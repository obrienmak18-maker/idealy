import type { Artifact, Conversation, Message, Space, Theme } from "../types";

const STORAGE_KEYS = {
  ACTIVE_CONVERSATION: "idealy_active_conversation_v1",
  ACTIVE_SPACE: "idealy_active_space_v1",
  ARTIFACTS: "idealy_artifacts_v1",
  CONVERSATIONS: "idealy_conversations_v1",
  MESSAGES: "idealy_messages_v1",
  SPACES: "idealy_spaces_v1",
  THEME: "idealy_theme_v1",
};

// In-memory fallback if localStorage is unavailable
const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore[key] = value;
  } catch {
    memoryStore[key] = value;
  }
}

// Initial seed data
const DEFAULT_SPACE: Space = {
  createdAt: Date.now() - 3_600_000,
  description:
    "Espace par défaut pour vos réflexions, analyses et productions.",
  id: "space-general",
  instructions:
    "Maintenir un ton concis, structuré et orienté livrable. Mettre en avant le code et les données.",
  name: "Espace Principal",
};

const DEFAULT_CONVERSATION: Conversation = {
  createdAt: Date.now() - 3_600_000,
  draft: "",
  id: "conv-welcome",
  isArchived: false,
  isPinned: true,
  selectedMode: "chat",
  spaceId: "space-general",
  title: "Bienvenue sur Idealy",
  updatedAt: Date.now() - 3_600_000,
};

const DEFAULT_ARTIFACT: Artifact = {
  content: `# Manifeste d'Interaction Idealy

## 1. Respect de la continuité
- Les brouillons restent préservés d'une conversation à l'autre.
- Les changements d'espace ne réinitialisent pas vos travaux en cours.

## 2. Rigueur technique & Esthétique
- Intégration du système visuel DeepSeek Harness : élévations douces 0.5px, fond blanc bleuté et surfaces dark profondes.
- Déclinaison de couleurs signature : Vert pétrole très doux (#0e9f90 / #2dd4bf) et accents indigo (#6366f1 / #818cf8).
- Déroulé complet du raisonnement (Reasoning Tokens) avec accordéon interactif.

## 3. Ergonomie sobre
- Palette douce conforme WCAG AA (≥ 4.5:1).
- Navigation clavier totale (\`Ctrl+K\`, \`Échap\`, \`Tab\`).
`,
  conversationId: "conv-welcome",
  createdAt: Date.now() - 3_600_000,
  id: "art-charter",
  title: "Manifeste d'interaction Idealy",
  type: "document",
};

const DEFAULT_MESSAGES: Message[] = [
  {
    content:
      "Quelles sont les caractéristiques de ce nouvel environnement Idealy ?",
    conversationId: "conv-welcome",
    createdAt: Date.now() - 3_600_000,
    id: "msg-1",
    mode: "chat",
    role: "user",
  },
  {
    artifactIds: ["art-charter"],
    content: `Bienvenue dans la nouvelle version d'**Idealy**, entièrement remaniée à partir de l'architecture d'interface **DeepSeek Harness** adaptée pour le Web.

Cette version allie la puissance et la clarté visuelle du design de DeepSeek à une identité soignée enrichie d'un **vert pétrole très doux** et de touches **indigo**.

### Ce qui est désormais intégré :
- **Processus de raisonnement interactif :** Dépliez l'accordéon ci-dessus pour consulter la chaîne de pensée détaillée et sa durée mesurée (4 s).
- **Composeur flottant élevé :** Une carte élégante aux angles squircle avec élévation douce 0.5px, sélecteur de mode et bouton d'envoi dédié.
- **Cartouches de code Shiki :** Bandeau adhésif avec nom du langage et copie instantanée dans le presse-papier :

\`\`\`typescript
// Configuration de l'environnement Idealy
export const idealyThemeConfig = {
  themeBase: 'neutral-bluish',
  accents: {
    petrolGreen: 'rgb(14, 159, 148)', // Vert pétrole doux
    indigoSoft: 'rgb(129, 140, 248)',   // Indigo ciel
  },
  elevation: '0.5px hairline stroke with dual gaussian blur',
  responsiveMode: 'web-native',
};
\`\`\`

- **Panneau de productions (Livrables) :** Consultez les artefacts et documents complets côte à côte sans perdre le fil de votre conversation.

Ouvrez le livrable à droite pour découvrir le manifeste complet.`,
    conversationId: "conv-welcome",
    createdAt: Date.now() - 3_590_000,
    id: "msg-2",
    mode: "chat",
    reasoning: `L'utilisateur s'enquiert des spécificités du nouvel environnement Idealy.
1. Prendre en compte la refonte basée sur le dépôt libre DeepSeek Harness adapté au pur web.
2. Souligner les éléments d'interface authentiques : accordéon de réflexion (ReasoningRow), composeur flottant élevé (InputBar), cartouches de code avec bandeau adhésif (CodeBlock).
3. Mettre en avant la nouvelle touche d'identité : blanc bleuté neutre, vert pétrole très doux et accents indigo subtils.
4. Rédiger une réponse structurée avec un exemple de code et un lien vers le document de synthèse.`,
    reasoningDuration: 4,
    role: "assistant",
  },
];

