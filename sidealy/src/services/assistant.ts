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
 * AssistantService — Moteur de streaming local avec réflexion approfondie (Deep Think).
 * Exécute le cycle complet de raisonnement suivi de la synthèse opérationnelle Idealy.
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

    // Phase 1: Reasoning / Deep Think
    if (deepThink || mode === "explore" || mode === "produce") {
      const reasoningParagraphs = [
        `1. Analyse sémantique de la requête : « ${content.trim()} ».\n`,
        `2. Définition du cadre d'exécution : Mode [${mode.toUpperCase()}], recherche web : ${webSearch ? "activée" : "inactive"}.\n`,
        `3. Examen des contraintes structurelles : conformité aux standards WCAG AA, design fluide et typographie native Idealy.\n`,
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
        "Le livrable structuré a été généré et projeté dans le **panneau latéral (Livrables)** pour vous permettre de le lire, l’éditer et l’exporter en toute simplicité.\n\n",
        "```typescript\n// Extrait de configuration généré pour Idealy\nexport interface ProductionConfig {\n  readonly taskName: string;\n  readonly mode: 'produce';\n  readonly styling: 'idealy-fluid-native';\n  readonly activePalette: {\n    readonly tealPetrol: 'rgb(14, 159, 148)';\n    readonly indigoSoft: 'rgb(129, 140, 248)';\n  };\n}\n```\n\n",
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
Ce document regroupe les éléments d'analyse et de mise en œuvre validés par le moteur d'assistance Idealy.

## 2. Architecture des Composants
- **ReasoningBlock :** Réflexion typographique fluide dans le fil sans accordéon rigide.
- **Composer :** Champ adaptatif de 40 à 360 px avec dictée vocale et pièces jointes intelligentes.
- **CodeBlock :** Cartouche de code propre avec coloration syntaxique et copie instantanée.

## 3. Recommandations
1. Conserver la fluidité native web sans dépendance lourde inutile.
2. Garantir la persistance locale et cloud continue de chaque session.
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
        "| Critère | Approche Standard | Architecture Idealy Native |\n",
        "| :--- | :--- | :--- |\n",
        "| **Composant Saisie** | Formulaire statique | Composer adaptatif fluide 40–360 px |\n",
        "| **Raisonnement** | Absent ou boîte fermée | Ligne verticale sobre et réflexion dans le fil |\n",
        "| **Blocs de code** | Pre brut | Cartouche stylé Shiki avec bouton de copie instantanée |\n",
        "| **Thème & Teinte** | Gris générique | Design spatial sobre + accents de Voie (Chakra, Mana, Nen, Énergie) |\n\n",
        `Souhaitez-vous générer un livrable formel ou continuer d'explorer ?`,
      ];
    } else {
      chunks = [
        `Bien reçu. Voici une réponse directe et soignée relative à : **« ${content.trim()} »**.\n\n`,
        `L'environnement Idealy est désormais configuré avec l'ergonomie native adaptée au web :\n\n`,
        "- **Flux de réflexion :** La pensée s'écrit de manière fluide dans le fil avant la réponse finale.\n",
        `- **Palette chromatique :** Contrastes sombres profonds rehaussés d'accents de Voie discrets.\n`,
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
