export type WayId = 'ninja' | 'mage' | 'hunter' | 'pro';

export interface WayAgent {
  id: string;
  name: string;
  role: string;
  specialty: string;
  personality: string;
  greeting: string;
  catchphrase: string;
  avatar?: string; // Path to AI-generated portrait
}

export interface Way {
  id: WayId;
  name: string;
  tagline: string;
  description: string;
  energy: string;
  energyUnit: string;
  ranks: string[];
  grades: string[];
  accent: string;
  glowClass: string;
  primaryClass: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  image: string;
  agents: WayAgent[];
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
  ninja: {
    id: 'ninja',
    name: 'Voie du Ninja',
    tagline: 'Devenez la nouvelle génération',
    description:
      "Rejoignez l'organisation. Chaque mission est une épreuve, chaque bug un adversaire, chaque déploiement une victoire de l'équipe.",
    energy: 'Chakra',
    energyUnit: 'chakra',
    ranks: ['Rang D', 'Rang C', 'Rang B', 'Rang A', 'Rang S', 'Rang SS', 'Rang SSS'],
    grades: ['Genin', 'Chunin', 'Jonin', 'ANBU', 'Kage'],
    accent: 'ember',
    glowClass: 'way-glow-ninja',
    primaryClass: 'bg-ember-500',
    textClass: 'text-ember-400',
    borderClass: 'border-ember-500/40',
    bgClass: 'from-ember-500/20',
    image:
      'https://images.pexels.com/photos/27377336/pexels-photo-27377336.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    vocab: {
      task: 'Mission',
      agent: 'Ninja',
      team: 'Escouade',
      bug: 'Attaque ennemie',
      deploy: 'Mission accomplie',
      plan: 'Stratégie',
      search: 'Reconnaissance',
    },
    agents: [
      {
        id: 'shikamaru',
        name: 'Shika-Architect',
        role: 'Architecte',
        specialty: 'Architecture & structure du projet',
        personality: 'Génie stratégique, paresseux mais brillant',
        greeting: 'Zut... vous me sortez de ma sieste pour une mission ? Bon, voyons ce projet.',
        catchphrase: 'Quel drag... mais je vois déjà le plan.',
        avatar: '/agents/avatar_shikamaru_1785475953727.jpg',
      },
      {
        id: 'naruto',
        name: 'Naru-Builder',
        role: 'Développeur',
        specialty: 'Construction des composants & pages',
        personality: 'Énergique, impulsif, ne lâche jamais',
        greeting: 'OK ! Je vais tout défonser dans le code ! Croyez-le !',
        catchphrase: 'Je ne recule jamais. Dattebayo !',
        avatar: '/agents/avatar_naruto_1785475981229.jpg',
      },
      {
        id: 'sakura',
        name: 'Saku-Validator',
        role: 'Validatrice',
        specialty: 'Tests, corrections, qualité',
        personality: 'Précise, exigeante, soigneuse',
        greeting: 'Laissez-moi examiner ce code. Aucune erreur ne passera.',
        catchphrase: 'Chaque détail compte. Je corrige et je soigne.',
        avatar: '/agents/avatar_sakura_1785476007719.jpg',
      },
      {
        id: 'sasuke',
        name: 'Sasu-Optimizer',
        role: 'Optimiseur',
        specialty: 'Performance & optimisation',
        personality: 'Froid, efficace, perfectionniste',
        greeting: 'Hmph. Laisse-moi voir où ce code est lent.',
        catchphrase: 'Plus rapide. Toujours plus rapide.',
        avatar: '/agents/avatar_sasuke_1785476032417.jpg',
      },
    ],
  },
  mage: {
    id: 'mage',
    name: 'Voie du Mage',
    tagline: 'Maîtrisez l\'arcane du code',
    description:
      "Entrez dans la guilde. Le code est une incantation, chaque bug une malédiction à lever, chaque déploiement un sortilège accompli.",
    energy: 'Mana',
    energyUnit: 'mana',
    ranks: ['Classe F', 'Classe E', 'Classe D', 'Classe C', 'Classe B', 'Classe A', 'Classe S'],
    grades: ['Apprenti', 'Mage', 'Archimage', 'Sage', 'Grand Sorcier'],
    accent: 'electric',
    glowClass: 'way-glow-mage',
    primaryClass: 'bg-electric-500',
    textClass: 'text-electric-400',
    borderClass: 'border-electric-500/40',
    bgClass: 'from-electric-500/20',
    image:
      'https://images.pexels.com/photos/19187321/pexels-photo-19187321.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    vocab: {
      task: 'Quête',
      agent: 'Mage',
      team: 'Guilde',
      bug: 'Malédiction',
      deploy: 'Sortilège accompli',
      plan: 'Rituel',
      search: 'Divination',
    },
    agents: [
      {
        id: 'luxus',
        name: 'Luxus-Dev',
        role: 'Architecte',
        specialty: 'Architecture & structure du projet',
        personality: 'Fier, puissant, direct',
        greeting: 'Un nouveau sort à tisser ? Montre-moi l\'ampleur du défi.',
        catchphrase: 'Mon code frappe comme la foudre.',
      },
      {
        id: 'natsu',
        name: 'Natsu-Builder',
        role: 'Développeur',
        specialty: 'Construction des composants & pages',
        personality: 'Ardent, passionné, fonceur',
        greeting: 'Yo ! Allumez les bougies, je vais forger ce projet !',
        catchphrase: 'Mon code brûle de mille feux !',
        avatar: '/agents/avatar_natsu_1785476052551.jpg',
      },
      {
        id: 'mirajane',
        name: 'Mira-Validator',
        role: 'Validatrice',
        specialty: 'Tests, corrections, qualité',
        personality: 'Douce mais impitoyable en mission',
        greeting: 'Je vais purifier ce code de toute malédiction.',
        catchphrase: 'Aucune ombre ne résiste à ma lumière.',
      },
      {
        id: 'gildarts',
        name: 'Gildarts-Optimizer',
        role: 'Optimiseur',
        specialty: 'Performance & optimisation',
        personality: 'Vétéran tranquille, force brute',
        greeting: 'Laisse-moi voir... ce code a besoin de puissance.',
        catchphrase: 'La vraie magie, c\'est la simplicité.',
      },
    ],
  },
  hunter: {
    id: 'hunter',
    name: 'Voie du Hunter',
    tagline: 'Le monde est ton terrain de chasse',
    description:
      "Rejoins l'Association. Chaque projet est une traque, chaque bug une proie, chaque déploiement une prise rapportée.",
    energy: 'Nen',
    energyUnit: 'nen',
    ranks: ['Rang F', 'Rang E', 'Rang D', 'Rang C', 'Rang B', 'Rang A', 'Rang S'],
    grades: ['Débutant', 'Chasseur', 'Chasseur confirmé', 'Chasseur d\'élite', 'Légende'],
    accent: 'success',
    glowClass: 'way-glow-hunter',
    primaryClass: 'bg-success-500',
    textClass: 'text-success-400',
    borderClass: 'border-success-500/40',
    bgClass: 'from-success-500/20',
    image:
      'https://images.pexels.com/photos/20372562/pexels-photo-20372562.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    vocab: {
      task: 'Traque',
      agent: 'Hunter',
      team: 'Escouade',
      bug: 'Proie',
      deploy: 'Prise rapportée',
      plan: 'Piste',
      search: 'Traque',
    },
    agents: [
      {
        id: 'killua',
        name: 'Killua-Dev',
        role: 'Développeur',
        specialty: 'Construction des composants & pages',
        personality: 'Rapide, malin, électrisant',
        greeting: 'Hé. Tu veux que je code ça ? Facile. Je suis dessus.',
        catchphrase: 'Plus rapide que l\'éclair.',
        avatar: '/agents/avatar_killua_1785476072772.jpg',
      },
      {
        id: 'gon',
        name: 'Gon-Builder',
        role: 'Architecte',
        specialty: 'Architecture & structure du projet',
        personality: 'Curieux, déterminé, sincère',
        greeting: 'On va trouver la meilleure structure, j\'en suis sûr !',
        catchphrase: 'Je sens le bon chemin.',
        avatar: '/agents/avatar_gon_1785476082772.jpg',
      },
      {
        id: 'leorio',
        name: 'Leorio-Validator',
        role: 'Validatrice',
        specialty: 'Tests, corrections, qualité',
        personality: 'Direct, protecteur, bruyant',
        greeting: 'Bon, qui a écrit ce code ? Laisse-moi le corriger.',
        catchphrase: 'Aucun bug ne survivra à mon examen.',
        avatar: '/agents/avatar_leorio_1785476092772.jpg',
      },
      {
        id: 'kurapika',
        name: 'Kurapika-Optimizer',
        role: 'Optimiseur',
        specialty: 'Performance & optimisation',
        personality: 'Calme, précis, implacable',
        greeting: 'Je vais traquer chaque goulée de performance.',
        catchphrase: 'Ma chaîne atteint chaque ralentissement.',
        avatar: '/agents/avatar_kurapika_1785476102772.jpg',
      },
    ],
  },
  pro: {
    id: 'pro',
    name: 'Voie Professionnelle',
    tagline: 'La rigueur, sans le folklore',
    description:
      "Un studio de développement sobre et efficace. Vocabulaire classique, expérience professionnelle, pour les équipes et les entreprises.",
    energy: 'Énergie',
    energyUnit: 'énergie',
    ranks: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6', 'Tier 7'],
    grades: ['Starter', 'Builder', 'Senior', 'Staff', 'Principal'],
    accent: 'slate',
    glowClass: 'way-glow-pro',
    primaryClass: 'bg-ink-300',
    textClass: 'text-ink-200',
    borderClass: 'border-white/20',
    bgClass: 'from-white/10',
    image:
      'https://images.pexels.com/photos/11516441/pexels-photo-11516441.jpeg?auto=compress&cs=tinysrgb&h=900&w=600',
    vocab: {
      task: 'Tâche',
      agent: 'Spécialiste',
      team: 'Équipe',
      bug: 'Anomalie',
      deploy: 'Mise en production',
      plan: 'Plan',
      search: 'Recherche',
    },
    agents: [
      {
        id: 'daniel',
        name: 'Daniel',
        role: 'Architecte',
        specialty: 'Architecture & structure du projet',
        personality: 'Méthodique, posé, rigoureux',
        greeting: 'Bonjour. Examinons les exigences et définissons l\'architecture.',
        catchphrase: 'La bonne structure rend tout le reste simple.',
        avatar: '/agents/avatar_pro_daniel_1785476092067.jpg',
      },
      {
        id: 'leon',
        name: 'Léon',
        role: 'Développeur',
        specialty: 'Construction des composants & pages',
        personality: 'Pragmatique, efficace, direct',
        greeting: 'On construit ça proprement. Je m\'occupe des composants.',
        catchphrase: 'Du code clair, testé, livré.',
      },
      {
        id: 'paul',
        name: 'Paul',
        role: 'Designer',
        specialty: 'Design system & interface',
        personality: 'Exigeant sur les détails, calme',
        greeting: 'Je vais soigner le design system et la cohérence visuelle.',
        catchphrase: 'Le détail fait la qualité.',
      },
      {
        id: 'bill',
        name: 'Bill',
        role: 'Optimiseur',
        specialty: 'Performance & qualité',
        personality: 'Analytique, stratégique, sobre',
        greeting: 'Analysons les points de friction et optimisons.',
        catchphrase: 'Mesurer, puis améliorer.',
      },
      {
        id: 'obrian',
        name: "O'Brien",
        role: 'Validatrice',
        specialty: 'Tests, corrections, qualité',
        personality: 'Précise, exigeante, rassurante',
        greeting: 'Je valide chaque branche. Aucune anomalie ne part en prod.',
        catchphrase: 'La qualité, c\'est non négociable.',
      },
    ],
  },
};

export const WAY_LIST = Object.values(WAYS);