export const StorageService = {
  loadActiveConversationId(): string {
    return safeGet(STORAGE_KEYS.ACTIVE_CONVERSATION) || "conv-welcome";
  },

  loadActiveSpaceId(): string {
    return safeGet(STORAGE_KEYS.ACTIVE_SPACE) || "space-general";
  },

  loadArtifacts(): Artifact[] {
    const raw = safeGet(STORAGE_KEYS.ARTIFACTS);
    if (!raw) {
      this.saveArtifacts([DEFAULT_ARTIFACT]);
      return [DEFAULT_ARTIFACT];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [DEFAULT_ARTIFACT];
    } catch {
      return [DEFAULT_ARTIFACT];
    }
  },

  loadConversations(): Conversation[] {
    const raw = safeGet(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) {
      this.saveConversations([DEFAULT_CONVERSATION]);
      return [DEFAULT_CONVERSATION];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [DEFAULT_CONVERSATION];
    } catch {
      return [DEFAULT_CONVERSATION];
    }
  },

  loadMessages(): Message[] {
    const raw = safeGet(STORAGE_KEYS.MESSAGES);
    if (!raw) {
      this.saveMessages(DEFAULT_MESSAGES);
      return DEFAULT_MESSAGES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : DEFAULT_MESSAGES;
    } catch {
      return DEFAULT_MESSAGES;
    }
  },
  loadSpaces(): Space[] {
    const raw = safeGet(STORAGE_KEYS.SPACES);
    if (!raw) {
      this.saveSpaces([DEFAULT_SPACE]);
      return [DEFAULT_SPACE];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [DEFAULT_SPACE];
    } catch {
      return [DEFAULT_SPACE];
    }
  },

  loadTheme(): Theme {
    const raw = safeGet(STORAGE_KEYS.THEME) as Theme;
    return raw === "light" || raw === "dark" || raw === "system"
      ? raw
      : "system";
  },

  saveActiveConversationId(conversationId: string): void {
    safeSet(STORAGE_KEYS.ACTIVE_CONVERSATION, conversationId);
  },

  saveActiveSpaceId(spaceId: string): void {
    safeSet(STORAGE_KEYS.ACTIVE_SPACE, spaceId);
  },

  saveArtifacts(artifacts: Artifact[]): void {
    safeSet(STORAGE_KEYS.ARTIFACTS, JSON.stringify(artifacts));
  },

  saveConversations(conversations: Conversation[]): void {
    safeSet(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  saveMessages(messages: Message[]): void {
    safeSet(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  saveSpaces(spaces: Space[]): void {
    safeSet(STORAGE_KEYS.SPACES, JSON.stringify(spaces));
  },

  saveTheme(theme: Theme): void {
    safeSet(STORAGE_KEYS.THEME, theme);
  },
};
