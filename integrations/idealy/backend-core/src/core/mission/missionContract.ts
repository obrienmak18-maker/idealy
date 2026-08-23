import type { Way } from '@/lore/ways';
import type { MissionContext } from '@/agents/orchestrator';
import { adaptStitchDesign, shouldUseStitchAdapter } from '@/core/design/stitchAdapter';
import type {
  ActionContract,
  DataContract,
  DeployContract,
  DesignContract,
  MissionBrief,
  MissionContracts,
  TestContract,
} from './contracts';

function splitItems(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function buildMissionBrief(prompt: string): MissionBrief {
  const normalized = prompt.trim();
  const mustHave = splitItems(normalized)
    .filter((item) => item.length > 12)
    .slice(0, 4);

  return {
    problem: normalized || 'Construire une application utile à partir d’une idée.',
    audience: 'À préciser avec l’utilisateur avant la publication.',
    primaryOutcome: normalized || 'Obtenir une première application navigable et testable.',
    mustHave: mustHave.length > 0 ? mustHave : ['Une interface principale navigable', 'Une action utile et vérifiable'],
    constraints: ['Ne pas exposer de secret dans le frontend', 'Préserver la voie et l’identité de la mission'],
    clarificationQuestions: [
      'Qui utilisera principalement cette application ?',
      'Quelle est l’action la plus importante à réussir dans la première version ?',
      'Les données doivent-elles rester en démonstration ou être reliées à un service réel ?',
    ],
  };
}

export function buildMissionContracts(
  prompt: string,
  way: Way,
  context?: Pick<MissionContext, 'preferredConnectors' | 'skills'>,
): MissionContracts {
  const brief = buildMissionBrief(prompt);
  const wantsMobile = /mobile|android|ios|expo|react native|smartphone|apk/i.test(prompt);
  const connectors = context?.preferredConnectors ?? [];
  const provider = connectors.includes('supabase') ? 'supabase' : 'mock';
  const screens = wantsMobile
    ? [
        { id: 'home', name: 'Accueil', purpose: 'Présenter l’action principale.', states: ['loading', 'empty', 'ready', 'error'] },
        { id: 'main-action', name: 'Action principale', purpose: 'Permettre l’usage central de la mission.', states: ['idle', 'submitting', 'success', 'error'] },
      ]
    : [
        { id: 'landing', name: 'Accueil', purpose: 'Expliquer la valeur de l’application.', states: ['loading', 'ready', 'error'] },
        { id: 'workspace', name: 'Espace principal', purpose: 'Afficher les données et l’action centrale.', states: ['loading', 'empty', 'ready', 'error'] },
      ];

  const baseDesign: DesignContract = {
    version: 1,
    source: 'idealy',
    direction: `Direction ${way.name} : ${way.description}`,
    visualReferences: [],
    screens,
    tokens: {
      colors: { background: 'ink-950', foreground: 'ink-50', accent: way.primaryClass },
      typography: { heading: 'display', body: 'sans' },
      spacing: { page: '1.5rem', section: '2.5rem' },
      radii: { panel: '1rem', control: '0.75rem' },
    },
  };
  const design = shouldUseStitchAdapter(prompt)
    ? adaptStitchDesign({ direction: baseDesign.direction, screens: baseDesign.screens, visualReferences: baseDesign.visualReferences })
    : baseDesign;

  const data: DataContract = {
    version: 1,
    provider,
    permissions: ['read:own-data', 'write:own-data'],
    entities: [
      {
        name: 'Item',
        fields: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'status', type: 'text', required: true },
        ],
      },
    ],
  };

  const actions: ActionContract = {
    version: 1,
    actions: [
      {
        id: 'create-primary-item',
        name: 'Créer un élément',
        description: 'Créer l’élément central de la mission avec validation utilisateur.',
        requiresAuth: provider === 'supabase',
        connector: provider === 'supabase' ? 'supabase' : undefined,
      },
      {
        id: 'refresh-primary-data',
        name: 'Actualiser les données',
        description: 'Relire l’état de l’application sans perdre le contexte visuel.',
        requiresAuth: provider === 'supabase',
        connector: provider === 'supabase' ? 'supabase' : undefined,
      },
    ],
  };

  const tests: TestContract = {
    version: 1,
    acceptance: [
      { id: 'build', description: 'Le projet se compile sans erreur TypeScript.', kind: 'build' },
      { id: 'primary-route', description: 'La route principale s’ouvre dans la preview.', kind: 'route' },
      { id: 'primary-action', description: 'L’action centrale expose un état de chargement, de succès et d’erreur.', kind: 'interaction' },
      { id: 'responsive', description: 'L’expérience reste lisible sur une largeur mobile.', kind: 'responsive' },
      { id: 'secrets', description: 'Aucun secret serveur n’est inclus dans les fichiers générés.', kind: 'security' },
    ],
  };

  const deploy: DeployContract = {
    version: 1,
    target: 'preview',
    environment: 'test',
    requiredConnectors: connectors.map(String),
    preflight: ['build', 'tests', 'secrets'],
  };

  return { version: 1, brief, design, data, actions, tests, deploy };
}
