export type DemoPathId = "ninja" | "hunter" | "mage" | "professional";

export type DemoAgent = {
  accent: string;
  avatarUrl?: string;
  focus: string;
  initials: string;
  name: string;
  role: string;
  specialty: string;
};

export type DemoPath = {
  accent: string;
  agents: DemoAgent[];
  description: string;
  icon: "crosshair" | "telescope" | "sparkles" | "briefcase";
  id: DemoPathId;
  incident?: { label: string; resolvedBy: string };
  levels?: Array<{
    objective: string;
    signal: string;
    title: string;
  }>;
  name: string;
  objective: string;
  resource: { initial: number; label: string; pauseLabel: string; unit: string };
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
  acnologia: "/images/agents/mage/avatar_acnologia.webp",
  chrollo: "/images/agents/hunter/avatar_chrollo.webp",
  daniel: "/images/agents/professional/avatar_pro_daniel_1785476092067.webp",
  erza: "/images/agents/mage/avatar_erza.webp",
  ging: "/images/agents/hunter/avatar_ging.webp",
  gon: "/images/agents/hunter/avatar_killua_1785476072772.webp",
  kakashi: "/images/agents/ninja/avatar_kakashi.webp",
  madara: "/images/agents/ninja/avatar_madara.webp",
  merum: "/images/agents/hunter/avatar_merum.webp",
  minato: "/images/agents/ninja/avatar_minato.webp",
  naruto: "/images/agents/ninja/avatar_naruto_1785475981229.webp",
  natsu: "/images/agents/mage/avatar_natsu_1785476052551.webp",
  netero: "/images/agents/hunter/avatar_netero.webp",
  orochimaru: "/images/agents/ninja/avatar_orochimaru.webp",
  sakura: "/images/agents/ninja/avatar_sakura_1785476007719.webp",
  sasuke: "/images/agents/ninja/avatar_sasuke_1785476032417.webp",
  shikamaru: "/images/agents/ninja/avatar_shikamaru_1785475953727.webp",
  zeref: "/images/agents/mage/avatar_zeref.webp",
};

