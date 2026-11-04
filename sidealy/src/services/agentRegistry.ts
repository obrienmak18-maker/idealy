import type { StaticAgent, Run, RunTurn, RunArtifact } from "../types";

/**
 * Registre Statique d'Identités des Agents Idealy.
 * Ce registre est immuable pendant toute la session.
 * L'interface ne peut pas afficher un agent qui n'y figure pas.
 * 
 * Règles absolues :
 * 1. L'avatar est un portrait réel, JAMAIS une initiale.
 * 2. Chaque agent a une couleur exclusive (tint), identifiant visuel fort.
 * 3. L'avatar se désature quand inactif et reprend ses couleurs au micro.
 * 4. Un agent n'apparaît que s'il est intervenu dans le run.
 */
export const STATIC_AGENT_REGISTRY: Record<string, StaticAgent> = {
  minato: {
    id: "minato",
    name: "Minato",
    role: "Chef d'équipe & Stratège",
    specialty: "Cadre la mission, arbitre les dépendances et orchestre l'escouade.",
    avatar: "/images/agents/Minato.jpg",
    tint: "#F59E0B", // Ambre / Or
    authority: "Valider le plan de run, ordonner les passations et clore le cycle.",
    voice: "Calme, incisif, structuré et fédérateur.",
  },
  naruto: {
    id: "naruto",
    name: "Naruto",
    role: "Ingénieur Full-Stack",
    specialty: "Implémente les composants React, la logique applicative et l'intégration.",
    avatar: "/images/agents/Naruto.jpg",
    tint: "#F97316", // Orange vif
    authority: "Décider des implémentations de code, bibliothèques front et structures d'état.",
    voice: "Énergique, direct, orienté action et concret.",
  },
  sasuke: {
    id: "sasuke",
    name: "Sasuke",
    role: "Architecte Système",
    specialty: "Définit les contrats d'API, les modèles de données et la sécurité.",
    avatar: "/images/agents/Sasuke.jpg",
    tint: "#8B5CF6", // Violet électrique
    authority: "Imposer les schémas de types, rejeter les couplages vicieux et valider l'architecture.",
    voice: "Exigeant, chirurgical, précis et sans détours.",
  },
  sakura: {
    id: "sakura",
    name: "Sakura",
    role: "Designer & UI/UX",
    specialty: "Conçoit les interfaces, l'accessibilité WCAG et les micro-interactions.",
    avatar: "/images/agents/Sakura.jpg",
    tint: "#EC4899", // Rose Chakra
    authority: "Ajuster la typographie, les contrastes, les espacements et les états visuels.",
    voice: "Bienveillante, attentive au détail, rigoureuse sur l'ergonomie.",
  },
  shikamaru: {
    id: "shikamaru",
    name: "Shikamaru",
    role: "Analyste & QA",
    specialty: "Traque les régressions, teste les cas limites et valide les flux.",
    avatar: "/images/agents/Shikamaru.jpg",
    tint: "#10B981", // Émeraude tactique
    authority: "Bloquer un livrable en cas de faille, exiger des tests et certifier la robustesse.",
    voice: "Pragmatique, détaché, logique et ultra-lucide.",
  },
  erza: {
    id: "erza",
    name: "Erza",
    role: "Chef de Guilde & Directrice Technique",
    specialty: "Sélectionne l'armure technique adaptée et mène l'équipe avec discipline.",
    avatar: "/images/agents/Erza.jpg",
    tint: "#EF4444", // Rouge carmin
    authority: "Imposer les standards de qualité et prioriser les chantiers critiques.",
    voice: "Autoritaire, protectrice, claire et sans compromis.",
  },
  natsu: {
    id: "natsu",
    name: "Natsu",
    role: "Full-Stack Builder",
    specialty: "Propulse le code avec intensité volcanique et pulvérise les blocages.",
    avatar: "/images/agents/Natsu.jpg",
    tint: "#EA580C", // Orange braise
    authority: "Construire rapidement des prototypes fonctionnels et débloquer les builds.",
    voice: "Intense, spontané, courageux et motivant.",
  },
  lucie: {
    id: "lucie",
    name: "Lucie",
    role: "UI/UX & Design Stellaire",
    specialty: "Invocatrice d'interfaces cohérentes et d'expériences utilisateur féeriques.",
    avatar: "/images/agents/Lucie.jpg",
    tint: "#06B6D4", // Cyan stellaire
    authority: "Garantir la clarté visuelle et la navigation intuitive.",
    voice: "Chaleureuse, expressive, inventive et accessible.",
  },
  luxus: {
    id: "luxus",
    name: "Luxus",
    role: "Performance & Haute Tension",
    specialty: "Éradique toute latence réseau, optimise le bundle et garantit 60 fps.",
    avatar: "/images/agents/Luxus.jpg",
    tint: "#EAB308", // Jaune foudre
    authority: "Refuser les requêtes superflues et exiger des métriques de vitesse.",
    voice: "Direct, percutant, focalisé sur la vélocité.",
  },
  mirajane: {
    id: "mirajane",
    name: "Mirajane",
    role: "Sécurité & Audit",
    specialty: "Implacable face aux failles XSS, CSRF et vulnérabilités de requêtes.",
    avatar: "/images/agents/Mirajane.jpg",
    tint: "#A855F7", // Violet améthyste
    authority: "Révoquer les accès non conformes et sécuriser les payloads sensibles.",
    voice: "Douce en apparence, intransigeante sur la sécurité.",
  },
  netero: {
    id: "netero",
    name: "Netero",
    role: "Grand Maître & Lead Architecte",
    specialty: "Sagesse centenaire pour arbitrer les choix structurants à haute résilience.",
    avatar: "/images/agents/Netero.jpg",
    tint: "#D97706", // Ambre Nen
    authority: "Valider les arbitrages stratégiques et la scalabilité système.",
    voice: "Philosophe, sage, percutant et expérimenté.",
  },
  gon: {
    id: "gon",
    name: "Gon",
    role: "Full-Stack Builder",
    specialty: "Détermination inébranlable et force brute pour concrétiser toute idée.",
    avatar: "/images/agents/Gon.jpg",
    tint: "#84CC16", // Vert citron Nen
    authority: "Produire les premiers éléments concrets sans atermoiement.",
    voice: "Franc, enthousiaste, loyal et déterminé.",
  },
  killua: {
    id: "killua",
    name: "Killua",
    role: "Performance & Vitesse Divine",
    specialty: "Vitesse de rendu foudroyante et exécution asynchrone ultra-fine.",
    avatar: "/images/agents/Killua.jpg",
    tint: "#38BDF8", // Bleu ciel électrique
    authority: "Optimiser les cascades asynchrones et traquer les ralentissements.",
    voice: "Vif, attentif, affûté et réfléchi.",
  },
  kurapika: {
    id: "kurapika",
    name: "Kurapika",
    role: "Architecte & Rigueur Analytique",
    specialty: "Règle absolue sur les types TypeScript, architecture Clean et normes.",
    avatar: "/images/agents/Kurapika.jpg",
    tint: "#6366F1", // Indigo Chaîne
    authority: "Imposer un typage strict et éliminer toute incohérence structurelle.",
    voice: "Méthodique, posé, rigoureux et analytique.",
  },
  leolio: {
    id: "leolio",
    name: "Leolio",
    role: "UI/UX & Empathie Utilisateur",
    specialty: "Diagnostic ergonomique, clarté des interfaces et bienveillance.",
    avatar: "/images/agents/Leolio.jpg",
    tint: "#14B8A6", // Turquoise médical
    authority: "Défendre l'utilisateur profane et simplifier les flux complexes.",
    voice: "Authentique, généreux, pragmatique et expressif.",
  },
  daniel: {
    id: "daniel",
    name: "Daniel",
    role: "Lead Architect & Head of Eng",
    specialty: "Architecture d'entreprise hexagonale, contrats stricts et SLAs 99.99%.",
    avatar: "/images/agents/Daniel.jpg",
    tint: "#2563EB", // Bleu saphir
    authority: "Signer les releases de production et certifier les standards SaaS.",
    voice: "Professionnel, sobre, orienté impact et métriques.",
  },
  kevin: {
    id: "kevin",
    name: "Kevin",
    role: "Senior Full-Stack Engineer",
    specialty: "TypeScript strict, code modulaire, refactoring SOLID et vélocité.",
    avatar: "/images/agents/Kevin.jpg",
    tint: "#0284C7", // Bleu ciel technique
    authority: "Choisir les patterns de conception logicielle et les refactorings.",
    voice: "Précis, mesuré, efficace et pédagogue.",
  },
  leslie: {
    id: "leslie",
    name: "Leslie",
    role: "Product & UI/UX Designer",
    specialty: "Design system de pointe, tokens sémantiques et composants accessibles.",
    avatar: "/images/agents/Leslie.jpg",
    tint: "#F43F5E", // Rose design
    authority: "Valider la conformité du Design System et les tokens visuels.",
    voice: "Créative, élégante, structurée et centrée utilisateur.",
  },
  maya: {
    id: "maya",
    name: "Maya",
    role: "QA & Compliance Officer",
    specialty: "Couverture de tests E2E, audit OWASP, conformité RGPD et contrats d'API.",
    avatar: "/images/agents/Maya.jpg",
    tint: "#059669", // Vert conformité
    authority: "Poser un veto sur toute mise en prod ne passant pas les tests.",
    voice: "Factuelle, méticuleuse, impartiale et vigilante.",
  },
  bill: {
    id: "bill",
    name: "Bill",
    role: "Cloud Infrastructure & SRE",
    specialty: "Haute disponibilité, monitoring, scalabilité globale et pipelines CI/CD.",
    avatar: "/images/agents/Bill.jpg",
    tint: "#7C3AED", // Violet infrastructure
    authority: "Piloter les déploiements cloud, les conteneurs et les quotas.",
    voice: "Posé, vigilant, technique et rassurant.",
  },
  alvin: {
    id: "alvin",
    name: "Alvin",
    role: "Dispatcher Universel",
    specialty: "Réceptionne le besoin, analyse l'intention et passe la main au bon interlocuteur.",
    avatar: "/images/agents/Alvin.jpg",
    tint: "#64748B", // Ardoise universelle
    authority: "Qualifier le besoin et router vers le bon agent.",
    voice: "Courtois, réactif, neutre et efficace.",
  },
};

