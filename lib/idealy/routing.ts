/**
 * Routage d'une demande Idealy : discussion rapide, construction ciblée ou escouade.
 *
 * Principe (inspiré des orchestrateurs multi-agents) : on ne mobilise une équipe que si la
 * mission l'exige. Le routeur est déterministe et explicable : chaque décision renvoie ses
 * raisons, ce qui permet à l'interface d'afficher honnêtement ce qui a été choisi.
 */
export type RouteLane = "quick" | "build";
export type RouteDepth = "direct" | "focused" | "squad";

export type IdealyRoute = {
  lane: RouteLane;
  depth: RouteDepth;
  /** Agents mobilisés (clés de rôle). Vide pour la discussion rapide. */
  agents: ReadonlyArray<"chief" | "builder" | "designer" | "specialist" | "reviewer">;
  /** Points de Power facturés si la mission aboutit. 0 pour la discussion rapide. */
  powerPoints: 0 | 10 | 50;
  /** Score de complexité (0 à 10+), pour le diagnostic. */
  score: number;
  reasons: string[];
};

type Signal = { pattern: RegExp; weight: number; reason: string };

const SIGNALS: Signal[] = [
  { pattern: /\b(auth|authentification|login|connexion|inscription|oauth|sso|mot de passe)\b/i, weight: 2, reason: "authentification" },
  { pattern: /\b(base de donn[ée]es|database|supabase|postgres|firebase|sql|backend|api|serveur)\b/i, weight: 2, reason: "données / backend" },
  { pattern: /\b(paiement|payment|stripe|abonnement|subscription|checkout|facturation)\b/i, weight: 2, reason: "paiements" },
  { pattern: /\b(temps r[ée]el|realtime|websocket|chat en direct|notifications?)\b/i, weight: 2, reason: "temps réel" },
  { pattern: /\b(admin|dashboard|tableau de bord|back-?office|crm|erp|marketplace|saas|e-?commerce)\b/i, weight: 2, reason: "produit complet" },
  { pattern: /\b(plusieurs pages|multi-?pages?|pages?|[ée]crans?|routes?|navigation)\b/i, weight: 1, reason: "plusieurs écrans" },
  { pattern: /\b(mobile|ios|android|pwa|responsive)\b/i, weight: 1, reason: "multi-plateforme" },
  { pattern: /\b(r[ôo]les?|permissions?|multi-?utilisateurs?|[ée]quipe|collaboration)\b/i, weight: 1, reason: "rôles et équipes" },
  { pattern: /\b(upload|fichiers?|images?|pdf|export|import|csv)\b/i, weight: 1, reason: "fichiers" },
  { pattern: /\b(ia|intelligence artificielle|chatbot|llm|openai|gemini|recommandation)\b/i, weight: 1, reason: "fonctions IA" },
];

const SMALL_SIGNALS = /\b(landing|page d'accueil|portfolio|vitrine|une seule page|one[- ]page|compteur|todo|to-do|calculatrice|formulaire|bouton|composant|carte|prototype simple)\b/i;

const AGENT_SETS = {
  focused: ["builder", "reviewer"],
  squad: ["chief", "builder", "designer", "specialist", "reviewer"],
} as const;

/** Décide de la voie à suivre pour une demande déjà classée (CONVERSATION / IDEATION / EXECUTION). */
export function routeIdealyRequest(input: {
  prompt: string;
  intent: "CONVERSATION" | "IDEATION" | "EXECUTION";
  /** Nombre de fichiers déjà dans le projet (une modification ciblée ne réveille pas toute l'équipe). */
  existingFileCount?: number;
}): IdealyRoute {
  const { prompt, intent } = input;
  if (intent !== "EXECUTION") {
    return { lane: "quick", depth: "direct", agents: [], powerPoints: 0, score: 0, reasons: ["discussion ou idée : réponse directe"] };
  }

  const reasons: string[] = [];
  let score = 0;
  for (const signal of SIGNALS) {
    if (signal.pattern.test(prompt)) {
      score += signal.weight;
      reasons.push(signal.reason);
    }
  }
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (words > 120) {
    score += 3;
    reasons.push("cahier des charges détaillé");
  } else if (words > 50) {
    score += 1;
    reasons.push("demande étoffée");
  }
  if (SMALL_SIGNALS.test(prompt) && score <= 2) {
    score = Math.max(0, score - 1);
    reasons.push("périmètre réduit");
  }
  // Une retouche sur un projet existant reste ciblée tant qu'elle ne demande pas de nouvelle brique lourde.
  if ((input.existingFileCount ?? 0) > 0 && score <= 3) {
    score = Math.max(0, score - 1);
    reasons.push("modification d'un projet existant");
  }

  if (score >= 4) {
    return { lane: "build", depth: "squad", agents: AGENT_SETS.squad, powerPoints: 50, score, reasons };
  }
  return { lane: "build", depth: "focused", agents: AGENT_SETS.focused, powerPoints: 10, score, reasons: reasons.length ? reasons : ["mission simple"] };
}