export const demoPaths: DemoPath[] = [
  {
    accent: "from-sky-400 via-cyan-300 to-violet-500",
    agents: [
      { accent: "from-amber-300 to-orange-500", avatarUrl: avatars.naruto, focus: "Déclenche l’élan et transforme l’intention en action.", initials: "NA", name: "Naruto", role: "Pilote d’élan", specialty: "Impulsion chakra" },
      { accent: "from-slate-500 to-cyan-500", avatarUrl: avatars.shikamaru, focus: "Découpe la mission et anticipe les chemins critiques.", initials: "SH", name: "Shikamaru", role: "Stratège de mission", specialty: "Tactique ombre" },
      { accent: "from-rose-400 to-emerald-500", avatarUrl: avatars.sakura, focus: "Valide les choix et remet l’équipe d’aplomb quand une étape fatigue le parcours.", initials: "SA", name: "Sakura", role: "Gardienne de qualité", specialty: "Soin de mission" },
      { accent: "from-rose-500 to-violet-600", avatarUrl: avatars.sasuke, focus: "Sécurise les choix sensibles et coupe les régressions avant livraison.", initials: "SS", name: "Sasuke", role: "Gardien de précision", specialty: "Foudre de contrôle" },
      { accent: "from-slate-300 to-indigo-500", avatarUrl: avatars.kakashi, focus: "Relit les décisions critiques et transforme l’expérience en raccourcis fiables.", initials: "KA", name: "Kakashi", role: "Mentor technique", specialty: "Lecture de patterns" },
      { accent: "from-yellow-300 to-sky-500", avatarUrl: avatars.minato, focus: "Accélère les passages entre les étapes et débloque les goulots.", initials: "MI", name: "Minato", role: "Accélérateur de flux", specialty: "Déplacement éclair" },
      { accent: "from-red-500 to-violet-700", avatarUrl: avatars.madara, focus: "Met la stratégie sous tension afin de révéler les angles morts du plan.", initials: "MA", name: "Madara", role: "Test de résilience", specialty: "Pression stratégique" },
      { accent: "from-emerald-400 to-violet-500", avatarUrl: avatars.orochimaru, focus: "Explore les voies non conventionnelles et propose des pistes expérimentales.", initials: "OR", name: "Orochimaru", role: "Chercheur expérimental", specialty: "Recherche avancée" },
    ],
    description: "Précision, mouvement et itérations courtes pour passer de l’idée à l’action.",
    icon: "crosshair",
    id: "ninja",
    name: "Voie Ninja",
    objective: "Gagner en clarté sans ralentir l’élan.",
    resource: { initial: 82, label: "Chakra de mission", pauseLabel: "Pause tactique recommandée", unit: "chakra" },
    reward: "+120 XP · Focus débloqué",
  },
  {
    accent: "from-emerald-300 via-lime-400 to-amber-400",
    agents: [
      { accent: "from-cyan-400 to-blue-500", avatarUrl: avatars.gon, focus: "Poursuit l’objectif, garde l’élan et rend les choix visibles.", initials: "GO", name: "Gon", role: "Éclaireur de piste", specialty: "Nen de découverte" },
      { accent: "from-slate-300 to-cyan-500", avatarUrl: avatars.ging, focus: "Trouve les indices faibles et les raccourcis qui font avancer l’enquête.", initials: "GI", name: "Ging", role: "Explorateur de signaux", specialty: "Nen d’exploration" },
      { accent: "from-amber-400 to-rose-500", avatarUrl: avatars.merum, focus: "Met les hypothèses à l’épreuve avec des questions de niveau expert.", initials: "ME", name: "Merum", role: "Arbitre de décisions", specialty: "Nen de confrontation" },
      { accent: "from-emerald-400 to-amber-500", avatarUrl: avatars.netero, focus: "Valide les étapes importantes avant que l’équipe n’engage davantage de ressources.", initials: "NE", name: "Netero", role: "Maître de validation", specialty: "Nen de maîtrise" },
      { accent: "from-violet-400 to-slate-700", avatarUrl: avatars.chrollo, focus: "Compare des méthodes opposées pour enrichir les solutions disponibles.", initials: "CH", name: "Chrollo", role: "Analyste de méthodes", specialty: "Nen d’analyse" },
    ],
    description: "Exploration, décision et validation pour les projets qui demandent du flair.",
    icon: "telescope",
    id: "hunter",
    name: "Voie Hunter",
    objective: "Trouver la piste la plus prometteuse avant de construire.",
    resource: { initial: 76, label: "Nen d’analyse", pauseLabel: "Pause de reconnaissance recommandée", unit: "nen" },
    reward: "+140 XP · Radar débloqué",
  },
  {
    accent: "from-fuchsia-400 via-violet-500 to-indigo-500",
    agents: [
      { accent: "from-orange-400 to-rose-500", avatarUrl: avatars.natsu, focus: "Transforme une vision en première version expressive et utilisable.", initials: "NA", name: "Natsu", role: "Forgeur d’expériences", specialty: "Mana de feu créatif" },
      { accent: "from-red-400 to-sky-500", avatarUrl: avatars.erza, focus: "Change d’outillage quand la mission demande une autre forme de protection.", initials: "ER", name: "Erza", role: "Gardienne de structure", specialty: "Mana d’armure" },
      { accent: "from-indigo-500 to-violet-700", avatarUrl: avatars.zeref, focus: "Analyse les conséquences longues et les zones de fragilité de l’expérience.", initials: "ZE", name: "Zeref", role: "Analyste de risques", specialty: "Mana d’équilibre" },
      { accent: "from-cyan-400 to-violet-700", avatarUrl: avatars.acnologia, focus: "Pousse la solution à ses limites pour vérifier qu’elle résiste à la complexité.", initials: "AC", name: "Acnologia", role: "Épreuve de résilience", specialty: "Mana de stress-test" },
    ],
    description: "Créativité structurée et expériences mémorables pour les projets ambitieux.",
    icon: "sparkles",
    id: "mage",
    name: "Voie Mage",
    objective: "Transformer une vision en expérience qui marque.",
    resource: { initial: 74, label: "Mana de forge", pauseLabel: "Pause de recharge créative recommandée", unit: "mana" },
    reward: "+150 XP · Grimoire débloqué",
  },
  {
    accent: "from-slate-300 via-sky-400 to-teal-400",
    agents: [
      { accent: "from-slate-500 to-sky-500", avatarUrl: avatars.daniel, focus: "Cadre les priorités, résout les incidents et protège la livraison.", initials: "DA", name: "Daniel", role: "Pilote d’opérations", specialty: "Diagnostic & livraison" },
      { accent: "from-violet-500 to-fuchsia-500", focus: "Traduit le signal utilisateur en priorité nette et maintient le cap produit pendant l’incident.", initials: "MB", name: "Maya Brooks", role: "Lead produit", specialty: "Triage & décisions" },
      { accent: "from-emerald-500 to-cyan-500", focus: "Mesure l’impact, isole les dépendances fragiles et définit le garde-fou qui évite le retour du bug.", initials: "JR", name: "Jordan Reed", role: "Ingénieur fiabilité", specialty: "Observabilité & garde-fous" },
      { accent: "from-orange-500 to-rose-500", focus: "Répare le flux affecté, prépare une remise en service progressive et documente le rollback.", initials: "EC", name: "Ethan Cole", role: "Ingénieur intégration", specialty: "Remédiation & release" },
      { accent: "from-amber-400 to-slate-600", focus: "Vérifie les scénarios critiques, confirme la résolution et transforme le retour d’incident en apprentissage exploitable.", initials: "AM", name: "Avery Morgan", role: "Analyste qualité", specialty: "Validation & post-mortem" },
    ],
    description: "Une voie d’exécution orientée opérations : signaler, contenir, corriger, valider et apprendre d’un incident.",
    icon: "briefcase",
    id: "professional",
    incident: { label: "Incident de synchronisation simulé", resolvedBy: "L’escouade applique un triage, une remédiation et une validation progressive. La démonstration ne modifie aucune donnée réelle." },
    levels: [
      { title: "Niveau 1 · Triage", objective: "Rendre le signal exploitable en moins de cinq minutes.", signal: "Impact qualifié · périmètre identifié" },
      { title: "Niveau 2 · Confinement", objective: "Réduire le risque sans masquer le diagnostic.", signal: "Dépendance isolée · retour arrière prêt" },
      { title: "Niveau 3 · Remédiation", objective: "Livrer le correctif minimal et vérifiable.", signal: "Correctif préparé · contrôle de régression" },
      { title: "Niveau 4 · Validation", objective: "Confirmer le rétablissement avec des scénarios réels.", signal: "Parcours critique validé · monitoring stable" },
      { title: "Niveau 5 · Passage de relais", objective: "Transformer l’incident en amélioration durable.", signal: "Post-mortem prêt · action préventive assignée" },
    ],
    name: "Voie Professionnel",
    objective: "Passer d’un besoin à un plan livrable et mesurable.",
    resource: { initial: 88, label: "Capacité opératoire", pauseLabel: "Pause de diagnostic recommandée", unit: "capacité" },
    reward: "+110 XP · Tableau de bord débloqué",
  },
];

export const demoMissionSteps: DemoMissionStep[] = [
  { agentIndex: 0, artifact: "Mission brief · brief.md", description: "Le besoin est cadré en objectif, public et résultat attendu.", id: "frame", label: "Cadrer la mission" },
  { agentIndex: 1, artifact: "Carte d’expérience · journey.tsx", description: "Le parcours principal et ses moments de décision sont clarifiés.", id: "shape", label: "Dessiner le parcours" },
  { agentIndex: 2, artifact: "Première version · app/page.tsx", description: "Une interface interactive est préparée pour être explorée dans le canvas.", id: "build", label: "Construire la première version" },
  { agentIndex: 3, artifact: "Contrôle qualité · mission.log", description: "Les états essentiels, le mobile et la suite de mission sont vérifiés.", id: "review", label: "Vérifier et préparer la suite" },
  { agentIndex: 4, artifact: "Passage de relais · release.md", description: "Les décisions, garde-fous et prochaines améliorations sont consignés avant la livraison.", id: "handoff", label: "Transmettre et apprendre" },
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