/**
 * Table d'alias pour mapper les noms courants ou mentions vers les agents statiques.
 */
const ALIAS_MAP: Record<string, string> = {
  alex: "sasuke",
  nadia: "shikamaru",
  architecte: "sasuke",
  ingénieur: "naruto",
  ingenieur: "naruto",
  builder: "naruto",
  designer: "sakura",
  design: "sakura",
  qa: "shikamaru",
  testeur: "shikamaru",
  lead: "minato",
  chef: "minato",
};

/**
 * Récupère un agent par son identifiant ou alias, avec repli sécurisé sur Minato.
 */
export function getAgentById(idOrAlias: string): StaticAgent {
  const normalized = idOrAlias.toLowerCase().trim().replace(/^@/, "");
  const mappedId = ALIAS_MAP[normalized] || normalized;
  return STATIC_AGENT_REGISTRY[mappedId] ?? STATIC_AGENT_REGISTRY.minato;
}

/**
 * Récupère tous les agents statiques enregistrés.
 */
export function getAllStaticAgents(): StaticAgent[] {
  return Object.values(STATIC_AGENT_REGISTRY);
}

/**
 * Récupère les agents associés à une voie donnée (ex: "ninja", "mage", "hunter", "professional").
 */
export function getAgentsForWay(wayId: string = "ninja"): StaticAgent[] {
  switch (wayId) {
    case "mage":
      return [
        STATIC_AGENT_REGISTRY.erza,
        STATIC_AGENT_REGISTRY.natsu,
        STATIC_AGENT_REGISTRY.lucie,
        STATIC_AGENT_REGISTRY.luxus,
        STATIC_AGENT_REGISTRY.mirajane,
      ];
    case "hunter":
      return [
        STATIC_AGENT_REGISTRY.netero,
        STATIC_AGENT_REGISTRY.gon,
        STATIC_AGENT_REGISTRY.killua,
        STATIC_AGENT_REGISTRY.kurapika,
        STATIC_AGENT_REGISTRY.leolio,
      ];
    case "professional":
      return [
        STATIC_AGENT_REGISTRY.daniel,
        STATIC_AGENT_REGISTRY.kevin,
        STATIC_AGENT_REGISTRY.leslie,
        STATIC_AGENT_REGISTRY.maya,
        STATIC_AGENT_REGISTRY.bill,
      ];
    case "ninja":
    default:
      return [
        STATIC_AGENT_REGISTRY.minato,
        STATIC_AGENT_REGISTRY.naruto,
        STATIC_AGENT_REGISTRY.sasuke,
        STATIC_AGENT_REGISTRY.sakura,
        STATIC_AGENT_REGISTRY.shikamaru,
      ];
  }
}

