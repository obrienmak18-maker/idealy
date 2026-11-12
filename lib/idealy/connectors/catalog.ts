import type { ConnectorDefinition } from "./types";

const readOperation = (
  id: string,
  label: string,
  capability: ConnectorDefinition["operations"][number]["capability"]
) => ({
  capability,
  id,
  label,
  missionSafe: true,
  requiresConfirmation: false,
  risk: "read" as const,
});

const writeOperation = (
  id: string,
  label: string,
  capability: ConnectorDefinition["operations"][number]["capability"],
  risk: "write" | "publish" | "financial" = "write"
) => ({
  capability,
  id,
  label,
  missionSafe: false,
  requiresConfirmation: true,
  risk,
});

export const connectorCatalog: readonly ConnectorDefinition[] = [
  {
    auth: "oauth2",
    authorizationUrl: "https://www.canva.dev/docs/connect/authentication/",
    availability: "planned",
    category: "design",
    dataBoundary: "user-selected-assets",
    description:
      "Importer, transformer et exporter des designs sélectionnés par l’utilisateur.",
    docsUrl: "https://www.canva.dev/docs/connect/",
    id: "canva",
    label: "Canva",
    notes: [
      "Le site ne doit jamais recevoir le client secret ni les tokens OAuth.",
      "L’intégration Canva de la session d’orchestration ne constitue pas une intégration runtime du site.",
    ],
    operations: [
      readOperation(
        "list-designs",
        "Lister les designs autorisés",
        "design-assets-read"
      ),
      readOperation(
        "get-design",
        "Lire un design sélectionné",
        "design-assets-read"
      ),
      writeOperation("create-design", "Créer un design", "design-generation"),
      writeOperation("export-design", "Exporter un design", "design-export"),
    ],
    provider: "canva",
    runtime: "idealy-server",
    scopes: [
      "design:meta:read",
      "design:content:read",
      "design:content:write",
      "asset:read",
      "asset:write",
    ],
    secretEnvNames: ["CANVA_CLIENT_ID", "CANVA_CLIENT_SECRET"],
  },
  {
    auth: "oauth2",
    availability: "configured",
    category: "code",
    dataBoundary: "user-selected-assets",
    description:
      "Lire un dépôt sélectionné et publier du code ou des issues après confirmation.",
    docsUrl:
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
    id: "github",
    label: "GitHub",
    notes: [
      "Les missions peuvent lire un dépôt explicitement choisi, mais ne publient jamais directement sur main.",
      "Toute écriture distante reste confirmée par l’utilisateur.",
    ],
    operations: [
      readOperation(
        "list-repositories",
        "Lister les dépôts autorisés",
        "repository-read"
      ),
      readOperation(
        "read-repository",
        "Lire un dépôt sélectionné",
        "repository-read"
      ),
      writeOperation("create-branch", "Créer une branche", "repository-write"),
      writeOperation(
        "open-pull-request",
        "Ouvrir une pull request",
        "repository-write"
      ),
    ],
    provider: "github",
    runtime: "idealy-server",
    scopes: ["repo", "read:user"],
    secretEnvNames: [
      "GITHUB_OAUTH_CLIENT_ID",
      "GITHUB_OAUTH_CLIENT_SECRET",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
    ],
  },
  {
    auth: "oauth2",
    availability: "planned",
    category: "data",
    dataBoundary: "user-selected-assets",
    description:
      "Lister les fichiers Drive explicitement autorisés par le compte Google connecté.",
    docsUrl:
      "https://developers.google.com/identity/protocols/oauth2/web-server",
    id: "google-drive",
    label: "Google Drive",
    notes: [
      "Google Drive reste planifié : aucune connexion, lecture ou import Google n’est actif dans cette version.",
      "Le premier scope prévu est limité aux métadonnées Drive en lecture seule ; tout accès au contenu ou toute écriture requiert une revue de scopes distincte.",
      "Les secrets OAuth Google sont exclusivement destinés aux Edge Functions et ne doivent jamais être ajoutés au navigateur ou à Netlify.",
    ],
    operations: [
      readOperation(
        "list-drive-files",
        "Lister les fichiers Drive autorisés",
        "file-storage"
      ),
      readOperation(
        "read-drive-metadata",
        "Lire les métadonnées d’un fichier sélectionné",
        "file-storage"
      ),
    ],
    provider: "google",
    runtime: "supabase-edge",
    scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
    secretEnvNames: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
  },
  {
    auth: "oauth2",
    availability: "configured",
    category: "deploy",
    dataBoundary: "metadata-only",
    description:
      "Créer des previews et déclencher un déploiement après validation de l’utilisateur.",
    docsUrl: "https://vercel.com/docs/integrations",
    id: "vercel",
    label: "Vercel",
    notes: [
      "Le bouton de publication doit rester distinct du flux de conversation et demander une confirmation.",
    ],
    operations: [
      readOperation(
        "list-projects",
        "Lister les projets Vercel",
        "deployment-preview"
      ),
      readOperation(
        "get-deployment",
        "Lire le statut d’un déploiement",
        "deployment-preview"
      ),
      writeOperation(
        "create-preview",
        "Créer une preview",
        "deployment-preview",
        "publish"
      ),
      writeOperation(
        "deploy-production",
        "Déployer en production",
        "deployment-production",
        "publish"
      ),
    ],
    provider: "vercel",
    runtime: "idealy-server",
    scopes: [],
    secretEnvNames: [
      "VERCEL_APP_CLIENT_ID",
      "VERCEL_INTEGRATION_CLIENT_ID",
      "VERCEL_TOKEN",
      "VERCEL-CLIENT-ID",
    ],
  },
  {
    auth: "managed",
    availability: "configured",
    category: "data",
    dataBoundary: "server-managed",
    description:
      "Lire les ressources du projet Idealy et gérer les données selon les policies RLS.",
    docsUrl: "https://supabase.com/docs/guides/api",
    id: "supabase",
    label: "Supabase",
    notes: [
      "Les tokens et la service role key restent côté serveur ou Edge Function.",
      "Les accès utilisateur passent par les policies RLS existantes.",
    ],
    operations: [
      readOperation(
        "read-mission",
        "Lire une mission de l’utilisateur",
        "database-read"
      ),
      readOperation(
        "read-mission-files",
        "Lire les fichiers d’une mission",
        "file-storage"
      ),
      writeOperation(
        "append-mission-event",
        "Ajouter un événement de mission",
        "database-write"
      ),
    ],
    provider: "supabase",
    runtime: "supabase-edge",
    scopes: [
      "profile:read",
      "project:read",
      "mission:read",
      "mission-file:read",
    ],
    secretEnvNames: [],
  },
  {
    auth: "oauth2",
    availability: "planned",
    category: "design",
    dataBoundary: "user-selected-assets",
    description:
      "Lire des fichiers de design sélectionnés et récupérer leurs métadonnées ou assets.",
    docsUrl: "https://developers.figma.com/docs/rest-api/",
    id: "figma",
    label: "Figma",
    notes: ["L’écriture dans Figma n’est pas activée par défaut dans Idealy."],
    operations: [
      readOperation(
        "read-file",
        "Lire un fichier sélectionné",
        "design-assets-read"
      ),
      readOperation(
        "export-assets",
        "Exporter les assets sélectionnés",
        "design-export"
      ),
    ],
    provider: "figma",
    runtime: "idealy-server",
    scopes: ["file_content:read"],
    secretEnvNames: ["FIGMA_CLIENT_ID", "FIGMA_CLIENT_SECRET"],
  },
  {
    auth: "oauth2",
    availability: "planned",
    category: "data",
    dataBoundary: "user-selected-assets",
    description:
      "Lire ou écrire des pages et bases explicitement partagées avec l’intégration.",
    docsUrl: "https://developers.notion.com/reference/intro",
    id: "notion",
    label: "Notion",
    notes: [
      "Les permissions restent celles accordées à la page ou à la base Notion.",
    ],
    operations: [
      readOperation(
        "search-pages",
        "Rechercher les pages partagées",
        "document-read"
      ),
      readOperation("read-page", "Lire une page sélectionnée", "document-read"),
      writeOperation(
        "append-page",
        "Ajouter du contenu à une page",
        "document-write"
      ),
    ],
    provider: "notion",
    runtime: "idealy-server",
    scopes: [],
    secretEnvNames: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
  },
  {
    auth: "oauth2",
    availability: "planned",
    category: "communication",
    dataBoundary: "metadata-only",
    description:
      "Lire un contexte autorisé et envoyer des messages uniquement après confirmation.",
    docsUrl: "https://api.slack.com/authentication/oauth-v2",
    id: "slack",
    label: "Slack",
    notes: [
      "L’envoi de message n’est jamais silencieux : il requiert une confirmation explicite.",
    ],
    operations: [
      readOperation(
        "list-channels",
        "Lister les canaux autorisés",
        "database-read"
      ),
      writeOperation("send-message", "Envoyer un message", "message-send"),
    ],
    provider: "slack",
    runtime: "idealy-server",
    scopes: ["channels:read", "chat:write"],
    secretEnvNames: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  },
  {
    auth: "managed",
    availability: "configured",
    category: "billing",
    dataBoundary: "server-managed",
    description:
      "Lire l’état de facturation Idealy sans exposer de données sensibles au navigateur.",
    docsUrl: "https://docs.stripe.com/api",
    id: "stripe",
    label: "Stripe",
    notes: [
      "Les opérations financières d’écriture restent hors du catalogue mission par défaut.",
    ],
    operations: [
      readOperation(
        "read-subscription",
        "Lire l’abonnement courant",
        "billing-read"
      ),
      readOperation("read-invoice", "Lire une facture", "billing-read"),
    ],
    provider: "stripe",
    runtime: "supabase-edge",
    scopes: ["billing:read"],
    secretEnvNames: [],
  },
  {
    auth: "service-account",
    availability: "planned",
    category: "deploy",
    dataBoundary: "user-selected-assets",
    description: "Run, Storage et BigQuery à la demande.",
    docsUrl: "https://cloud.google.com/docs",
    id: "google-cloud",
    label: "Google Cloud",
    notes: ["Accès aux infrastructures Cloud et déploiements."],
    operations: [
      readOperation(
        "list-gcp-resources",
        "Lister les ressources Cloud",
        "file-storage"
      ),
    ],
    provider: "google-cloud",
    runtime: "idealy-server",
    scopes: [],
    secretEnvNames: ["GOOGLE_APPLICATION_CREDENTIALS"],
  },
  {
    auth: "managed",
    availability: "configured",
    category: "data",
    dataBoundary: "server-managed",
    description: "Connexion directe à une instance existante.",
    docsUrl: "https://www.postgresql.org/docs/",
    id: "postgres",
    label: "PostgreSQL",
    notes: ["Accès sécurisé à une base relationnelle PostgreSQL."],
    operations: [
      readOperation(
        "query-db",
        "Exécuter des requêtes de lecture",
        "database-read"
      ),
    ],
    provider: "postgres",
    runtime: "supabase-edge",
    scopes: [],
    secretEnvNames: ["DATABASE_URL"],
  },
  {
    auth: "api-key",
    authorizationUrl: "https://dashboard.exa.ai/api-keys",
    availability: "configured",
    category: "data",
    dataBoundary: "metadata-only",
    description:
      "Recherche web temps réel, récupération de documentation et extraction de faits sourcés.",
    docsUrl: "https://exa.ai/docs",
    id: "exa",
    label: "Exa Semantic Search",
    notes: [
      "Recherche web sémantique avec extraction automatique d'extraits textuels pertinents.",
      "Ne modifie aucune donnée utilisateur.",
    ],
    operations: [
      readOperation(
        "web-search",
        "Rechercher sur le web sémantique",
        "web-search"
      ),
    ],
    provider: "exa",
    runtime: "idealy-server",
    scopes: ["search:read"],
    secretEnvNames: ["EXA_API_KEY"],
  },
  {
    auth: "api-key",
    authorizationUrl: "https://fal.ai/dashboard/keys",
    availability: "configured",
    category: "design",
    dataBoundary: "metadata-only",
    description:
      "Génération d’images ultra-rapide et haute fidélité via Flux.1 [schnell].",
    docsUrl: "https://fal.ai/models/fal-ai/flux/schnell",
    id: "fal",
    label: "Fal.ai Flux.1",
    notes: [
      "Génération d'images haute fidélité pour wireframes, héros et maquettes.",
      "Gère automatiquement la détection de solde à recharger (TOP_UP) sans bloquer l'orchestration.",
    ],
    operations: [
      writeOperation(
        "generate-image",
        "Générer une image via Flux.1",
        "design-generation"
      ),
    ],
    provider: "fal",
    runtime: "idealy-server",
    scopes: ["image:generate"],
    secretEnvNames: ["FAL_KEY", "FAL_AI_API_KEY"],
  },
];

export function listConnectorDefinitions() {
  return connectorCatalog;
}
