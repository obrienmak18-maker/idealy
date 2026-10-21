/**
 * Détection de framework et instructions de build Idealy (LOT F).
 *
 * Mécanisme inspiré de la détection par carte de fichiers du dépôt open-source
 * StackBlitz bolt.new (MIT, (c) 2024 StackBlitz, Inc.) : lire package.json /
 * index.html / structure pour déduire le framework, puis adapter les commandes.
 * Réécriture complète en vocabulaire Idealy ; préserve le comportement mobile
 * existant de buildIUPS (mobileKeywords → Expo) sans le casser.
 * Voir THIRD_PARTY_NOTICES.md.
 */

export type DetectedFramework = "vite-react" | "vite-vanilla" | "expo" | "next" | "node-cli" | "static-html";

export interface FrameworkDetection {
  framework: DetectedFramework;
  /** Commande d'installation des dépendances dans le conteneur. */
  installCommand: string;
  /** Commande de validation (build ou typecheck) pour la boucle LOT E. */
  validateCommand: string;
  /** Commande de démarrage du serveur de dev (null = pas de serveur). */
  devCommand: string | null;
  /** Indices humains lisibles journalisés (preuve de détection). */
  reasons: string[];
}

/**
 * Détecte le framework depuis la carte de fichiers du projet généré.
 * `files` : map chemin relatif → contenu. Contenus manquants tolérés (détection
 * structurelle pure sur les chemins si le contenu n'est pas encore connu).
 */
export function detectFramework(files: Record<string, string>): FrameworkDetection {
  const paths = Object.keys(files);
  const reasons: string[] = [];

  let pkg: Record<string, unknown> | null = null;
  const rawPkg = files["package.json"];
  if (rawPkg) {
    try {
      pkg = JSON.parse(rawPkg) as Record<string, unknown>;
    } catch {
      reasons.push("package.json présent mais illisible : repli structurel.");
    }
  }
  const deps = {
    ...(isObject(pkg?.dependencies) ? pkg.dependencies : {}),
    ...(isObject(pkg?.devDependencies) ? pkg.devDependencies : {}),
  } as Record<string, string>;

  // ── Expo / mobile — cohérent avec mobileKeywords de buildIUPS (à préserver) ──
  const hasExpo = Boolean(deps.expo) || paths.some((p) => /^app\.json$|^expo\.config\.(js|ts)$/.test(p));
  if (hasExpo) {
    reasons.push("dépendance expo ou app.json/expo.config détecté");
    return {
      framework: "expo",
      installCommand: "npm install --no-audit --no-fund",
      validateCommand: "npx tsc --noEmit",
      devCommand: "npx expo start --web",
      reasons,
    };
  }

  // ── Next.js ──
  if (deps.next || paths.some((p) => p.startsWith("next.config."))) {
    reasons.push("dépendance next ou next.config.* détecté");
    return {
      framework: "next",
      installCommand: "npm install --no-audit --no-fund",
      validateCommand: "npm run build",
      devCommand: "npm run dev",
      reasons,
    };
  }

  // ── Vite (react ou vanilla) ──
  const hasVite = Boolean(deps.vite) || paths.some((p) => /^vite\.config\.(js|ts|mjs)$/.test(p));
  if (hasVite) {
    const hasReact = Boolean(deps.react && deps["react-dom"]);
    reasons.push(hasReact ? "vite + react/react-dom détectés" : "vite détecté sans react");
    return {
      framework: hasReact ? "vite-react" : "vite-vanilla",
      installCommand: "npm install --no-audit --no-fund",
      validateCommand: scriptsBuild(pkg) ? "npm run build" : "npx tsc --noEmit",
      devCommand: "npm run dev",
      reasons,
    };
  }

  // ── HTML statique servi par un paquet léger ──
  if (paths.includes("index.html") && !pkg) {
    reasons.push("index.html sans package.json : service statique");
    return {
      framework: "static-html",
      installCommand: "npm install --no-audit --no-fund serve",
      validateCommand: "npx tsc --noEmit --allowJs index.js",
      devCommand: "npx serve .",
      reasons,
    };
  }

  // ── CLI Node ──
  if (pkg && !deps.vite && !deps.react) {
    reasons.push("package.json sans stack web : CLI Node");
    return {
      framework: "node-cli",
      installCommand: "npm install --no-audit --no-fund",
      validateCommand: scriptsBuild(pkg) ? "npm run build" : "npx tsc --noEmit",
      devCommand: null,
      reasons,
    };
  }

  // ── Repli Vite+React : c'est la cible par défaut d'Idealy ──
  reasons.push("aucun marqueur fort : repli sur la cible par défaut Idealy (React + Vite)");
  return {
    framework: "vite-react",
    installCommand: "npm install --no-audit --no-fund",
    validateCommand: "npm run build",
    devCommand: "npm run dev",
    reasons,
  };
}

/** Instructions de build adaptées injectables dans un prompt système. */
export function frameworkBuildInstructions(detection: FrameworkDetection): string {
  const lines = [
    `<framework_detecte>${detection.framework}</framework_detecte>`,
    `Installation : ${detection.installCommand}`,
    `Validation attendue : ${detection.validateCommand}`,
  ];
  if (detection.devCommand) lines.push(`Serveur de dev (action start) : ${detection.devCommand}`);
  else lines.push("Pas de serveur de dev : ne jamais émettre d'action start.");
  if (detection.framework === "expo") {
    lines.push(
      "Projet mobile : cible Expo (SDK 51+). N'utilise aucune API DOM ; composants depuis react-native ; preview via expo start --web.",
    );
  }
  return lines.join("\n");
}

function scriptsBuild(pkg: Record<string, unknown> | null): boolean {
  const scripts = isObject(pkg?.scripts) ? pkg.scripts : {};
  return typeof scripts.build === "string" && scripts.build.length > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
