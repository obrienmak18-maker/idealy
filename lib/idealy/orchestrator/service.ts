import "server-only";
import type { OrchestrationEvent } from "./events";
import { isUuid, rowToTask, toRecord } from "./persistence";
import type {
  MissionStatus,
  OrchestratorTask,
  OrchestratorTaskStatus,
} from "./types";

/**
 * Server-only reads for mission DAG persistence.
 *
 * Fetches use the caller's own JWT so RLS decides visibility. Writes go through
 * the service role in an Edge Function, never from a browser, so a client can
 * never declare its own mission "completed".
 */

type SupabaseConfig = { accessToken: string; anonKey: string; url: string };

function getConfig(accessToken: string): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { accessToken, anonKey, url };
}

async function restGet<T>(
  config: SupabaseConfig,
  path: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        apikey: config.anonKey,
      },
    });
    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

/** Loads the persisted graph for a mission. RLS guarantees the user boundary. */
export async function loadMissionTasks({
  accessToken,
  missionId,
}: {
  accessToken: string;
  missionId: string;
}): Promise<{ error: string | null; tasks: OrchestratorTask[] }> {
  if (!isUuid(missionId)) {
    return { error: "Invalid mission id", tasks: [] };
  }
  const config = getConfig(accessToken);
  if (!config) {
    return { error: "Supabase is not configured.", tasks: [] };
  }
  const { data, error } = await restGet<Record<string, unknown>[]>(
    config,
    `mission_tasks?select=*&mission_id=eq.${missionId}&order=created_at`
  );
  if (error || !data) {
    return { error: error ?? "Unable to read mission tasks.", tasks: [] };
  }
  return {
    error: null,
    tasks: data.map(rowToTask).filter((t): t is OrchestratorTask => t !== null),
  };
}

/** Rebuilds the timeline from persisted events, oldest first. */
export async function loadOrchestrationEvents({
  accessToken,
  limit = 200,
  missionId,
}: {
  accessToken: string;
  limit?: number;
  missionId: string;
}): Promise<{ error: string | null; events: OrchestrationEvent[] }> {
  if (!isUuid(missionId)) {
    return { error: "Invalid mission id", events: [] };
  }
  const config = getConfig(accessToken);
  if (!config) {
    return { error: "Supabase is not configured.", events: [] };
  }
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const { data, error } = await restGet<Record<string, unknown>[]>(
    config,
    `mission_orchestration_events?select=*&mission_id=eq.${missionId}` +
      `&order=sequence&limit=${safeLimit}`
  );
  if (error || !data) {
    return {
      error: error ?? "Unable to read orchestration events.",
      events: [],
    };
  }
  return {
    error: null,
    events: data.map((row) => ({
      attempt: typeof row.attempt === "number" ? row.attempt : null,
      createdAt: String(row.created_at ?? ""),
      id: String(row.id ?? ""),
      message: String(row.message ?? ""),
      missionId: String(row.mission_id ?? ""),
      payload: toRecord(row.payload),
      status:
        (row.status as OrchestratorTaskStatus | MissionStatus | null) ?? null,
      taskId: typeof row.task_key === "string" ? row.task_key : null,
      type: row.event_type as OrchestrationEvent["type"],
    })),
  };
}
