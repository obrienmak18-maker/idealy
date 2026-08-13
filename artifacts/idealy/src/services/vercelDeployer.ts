import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import { getSupabaseClient } from '@/supabaseClient';

export interface DeploymentResult {
  id: string;
  url: string;
  readyState: 'READY' | 'BUILDING' | 'ERROR' | string;
  createdAt: number;
}

export interface DeploymentStatus {
  id: string;
  readyState: string;
  url: string;
}

function getFunctionsClient() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase n’est pas configuré pour le déploiement serveur.');
  return supabase;
}

export async function deployToVercel(
  schema: IdealyUniversalProjectSchema,
  onLog?: (msg: string) => void,
): Promise<DeploymentResult> {
  const log = onLog || console.log;
  log('🔒 Vérification de session et préparation du déploiement serveur...');
  const { data, error } = await getFunctionsClient().functions.invoke('vercel-deploy', {
    body: { schema, target: 'production' },
  });
  if (error || !data || data.error) throw new Error(data?.error ?? error?.message ?? 'Déploiement Vercel indisponible.');
  log(`✅ Déploiement créé : ${data.url || 'URL en attente'}`);
  return data as DeploymentResult;
}

export async function getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
  const { data, error } = await getFunctionsClient().functions.invoke('vercel-status', { body: { deploymentId } });
  if (error || !data || data.error) throw new Error(data?.error ?? error?.message ?? 'Impossible de récupérer le statut Vercel.');
  return data as DeploymentStatus;
}
