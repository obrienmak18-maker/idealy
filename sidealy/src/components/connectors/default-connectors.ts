export interface ConnectorDefinition {
  id: string;
  name: string;
  category: "dev" | "data" | "ai" | "productivity";
  categoryLabel: string;
  description: string;
  version: string;
  installed: boolean;
  available: boolean;
  configurationRequired: boolean;
  docUrl?: string;
  tools: Array<{
    id: string;
    label: string;
    risk: "low" | "medium" | "high";
    description?: string;
  }>;
}

export const DEFAULT_CONNECTORS_CATALOG: ConnectorDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    category: "dev",
    categoryLabel: "Développement",
    description: "Exportez vos missions, créez des dépôts, synchronisez les commits et gérez vos pull requests directement depuis Idealy.",
    version: "2.4.0",
    installed: true,
    available: true,
    configurationRequired: false,
    tools: [
      { id: "github.create_repo", label: "Créer un dépôt", risk: "medium" },
      { id: "github.push_branch", label: "Pousser une branche", risk: "medium" },
      { id: "github.create_pr", label: "Ouvrir une Pull Request", risk: "low" },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "data",
    categoryLabel: "Base de données",
    description: "Accédez à vos bases PostgreSQL, exécutez des migrations, visualisez les tables et générez des types TypeScript stricts.",
    version: "1.8.2",
    installed: true,
    available: true,
    configurationRequired: false,
    tools: [
      { id: "supabase.list_tables", label: "Explorer les tables", risk: "low" },
      { id: "supabase.execute_sql", label: "Exécuter des requêtes SQL", risk: "high" },
      { id: "supabase.apply_migration", label: "Appliquer une migration", risk: "high" },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "dev",
    categoryLabel: "Déploiement",
    description: "Déployez vos projets Next.js et React en un clic, surveillez les builds et inspectez les domaines de production.",
    version: "2.1.0",
    installed: true,
    available: true,
    configurationRequired: false,
    tools: [
      { id: "vercel.deploy_project", label: "Déployer un projet", risk: "medium" },
      { id: "vercel.get_deployment", label: "Statut du déploiement", risk: "low" },
    ],
  },
  {
    id: "netlify",
    name: "Netlify",
    category: "dev",
    categoryLabel: "Déploiement",
    description: "Hébergement Jamstack, déploiements prévisualisés instantanés et fonctions Serverless.",
    version: "1.5.0",
    installed: false,
    available: false,
    configurationRequired: true,
    tools: [
      { id: "netlify.deploy_site", label: "Déployer un site", risk: "medium" },
      { id: "netlify.list_sites", label: "Lister les sites", risk: "low" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "data",
    categoryLabel: "Paiements & Billing",
    description: "Connectez votre facturation, gérez les abonnements et simulez des flux de paiement sécurisés.",
    version: "3.0.1",
    installed: true,
    available: true,
    configurationRequired: false,
    tools: [
      { id: "stripe.get_customer", label: "Consulter un client", risk: "low" },
      { id: "stripe.create_checkout", label: "Créer une session checkout", risk: "medium" },
    ],
  },
  {
    id: "google",
    name: "Google Cloud & BigQuery",
    category: "data",
    categoryLabel: "Cloud & Analytics",
    description: "Requêtes analytiques BigQuery, stockage Cloud Storage et intégration avec les APIs Google.",
    version: "2.0.0",
    installed: false,
    available: false,
    configurationRequired: true,
    tools: [
      { id: "bigquery.query", label: "Exécuter des requêtes BigQuery", risk: "medium" },
      { id: "gcs.upload_file", label: "Uploader sur GCS", risk: "low" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI Models",
    category: "ai",
    categoryLabel: "Intelligence Artificielle",
    description: "Apportez vos propres clés API (BYOK) pour GPT-4o, GPT-o1, o3-mini et les derniers modèles OpenAI.",
    version: "1.9.0",
    installed: true,
    available: true,
    configurationRequired: false,
    tools: [
      { id: "openai.chat_completions", label: "Génération de texte avancée", risk: "low" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    category: "ai",
    categoryLabel: "Intelligence Artificielle",
    description: "Intégrez Claude 3.7 Sonnet, Claude 3.5 et les modèles de pointe Anthropic pour le code architectural de haute précision.",
    version: "1.4.0",
    installed: true,
    available: true,
    configurationRequired: false,
    tools: [
      { id: "anthropic.messages", label: "Inférence Claude Sonnet", risk: "low" },
    ],
  },
  {
    id: "slack",
    name: "Slack Notifications",
    category: "productivity",
    categoryLabel: "Productivité",
    description: "Diffusez les résumés de mission et alertes de build directement dans vos canaux d'équipe.",
    version: "1.2.0",
    installed: false,
    available: false,
    configurationRequired: true,
    tools: [
      { id: "slack.post_message", label: "Poster un message", risk: "low" },
    ],
  },
  {
    id: "notion",
    name: "Notion Workspace",
    category: "productivity",
    categoryLabel: "Productivité",
    description: "Synchronisez vos spécifications, plans de mission et documentation directement dans Notion.",
    version: "1.1.0",
    installed: false,
    available: false,
    configurationRequired: true,
    tools: [
      { id: "notion.create_page", label: "Créer une page de spec", risk: "low" },
    ],
  },
];
