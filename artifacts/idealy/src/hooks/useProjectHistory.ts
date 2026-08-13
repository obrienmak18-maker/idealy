import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/supabaseClient';
import { logger } from '@/utils/logger';

export interface ProjectHistory {
  id: string;
  title: string;
  schema: Record<string, unknown>;
  created_at: string;
}

export function useProjectHistory() {
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20) as { data: ProjectHistory[] | null; error: Error | null };
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      logger.error('Failed to load history', err instanceof Error ? err : undefined, {
        action: 'loadHistory',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (title: string, schema: Record<string, unknown>) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { error } = await supabase.from('projects').insert({
        title,
        schema,
      }) as { error: Error | null };
      if (error) throw error;
      await loadHistory();
    } catch (err) {
      logger.error('Failed to save project', err instanceof Error ? err : undefined, {
        action: 'saveProject',
      });
    }
  }, [loadHistory]);

  return { history, loading, loadHistory, saveProject };
}