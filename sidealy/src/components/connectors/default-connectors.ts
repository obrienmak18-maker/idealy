export type ConnectorStatus =
  | "available"
  | "not_connected"
  | "connecting"
  | "connected"
  | "expired"
  | "configuration_required"
  | "error"
  | "unavailable";

export interface ConnectorDefinition {
  available: boolean;
  category: "dev" | "data" | "ai" | "productivity";
  categoryLabel: string;
  configurationRequired: boolean;
  description: string;
  docUrl?: string;
  id: string;
  installed: boolean;
  name: string;
  status?: ConnectorStatus;
  tools: Array<{
    id: string;
    label: string;
    risk: "low" | "medium" | "high";
    description?: string;
  }>;
  version: string;
}

export const DEFAULT_CONNECTORS_CATALOG: ConnectorDefinition[] = [
  {
    available: true,
    category: "dev",
    categoryLabel: "Développement",
    configurationRequired: true,
    description:
      "Exportez vos missions, créez des dépôts, synchronisez les commits et gérez vos pull requests directement depuis Idealy.",
    id: "github",
    installed: false,
    name: "GitHub",
    tools: [
      { id: "github.create_repo", label: "Créer un dépôt", risk: "medium" },
      {
        id: "github.push_branch",
        label: "Pousser une branche",
        risk: "medium",
      },
      { id: "github.create_pr", label: "Ouvrir une Pull Request", risk: "low" },
    ],
    version: "2.4.0",
  },
  {
    available: true,
    category: "data",
    categoryLabel: "Base de données",
    configurationRequired: true,
    description:
      "Accédez à vos bases PostgreSQL, exécutez des migrations, visualisez les tables et générez des types TypeScript stricts.",
    id: "supabase",
    installed: false,
    name: "Supabase",
    tools: [
      { id: "supabase.list_tables", label: "Explorer les tables", risk: "low" },
      {
        id: "supabase.execute_sql",
        label: "Exécuter des requêtes SQL",
        risk: "high",
      },
      {
        id: "supabase.apply_migration",
        label: "Appliquer une migration",
        risk: "high",
      },
    ],
    version: "1.8.2",
  },
  {
    available: true,
    category: "dev",
    categoryLabel: "Déploiement",
    configurationRequired: true,
    description:
      "Déployez vos projets Next.js et React en un clic, surveillez les builds et inspectez les domaines de production.",
    id: "vercel",
    installed: false,
    name: "Vercel",
    tools: [
      {
        id: "vercel.deploy_project",
        label: "Déployer un projet",
        risk: "medium",
      },
      {
        id: "vercel.get_deployment",
        label: "Statut du déploiement",
        risk: "low",
      },
    ],
    version: "2.1.0",
  },
  {
    available: false,
    category: "dev",
    categoryLabel: "Déploiement",
    configurationRequired: true,
    description:
      "Hébergement Jamstack, déploiements prévisualisés instantanés et fonctions Serverless.",
    id: "netlify",
    installed: false,
    name: "Netlify",
    tools: [
      { id: "netlify.deploy_site", label: "Déployer un site", risk: "medium" },
      { id: "netlify.list_sites", label: "Lister les sites", risk: "low" },
    ],
    version: "1.5.0",
  },
  {
    available: true,
    category: "data",
    categoryLabel: "Paiements & Billing",
    configurationRequired: false,
    description:
      "Connectez votre facturation, gérez les abonnements et simulez des flux de paiement sécurisés.",
    id: "stripe",
    installed: false,
    name: "Stripe",
    tools: [
      { id: "stripe.get_customer", label: "Consulter un client", risk: "low" },
      {
        id: "stripe.create_checkout",
        label: "Créer une session checkout",
        risk: "medium",
      },
    ],
    version: "3.0.1",
  },
  {
    available: false,
    category: "data",
    categoryLabel: "Cloud & Analytics",
    configurationRequired: true,
    description:
      "Requêtes analytiques BigQuery, stockage Cloud Storage et intégration avec les APIs Google.",
    id: "google",
    installed: false,
    name: "Google Cloud & BigQuery",
    tools: [
      {
        id: "bigquery.query",
        label: "Exécuter des requêtes BigQuery",
        risk: "medium",
      },
      { id: "gcs.upload_file", label: "Uploader sur GCS", risk: "low" },
    ],
    version: "2.0.0",
  },
  {
    available: true,
    category: "ai",
    categoryLabel: "Intelligence Artificielle",
    configurationRequired: false,
    description:
      "Apportez vos propres clés API (BYOK) pour GPT-4o, GPT-o1, o3-mini et les derniers modèles OpenAI.",
    id: "openai",
    installed: false,
    name: "OpenAI Models",
    tools: [
      {
        id: "openai.chat_completions",
        label: "Génération de texte avancée",
        risk: "low",
      },
    ],
    version: "1.9.0",
  },
  {
    available: true,
    category: "ai",
    categoryLabel: "Intelligence Artificielle",
    configurationRequired: false,
    description:
      "Intégrez Claude 3.7 Sonnet, Claude 3.5 et les modèles de pointe Anthropic pour le code architectural de haute précision.",
    id: "anthropic",
    installed: false,
    name: "Anthropic Claude",
    tools: [
      {
        id: "anthropic.messages",
        label: "Inférence Claude Sonnet",
        risk: "low",
      },
    ],
    version: "1.4.0",
  },
  {
    available: false,
    category: "productivity",
    categoryLabel: "Productivité",
    configurationRequired: true,
    description:
      "Diffusez les résumés de mission et alertes de build directement dans vos canaux d'équipe.",
    id: "slack",
    installed: false,
    name: "Slack Notifications",
    tools: [
      { id: "slack.post_message", label: "Poster un message", risk: "low" },
    ],
    version: "1.2.0",
  },
  {
    available: false,
    category: "productivity",
    categoryLabel: "Productivité",
    configurationRequired: true,
    description:
      "Synchronisez vos spécifications, plans de mission et documentation directement dans Notion.",
    id: "notion",
    installed: false,
    name: "Notion Workspace",
    tools: [
      {
        id: "notion.create_page",
        label: "Créer une page de spec",
        risk: "low",
      },
    ],
    version: "1.1.0",
  },
];
