/**
 * vercelDeployer.ts
 * Service de déploiement réel vers l'API REST Vercel.
 * Utilise le token stocké dans les connecteurs d'Idealy.
 */

import type { IdealyUniversalProjectSchema } from '@/core/iups/types';

export interface DeploymentResult {
  id: string;
  url: string;
  readyState: 'READY' | 'BUILDING' | 'ERROR';
  createdAt: number;
}

export interface DeploymentStatus {
  id: string;
  readyState: string;
  url: string;
}

/**
 * Déploie le schéma sur Vercel via l'API REST v13.
 * Docs: https://vercel.com/docs/rest-api/endpoints/deployments
 */
export async function deployToVercel(
  schema: IdealyUniversalProjectSchema,
  vercelToken: string,
  onLog?: (msg: string) => void
): Promise<DeploymentResult> {
  const log = onLog || console.log;
  
  if (!vercelToken) {
    throw new Error('Token Vercel manquant. Ajoutez-le dans les Connecteurs.');
  }

  log('🔄 Préparation des fichiers pour Vercel...');
  const files = schema.project.files || {};
  
  // Convertir les fichiers au format attendu par l'API Vercel
  const vercelFiles = Object.entries(files).map(([filePath, data]) => ({
    file: filePath,
    data: btoa(unescape(encodeURIComponent(data))), // base64
    encoding: 'base64',
  }));

  log('📡 Envoi vers l\'API Vercel...');
  
  const payload = {
    name: schema.project.name?.toLowerCase().replace(/\s+/g, '-') || 'idealy-app',
    files: vercelFiles,
    projectSettings: {
      framework: 'vite',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      installCommand: 'npm install',
    },
    target: 'production',
  };

  const response = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Vercel API error ${response.status}: ${error.error?.message || error.message || 'Erreur inconnue'}`);
  }

  const deployment = await response.json();
  log(`✅ Déploiement créé : ${deployment.url}`);
  log(`🔗 ID : ${deployment.id}`);
  
  return {
    id: deployment.id,
    url: `https://${deployment.url}`,
    readyState: deployment.readyState || 'BUILDING',
    createdAt: deployment.createdAt || Date.now(),
  };
}

/**
 * Vérifie le statut d'un déploiement Vercel.
 */
export async function getDeploymentStatus(
  deploymentId: string,
  vercelToken: string
): Promise<DeploymentStatus> {
  const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le statut: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    readyState: data.readyState,
    url: `https://${data.url}`,
  };
}