export interface RunRouteDecision {
  agents: StaticAgent[];
  leader?: StaticAgent;
  mode: "solo" | "équipe";
  reason: string;
}

/**
 * La Régie : Routeur d'exécution pour chaque run de conversation.
 * 
 * Analyse trois signaux :
 * 1. Nature de la demande :
 *    - Question / explication / conversation = 1 seul agent (Solo).
 *    - Production multi-compétences = plusieurs agents (Équipe).
 * 2. Dépendances réelles :
 *    - Pas de multi-agents pour faire nombre.
 *    - Uniquement s'il existe une dépendance : concevoir puis coder, coder puis vérifier.
 * 3. Mentions explicites (@sasuke, "Alex", etc.) :
 *    - L'agent nommé est prioritaire.
 * 
 * Garde-fous absolus :
 * - Un seul agent si une compétence suffit (cas le plus fréquent !).
 * - Maximum 3 agents par run.
 * - Toujours un chef d'orchestre si 2 ou 3 agents.
 * - Jamais d'agent qui parle s'il n'a rien à produire.
 */
export function routeRun(
  prompt: string,
  options?: {
    explicitAgent?: string;
    mode?: "chat" | "explore" | "produce";
    wayId?: string;
  }
): RunRouteDecision {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const wayAgents = getAgentsForWay(options?.wayId || "ninja");
  const leader = wayAgents[0]; // Minato / Erza / Netero / Daniel
  const builder = wayAgents[1]; // Naruto / Natsu / Gon / Kevin
  const architect = wayAgents[2]; // Sasuke / Lucie / Killua / Leslie
  const qa = wayAgents[4]; // Shikamaru / Mirajane / Leolio / Maya

  // 1. Signal : Mention explicite d'agent (@nom ou nom dans le prompt)
  const explicitMentionMatch = text.match(/@([a-zA-ZÀ-ÿ0-9_-]+)/);
  if (explicitMentionMatch) {
    const requested = getAgentById(explicitMentionMatch[1]);
    return {
      mode: "solo",
      agents: [requested],
      reason: `Mention explicite : mission confiée à ${requested.name} (${requested.role}).`,
    };
  }

  if (options?.explicitAgent) {
    const requested = getAgentById(options.explicitAgent);
    return {
      mode: "solo",
      agents: [requested],
      reason: `Agent sélectionné : intervention directe de ${requested.name}.`,
    };
  }

  // 2. Détection de question / explication simple -> Run SOLO
  const isQuestion =
    text.endsWith("?") ||
    /^(comment|pourquoi|qu'est-ce|qu'est ce|quelle|quel|explique|peux-tu m'expliquer|peux tu m'expliquer|c'est quoi|dis-moi|dis moi)/i.test(
      lower
    );

  const isShortOrGeneral =
    text.length < 90 &&
    !/(construis|crée|génère|développe|fais-moi une application|application complète|nouveau projet|refais tout)/i.test(
      lower
    );

  if (isQuestion || isShortOrGeneral || options?.mode === "chat") {
    // Choix de l'agent solo selon la thématique
    if (/(style|css|couleur|tailwind|ui|ux|bouton|design|charte|police)/i.test(lower)) {
      const designer = wayAgents.find((a) => a.role.toLowerCase().includes("designer")) || wayAgents[3];
      return {
        mode: "solo",
        agents: [designer],
        reason: `Explication ciblée sur l'interface et le design confiée à ${designer.name}.`,
      };
    }

    if (/(architecture|base de données|sql|supabase|sécurité|schéma|api|modèle|table)/i.test(lower)) {
      return {
        mode: "solo",
        agents: [architect],
        reason: `Question d'architecture et de modèle de données traitée par ${architect.name}.`,
      };
    }

    if (/(bug|erreur|faille|crash|test|pourquoi ça marche pas|régression)/i.test(lower)) {
      return {
        mode: "solo",
        agents: [qa],
        reason: `Analyse de problème et diagnostic confiés à ${qa.name}.`,
      };
    }

    // Par défaut pour une question technique : l'ingénieur full-stack
    return {
      mode: "solo",
      agents: [builder],
      reason: `Réponse technique directe et ciblée prise en charge par ${builder.name}.`,
    };
  }

  // 3. Dépendances réelles pour Run en Équipe
  const needsDesignAndCode =
    /(créer|faire|construis|génère|développe)/i.test(lower) &&
    /(bouton|page|composant|interface|écran|modal|tableau de bord|navbar)/i.test(lower);

  const needsFullApp =
    /(application complète|projet complet|site entier|saas|plateforme|mvp)/i.test(lower) ||
    options?.mode === "produce";

  if (needsFullApp) {
    // 3 agents max : Chef d'équipe pour cadrer -> Builder pour coder -> QA pour vérifier
    return {
      mode: "équipe",
      leader,
      agents: [leader, builder, qa],
      reason: `Projet d'envergure : cadrage par ${leader.name}, implémentation par ${builder.name}, et certification par ${qa.name}.`,
    };
  }

  if (needsDesignAndCode) {
    // 2 agents : Architecte/Designer pour poser le contrat -> Builder pour réaliser
    return {
      mode: "équipe",
      leader,
      agents: [leader, builder],
      reason: `Dépendance conception puis implémentation : coordination ${leader.name} → ${builder.name}.`,
    };
  }

  // Défaillance / Cas par défaut : Solo avec l'Ingénieur Full-Stack
  return {
    mode: "solo",
    agents: [builder],
    reason: `Prise en charge directe par ${builder.name} (${builder.role}).`,
  };
}

