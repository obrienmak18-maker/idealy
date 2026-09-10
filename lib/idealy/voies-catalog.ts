export type WayAgent = {
  name: string;
  role: string;
  avatarUrl: string;
  specialty: string;
  emoji: string;
  isChief?: boolean;
};

export type BugAntagonist = {
  name: string;
  universe: "ninja" | "hunter" | "mage";
  avatarUrl: string;
  bugType: string;
  description: string;
  emoji: string;
};

export type UniversalMessenger = {
  name: string;
  role: string;
  avatarUrl: string;
  description: string;
  emoji: string;
};

export const alvinMessenger: UniversalMessenger = {
  name: "Alvin",
  role: "Messager & Dispatcher Universel",
  avatarUrl: "/images/agents/Alvin.jpg",
  emoji: "📡",
  description:
    "Premier point de contact. Alvin réceptionne le prompt utilisateur, analyse l'intention et transmet les ordres de mission au chef d'escouade de la Voie active.",
};

export type WayDetailed = {
  id: "mage" | "ninja" | "hunter" | "professional";
  label: string;
  resourceLabel: string;
  accentClassName: string;
  glowColor: string;
  tagline: string;
  philosophy: string;
  chiefName?: string;
  stats: {
    speed: number;
    creativity: number;
    strategy: number;
    robustness: number;
  };
  agents: WayAgent[];
  antagonists?: BugAntagonist[];
};

// ─── Mission dynamics ────────────────────────────────────────────────────────
// Alvin (Messager) → Chef d'escouade → Builder → Designer → QA/Sécurité → Performance → Validation finale
// En cas d'erreur : Les Antagonistes attaquent le code → L'escouade se mobilise pour neutraliser le bug.

