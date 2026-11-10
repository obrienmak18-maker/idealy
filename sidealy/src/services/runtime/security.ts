import type { AllowedCommand } from "./types";

/**
 * Denied file path patterns.
 * Shared between client and server to prevent leakage of secrets, keys, and internal configs.
 */
export const DENIED_PATH_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/i, // Denies .env, .env.local, .env.production, etc. EXCEPT .env.example (handled below)
  /^\.npmrc$/i,
  /\.(pem|key|p12|pfx|pkcs12)$/i,
  /^id_rsa/i,
  /\.git(\/|\\|$)/i,
  /node_modules(\/|\\|$)/i,
];

/**
 * Verifies if a workspace file path is safe to read, write, or mount.
 */
export function isAllowedWorkspacePath(rawPath: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!rawPath || typeof rawPath !== "string") {
    return { allowed: false, reason: "Chemin manquant ou invalide." };
  }

  // Null byte or control character detection
  for (let i = 0; i < rawPath.length; i += 1) {
    const code = rawPath.charCodeAt(i);
    if (code <= 31 || code === 127) {
      return {
        allowed: false,
        reason: "Caractère de contrôle non autorisé dans le chemin.",
      };
    }
  }

  const normalized = rawPath.replaceAll("\\", "/").replace(/^\/+/, "").trim();

  if (normalized.length === 0) {
    return { allowed: false, reason: "Le chemin est vide." };
  }

  if (normalized.length > 240) {
    return {
      allowed: false,
      reason:
        "Le chemin dépasse la longueur maximale autorisée (240 caractères).",
    };
  }

  const segments = normalized.split("/").filter(Boolean);

  if (segments.some((seg) => seg === "." || seg === "..")) {
    return {
      allowed: false,
      reason:
        "Les segments de traversée de répertoire (« .. ») sont interdits.",
    };
  }

  const fileName = segments.at(-1) ?? "";

  // Whitelist exception: .env.example is benign documentation
  if (fileName.toLowerCase() === ".env.example") {
    return { allowed: true };
  }

  // Check against denied patterns
  for (const pattern of DENIED_PATH_PATTERNS) {
    if (pattern.test(fileName) || pattern.test(normalized)) {
      return {
        allowed: false,
        reason: `Accès refusé au fichier sensible : « ${fileName} ». Aucun secret ou clé d'environnement ne doit transiter par le runtime.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Normalizes a workspace path into a safe relative path anchored in "workspace/".
 * Throws an explicit error if the path is disallowed.
 */
export function sanitizeWorkspacePath(rawPath: string): string {
  const check = isAllowedWorkspacePath(rawPath);
  if (!check.allowed) {
    throw new Error(check.reason || `Chemin non autorisé : ${rawPath}`);
  }
  const normalized = rawPath.replaceAll("\\", "/").replace(/^\/+/, "").trim();
  return `workspace/${normalized}`;
}

/**
 * Regex for valid npm package names with optional scope and semver tag.
 * Examples: "react", "@types/node", "lucide-react@^0.553.0"
 */
const NPM_PACKAGE_NAME_REGEX =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-zA-Z0-9^~.><=v-]+)?$/;

/**
 * Validates and sanitizes an AllowedCommand before passing to the runtime execution engine.
 * Ensures no shell injection, arbitrary scripts, or uncontrolled dependencies can be executed.
 */
export function validateAllowedCommand(cmd: AllowedCommand): {
  valid: boolean;
  binary: string;
  args: string[];
  reason?: string;
} {
  if (!cmd || typeof cmd !== "object" || !("kind" in cmd)) {
    return {
      args: [],
      binary: "",
      reason: "Format de commande invalide.",
      valid: false,
    };
  }

  switch (cmd.kind) {
    case "npm-install": {
      const args: string[] = ["install", "--ignore-scripts"];
      if (Array.isArray(cmd.packages) && cmd.packages.length > 0) {
        for (const pkg of cmd.packages) {
          const trimmed = pkg.trim();
          if (!trimmed) {
            continue;
          }
          if (!NPM_PACKAGE_NAME_REGEX.test(trimmed)) {
            return {
              args: [],
              binary: "npm",
              reason: `Nom de paquet npm non valide : « ${trimmed} ». Seuls les paquets du registre npm officiel sans caractères shell sont autorisés.`,
              valid: false,
            };
          }
          args.push(trimmed);
        }
      }
      return { args, binary: "npm", valid: true };
    }

    case "npm-ci": {
      return {
        args: ["ci", "--ignore-scripts"],
        binary: "npm",
        valid: true,
      };
    }

    case "npm-run": {
      const allowedScripts = ["dev", "build", "start", "preview"] as const;
      if (!allowedScripts.includes(cmd.script)) {
        return {
          args: [],
          binary: "npm",
          reason: `Script non autorisé : « ${cmd.script} ». Seuls les scripts [${allowedScripts.join(", ")}] peuvent être exécutés.`,
          valid: false,
        };
      }
      return {
        args: ["run", cmd.script],
        binary: "npm",
        valid: true,
      };
    }

    case "tsc-noemit": {
      return {
        args: ["tsc", "--noEmit"],
        binary: "npx",
        valid: true,
      };
    }

    default: {
      const unknownKind = (cmd as { kind?: string }).kind;
      return {
        args: [],
        binary: "",
        reason: `Type de commande inconnu ou non autorisé : « ${unknownKind} ».`,
        valid: false,
      };
    }
  }
}