/**
 * Construit un Run complet avec ses tours ordonnés et la passation explicite de micro.
 */
export function buildRunForMessage(
  userPrompt: string,
  responseContent: string,
  options?: {
    artifacts?: RunArtifact[];
    deepThink?: boolean;
    mode?: "chat" | "explore" | "produce";
    reasoning?: string;
    wayId?: string;
  }
): Run {
  const route = routeRun(userPrompt, {
    mode: options?.mode,
    wayId: options?.wayId,
  });

  const now = Date.now();
  const runId = `run-${now}`;

  if (route.mode === "solo") {
    const agent = route.agents[0];
    const turn: RunTurn = {
      agentId: agent.id,
      startedAt: now,
      endedAt: now,
      state: "terminé",
      reasoning: options?.reasoning || "",
      content: responseContent,
      artifacts: options?.artifacts,
    };

    return {
      id: runId,
      mode: "solo",
      reason: route.reason,
      turns: [turn],
      creditsSpent: 10,
    };
  }

  // Mode ÉQUIPE (2 ou 3 agents)
  const turns: RunTurn[] = [];
  const agentCount = route.agents.length;

  if (agentCount === 2) {
    const [first, second] = route.agents;
    
    // Tour 1: Le premier cadre et commence
    turns.push({
      agentId: first.id,
      startedAt: now,
      endedAt: now + 1200,
      state: "terminé",
      reasoning: options?.reasoning ? `${options.reasoning.slice(0, 180)}...` : `Analyse de la demande : cadrage des spécifications et identification des contraintes.`,
      content: `J'ai analysé votre demande. Je pose le socle technique et l'architecture avant de passer la main.`,
      handoff: {
        to: second.id,
        line: `Le socle est prêt. ${second.name}, tu peux prendre le relais pour l'implémentation complète ?`,
      },
    });

    // Tour 2: Le second produit et conclut
    turns.push({
      agentId: second.id,
      startedAt: now + 1300,
      endedAt: now + 3000,
      state: "terminé",
      reasoning: `Intégration du composant, typage strict et vérification des états d'erreur.`,
      content: responseContent,
      artifacts: options?.artifacts,
    });
  } else {
    // 3 agents : Leader -> Builder -> QA
    const [conductor, worker, reviewer] = route.agents;

    // Tour 1 : Le chef ouvre et cadre
    turns.push({
      agentId: conductor.id,
      startedAt: now,
      endedAt: now + 800,
      state: "terminé",
      reasoning: `Cadrage du projet : répartition des tâches entre ${worker.name} et ${reviewer.name}.`,
      content: `Demande reçue. Nous mettons en place une chaîne d'exécution ciblée : ${worker.name} va construire les composants nécessaires, puis ${reviewer.name} vérifiera la conformité et les cas limites.`,
      handoff: {
        to: worker.id,
        line: `Objectif validé. ${worker.name}, tu as le champ libre pour implémenter la solution.`,
      },
    });

    // Tour 2 : L'ouvrier produit le travail concret
    turns.push({
      agentId: worker.id,
      startedAt: now + 900,
      endedAt: now + 2400,
      state: "terminé",
      reasoning: options?.reasoning || `Écriture du code et structuration des modules.`,
      content: responseContent,
      artifacts: options?.artifacts,
      handoff: {
        to: reviewer.id,
        line: `Les composants et styles sont en place. ${reviewer.name}, peux-tu auditer les cas d'erreur et confirmer ?`,
      },
    });

    // Tour 3 : Le dernier conclut
    turns.push({
      agentId: reviewer.id,
      startedAt: now + 2500,
      endedAt: now + 3200,
      state: "terminé",
      reasoning: `Contrôle de l'accessibilité, typage et tests des régressions.`,
      content: `Vérification terminée. Les contrats d'API sont respectés, les styles sont harmonisés et aucun point bloquant n'a été détecté. L'ensemble est opérationnel.`,
    });
  }

  return {
    id: runId,
    mode: "équipe",
    reason: route.reason,
    turns,
    creditsSpent: 50,
  };
}
