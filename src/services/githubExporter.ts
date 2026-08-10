import { getSupabaseClient } from '@/supabaseClient';
import { logger } from '@/utils/logger';

export interface GitHubExportResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}

export async function exportToGitHub(
  projectName: string,
  files: Record<string, string>
): Promise<GitHubExportResult> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Service non disponible.');

    const { data, error } = await supabase.functions.invoke('github-export', {
      body: { projectName, files },
    });

    if (error) throw error;
    if (!data?.repoUrl) throw new Error('Export GitHub indisponible.');

    logger.info('Project exported to GitHub', { action: 'exportToGitHub', projectName });
    return { success: true, repoUrl: data.repoUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'export GitHub';
    logger.error('GitHub export failed', err instanceof Error ? err : undefined, {
      action: 'exportToGitHub',
      projectName,
    });
    return { success: false, error: message };
  }
}