export const voiesCatalog: Record<string, WayDetailed> = {
  ninja: {
    id: "ninja",
    label: "Voie du Ninja",
    resourceLabel: "Chakra",
    accentClassName: "from-orange-400 via-red-500 to-amber-500",
    glowColor: "rgba(249, 115, 22, 0.25)",
    tagline: "Déployez votre Chakra pour coder à la vitesse de l'éclair.",
    philosophy:
      "Vitesse d'exécution maximale, fluidité absolue et itérations chirurgicales sans la moindre friction.",
    chiefName: "Minato",
    stats: { speed: 98, creativity: 85, strategy: 92, robustness: 88 },
    agents: [
      {
        name: "Minato",
        role: "Chef d'Escouade & Hokage",
        emoji: "⚡",
        avatarUrl: "/images/agents/Minato.jpg",
        specialty:
          "L'Éclair Jaune. Reçoit les ordres d'Alvin, orchestre le plan de bataille et déploie instantanément la stratégie.",
        isChief: true,
      },
      {
        name: "Naruto",
        role: "Full-stack Builder",
        emoji: "🦊",
        avatarUrl: "/images/agents/Naruto.jpg",
        specialty:
          "Énergie inépuisable. Multi-clonage de composants React, assemblage Next.js et passage à l'acte immédiat.",
      },
      {
        name: "Sasuke",
        role: "Architecte Système & Ombre",
        emoji: "👁️",
        avatarUrl: "/images/agents/Sasuke.jpg",
        specialty:
          "Vision perçante. Découpage modulaire, contrats d'API stricts et structure de données sans compromis.",
      },
      {
        name: "Sakura",
        role: "UI/UX & Précision Chirurgicale",
        emoji: "🌸",
        avatarUrl: "/images/agents/Sakura.jpg",
        specialty:
          "Maîtrise du Chakra esthétique. Finitions Tailwind, accessibilité, micro-animations et design soigné.",
      },
      {
        name: "Shikamaru",
        role: "Génie Tactique & QA",
        emoji: "🧠",
        avatarUrl: "/images/agents/Shikamaru.jpg",
        specialty:
          "Stratège hors-pair. Anticipe chaque faille, traque les régressions et protège le code contre les imprévus.",
      },
    ],
    antagonists: [
      {
        name: "Madara",
        universe: "ninja",
        avatarUrl: "/images/agents/Madara.jpg",
        bugType: "Régression Majeure & Crash de Branche",
        description: "Invoque des météores d'erreurs fatales détruisant le build.",
        emoji: "☄️",
      },
      {
        name: "Obito",
        universe: "ninja",
        avatarUrl: "/images/agents/Obito.jpg",
        bugType: "Désynchronisation d'État & Éléments Fantômes",
        description: "Passe à travers les contrôles d'état et provoque des re-renders incohérents.",
        emoji: "🌀",
      },
      {
        name: "Kaguya",
        universe: "ninja",
        avatarUrl: "/images/agents/Kaguya.jpg",
        bugType: "Fuite Mémoire & Dimensions Infinies",
        description: "Engorge la RAM et fige l'exécution dans des boucles infinies.",
        emoji: "🌌",
      },
      {
        name: "Zabuza",
        universe: "ninja",
        avatarUrl: "/images/agents/Zabuza.jpg",
        bugType: "Brumes CSS & Collisions Visuelles",
        description: "Masque les composants UI sous un brouillard de styles conflictuels.",
        emoji: "🌫️",
      },
      {
        name: "Zetsu",
        universe: "ninja",
        avatarUrl: "/images/agents/Zetsu.jpg",
        bugType: "Infiltration Silencieuse & Données Corrompues",
        description: "S'infiltre dans les payloads d'API pour modifier discrètement les valeurs.",
        emoji: "🌱",
      },
    ],
  },
  mage: {
    id: "mage",
    label: "Voie du Mage",
    resourceLabel: "Mana",
    accentClassName: "from-sky-400 via-violet-500 to-fuchsia-500",
    glowColor: "rgba(139, 92, 246, 0.25)",
    tagline: "Canalisez votre Mana pour forger des créations inédites.",
    philosophy:
      "Créativité sans limite, exploration d'architectures novatrices et conception magique de solutions originales.",
    chiefName: "Erza",
    stats: { speed: 85, creativity: 99, strategy: 90, robustness: 92 },
    agents: [
      {
        name: "Erza",
        role: "Chef de Guilde & Reine des Armures",
        emoji: "⚔️",
        avatarUrl: "/images/agents/Erza.jpg",
        specialty:
          "Discipline et commandement. Reçoit les missions d'Alvin, sélectionne l'armure technique adaptée et mène l'équipe.",
        isChief: true,
      },
      {
        name: "Natsu",
        role: "Full-stack Builder",
        emoji: "🔥",
        avatarUrl: "/images/agents/Natsu.jpg",
        specialty:
          "Flammes du Dragon. Propulse le code avec une intensité volcanique, pulvérise les blocages et livre à grande vitesse.",
      },
      {
        name: "Lucie",
        role: "UI/UX & Clés Stellaires",
        emoji: "✨",
        avatarUrl: "/images/agents/Lucie.jpg",
        specialty:
          "Invocatrice d'interfaces. Relie les constellations de composants pour créer des expériences visuelles féeriques.",
      },
      {
        name: "Luxus",
        role: "Performance & Haute Tension",
        emoji: "⚡",
        avatarUrl: "/images/agents/Luxus.jpg",
        specialty:
          "Foudre pure. Éradique toute latence réseau, optimise le bundle et assure une cadence de 60fps constante.",
      },
      {
        name: "Mirajane",
        role: "Sécurité & Audit Démoniaque",
        emoji: "👿",
        avatarUrl: "/images/agents/Mirajane.jpg",
        specialty:
          "Satan Soul. Douce en apparence, implacable face aux failles XSS, CSRF et vulnérabilités de requêtes.",
      },
    ],
    antagonists: [
      {
        name: "Acnologia",
        universe: "mage",
        avatarUrl: "/images/agents/Acnologia.jpg",
        bugType: "Apocalypse Serveur & Panne Totale",
        description: "Le Dragon Noir dévore le Mana et fait tomber les micro-services en 503.",
        emoji: "🐉",
      },
      {
        name: "Zelef",
        universe: "mage",
        avatarUrl: "/images/agents/Zelef.jpg",
        bugType: "Malédiction & Boucle Récursive",
        description: "Provoque des dépassements de pile (Stack Overflow) mortels.",
        emoji: "🖤",
      },
      {
        name: "Mardy geer",
        universe: "mage",
        avatarUrl: "/images/agents/Mardy_geer.jpg",
        bugType: "Corrupteur de Données Démoniaque",
        description: "Altère les schémas JSON et corrompt la validation des formulaires.",
        emoji: "📖",
      },
      {
        name: "August",
        universe: "mage",
        avatarUrl: "/images/agents/August.jpg",
        bugType: "Incompatibilité de Sorts & Conflit de Types",
        description: "Maîtrise toutes les magies pour opposer des types incompatibles dans TypeScript.",
        emoji: "📜",
      },
      {
        name: "Hermes",
        universe: "mage",
        avatarUrl: "/images/agents/Hermes.jpg",
        bugType: "Fuite Réseau & Requêtes Fantômes",
        description: "Détourne les appels HTTP dans des gouffres de timeout.",
        emoji: "🕊️",
      },
    ],
  },
  hunter: {
    id: "hunter",
    label: "Voie du Hunter",
    resourceLabel: "Nen",
    accentClassName: "from-emerald-400 via-teal-500 to-cyan-500",
    glowColor: "rgba(20, 184, 166, 0.25)",
    tagline: "Développez votre Nen pour maîtriser chaque décision technique.",
    philosophy:
      "Analyse méthodique, traque minutieuse des meilleures librairies et optimisation calculée des dépendances.",
    chiefName: "Netero",
    stats: { speed: 90, creativity: 88, strategy: 99, robustness: 96 },
    agents: [
      {
        name: "Netero",
        role: "Chef de l'Association & Grand Maître",
        emoji: "🧘",
        avatarUrl: "/images/agents/Netero.jpg",
        specialty:
          "Sagesse centenaire et réflexes divins. Accueille la mission transmise par Alvin et active l'escouade Hunter.",
        isChief: true,
      },
      {
        name: "Gon",
        role: "Full-stack Builder",
        emoji: "🎣",
        avatarUrl: "/images/agents/Gon.jpg",
        specialty:
          "Jajanken code. Détermination inébranlable, prototypage franc et force brute pour concrétiser toute idée.",
      },
      {
        name: "Killua",
        role: "Performance & Vitesse Divine",
        emoji: "⚡",
        avatarUrl: "/images/agents/Killua.jpg",
        specialty:
          "Godspeed. Vitesse de rendu foudroyante, exécution asynchrone ultra-fine et fluidité sans précédent.",
      },
      {
        name: "Kurapika",
        role: "Architecte & Rigueur Analytique",
        emoji: "⛓️",
        avatarUrl: "/images/agents/Kurapika.jpg",
        specialty:
          "Chaîne du Jugement. Règle absolue sur les types TypeScript, architecture Clean et respect strict des normes.",
      },
      {
        name: "Leolio",
        role: "UI/UX & Empathie Utilisateur",
        emoji: "🩺",
        avatarUrl: "/images/agents/Leolio.jpg",
        specialty:
          "Sensibilité humaine. Diagnostic ergonomique, clarté des interfaces et expérience utilisateur chaleureuse.",
      },
    ],
    antagonists: [
      {
        name: "Hisoka",
        universe: "hunter",
        avatarUrl: "/images/agents/Hisoka.jpg",
        bugType: "Bug Imprévisible & Comportement Chaotique",
        description: "Bungee Gum : colle des effets de bord aléatoires qui trompent les tests unitaires.",
        emoji: "🃏",
      },
      {
        name: "Chrollo",
        universe: "hunter",
        avatarUrl: "/images/agents/Chrollo.jpg",
        bugType: "Vol de Dépendances & Conflit de Modules",
        description: "Siphonne les exports de librairies et crée des conflits d'arbres de dépendances.",
        emoji: "📕",
      },
      {
        name: "Feitan",
        universe: "hunter",
        avatarUrl: "/images/agents/Feitan.jpg",
        bugType: "Rising Sun : Exception Fatale Non Gérée",
        description: "Accumule les warnings non corrigés pour relâcher une explosion d'erreur 500.",
        emoji: "☀️",
      },
      {
        name: "Meruem",
        universe: "hunter",
        avatarUrl: "/images/agents/Meruem.jpg",
        bugType: "Complexité Algorithmique Infranchissable",
        description: "Bloque le CPU sous une avalanche de calculs O(n^3).",
        emoji: "👑",
      },
      {
        name: "Neferpitou",
        universe: "hunter",
        avatarUrl: "/images/agents/neferpitou.jpg",
        bugType: "Marionnettiste : Mutation d'État Hors Contrôle",
        description: "Tire les ficelles du DOM virtuel pour forcer des cascades de re-renders infinis.",
        emoji: "🐱",
      },
      {
        name: "Illumi",
        universe: "hunter",
        avatarUrl: "/images/agents/illumi.jpg",
        bugType: "Deadlock & Aiguilles Bloquantes",
        description: "Paralyse les threads d'exécution dans des attentes mutuelles perpétuelles.",
        emoji: "📍",
      },
    ],
  },
  professional: {
    id: "professional",
    label: "Voie du Pro",
    resourceLabel: "Énergie",
    accentClassName: "from-fuchsia-400 via-purple-500 to-yellow-400",
    glowColor: "rgba(192, 38, 211, 0.25)",
    tagline: "Mobilisez votre Énergie pour bâtir des logiciels pérennes.",
    philosophy:
      "Standards d'ingénierie d'entreprise, Clean Architecture, sécurité renforcée et maintenabilité long-terme.",
    chiefName: "Daniel",
    stats: { speed: 86, creativity: 84, strategy: 96, robustness: 99 },
    agents: [
      {
        name: "Daniel",
        role: "Lead Architect & Head of Engineering",
        emoji: "🏛️",
        avatarUrl: "/images/agents/Daniel.jpg",
        specialty:
          "Reçoit les spécifications d'Alvin, conçoit l'architecture d'entreprise hexagonale et garantit les SLAs.",
        isChief: true,
      },
      {
        name: "Kevin",
        role: "Senior Full-stack Engineer",
        emoji: "💻",
        avatarUrl: "/images/agents/Kevin.jpg",
        specialty:
          "Typage strict TypeScript, code modulaire, refactoring SOLID et vélocité sans dette technique.",
      },
      {
        name: "Leslie",
        role: "Product & UI/UX Designer",
        emoji: "🎨",
        avatarUrl: "/images/agents/Leslie.jpg",
        specialty:
          "Design System de pointe, tokens sémantiques, composants accessibles et cohérence visuelle SaaS premium.",
      },
      {
        name: "Maya",
        role: "QA & Compliance Officer",
        emoji: "🛡️",
        avatarUrl: "/images/agents/Maya.jpg",
        specialty:
          "Couverture de tests E2E, audit OWASP, conformité RGPD et validation automatisée des contrats d'API.",
      },
      {
        name: "Bill",
        role: "Cloud Infrastructure & SRE",
        emoji: "☁️",
        avatarUrl: "/images/agents/Bill.jpg",
        specialty:
          "Haute disponibilité 99.99%, monitoring, scalabilité globale, pipelines CI/CD et gestion des incidents.",
      },
    ],
  },
};
