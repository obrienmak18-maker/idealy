import type { Artifact, IntentionMode } from "../types";

export interface AssistantStreamCallbacks {
  onArtifact?: (artifact: Omit<Artifact, "id" | "createdAt">) => void;
  onChunk: (chunk: string) => void;
  onComplete?: (reasoningDuration?: number) => void;
  onError?: (error: Error) => void;
  onReasoningChunk?: (chunk: string) => void;
}

export interface SendMessageOptions {
  callbacks: AssistantStreamCallbacks;
  content: string;
  conversationTitle?: string;
  deepThink?: boolean;
  mode: IntentionMode;
  signal?: AbortSignal;
  spaceInstructions?: string;
  webSearch?: boolean;
}

/**
 * AssistantService — Moteur de streaming avec réflexion approfondie (Deep Think).
 * Simule le cycle complet de raisonnement (Reasoning Tokens) suivi de la réponse finale,
 * exactement comme dans l'architecture DeepSeek R1 / DeepSeek Harness.
 */
export const AssistantService = {
  isRemoteServiceConfigured(): boolean {
    return false;
  },

  async streamResponse(options: SendMessageOptions): Promise<void> {
    const {
      content,
      mode,
      deepThink = true,
      webSearch = false,
      spaceInstructions,
      conversationTitle,
      signal,
      callbacks,
    } = options;

    if (signal?.aborted) {
      callbacks.onComplete?.();
      return;
    }

    const startTime = Date.now();
    let reasoningDuration = 0;

    // Phase 1: Reasoning / Deep Think (if enabled or in explore/produce modes)
    if (deepThink || mode === "explore" || mode === "produce") {
      const reasoningParagraphs = [
        `1. Analyse sémantique de la requête : « ${content.trim()} ».\n`,
        `2. Définition du cadre d'exécution : Mode [${mode.toUpperCase()}], recherche web : ${webSearch ? "activée" : "inactive"}.\n`,
        `3. Examen des contraintes structurelles : préservation des règles d'accessibilité WCAG AA, design système inspiré de DeepSeek Harness avec accents vert pétrole doux.\n`,
        "4. Élaboration de la synthèse technique et découpage des composants opérationnels.\n",
        "5. Validation de la réponse pour clarté, pertinence et concision.",
      ];

      for (const line of reasoningParagraphs) {
        if (signal?.aborted) {
          break;
        }
        callbacks.onReasoningChunk?.(line);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }

      reasoningDuration = Math.max(
        1,
        Math.round((Date.now() - startTime) / 1000),
      );
    }

    if (signal?.aborted) {
      callbacks.onComplete?.(reasoningDuration);
      return;
    }

    // Phase 2: Generation of main response content
    let chunks: string[] = [];
    let artifactToGenerate: Omit<Artifact, "id" | "createdAt"> | null = null;

    if (mode === "produce") {
      chunks = [
        "### Spécification et Livrable de Travail\n\n",
        `Voici le document préparé pour votre demande : **« ${content.trim()} »**.\n\n`,
        "Le livrable structuré a été généré et projeté dans le **panneau latéral (Livrables)** pour vous permettre de le lire, l\u2019éditer et l\u2019exporter en toute simplicité.\n\n",
        "```typescript\\n// Extrait de configuration généré pour Idealy\\nexport interface ProductionConfig {\\n  readonly taskName: string;\\n  readonly mode: 'produce';\\n  readonly styling: 'deepseek-harness-hybrid';\\n  readonly activePalette: {\\n    readonly tealPetrol: 'rgb(14, 159, 148)';\\n    readonly indigoSoft: 'rgb(129, 140, 248)';\\n  };\\n}\\n```\\n\\n",
        "#### Points de vigilance :\n",
        "- **Conformité des styles :** Les élévations 0.5px et les rayons squircle sont appliqués.\n",
        `- **Intégrité des données :** L'artefact reste conservé dans votre historique local.\n\n`,
        "Consultez le panneau à droite pour accéder au document source complet.",
      ];

      artifactToGenerate = {
        content: `# Livrable de Travail Idealy

**Demande initiale :** ${content.trim()}  
**Mode :** Produire  
**Instructions d'espace :** ${spaceInstructions || "Standard"}  
**Généré le :** ${new Date().toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}

---

## 1. Synthèse Exécutive
Ce document regroupe les éléments d'analyse et de mise en œuvre validés par le moteur d'assistance.

## 2. Architecture des Composants
- **ReasoningRow :** Accordéon de pensée rétractable avec chronomètre et premier aperçu.
- **InputBar :** Composeur flottant élevé avec bords squircle et sélecteur de mode.
- **CodeBlock :** Cartouche de code avec bandeau adhésif et bouton de copie instantanée.

## 3. Recommandations
1. Conserver la fluidité native web sans dépendance Electron inutile.
2. Garantir la persistance locale continue de chaque session.
`,
        conversationId: "",
        language: "markdown",
        title: `Livrable — ${conversationTitle || "Spécification technique"}`,
        type: "specification",
      };
    } else if (mode === "explore") {
      chunks = [
        "### Analyse Comparative et Exploration\n\n",
        `Examen analytique de la requête : **« ${content.trim()} »**.\n\n`,
        "| Critère | Approche Antérieure | Approche Idealy (Harness) |\n",
        "| :--- | :--- | :--- |\n",
        "| **Composant Saisie** | Formulaire statique | Carte flottante élevée avec bordures 0.5px |\n",
        "| **Raisonnement** | Absent ou texte brut | Accordéon repliable avec durée mesurée |\n",
        "| **Blocs de code** | Pre standard | Cartouche stylé Shiki avec en-tête fixé |\n",
        "| **Thème & Teinte** | Blancs neutres froids | Blancs bleutés doux + Vert pétrole / Indigo |\n\n",
        `Souhaitez-vous générer un livrable formel ou continuer d'explorer ?`,
      ];
    } else {
      chunks = [
        `Bien reçu. Voici une réponse directe et soignée relative à : **« ${content.trim()} »**.\n\n`,
        `L'environnement Idealy est désormais configuré avec l'ergonomie DeepSeek Harness adaptée au web :\n\n`,
        "- **Bloc de raisonnement :** Vous pouvez déplier la section de pensée ci-dessus pour observer le cheminement pas à pas.\n",
        `- **Palette chromatique :** Blancs bleutés neutres rehaussés d'un vert pétrole très doux et d'accents indigo discrets.\n`,
        "- **Composeur fluide :** Saisie auto-extensible, raccourcis `Entrée` pour envoyer et gestion robuste du focus.\n\n",
        "Que souhaitez-vous réaliser à présent ?",
      ];
    }

    for (const chunk of chunks) {
      if (signal?.aborted) {
        break;
      }
      callbacks.onChunk(chunk);
      await new Promise((resolve) => setTimeout(resolve, 70));
    }

    if (!signal?.aborted && artifactToGenerate && callbacks.onArtifact) {
      callbacks.onArtifact(artifactToGenerate);
    }

    callbacks.onComplete?.(reasoningDuration);
  },
};
