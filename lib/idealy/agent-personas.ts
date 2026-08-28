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

export const missionAgentRoster = [
  {
    key: "architect",
    label: "Architecte",
    name: "Sélène Ardent",
    responsibility: "Cadre le périmètre, les hypothèses et les critères de réussite.",
  },
  {
    key: "builder",
    label: "Builder",
    name: "Maël Forge",
    responsibility: "Construit uniquement le livrable borné et rend les fichiers vérifiables.",
  },
  {
    key: "reviewer",
    label: "Reviewer",
    name: "Iris Vale",
    responsibility: "Contrôle les faits, les risques et les tests à exécuter sans inventer de résultat.",
  },
] as const;

export function normalizeMissionWay(value: unknown): MissionWay {
  return normalizeIdealyWay(value);
}

export function getMissionPersona(value: unknown): MissionPersona {
  return personas[normalizeMissionWay(value)];
}

export function missionPersonaPrompt(value: unknown): string {
  const persona = getMissionPersona(value);
  const roster = missionAgentRoster
    .map(
      (agent) => `${agent.label} (${agent.name}) : ${agent.responsibility}`
    )
    .join("\n");

  return `\n\nIdealy voice profile: ${persona.label}. The tone is ${persona.tone}. The decision style is to ${persona.decisionStyle}. Keep the functional roles exactly Architecte, Builder and Reviewer. Use the following original operator names only as a narrative signature, never as a claim of identity: \n${roster}\nDo not imitate, quote, reference or claim affiliation with any existing fictional character or franchise. Never claim an action, file, test, external publication or live state that is not present in the supplied context.`;
}
