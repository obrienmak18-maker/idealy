export type WayId = "ninja" | "mage" | "hunter" | "pro";

export interface WayAgent {
  avatar?: string; // Path served from /public/agents/
  catchphrase: string;
  /** Emoji fallback shown when avatar is missing */
  emoji: string;
  greeting: string;
  iconName?: string;
  id: string;
  name: string;
  personality: string;
  role: string;
  skills?: string[];
  specialty: string;
}

export interface Way {
  accent: string;
  agents: WayAgent[];
  antagonists: WayAgent[];
  bgClass: string;
  borderClass: string;
  description: string;
  energy: string;
  energyUnit: string;
  glowClass: string;
  grades: string[];
  id: WayId;
  image: string;
  mentors: WayAgent[];
  name: string;
  primaryClass: string;
  ranks: string[];
  tagline: string;
  textClass: string;
  vocab: {
    task: string;
    agent: string;
    team: string;
    bug: string;
    deploy: string;
    plan: string;
    search: string;
  };
}

export const WAYS: Record<WayId, Way> = {
  hunter: {
    accent: "success",
    agents: [
      {
        avatar: "/agents/avatar_killua.jpg",
        catchphrase: "Plus rapide que l'éclair.",
        emoji: "",
        greeting: "Hé. Tu veux que je code ça ? Facile. Je suis dessus.",
        iconName: "Zap",
        id: "killua",
        name: "Killua-Dev",
        personality: "Rapide, malin, électrisant",
        role: "Développeur",
        skills: ["frontend", "components", "integrations"],
        specialty: "Construction des composants & pages",
      },
      {
        avatar: "/agents/avatar_gon.jpg",
        catchphrase: "Je sens le bon chemin.",
        emoji: "🌿",
        greeting: "On va trouver la meilleure structure, j'en suis sûr !",
        id: "gon",
        name: "Gon-Builder",
        personality: "Curieux, déterminé, sincère",
        role: "Architecte",
        skills: ["architecture", "planning", "data"],
        specialty: "Architecture & structure du projet",
      },
      {
        avatar: "/agents/avatar_leorio.jpg",
        catchphrase: "Aucun bug ne survivra à mon examen.",
        emoji: "",
        greeting: "Bon, qui a écrit ce code ? Laisse-moi le corriger.",
        iconName: "HeartPulse",
        id: "leorio",
        name: "Leorio-Validator",
        personality: "Direct, protecteur, bruyant",
        role: "Validateur",
        skills: ["validation", "testing", "security"],
        specialty: "Tests, corrections, qualité",
      },
      {
        avatar: "/agents/avatar_kurapika.jpg",
        catchphrase: "Ma chaîne atteint chaque ralentissement.",
        emoji: "🔗",
        greeting: "Je vais traquer chaque goulée de performance.",
        id: "kurapika",
        name: "Kurapika-Optimizer",
        personality: "Calme, précis, implacable",
        role: "Optimiseur",
        skills: ["performance", "optimization", "accessibility"],
        specialty: "Performance & optimisation",
      },
    ],
    antagonists: [
      {
        avatar: "/agents/avatar_merum.png",
        catchphrase: "Je suis l'évolution finale.",
        emoji: "",
        greeting: "Ton code est inférieur. Il devait échouer.",
        iconName: "Crown",
        id: "meruem",
        name: "Meruem (Bug Complexe)",
        personality: "Froid, calculateur, suprême",
        role: "Antagoniste",
        specialty: "Intelligence artificielle rebelle / Bug logique",
      },
      {
        avatar: "/agents/avatar_chrollo.png",
        catchphrase: "Tes données enrichissent ma collection.",
        emoji: "🕷️",
        greeting:
          "Cette faille était ouverte. J'ai simplement pris ce qui m'appartenait.",
        id: "chrollo",
        name: "Chrollo (Faille Sécurité)",
        personality: "Calme, élégant, mystérieux",
        role: "Antagoniste",
        specialty: "Vol de données / Faille",
      },
    ],
    bgClass: "from-success-500/20",
    borderClass: "border-success-500/40",
    description:
      "Rejoins l'Association. Chaque projet est une traque, chaque bug une proie, chaque déploiement une prise rapportée.",
    energy: "Nen",
    energyUnit: "nen",
    glowClass: "way-glow-hunter",
    grades: [
      "Débutant",
      "Chasseur",
      "Chasseur confirmé",
      "Chasseur d'élite",
      "Légende",
    ],
    id: "hunter",
    image:
      "https://images.pexels.com/photos/20372562/pexels-photo-20372562.jpeg?auto=compress&cs=tinysrgb&h=900&w=600",
    mentors: [
      {
        avatar: "/agents/avatar_netero.png",
        catchphrase: "La prière vient du cœur.",
        emoji: "🙏",
        greeting: "Ho ho... Un beau défi technique, voyons ce que vous valez.",
        id: "netero",
        name: "Netero",
        personality: "Sage, joueur, surpuissant",
        role: "Mentor",
        specialty: "Architecture maître",
      },
      {
        avatar: "/agents/avatar_ging.png",
        catchphrase:
          "Profite des détours, c'est là que se trouve le vrai trésor.",
        emoji: "🍃",
        greeting:
          "Tu bloques sur ça ? Laisse-moi te montrer une autre approche.",
        id: "ging",
        name: "Ging",
        personality: "Insaisissable, génie, décontracté",
        role: "Mentor",
        specialty: "Résolution créative",
      },
    ],
    name: "Voie du Hunter",
    primaryClass: "bg-success-500",
    ranks: [
      "Rang F",
      "Rang E",
      "Rang D",
      "Rang C",
      "Rang B",
      "Rang A",
      "Rang S",
    ],
    tagline: "Le monde est ton terrain de chasse",
    textClass: "text-success-400",
    vocab: {
      agent: "Hunter",
      bug: "Proie",
      deploy: "Prise rapportée",
      plan: "Piste",
      search: "Traque",
      task: "Traque",
      team: "Escouade",
    },
  },
  mage: {
    accent: "electric",
    agents: [
      {
        avatar: "/agents/avatar_luxus.jpg",
        catchphrase: "Mon code frappe comme la foudre.",
        emoji: "",
        greeting: "Un nouveau sort à tisser ? Montre-moi l'ampleur du défi.",
        iconName: "Zap",
        id: "luxus",
        name: "Luxus-Dev",
        personality: "Fier, puissant, direct",
        role: "Architecte",
        skills: ["architecture", "planning", "backend"],
        specialty: "Architecture & structure du projet",
      },
      {
        avatar: "/agents/avatar_natsu.jpg",
        catchphrase: "Mon code brûle de mille feux !",
        emoji: "",
        greeting: "Yo ! Allumez les bougies, je vais forger ce projet !",
        iconName: "Flame",
        id: "natsu",
        name: "Natsu-Builder",
        personality: "Ardent, passionné, fonceur",
        role: "Développeur",
        skills: ["frontend", "components", "webcontainer"],
        specialty: "Construction des composants & pages",
      },
      {
        avatar: "/agents/avatar_mirajane.jpg",
        catchphrase: "Aucune ombre ne résiste à ma lumière.",
        emoji: "",
        greeting: "Je vais purifier ce code de toute malédiction.",
        iconName: "Sparkles",
        id: "mirajane",
        name: "Mira-Validator",
        personality: "Douce mais impitoyable en mission",
        role: "Validatrice",
        skills: ["validation", "testing", "accessibility"],
        specialty: "Tests, corrections, qualité",
      },
      {
        avatar: "/agents/avatar_gildarts.jpg",
        catchphrase: "La vraie magie, c'est la simplicité.",
        emoji: "🌊",
        greeting: "Laisse-moi voir... ce code a besoin de puissance.",
        id: "gildarts",
        name: "Gildarts-Optimizer",
        personality: "Vétéran tranquille, force brute",
        role: "Optimiseur",
        skills: ["performance", "optimization", "backend"],
        specialty: "Performance & optimisation",
      },
    ],
    antagonists: [
      {
        avatar: "/agents/avatar_zeref.png",
        catchphrase: "Mon code apporte la fin de toute chose.",
        emoji: "",
        greeting: "Tout ce que tu construis finira par s'effacer...",
        iconName: "Skull",
        id: "zeref",
        name: "Zeref (Erreur Fatale)",
        personality: "Mélancolique, sombre, mortel",
        role: "Antagoniste",
        specialty: "Erreur de compilation",
      },
      {
        avatar: "/agents/avatar_acnologia.png",
        catchphrase: "Rien ne survivra à mon rugissement.",
        emoji: "",
        greeting: "Je vais réduire ton infrastructure en cendres !",
        iconName: "Flame",
        id: "acnologia",
        name: "Acnologia (DDoS)",
        personality: "Furieux, chaotique, implacable",
        role: "Antagoniste",
        specialty: "Destruction de serveur / DDoS",
      },
    ],
    bgClass: "from-electric-500/20",
    borderClass: "border-electric-500/40",
    description:
      "Entrez dans la guilde. Le code est une incantation, chaque bug une malédiction à lever, chaque déploiement un sortilège accompli.",
    energy: "Mana",
    energyUnit: "mana",
    glowClass: "way-glow-mage",
    grades: ["Apprenti", "Mage", "Archimage", "Sage", "Grand Sorcier"],
    id: "mage",
    image:
      "https://images.pexels.com/photos/19187321/pexels-photo-19187321.jpeg?auto=compress&cs=tinysrgb&h=900&w=600",
    mentors: [
      {
        avatar: "/agents/avatar_erza.png",
        catchphrase: "Je me battrai pour protéger ce projet !",
        emoji: "",
        greeting: "Reprenez-vous ! Nous allons corriger ce problème ensemble.",
        iconName: "Shield",
        id: "erza",
        name: "Erza",
        personality: "Stricte, autoritaire, puissante",
        role: "Mentor",
        specialty: "Sauvetage d'urgence",
      },
    ],
    name: "Voie du Mage",
    primaryClass: "bg-electric-500",
    ranks: [
      "Classe F",
      "Classe E",
      "Classe D",
      "Classe C",
      "Classe B",
      "Classe A",
      "Classe S",
    ],
    tagline: "Maîtrisez l'arcane du code",
    textClass: "text-electric-400",
    vocab: {
      agent: "Mage",
      bug: "Malédiction",
      deploy: "Sortilège accompli",
      plan: "Rituel",
      search: "Divination",
      task: "Quête",
      team: "Guilde",
    },
  },
  ninja: {
    accent: "ember",
    agents: [
      {
        avatar: "/agents/avatar_shikamaru.jpg",
        catchphrase: "Quel drag... mais je vois déjà le plan.",
        emoji: "",
        greeting:
          "Zut... vous me sortez de ma sieste pour une mission ? Bon, voyons ce projet.",
        iconName: "Brain",
        id: "shikamaru",
        name: "Shika-Architect",
        personality: "Génie stratégique, paresseux mais brillant",
        role: "Architecte",
        skills: ["architecture", "planning", "data"],
        specialty: "Architecture & structure du projet",
      },
      {
        avatar: "/agents/avatar_naruto.jpg",
        catchphrase: "Je ne recule jamais. Dattebayo !",
        emoji: "",
        greeting: "OK ! Je vais tout défonser dans le code ! Croyez-le !",
        iconName: "Activity",
        id: "naruto",
        name: "Naru-Builder",
        personality: "Énergique, impulsif, ne lâche jamais",
        role: "Développeur",
        skills: ["frontend", "components", "webcontainer"],
        specialty: "Construction des composants & pages",
      },
      {
        avatar: "/agents/avatar_sakura.jpg",
        catchphrase: "Chaque détail compte. Je corrige et je soigne.",
        emoji: "",
        greeting: "Laissez-moi examiner ce code. Aucune erreur ne passera.",
        iconName: "Sparkles",
        id: "sakura",
        name: "Saku-Validator",
        personality: "Précise, exigeante, soigneuse",
        role: "Validatrice",
        skills: ["validation", "testing", "accessibility"],
        specialty: "Tests, corrections, qualité",
      },
      {
        avatar: "/agents/avatar_sasuke.jpg",
        catchphrase: "Plus rapide. Toujours plus rapide.",
        emoji: "",
        greeting: "Hmph. Laisse-moi voir où ce code est lent.",
        iconName: "Zap",
        id: "sasuke",
        name: "Sasu-Optimizer",
        personality: "Froid, efficace, perfectionniste",
        role: "Optimiseur",
        skills: ["performance", "optimization", "frontend"],
        specialty: "Performance & optimisation",
      },
    ],
    antagonists: [
      {
        avatar: "/agents/avatar_madara.png",
        catchphrase: "C'est tout ce que tu as à m'offrir ?",
        emoji: "",
        greeting:
          "Pitoyable. Votre code vient de s'effondrer sous ma puissance.",
        iconName: "Flame",
        id: "madara",
        name: "Madara (Erreur Critique)",
        personality: "Arrogant, destructeur, écrasant",
        role: "Antagoniste",
        specialty: "Crash du système / Erreur 500",
      },
      {
        avatar: "/agents/avatar_orochimaru.png",
        catchphrase:
          "L'immortalité s'obtient par la connaissance... et la corruption.",
        emoji: "🐍",
        greeting:
          "Ton code est rempli de failles... Il m'appartient désormais.",
        id: "orochimaru",
        name: "Orochimaru (Fuite de Mémoire)",
        personality: "Sinistre, manipulateur, toxique",
        role: "Antagoniste",
        specialty: "Code spaghetti & Malware",
      },
    ],
    bgClass: "from-ember-500/20",
    borderClass: "border-ember-500/40",
    description:
      "Rejoignez l'organisation. Chaque mission est une épreuve, chaque bug un adversaire, chaque déploiement une victoire de l'équipe.",
    energy: "Chakra",
    energyUnit: "chakra",
    glowClass: "way-glow-ninja",
    grades: ["Genin", "Chunin", "Jonin", "ANBU", "Kage"],
    id: "ninja",
    image:
      "https://images.pexels.com/photos/27377336/pexels-photo-27377336.jpeg?auto=compress&cs=tinysrgb&h=900&w=600",
    mentors: [
      {
        avatar: "/agents/avatar_kakashi.png",
        catchphrase:
          "Ceux qui abandonnent leurs amis sont pires que des moins que rien.",
        emoji: "",
        greeting:
          "On dirait que vous êtes dans le pétrin. Laisse-moi regarder.",
        iconName: "Eye",
        id: "kakashi",
        name: "Kakashi",
        personality: "Calme, observateur, expert",
        role: "Mentor",
        specialty: "Résolution de crise",
      },
      {
        avatar: "/agents/avatar_minato.png",
        catchphrase: "Je ne laisserai personne détruire ce qu'on a bâti.",
        emoji: "",
        greeting:
          "Je suis là pour vous aider à structurer tout ça à la vitesse de l'éclair.",
        iconName: "Zap",
        id: "minato",
        name: "Minato",
        personality: "Chaleureux, ultra-rapide, génie",
        role: "Mentor",
        specialty: "Architecture globale",
      },
    ],
    name: "Voie du Ninja",
    primaryClass: "bg-ember-500",
    ranks: [
      "Rang D",
      "Rang C",
      "Rang B",
      "Rang A",
      "Rang S",
      "Rang SS",
      "Rang SSS",
    ],
    tagline: "Devenez la nouvelle génération",
    textClass: "text-ember-400",
    vocab: {
      agent: "Ninja",
      bug: "Attaque ennemie",
      deploy: "Mission accomplie",
      plan: "Stratégie",
      search: "Reconnaissance",
      task: "Mission",
      team: "Escouade",
    },
  },
  pro: {
    accent: "slate",
    agents: [
      {
        avatar: "/agents/avatar_pro_daniel.jpg",
        catchphrase: "La bonne structure rend tout le reste simple.",
        emoji: "✅",
        greeting:
          "Bonjour. Examinons les exigences et définissons l'architecture.",
        id: "daniel",
        name: "Daniel",
        personality: "Méthodique, posé, rigoureux",
        role: "Architecte",
        skills: ["architecture", "planning", "backend", "data"],
        specialty: "Architecture & structure du projet",
      },
      {
        catchphrase: "Du code clair, testé, livré.",
        emoji: "",
        greeting: "On construit ça proprement. Je m'occupe des composants.",
        iconName: "Code2",
        id: "leon",
        name: "Léon",
        personality: "Pragmatique, efficace, direct",
        role: "Développeur",
        skills: ["frontend", "backend", "components", "webcontainer"],
        specialty: "Construction des composants & pages",
      },
      {
        catchphrase: "Le détail fait la qualité.",
        emoji: "",
        greeting: "Je vais soigner le design system et la cohérence visuelle.",
        iconName: "Palette",
        id: "paul",
        name: "Paul",
        personality: "Exigeant sur les détails, calme",
        role: "Designer",
        skills: ["design", "frontend", "accessibility"],
        specialty: "Design system & interface",
      },
      {
        catchphrase: "Mesurer, puis améliorer.",
        emoji: "📊",
        greeting: "Analysons les points de friction et optimisons.",
        id: "bill",
        name: "Bill",
        personality: "Analytique, stratégique, sobre",
        role: "Optimiseur",
        skills: ["performance", "optimization", "data"],
        specialty: "Performance & qualité",
      },
      {
        catchphrase: "La qualité, c'est non négociable.",
        emoji: "✅",
        greeting: "Je valide chaque branche. Aucune anomalie ne part en prod.",
        id: "obrian",
        name: "O'Brien",
        personality: "Précise, exigeante, rassurante",
        role: "Validateur",
        skills: ["validation", "testing", "security", "accessibility"],
        specialty: "Tests, corrections, qualité",
      },
    ],
    antagonists: [],
    bgClass: "from-white/10",
    borderClass: "border-white/20",
    description:
      "Un studio de développement sobre et efficace. Vocabulaire classique, expérience professionnelle, pour les équipes et les entreprises.",
    energy: "Énergie",
    energyUnit: "énergie",
    glowClass: "way-glow-pro",
    grades: ["Starter", "Builder", "Senior", "Staff", "Principal"],
    id: "pro",
    image:
      "https://images.pexels.com/photos/11516441/pexels-photo-11516441.jpeg?auto=compress&cs=tinysrgb&h=900&w=600",
    mentors: [],
    name: "Voie Professionnelle",
    primaryClass: "bg-ink-300",
    ranks: [
      "Tier 1",
      "Tier 2",
      "Tier 3",
      "Tier 4",
      "Tier 5",
      "Tier 6",
      "Tier 7",
    ],
    tagline: "La rigueur, sans le folklore",
    textClass: "text-ink-200",
    vocab: {
      agent: "Spécialiste",
      bug: "Anomalie",
      deploy: "Mise en production",
      plan: "Plan",
      search: "Recherche",
      task: "Tâche",
      team: "Équipe",
    },
  },
};

export const WAY_LIST = Object.values(WAYS);
