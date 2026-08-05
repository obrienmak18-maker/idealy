import type { IdealyUniversalProjectSchema } from '@/core/iups/types';

export interface AgentEvent {
  type: 'phase' | 'tool' | 'warning';
  message: string;
  path?: string;
}

export interface AgentResult {
  ok: boolean;
  text: string;
  files: Record<string, string>;
  changedPaths: string[];
  events: AgentEvent[];
  steps?: number;
  error?: string;
}

function getApiBase() {
  return (import.meta.env.VITE_API_BASE_URL ?? window.location.origin).replace(/\/$/, '');
}

export async function runWorkspaceAgent(
  prompt: string,
  schema: IdealyUniversalProjectSchema | null,
  signal?: AbortSignal,
): Promise<AgentResult> {
  const response = await fetch(`${getApiBase()}/api/ai/agent`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      projectName: schema?.project.name,
      files: schema?.project.files ?? {},
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? 'L’agent n’a pas pu terminer la mission.');
  }
  return payload as AgentResult;
}
