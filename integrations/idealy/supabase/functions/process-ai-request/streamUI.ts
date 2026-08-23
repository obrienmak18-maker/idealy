import { createUIMessageStream, createUIMessageStreamResponse } from 'npm:ai@7.0.51';

export type AgentUIPhase = 'planning' | 'building' | 'validating' | 'completed' | 'needs-fix';

export interface AgentTimelineData {
  missionId?: string | null;
  phase: AgentUIPhase;
  progress: number;
  strategist: 'queued' | 'active' | 'done';
  builder: 'queued' | 'active' | 'done';
  terminal: 'queued' | 'active' | 'done' | 'error';
}

function timelineForPhase(phase: AgentUIPhase, progress: number): AgentTimelineData {
  return {
    phase,
    progress: Math.max(0, Math.min(100, progress)),
    strategist: phase === 'planning' ? 'active' : 'done',
    builder: phase === 'building' ? 'active' : phase === 'planning' ? 'queued' : 'done',
    terminal: phase === 'validating' ? 'active' : phase === 'needs-fix' ? 'error' : phase === 'completed' ? 'done' : 'queued',
  };
}

/**
 * AI SDK 7 renamed the old experimental streamUI primitive to
 * createUIMessageStream. This wrapper keeps Idealy's server contract named
 * streamUI while sending only structured UI data to the browser.
 */
export function streamUI(input: {
  headers: Record<string, string>;
  missionId?: string | null;
  phase: AgentUIPhase;
  progress?: number;
}): Response {
  const data = { ...timelineForPhase(input.phase, input.progress ?? 0), missionId: input.missionId ?? null };
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: 'data-agent-timeline',
        id: 'idealy-agent-timeline',
        data,
      } as never);
    },
    onError: () => 'UI stream failed.',
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      ...input.headers,
      'Cache-Control': 'no-cache',
    },
  });
}
