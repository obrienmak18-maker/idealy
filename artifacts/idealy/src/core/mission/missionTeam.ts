import type { Way, WayAgent } from '@/lore/ways';

export interface MissionTeam {
  strategist: WayAgent;
  builder: WayAgent;
  validator: WayAgent;
  optimizer?: WayAgent;
}

function agentText(agent: WayAgent): string {
  return `${agent.role} ${agent.specialty}`.toLocaleLowerCase();
}

function findAgent(way: Way, matcher: RegExp, fallbackIndex: number, excluded: WayAgent[] = []): WayAgent {
  const candidates = way.agents.filter((agent) => !excluded.some((excludedAgent) => excludedAgent.id === agent.id));
  const selected = candidates.find((agent) => matcher.test(agentText(agent)));
  const fallback = candidates[fallbackIndex] ?? candidates[0] ?? way.agents[0];

  if (!selected && !fallback) {
    throw new Error(`La voie ${way.id} ne possède aucun agent assignable.`);
  }

  return selected ?? fallback;
}

/** Sélectionne les rôles réels de la voie plutôt que de dépendre de leur position dans la liste. */
export function selectMissionTeam(way: Way): MissionTeam {
  const strategist = findAgent(way, /architect|strat[ée]g/, 0);
  const builder = findAgent(way, /d[ée]veloppeur|construction|composant/, 1, [strategist]);
  const validator = findAgent(way, /valid|test|qualit[ée]/, 2, [strategist, builder]);
  const optimizerCandidate = way.agents.find((agent) => /optimis|performance/.test(agentText(agent)));

  return {
    strategist,
    builder,
    validator,
    optimizer: optimizerCandidate && ![strategist, builder, validator].some((agent) => agent.id === optimizerCandidate.id)
      ? optimizerCandidate
      : undefined,
  };
}
