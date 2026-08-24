export type DemoPathId = "ninja" | "hunter" | "mage" | "professional";

export type DemoAgent = {
  accent: string;
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
  name: string;
  objective: string;
  reward: string;
};

export type DemoMissionStep = {
  agentIndex: number;
  artifact: string;
  description: string;
  id: string;
  label: string;
};

export const demoPaths: DemoPath[] = [
  {
    accent: "from-sky-400 via-cyan-300 to-violet-500",
    agents: [
      {
        accent: "from-sky-400 to-cyan-500",
        focus: "Découpe la mission et protège l’essentiel.",
        initials: "NI",
        name: "Kairo",
        role: "Stratège de mission",
      },
      {
        accent: "from-violet-400 to-fuchsia-500",
        focus: "Transforme les contraintes en parcours clair.",
        initials: "UX",
        name: "Sena",
        role: "Architecte expérience",
      },
      {
        accent: "from-amber-300 to-orange-500",
        focus: "Livre une première version légère et contrôlée.",
        initials: "BL",
        name: "Rin",
        role: "Builder rapide",
      },
    ],
    description: "Précision, mouvement et itérations courtes pour passer de l’idée à l’action.",
    icon: "crosshair",
    id: "ninja",
    name: "Voie Ninja",
    objective: "Gagner en clarté sans ralentir l’élan.",
    reward: "+120 XP · Focus débloqué",
  },
  {
    accent: "from-emerald-300 via-lime-400 to-amber-400",
    agents: [
      {
        accent: "from-emerald-400 to-lime-500",
        focus: "Repère les opportunités et les risques invisibles.",
        initials: "HU",
        name: "Nyra",
        role: "Éclaireuse produit",
      },
      {
        accent: "from-amber-300 to-orange-500",
        focus: "Compare les options et trace la meilleure piste.",
        initials: "SP",
        name: "Oren",
        role: "Analyste terrain",
      },
      {
        accent: "from-cyan-400 to-blue-500",
        focus: "Teste le parcours avant d’engager plus de ressources.",
        initials: "QA",
        name: "Mika",
        role: "Vérificatrice d’impact",
      },
    ],
    description: "Exploration, décision et validation pour les projets qui demandent du flair.",
    icon: "telescope",
    id: "hunter",
    name: "Voie Hunter",
    objective: "Trouver la piste la plus prometteuse avant de construire.",
    reward: "+140 XP · Radar débloqué",
  },
  {
    accent: "from-fuchsia-400 via-violet-500 to-indigo-500",
    agents: [
      {
        accent: "from-fuchsia-400 to-violet-500",
        focus: "Donne une forme élégante à l’intention initiale.",
        initials: "MG",
        name: "Astra",
        role: "Directrice créative",
      },
      {
        accent: "from-indigo-400 to-blue-500",
        focus: "Compose les systèmes et les interactions qui enchantent.",
        initials: "SY",
        name: "Elio",
        role: "Mage système",
      },
      {
        accent: "from-pink-400 to-rose-500",
        focus: "Vérifie que l’émotion sert réellement l’usage.",
        initials: "CX",
        name: "Luma",
        role: "Gardienne de cohérence",
      },
    ],
    description: "Créativité structurée et expériences mémorables pour les projets ambitieux.",
    icon: "sparkles",
    id: "mage",
    name: "Voie Mage",
    objective: "Transformer une vision en expérience qui marque.",
    reward: "+150 XP · Grimoire débloqué",
  },
  {
    accent: "from-slate-300 via-sky-400 to-teal-400",
    agents: [
      {
        accent: "from-slate-400 to-sky-500",
        focus: "Cadre les priorités, la valeur et les décisions.",
        initials: "PM",
        name: "Ari",
        role: "Pilote de produit",
      },
      {
        accent: "from-teal-400 to-emerald-500",
        focus: "Stabilise l’architecture et les livrables.",
        initials: "EN",
        name: "Noa",
        role: "Ingénieure solution",
      },
      {
        accent: "from-amber-300 to-orange-500",
        focus: "Prépare un passage clair vers la livraison.",
        initials: "OP",
        name: "Tess",
        role: "Responsable opérations",
      },
    ],
    description: "Une voie directe, fiable et structurée pour exécuter comme une équipe produit.",
    icon: "briefcase",
    id: "professional",
    name: "Voie Professionnel",
    objective: "Passer d’un besoin à un plan livrable et mesurable.",
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
    agentIndex: 2,
    artifact: "Contrôle qualité · mission.log",
    description: "Les états essentiels, le mobile et la suite de mission sont vérifiés.",
    id: "review",
    label: "Vérifier et préparer la suite",
  },
];

export function getDemoPath(id: DemoPathId): DemoPath {
  return demoPaths.find((path) => path.id === id) ?? demoPaths[0];
}
