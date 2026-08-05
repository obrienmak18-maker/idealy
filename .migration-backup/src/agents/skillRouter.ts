export type ConnectorProvider =
  | 'github'
  | 'supabase'
  | 'stripe'
  | 'neon'
  | 'figma'
  | 'vercel'
  | 'notion'
  | 'slack'
  | 'google'
  | 'aws'
  | 'cloudflare';

export type SkillSlug =
  | 'application-builder'
  | 'database-design'
  | 'security-audit'
  | 'quality-assurance'
  | 'deployment'
  | 'documentation';

export interface MissionPlan {
  skills: SkillSlug[];
  preferredConnectors: ConnectorProvider[];
}

const RULES: Array<{ pattern: RegExp; skills: SkillSlug[]; connectors: ConnectorProvider[] }> = [
  { pattern: /paiement|abonnement|stripe|checkout|factur/i, skills: ['application-builder'], connectors: ['stripe', 'supabase'] },
  { pattern: /base de donn|postgres|sql|migration|rls|auth/i, skills: ['database-design'], connectors: ['supabase', 'neon'] },
  { pattern: /design|maquette|figma|interface|ui|ux/i, skills: ['application-builder'], connectors: ['figma'] },
  { pattern: /deploy|d.ploiement|production|domaine|hosting/i, skills: ['deployment'], connectors: ['vercel', 'cloudflare', 'github'] },
  { pattern: /document|readme|guide|api docs|faq/i, skills: ['documentation'], connectors: ['notion', 'github'] },
  { pattern: /s.curit|audit|vuln.rabilit|performance|lighthouse|test/i, skills: ['security-audit', 'quality-assurance'], connectors: ['github', 'supabase'] },
];

/** Deterministic routing keeps agent behavior explainable and testable. */
export function planMission(prompt: string): MissionPlan {
  const skills = new Set<SkillSlug>(['application-builder']);
  const connectors = new Set<ConnectorProvider>(['github']);

  for (const rule of RULES) {
    if (!rule.pattern.test(prompt)) continue;
    rule.skills.forEach((skill) => skills.add(skill));
    rule.connectors.forEach((connector) => connectors.add(connector));
  }

  return { skills: [...skills], preferredConnectors: [...connectors] };
}
