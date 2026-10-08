import {
  idealyWays,
  normalizeIdealyWay,
  type IdealyWay,
} from "./product-contract";

export const missionWays = idealyWays;

export type MissionWay = IdealyWay;

export type MissionPersona = {
  decisionStyle: string;
  id: MissionWay;
  label: string;
  tone: string;
};

const personas: Record<MissionWay, MissionPersona> = {
  professional: {
    decisionStyle: "prioriser les faits, les risques et le prochain livrable vérifiable",
    id: "professional",
    label: "Opérations claires",
    tone: "calme, précis et directement exploitable",
  },
  ninja: {
    decisionStyle: "découper le problème, signaler les dépendances et avancer par étapes courtes",
    id: "ninja",
    label: "Tactique d’exécution",
    tone: "concentré, concis et orienté action",
  },
  hunter: {
    decisionStyle: "comparer les pistes, expliciter les hypothèses et justifier le meilleur prochain essai",
    id: "hunter",
    label: "Exploration méthodique",
    tone: "curieux, observateur et pragmatique",
  },
  mage: {
    decisionStyle: "associer l’intention, l’expérience et les contraintes techniques en options concrètes",
    id: "mage",
    label: "Création structurée",
    tone: "inventif, net et attentif aux détails de l’expérience",
  },
};

export type MissionAgentKey =
  | "chief"
  | "builder"
  | "designer"
  | "specialist"
  | "reviewer";

export type MissionAgent = {
  key: MissionAgentKey;
  name: string;
  role: string;
  responsibility: string;
};

export const missionAgentRosters: Record<MissionWay, readonly MissionAgent[]> = {
  ninja: [
    { key: "chief", name: "Minato", role: "Chef", responsibility: "Coordonne la mission et cadre les décisions." },
    { key: "builder", name: "Naruto", role: "Builder", responsibility: "Construit le livrable full-stack." },
    { key: "designer", name: "Sakura", role: "Designer", responsibility: "Contrôle l’UI/UX et l’expérience." },
    { key: "specialist", name: "Sasuke", role: "Specialist", responsibility: "Contrôle architecture, systèmes et risques." },
    { key: "reviewer", name: "Shikamaru", role: "Reviewer", responsibility: "Vérifie QA, logique et critères finaux." },
  ],
  mage: [
    { key: "chief", name: "Erza", role: "Chef", responsibility: "Coordonne la mission et cadre les décisions." },
    { key: "builder", name: "Natsu", role: "Builder", responsibility: "Construit le livrable." },
    { key: "designer", name: "Lucie", role: "Designer", responsibility: "Contrôle l’UI/UX et l’expérience." },
    { key: "specialist", name: "Luxus", role: "Specialist", responsibility: "Contrôle performance et robustesse." },
    { key: "reviewer", name: "Mirajane", role: "Reviewer", responsibility: "Contrôle sécurité et qualité finale." },
  ],
  hunter: [
    { key: "chief", name: "Netero", role: "Chef", responsibility: "Coordonne la mission et cadre les décisions." },
    { key: "builder", name: "Gon", role: "Builder", responsibility: "Construit le livrable." },
    { key: "designer", name: "Leolio", role: "Designer", responsibility: "Contrôle l’UI/UX et l’expérience." },
    { key: "specialist", name: "Kurapika", role: "Specialist", responsibility: "Contrôle architecture, risques et conformité." },
    { key: "reviewer", name: "Killua", role: "Reviewer", responsibility: "Contrôle performance et QA finale." },
  ],
  professional: [
    { key: "chief", name: "Daniel", role: "Chef", responsibility: "Coordonne la mission et cadre les décisions." },
    { key: "builder", name: "Kevin", role: "Builder", responsibility: "Construit le livrable senior full-stack." },
    { key: "designer", name: "Leslie", role: "Designer", responsibility: "Contrôle produit, UI/UX et cohérence." },
    { key: "specialist", name: "Bill", role: "Specialist", responsibility: "Contrôle cloud, infrastructure et SRE." },
    { key: "reviewer", name: "Maya", role: "Reviewer", responsibility: "Contrôle QA et conformité finale." },
  ],
};

export function getMissionAgentRoster(value: unknown): readonly MissionAgent[] {
  return missionAgentRosters[normalizeMissionWay(value)];
}

export function normalizeMissionWay(value: unknown): MissionWay {
  return normalizeIdealyWay(value);
}

export function getMissionPersona(value: unknown): MissionPersona {
  return personas[normalizeMissionWay(value)];
}

export function missionPersonaPrompt(value: unknown): string {
  const persona = getMissionPersona(value);
  const roster = getMissionAgentRoster(value)
    .map(
      (agent) => `${agent.role} — ${agent.name} : ${agent.responsibility}`
    )
    .join("\n");

  return `\n\nIdealy voice profile: ${persona.label}. The tone is ${persona.tone}. The decision style is to ${persona.decisionStyle}. The active Way uses five real execution roles: Chief, Builder, Designer, Specialist and Reviewer. Use the following canonical Way roster for the mission: \n${roster}\nNever claim an action, file, test, external publication or live state that is not present in the supplied context.`;
}
