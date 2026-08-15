import type { Way, WayAgent } from '@/lore/ways';

export interface MissionTeam {
  strategist: WayAgent;
  builder: WayAgent;
  validator: WayAgent;
  optimizer?: WayAgent;
  supporting: WayAgent[];
  requiredSkills: string[];
}

function agentText(agent: WayAgent): string {
  return `${agent.role} ${agent.specialty} ${(agent.skills ?? []).join(' ')}`.toLocaleLowerCase();
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

const SKILL_HINTS: Array<{ skill: string; pattern: RegExp }> = [
  { skill: 'design', pattern: /design|interface|ui|ux|visuel|maquette|style|couleur|animation/ },
  { skill: 'frontend', pattern: /frontend|front-end|react|vue|composant|page|écran|interface/ },
  { skill: 'backend', pattern: /backend|back-end|api|serveur|auth|supabase|stripe|base de données/ },
  { skill: 'data', pattern: /data|données|tableau|analytics|sql|base|statistique/ },
  { skill: 'integrations', pattern: /connecteur|intégration|github|figma|stripe|pexels|webhook|oauth/ },
  { skill: 'validation', pattern: /validation|corriger|bug|erreur|fiabil|qualité|test/ },
  { skill: 'security', pattern: /sécurité|secret|clé|permission|vulnér|protection/ },
  { skill: 'performance', pattern: /performance|rapide|optim|latence|taille|chargement/ },
  { skill: 'webcontainer', pattern: /terminal|npm|build|webcontainer|fichier|code/ },
  { skill: 'architecture', pattern: /architecture|structure|route|schéma|organiser|projet/ },
];

export function inferMissionSkills(prompt = ''): string[] {
  const normalized = prompt.toLocaleLowerCase();
  const skills = SKILL_HINTS.filter(({ pattern }) => pattern.test(normalized)).map(({ skill }) => skill);
  return skills.length > 0 ? skills : ['architecture', 'frontend', 'validation'];
}

function scoreAgent(agent: WayAgent, requiredSkills: string[], rolePattern: RegExp): number {
  const skills = new Set(agent.skills ?? []);
  const skillScore = requiredSkills.reduce((score, skill) => score + (skills.has(skill) ? 4 : 0), 0);
  const roleScore = rolePattern.test(agentText(agent)) ? 3 : 0;
  return skillScore + roleScore;
}

function selectBest(way: Way, requiredSkills: string[], rolePattern: RegExp, excluded: WayAgent[]): WayAgent {
  const candidates = way.agents.filter((agent) => !excluded.some((excludedAgent) => excludedAgent.id === agent.id));
  return candidates
    .map((agent, index) => ({ agent, score: scoreAgent(agent, requiredSkills, rolePattern), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.agent
    ?? findAgent(way, rolePattern, 0, excluded);
}

/** Sélectionne d’abord les rôles indispensables, puis complète selon la couverture de compétences de la mission. */
export function selectMissionTeam(way: Way, prompt = ''): MissionTeam {
  const requiredSkills = inferMissionSkills(prompt);
  const strategist = selectBest(way, requiredSkills, /architect|strat[ée]g/, []);
  const builder = selectBest(way, requiredSkills, /d[ée]veloppeur|construction|composant/, [strategist]);
  const validator = selectBest(way, requiredSkills, /valid|test|qualit[ée]/, [strategist, builder]);
  const optimizerCandidate = way.agents
    .filter((agent) => ![strategist, builder, validator].some((selected) => selected.id === agent.id))
    .sort((a, b) => scoreAgent(b, requiredSkills, /optimis|performance/) - scoreAgent(a, requiredSkills, /optimis|performance/))[0];
  const optimizer = optimizerCandidate && /optimis|performance/.test(agentText(optimizerCandidate)) ? optimizerCandidate : undefined;
  const selectedIds = new Set([strategist.id, builder.id, validator.id, optimizer?.id]);
  const supporting = way.agents
    .filter((agent) => !selectedIds.has(agent.id))
    .map((agent) => ({ agent, score: scoreAgent(agent, requiredSkills, /./) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ agent }) => agent);

  return { strategist, builder, validator, optimizer, supporting, requiredSkills };
}
