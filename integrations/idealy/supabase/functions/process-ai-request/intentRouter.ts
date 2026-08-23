export type IntentCategory = "CONVERSATION" | "IDEATION" | "EXECUTION";

export interface IntentRoute {
  category: IntentCategory;
  confidence: number;
  reason: string;
}

const CONVERSATION_PATTERN =
  /^(ok|okay|oui|non|merci|salut|bonjour|bonsoir|hello|hey|d'accord|je comprends|continue|pourquoi|comment ça va|tu es là|qui es-tu|explique(?:-moi)?\s+(?:ce|cela|ça|ton|le))/i;
const EXECUTION_PATTERN =
  /\b(crée|creer|créer|génère|generer|générer|construis|construire|implémente|implementer|implémenter|ajoute|ajouter|modifie|modifier|refactorise|refactoriser|corrige|corriger|code|code-moi|déploie|déployer|connecte|connecter|écris|ecris|écrire|lance|lancer|supprime|supprimer|remplace|remplacer|ouvre|ouvrir)\b/i;
const IDEATION_PATTERN =
  /\b(idée|idee|idées|idees|imagine|imaginer|propose|proposer|brainstorm|concept|concepts|fonctionnalité à inventer|roadmap|stratégie|strategie|compare|comparer|qu'est-ce qu'on pourrait|que pourrait-on|suggestion|suggestions)\b/i;
const BUILD_TARGET_PATTERN =
  /\b(app|application|site|page|dashboard|composant|composants|interface|ui|ux|code|fichier|route|api|base de données|database|canvas|projet|mission|terminal|webcontainer)\b/i;

export function classifyIntent(prompt: string): IntentRoute {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return {
      category: "CONVERSATION",
      confidence: 1,
      reason: "Message vide ou neutre.",
    };
  }
  if (/^\/(deploy|fix|add-file|style)\b/i.test(normalized)) {
    return {
      category: "EXECUTION",
      confidence: 1,
      reason: "Commande explicite.",
    };
  }
  if (
    CONVERSATION_PATTERN.test(normalized) &&
    !BUILD_TARGET_PATTERN.test(lower)
  ) {
    return {
      category: "CONVERSATION",
      confidence: 0.96,
      reason: "Formulation conversationnelle sans cible de construction.",
    };
  }
  if (EXECUTION_PATTERN.test(lower) && BUILD_TARGET_PATTERN.test(lower)) {
    return {
      category: "EXECUTION",
      confidence: 0.94,
      reason: "Verbe d’action associé à une cible de projet.",
    };
  }
  if (IDEATION_PATTERN.test(lower)) {
    return {
      category: "IDEATION",
      confidence: 0.88,
      reason:
        "Demande d’exploration ou de conception sans écriture sur le projet.",
    };
  }
  if (
    /(\?|\bpourquoi\b|\bcomment\b|\bqu'est-ce que\b)/i.test(normalized) &&
    !BUILD_TARGET_PATTERN.test(lower)
  ) {
    return {
      category: "CONVERSATION",
      confidence: 0.84,
      reason: "Question générale sans cible de construction.",
    };
  }
  if (BUILD_TARGET_PATTERN.test(lower) && normalized.length > 45) {
    return {
      category: "IDEATION",
      confidence: 0.68,
      reason: "Description de produit à clarifier avant exécution.",
    };
  }
  return {
    category: "CONVERSATION",
    confidence: 0.62,
    reason: "Aucune intention d’écriture suffisamment explicite.",
  };
}
