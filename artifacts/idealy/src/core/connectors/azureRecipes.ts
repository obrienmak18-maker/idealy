export type AzureRecipeId = 'functions-http' | 'storage-blob';

export interface AzureRecipe {
  id: AzureRecipeId;
  name: string;
  purpose: string;
  serverSecretNames: string[];
  permission: string;
  status: 'adapter-planned';
  nextServerAction: string;
}

/**
 * Azure stays recipe-driven until a concrete project asks for one service.
 * Secrets are names only; values belong in Supabase Edge Function secrets.
 */
export const AZURE_RECIPES: AzureRecipe[] = [
  {
    id: 'functions-http',
    name: 'Azure Functions HTTP',
    purpose: 'Exposer une fonction HTTP pour une action serveur précise de la mission.',
    serverSecretNames: ['AZURE_FUNCTIONS_BASE_URL', 'AZURE_FUNCTIONS_KEY'],
    permission: 'functions:invoke',
    status: 'adapter-planned',
    nextServerAction: 'Créer un endpoint Edge Function qui appelle uniquement la fonction autorisée.',
  },
  {
    id: 'storage-blob',
    name: 'Azure Blob Storage',
    purpose: 'Stocker des objets lorsque le contrat de données de la mission le demande.',
    serverSecretNames: ['AZURE_STORAGE_ACCOUNT', 'AZURE_STORAGE_CONTAINER', 'AZURE_STORAGE_SAS'],
    permission: 'storage:use',
    status: 'adapter-planned',
    nextServerAction: 'Créer un endpoint Edge Function signé pour les uploads et téléchargements autorisés.',
  },
];
