import { Router } from "express";
import { generateText, gateway, isStepCount, tool } from "ai";
import { z } from "zod";

const router = Router();
const MAX_FILES = 100;
const MAX_FILE_BYTES = 400_000;
const MAX_PROMPT_CHARS = 20_000;
const model = gateway("openai/gpt-5.5");
const MAX_VALIDATION_FILES = 20;

const fileMapSchema = z.record(z.string(), z.string()).default({});
const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(MAX_PROMPT_CHARS),
  files: fileMapSchema,
  projectName: z.string().trim().max(80).optional(),
});

type Event = { type: "phase" | "tool" | "warning"; message: string; path?: string };

function safePath(input: string) {
  const path = input.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("//")) {
    throw new Error("Chemin de fichier invalide.");
  }
  if (!/^[a-zA-Z0-9._/()@+\- ]+$/.test(path)) {
    throw new Error("Le chemin contient des caractères interdits.");
  }
  return path;
}

function assertFileSize(content: string) {
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) {
    throw new Error("Le fichier dépasse la limite de 400 Ko.");
  }
}

router.post("/ai/agent", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Requête agent invalide.", details: parsed.error.flatten() });
    return;
  }

  const workspace = new Map<string, string>();
  for (const [rawPath, content] of Object.entries(parsed.data.files).slice(0, MAX_FILES)) {
    try {
      const path = safePath(rawPath);
      assertFileSize(content);
      workspace.set(path, content);
    } catch {
      // Ignore unsafe client-provided paths instead of allowing them into the agent workspace.
    }
  }

  const events: Event[] = [
    { type: "phase", message: "Analyse de la demande et du projet existant…" },
  ];
  const changedPaths = new Set<string>();

  const listFiles = tool({
    description: "Liste les fichiers actuellement présents dans le workspace.",
    inputSchema: z.object({}),
    execute: async () => {
      const files = [...workspace.keys()].sort();
      events.push({ type: "tool", message: `${files.length} fichier(s) inspecté(s).` });
      return { files };
    },
  });

  const readFile = tool({
    description: "Lit un fichier existant avant de le modifier.",
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path: rawPath }) => {
      const path = safePath(rawPath);
      const content = workspace.get(path);
      if (content === undefined) throw new Error(`Fichier introuvable: ${path}`);
      events.push({ type: "tool", message: "Fichier lu", path });
      return { path, content };
    },
  });

  const writeFile = tool({
    description: "Crée ou remplace un fichier complet. Utilise ce tool pour écrire plusieurs fichiers si nécessaire.",
    inputSchema: z.object({ path: z.string(), content: z.string().max(MAX_FILE_BYTES) }),
    execute: async ({ path: rawPath, content }) => {
      const path = safePath(rawPath);
      assertFileSize(content);
      if (!workspace.has(path) && workspace.size >= MAX_FILES) throw new Error("Limite de fichiers atteinte.");
      const existed = workspace.has(path);
      workspace.set(path, content);
      changedPaths.add(path);
      events.push({ type: "tool", message: existed ? "Fichier écrit" : "Fichier créé", path });
      return { ok: true, path, bytes: Buffer.byteLength(content, "utf8") };
    },
  });

  const deleteFile = tool({
    description: "Supprime un fichier uniquement si la demande le justifie explicitement.",
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path: rawPath }) => {
      const path = safePath(rawPath);
      if (!workspace.delete(path)) throw new Error(`Fichier introuvable: ${path}`);
      changedPaths.add(path);
      events.push({ type: "tool", message: "Fichier supprimé", path });
      return { ok: true, path };
    },
  });

  const validateProject = tool({
    description: "Vérifie la présence des fichiers d'entrée et détecte les erreurs évidentes de structure.",
    inputSchema: z.object({ stack: z.enum(["react-vite-typescript", "expo-react-native", "unknown"]).default("unknown") }),
    execute: async ({ stack }) => {
      const files = [...workspace.keys()];
      const required = stack === "expo-react-native"
        ? ["package.json", "app.json"]
        : ["package.json", "index.html", "src/main.tsx"];
      const missing = required.filter((path) => !workspace.has(path));
      events.push({ type: missing.length ? "warning" : "phase", message: missing.length ? `Validation: ${missing.length} fichier(s) requis manquant(s).` : "Validation de structure réussie." });
      return { ok: missing.length === 0, missing, fileCount: files.length };
    },
  });

  try {
    events.push({ type: "phase", message: "Planification des changements et des fichiers…" });
    const result = await generateText({
      model,
      system: `Tu es l'agent de développement d'Idealy. Tu transformes une demande en modifications réelles, sûres et vérifiables.

Règles:
- N'expose jamais de chaîne de pensée privée. Décris seulement les étapes, décisions et résultats utiles.
- Inspecte d'abord les fichiers avec listFiles/readFile quand le projet existe.
- Écris le code complet avec writeFile; tu peux écrire plusieurs fichiers dans la même mission.
- Respecte le stack existant et ne remplace pas inutilement des fichiers.
- N'utilise jamais de chemin absolu, .., secrets, clés API ou contenu inventé pour remplacer une intégration.
- Termine par validateProject et fournis un résumé clair des fichiers modifiés et des limites éventuelles.
Projet: ${parsed.data.projectName ?? "Idealy workspace"}`,
      prompt: parsed.data.prompt,
      tools: { listFiles, readFile, writeFile, deleteFile, validateProject },
      stopWhen: isStepCount(12),
      maxOutputTokens: 12_000,
    });

    events.push({ type: "phase", message: "Mission terminée: fichiers prêts pour aperçu et validation." });
    res.json({
      ok: true,
      text: result.text,
      files: Object.fromEntries(workspace),
      changedPaths: [...changedPaths],
      events,
      steps: result.steps.length,
    });
  } catch (error) {
    events.push({ type: "warning", message: "La mission n'a pas pu être terminée." });
    const rawError = error instanceof Error ? error.message : "Erreur agent inconnue.";
    const errorMessage = rawError.includes("valid credit card")
      ? "Le moteur IA est configuré, mais le compte AI Gateway doit être débloqué avec une carte de facturation."
      : rawError;
    res.status(502).json({
      ok: false,
      error: errorMessage,
      events,
      files: Object.fromEntries(workspace),
      changedPaths: [...changedPaths],
    });
  }
});

export default router;
