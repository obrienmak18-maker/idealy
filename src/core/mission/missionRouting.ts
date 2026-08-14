import type { Way, WayAgent, WayId } from '@/lore/ways';
import type { MissionContracts } from './contracts';

export type MissionComplexity = 'starter' | 'standard' | 'advanced';

export interface MissionRoute {
  complexity: MissionComplexity;
  rank: string;
  estimatedEnergy: number;
  commandCenter: string;
  handoffLabel: string;
  summary: string;
  reasons: string[];
  assignedAgents: WayAgent[];
}

const ADVANCED_SIGNALS = /\b(authentification|connexion|stripe|paiement|supabase|base de donn[éee]es|api|temps r[ée]el|realtime|r[ôo]les|admin|multi[- ]utilisateur|mobile|android|ios|publication|d[ée]ploiement|marketplace)\b/gi;
const STANDARD_SIGNALS = /\b(tableau de bord|dashboard|calendrier|r[ée]servation|notification|fichier|upload|profil|recherche|filtre|formulaire|statistiques|ia|assistant)\b/gi;

const COMMAND_CENTERS: Record<WayId, { commandCenter: string; handoffLabel: string }> = {
  ninja: { commandCenter: 'Bureau du Hokage', handoffLabel: 'Le messager transmet votre mission au Hokage.' },
  mage: { commandCenter: 'Tableau de la Guilde', handoffLabel: 'Le grimoire transmet votre quête au maître de guilde.' },
  hunter: { commandCenter: 'Association des Hunters', handoffLabel: 'Le rapport de traque est transmis à l’association.' },
  pro: { commandCenter: 'Direction de projet', handoffLabel: 'Votre demande est transmise au responsable de mission.' },
};

function countMatches(value: string, pattern: RegExp): number {
  return (value.match(pattern) ?? []).length;
}

function buildComplexityScore(prompt: string, contracts: MissionContracts): number {
  const normalized = prompt.toLowerCase();
  const advanced = countMatches(normalized, ADVANCED_SIGNALS);
  const standard = countMatches(normalized, STANDARD_SIGNALS);
  const scope = contracts.brief.mustHave.length;
  const lengthBonus = normalized.length > 260 ? 1 : 0;

  return advanced * 2 + standard + Math.max(0, scope - 2) + lengthBonus;
}

function complexityFromScore(score: number): MissionComplexity {
  if (score >= 5) return 'advanced';
  if (score >= 2) return 'standard';
  return 'starter';
}

function routeCopy(complexity: MissionComplexity, way: Way, rank: string, assignedAgents: WayAgent[]): Pick<MissionRoute, 'summary' | 'reasons'> {
  const lead = assignedAgents[0]?.name ?? way.vocab.agent;
  const team = assignedAgents.length > 1 ? `avec ${assignedAgents.length - 1} renfort${assignedAgents.length > 2 ? 's' : ''}` : 'en autonomie';

  if (complexity === 'advanced') {
    return {
      summary: `${lead} recommande une équipe de rang ${rank} ${team} : la mission demande plusieurs étapes à relier proprement.`,
      reasons: ['Plusieurs éléments importants ont été détectés.', 'La mission doit être découpée et validée avant publication.'],
    };
  }

  if (complexity === 'standard') {
    return {
      summary: `${lead} recommande une équipe de rang ${rank} ${team} pour construire une première version solide.`,
      reasons: ['La mission contient une action principale et quelques éléments à organiser.', 'Une vérification de qualité est prévue avant l’aperçu.'],
    };
  }

  return {
    summary: `${lead} recommande une équipe de rang ${rank} ${team} : la mission est idéale pour une première tranche rapide.`,
    reasons: ['Le périmètre est clair et concentré.', 'La première version peut être montrée rapidement dans l’aperçu.'],
  };
}

/**
 * Classe localement le périmètre apparent d’une mission. Ce résultat guide
 * l’expérience de briefing ; il ne représente ni un devis, ni une promesse de prix.
 */
export function deriveMissionRoute(prompt: string, contracts: MissionContracts, way: Way): MissionRoute {
  const complexity = complexityFromScore(buildComplexityScore(prompt, contracts));
  const rankIndex = complexity === 'starter' ? 0 : complexity === 'standard' ? 1 : 2;
  const rank = way.grades[Math.min(rankIndex, way.grades.length - 1)] ?? 'Builder';
  const agentCount = complexity === 'starter' ? 2 : complexity === 'standard' ? 3 : Math.min(4, way.agents.length);
  const assignedAgents = way.agents.slice(0, agentCount);
  const copy = routeCopy(complexity, way, rank, assignedAgents);
  const command = COMMAND_CENTERS[way.id];
  const estimatedEnergy = complexity === 'starter' ? 5 : complexity === 'standard' ? 10 : 20;

  return {
    complexity,
    rank,
    estimatedEnergy,
    commandCenter: command.commandCenter,
    handoffLabel: command.handoffLabel,
    assignedAgents,
    ...copy,
  };
}
