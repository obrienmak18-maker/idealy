import type { DataUIPart } from "ai";
import type { MissionPlan } from "./backend-adapter";
import type { CustomUIDataTypes, ChatMessage } from "../types";

export const LOCAL_DEMO_MISSION_ID = "local-workspace-mission";

const localPreviewHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Atelier Nord — Aperçu</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #f6f8fb; color: #0f172a; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      main { max-width: 1040px; margin: 0 auto; padding: 52px 28px; }
      .eyebrow { color: #0f766e; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
      h1 { max-width: 720px; margin: 16px 0; font-size: clamp(40px, 6vw, 72px); letter-spacing: -.055em; line-height: .98; }
      p { max-width: 560px; color: #475569; font-size: 17px; line-height: 1.6; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
      button { border: 0; border-radius: 999px; padding: 13px 18px; background: #0f766e; color: white; font-weight: 700; }
      button.secondary { background: white; border: 1px solid #cbd5e1; color: #0f172a; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 64px; }
      .card { min-height: 150px; padding: 22px; border: 1px solid #dbe3ef; border-radius: 20px; background: white; box-shadow: 0 12px 30px rgba(15,23,42,.06); }
      .mark { width: 34px; height: 8px; border-radius: 99px; background: linear-gradient(90deg, #38bdf8, #14b8a6, #facc15, #fb923c); }
      h2 { margin: 20px 0 8px; font-size: 17px; }
      .card p { margin: 0; font-size: 14px; }
      @media (max-width: 680px) { main { padding: 36px 20px; } .grid { grid-template-columns: 1fr; margin-top: 42px; } }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Atelier Nord</div>
      <h1>Votre prochaine idée mérite un espace pour grandir.</h1>
      <p>Un aperçu local de l’application créée par la mission. Cette page est fournie pour la démonstration du canvas Idealy.</p>
      <div class="actions"><button>Découvrir le programme</button><button class="secondary">Voir les ateliers</button></div>
      <section class="grid"><article class="card"><div class="mark"></div><h2>Explorer</h2><p>Un point de départ clair pour lancer la prochaine étape.</p></article><article class="card"><div class="mark"></div><h2>Construire</h2><p>Des détails utiles, organisés autour de la même intention.</p></article><article class="card"><div class="mark"></div><h2>Partager</h2><p>Une expérience simple, lisible et pensée pour avancer.</p></article></section>
    </main>
  </body>
</html>`;

const localCode = `export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
          Atelier Nord
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">
          Votre prochaine idée mérite un espace pour grandir.
        </h1>
        <p className="mt-5 max-w-xl text-slate-600">
          Une page de lancement claire, utile et prête à évoluer avec votre projet.
        </p>
      </section>
    </main>
  );
}`;

export const localMissionPlan: MissionPlan = {
  projectKind: "Page de lancement",
  intention: "Présenter Atelier Nord et guider les visiteurs vers une première découverte.",
  v1Scope: "Une landing responsive avec proposition de valeur, appel à l’action et cartes de parcours.",
  nextStep: "Relire l’aperçu, vérifier les fichiers puis confirmer le passage à l’itération suivante.",
  agents: [
    {
      name: "Lyra — Architecte",
      responsibility: "Cadre l’intention, le parcours et la priorité de la première version.",
      result: "Un plan de mission lisible et un périmètre V1 cohérent.",
    },
    {
      name: "Mason — Builder",
      responsibility: "Prépare une structure de page responsive à partir du plan validé.",
      result: "Les fichiers de l’aperçu et une première interface fonctionnelle.",
    },
    {
      name: "Nova — Reviewer",
      responsibility: "Vérifie la clarté, la cohérence et les points à améliorer.",
      result: "Une revue concise avant toute publication réelle.",
    },
  ],
  design: {
    analysis: {
      accessibility: "high",
      audience: "Créateurs et visiteurs d’Atelier Nord",
      charts: false,
      complexity: "medium",
      density: "spacious",
      framework: "next",
      interaction: "medium",
      motion: "low",
      platform: "web",
      productType: "Page de lancement",
      sector: "Création",
      threeD: false,
      tone: "Calme, clair et éditorial",
    },
    constraints: ["Responsive", "Lisible", "Démo locale sans appel externe"],
    dependencies: [],
    instructions: ["Mettre en avant une intention claire et une action principale."],
    requestedProviders: [],
    selectedProviders: [],
    stack: { dependencies: [], providers: [] },
    tokens: {
      borderRadius: "moderate",
      borderStyle: "fin et discret",
      colorStrategy: "Bleu ciel, vert pétrole, jaune chaud et fond ivoire",
      density: "aérée",
      motionDuration: "courte et fonctionnelle",
      shadowStrategy: "douce et peu contrastée",
      spacing: "généreuse",
      typography: "Sans sérif lisible, titres denses et hiérarchie claire",
    },
    variationSeed: 41,
    version: "1.0",
    visualDirection: {
      name: "Éditorial contemporain",
      rationale: "Une hiérarchie claire, des surfaces légères et une palette chaleureuse pour rendre l’entrée en mission rassurante.",
    },
  },
  designCritic: {
    issues: [],
    passed: true,
    score: 88,
  },
};

function localMessage(role: "assistant" | "user", text: string): ChatMessage {
  return {
    id: `local-${role}-${crypto.randomUUID()}`,
    metadata: { createdAt: new Date().toISOString() },
    parts: [{ text, type: "text" }],
    role,
  } as ChatMessage;
}

export function localUserMessage(text: string) {
  return localMessage("user", text);
}

export function localAssistantMessage() {
  return localMessage(
    "assistant",
    "J’ai préparé une mission locale pour Atelier Nord. Le plan est prêt, le canvas s’ouvre avec les fichiers et l’aperçu. Vous pouvez maintenant parcourir Preview, Code, Database et Console, ajuster le format, ouvrir l’aperçu, ou lancer l’escouade locale."
  );
}

export function localWorkspaceDataStream(): DataUIPart<CustomUIDataTypes>[] {
  const updatedAt = new Date().toISOString();
  const file = {
    content: localCode,
    id: "local-file-page",
    language: "typescript",
    missionId: LOCAL_DEMO_MISSION_ID,
    path: "src/app/page.tsx",
    status: "validated" as const,
    updatedAt,
    version: 1,
  };

  return [
    { data: "EXECUTION", type: "data-idealy-intent" },
    { data: LOCAL_DEMO_MISSION_ID, type: "data-idealy-mission" },
    { data: localMissionPlan, type: "data-idealy-plan" },
    {
      data: {
        eventType: "mission_started",
        missionId: LOCAL_DEMO_MISSION_ID,
        payload: { mode: "local-demo", source: "workspace" },
        sequence: 1,
      },
      type: "data-idealy-file-event",
    },
    {
      data: {
        eventType: "agent_started",
        missionId: LOCAL_DEMO_MISSION_ID,
        payload: { agent: "Lyra — Architecte", mode: "local-demo" },
        sequence: 2,
      },
      type: "data-idealy-file-event",
    },
    {
      data: {
        eventType: "file_content",
        file,
        missionId: LOCAL_DEMO_MISSION_ID,
        path: file.path,
        payload: { mode: "local-demo" },
        sequence: 3,
      },
      type: "data-idealy-file-event",
    },
    {
      data: {
        eventType: "file_saved",
        file,
        missionId: LOCAL_DEMO_MISSION_ID,
        path: file.path,
        payload: { mode: "local-demo" },
        sequence: 4,
      },
      type: "data-idealy-file-event",
    },
    { data: localPreviewHtml, type: "data-preview" },
    {
      data: {
        eventType: "mission_completed",
        missionId: LOCAL_DEMO_MISSION_ID,
        payload: { mode: "local-demo", status: "ready-for-review" },
        sequence: 5,
      },
      type: "data-idealy-file-event",
    },
  ];
}

export function localWorkspaceMetadata() {
  return {
    demoMode: true,
    missionId: LOCAL_DEMO_MISSION_ID,
    missionSquadStatus: "ready-for-review",
    outputs: [
      {
        contents: [{ type: "text", value: "[local] Plan mission prepared" }],
        id: "local-plan",
        status: "completed",
      },
      {
        contents: [{ type: "text", value: "[local] Preview and workspace files ready" }],
        id: "local-preview",
        status: "completed",
      },
    ],
  };
}

export { localPreviewHtml };
