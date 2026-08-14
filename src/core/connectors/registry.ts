export type ConnectorEnvironment = 'test' | 'production';
export type ConnectorStatus = 'available' | 'configured' | 'needs-auth' | 'not-configured' | 'blocked';
export type ConnectorReadiness = 'operational' | 'admin-config' | 'adapter-planned';

export interface ConnectorCapability {
  id: string;
  label: string;
  description: string;
  permission: string;
  destructive?: boolean;
}

export interface ConnectorDefinition {
  id: 'supabase' | 'stripe' | 'github' | 'vercel' | 'azure' | 'figma';
  name: string;
  readiness: ConnectorReadiness;
  description: string;
  setupUrl: string;
  secretHandling: 'public-config' | 'server-managed' | 'oauth';
  environments: ConnectorEnvironment[];
  capabilities: ConnectorCapability[];
}

export interface ConnectorConnectionState {
  provider: ConnectorDefinition['id'];
  environment: ConnectorEnvironment;
  status: ConnectorStatus;
  lastCheckedAt?: number;
  lastError?: string;
}

export const CONNECTOR_REGISTRY: ConnectorDefinition[] = [
  {
    id: 'supabase',
    name: 'Supabase',
    readiness: 'operational',
    description: 'Données, Auth, Storage et Edge Functions pour les applications générées.',
    setupUrl: 'https://supabase.com/dashboard/project/_/settings/api',
    secretHandling: 'public-config',
    environments: ['test', 'production'],
    capabilities: [
      { id: 'read-schema', label: 'Lire le schéma', description: 'Comprendre les tables et les relations autorisées.', permission: 'schema:read' },
      { id: 'read-write-data', label: 'Lire et écrire les données', description: 'Exécuter les actions prévues par le contrat de mission.', permission: 'data:read-write' },
      { id: 'auth', label: 'Authentifier les utilisateurs', description: 'Utiliser Auth sans exposer de clé de service.', permission: 'auth:use' },
      { id: 'storage', label: 'Gérer les fichiers', description: 'Utiliser Storage avec les politiques du projet.', permission: 'storage:use' },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    readiness: 'admin-config',
    description: 'Checkout, abonnements et événements de paiement vérifiés.',
    setupUrl: 'https://dashboard.stripe.com/test/apikeys',
    secretHandling: 'server-managed',
    environments: ['test', 'production'],
    capabilities: [
      { id: 'checkout', label: 'Créer un checkout', description: 'Démarrer un paiement ou abonnement en mode autorisé.', permission: 'checkout:create' },
      { id: 'subscriptions', label: 'Synchroniser les abonnements', description: 'Mettre à jour l’état métier depuis un webhook signé.', permission: 'subscriptions:sync' },
      { id: 'portal', label: 'Ouvrir le portail client', description: 'Permettre à l’utilisateur de gérer son abonnement.', permission: 'portal:create' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    readiness: 'operational',
    description: 'Exporter le code, créer un dépôt et suivre la version publiée.',
    setupUrl: 'https://github.com/settings/apps',
    secretHandling: 'oauth',
    environments: ['test', 'production'],
    capabilities: [
      { id: 'export', label: 'Exporter le code', description: 'Pousser les fichiers d’une mission vers un dépôt autorisé.', permission: 'repo:write' },
      { id: 'read-status', label: 'Lire l’état CI', description: 'Afficher les contrôles GitHub liés à la publication.', permission: 'checks:read' },
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    readiness: 'admin-config',
    description: 'Créer une preview ou publier un projet après les contrôles de mission.',
    setupUrl: 'https://vercel.com/account/tokens',
    secretHandling: 'server-managed',
    environments: ['test', 'production'],
    capabilities: [
      { id: 'preview', label: 'Créer une preview', description: 'Publier une version vérifiée et récupérable.', permission: 'deploy:preview' },
      { id: 'production', label: 'Publier en production', description: 'Déployer uniquement après un preflight réussi.', permission: 'deploy:production', destructive: true },
    ],
  },
  {
    id: 'azure',
    name: 'Azure',
    readiness: 'adapter-planned',
    description: 'Cible d’exécution avancée à préciser par service avant activation.',
    setupUrl: 'https://portal.azure.com/',
    secretHandling: 'server-managed',
    environments: ['test', 'production'],
    capabilities: [
      { id: 'functions', label: 'Azure Functions', description: 'Exposer une fonction HTTP pour un besoin explicite.', permission: 'functions:invoke' },
      { id: 'storage', label: 'Azure Storage', description: 'Stocker des objets lorsque le projet le demande.', permission: 'storage:use' },
    ],
  },
  {
    id: 'figma',
    name: 'Figma',
    readiness: 'admin-config',
    description: 'Références de design via OAuth ; l’adaptateur de production reste à configurer.',
    setupUrl: 'https://www.figma.com/developers/api',
    secretHandling: 'oauth',
    environments: ['test', 'production'],
    capabilities: [
      { id: 'read-design', label: 'Lire une référence design', description: 'Importer une référence autorisée pour guider le contrat visuel.', permission: 'design:read' },
    ],
  },
];

export function getConnectorDefinition(id: ConnectorDefinition['id']): ConnectorDefinition {
  return CONNECTOR_REGISTRY.find((connector) => connector.id === id) ?? CONNECTOR_REGISTRY[0];
}
