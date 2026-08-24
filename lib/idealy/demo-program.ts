export type DemoPathId = "ninja" | "hunter" | "mage" | "professional";

export type DemoAgent = {
  accent: string;
  avatarUrl: string;
  focus: string;
  initials: string;
  name: string;
  role: string;
};

export type DemoPath = {
  accent: string;
  agents: DemoAgent[];
  description: string;
  icon: "crosshair" | "telescope" | "sparkles" | "briefcase";
  id: DemoPathId;
  incident?: {
    label: string;
    resolvedBy: string;
  };
  name: string;
  objective: string;
  resource: {
    initial: number;
    label: string;
    pauseLabel: string;
    unit: string;
  };
  reward: string;
};

export type DemoMissionStep = {
  agentIndex: number;
  artifact: string;
  description: string;
  id: string;
  label: string;
};

const avatars = {
  forge: "/images/agents/forge.webp",
  guardian: "/images/agents/guardian.webp",
  professional: "/images/agents/daniel.jpg",
  signal: "/images/agents/signal.webp",
  sprint: "/images/agents/sprint.webp",
  strategy: "/images/agents/strategy.webp",
  validation: "/images/agents/validation.webp",
};

export const demoPaths: DemoPath[] = [
  {
    accent: "from-sky-400 via-cyan-300 to-violet-500",
    agents: [
      {
        accent: "from-amber-300 to-orange-500",
        avatarUrl: avatars.sprint,
        focus: "Transforme l’intention en premier mouvement clair.",
        initials: "AR",
        name: "Aro",
        role: "Éclaireur d’élan",
      },
      {
        accent: "from-slate-500 to-cyan-500",
        avatarUrl: avatars.strategy,
        focus: "Découpe la mission et protège l’essentiel.",
        initials: "SO",
        name: "Soren",
        role: "Tacticien de mission",
      },
      {
        accent: "from-rose-400 to-emerald-500",
        avatarUrl: avatars.validation,
        focus: "Valide les choix et préserve la qualité du parcours.",
        initials: "CE",
        name: "Celya",
        role: "Gardienne de validation",
      },
      {
        accent: "from-rose-500 to-violet-600",
        avatarUrl: avatars.guardian,
        focus: "Anticipe les risques avant qu’ils ne ralentissent la mission.",
        initials: "VE",
        name: "Veyr",
        role: "Gardien de fiabilité",
      },
    ],
    description: "Précision, mouvement et itérations courtes pour passer de l’idée à l’action.",
    icon: "crosshair",
    id: "ninja",
    name: "Voie Ninja",
    objective: "Gagner en clarté sans ralentir l’élan.",
    resource: {
      initial: 82,
      label: "Élan de mission",
      pauseLabel: "Pause tactique recommandée",
      unit: "élan",
    },
    reward: "+120 XP · Focus débloqué",
  },
  {
    accent: "from-emerald-300 via-lime-400 to-amber-400",
    agents: [
      {
        accent: "from-cyan-400 to-blue-500",
        avatarUrl: avatars.signal,
        focus: "Repère les opportunités, les signaux et les zones de risque.",
        initials: "LI",
        name: "Lio",
        role: "Éclaireur de signaux",
      },
    ],
    description: "Exploration, décision et validation pour les projets qui demandent du flair.",
    icon: "telescope",
    id: "hunter",
    name: "Voie Hunter",
    objective: "Trouver la piste la plus prometteuse avant de construire.",
    resource: {
      initial: 76,
      label: "Charge d’observation",
      pauseLabel: "Pause de reconnaissance recommandée",
      unit: "signaux",
    },
    reward: "+140 XP · Radar débloqué",
  },
  {
    accent: "from-fuchsia-400 via-violet-500 to-indigo-500",
    agents: [
      {
        accent: "from-orange-400 to-rose-500",
        avatarUrl: avatars.forge,
        focus: "Transforme une vision en expérience expressive et utilisable.",
        initials: "FA",
        name: "Faro",
        role: "Forgeur d’expériences",
      },
    ],
    description: "Créativité structurée et expériences mémorables pour les projets ambitieux.",
    icon: "sparkles",
    id: "mage",
    name: "Voie Mage",
    objective: "Transformer une vision en expérience qui marque.",
    resource: {
      initial: 74,
      label: "Flux créatif",
      pauseLabel: "Pause de recharge créative recommandée",
      unit: "flux",
    },
    reward: "+150 XP · Grimoire débloqué",
  },
  {
    accent: "from-slate-300 via-sky-400 to-teal-400",
    agents: [
      {
        accent: "from-slate-500 to-sky-500",
        avatarUrl: avatars.professional,
        focus: "Cadre les priorités, résout les incidents et protège la livraison.",
        initials: "DA",
        name: "Daniel",
        role: "Pilote d’opérations",
      },
    ],
    description: "Une voie directe, fiable et structurée pour exécuter comme une équipe produit.",
    icon: "briefcase",
    id: "professional",
    incident: {
      label: "Incident de synchronisation simulé",
      resolvedBy: "Daniel isole le blocage, applique le correctif et relance le contrôle.",
    },
    name: "Voie Professionnel",
    objective: "Passer d’un besoin à un plan livrable et mesurable.",
    resource: {
      initial: 88,
      label: "Capacité opératoire",
      pauseLabel: "Pause de diagnostic recommandée",
      unit: "capacité",
    },
    reward: "+110 XP · Tableau de bord débloqué",
  },
];

export const demoMissionSteps: DemoMissionStep[] = [
  {
    agentIndex: 0,
    artifact: "Mission brief · brief.md",
    description: "Le besoin est cadré en objectif, public et résultat attendu.",
    id: "frame",
    label: "Cadrer la mission",
  },
  {
    agentIndex: 1,
    artifact: "Carte d’expérience · journey.tsx",
    description: "Le parcours principal et ses moments de décision sont clarifiés.",
    id: "shape",
    label: "Dessiner le parcours",
  },
  {
    agentIndex: 2,
    artifact: "Première version · app/page.tsx",
    description: "Une interface interactive est préparée pour être explorée dans le canvas.",
    id: "build",
    label: "Construire la première version",
  },
  {
    agentIndex: 3,
    artifact: "Contrôle qualité · mission.log",
    description: "Les états essentiels, le mobile et la suite de mission sont vérifiés.",
    id: "review",
    label: "Vérifier et préparer la suite",
  },
];

export function getDemoPath(id: DemoPathId): DemoPath {
  return demoPaths.find((path) => path.id === id) ?? demoPaths[0];
}

export function getPathAgent(path: DemoPath, missionStep: DemoMissionStep): DemoAgent {
  return path.agents[missionStep.agentIndex % path.agents.length];
}

export function resourceForStep(path: DemoPath, stepIndex: number): number {
  return Math.max(0, path.resource.initial - Math.min(stepIndex, 4) * 20);
}
