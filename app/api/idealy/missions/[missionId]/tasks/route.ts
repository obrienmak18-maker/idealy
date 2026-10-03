import { getToken } from "next-auth/jwt";
import { auth } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { summarizeTasks } from "@/lib/idealy/orchestrator/persistence";
import {
  loadMissionTasks,
  loadOrchestrationEvents,
} from "@/lib/idealy/orchestrator/service";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Reads the persisted task graph plus its event timeline for one mission.
 *
 * Both reads run with the caller's own Supabase JWT, so RLS is what proves the
 * mission belongs to them — the route never trusts a mission id on its own.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { missionId } = await params;
  if (!UUID_PATTERN.test(missionId)) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  if (!accessToken) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: { "Cache-Control": "no-store" }, status: 401 }
    );
  }

  const [tasksResult, eventsResult] = await Promise.all([
    loadMissionTasks({ accessToken, missionId }),
    loadOrchestrationEvents({ accessToken, missionId }),
  ]);

  if (tasksResult.error || eventsResult.error) {
    return Response.json(
      { error: tasksResult.error ?? eventsResult.error },
      { headers: { "Cache-Control": "no-store" }, status: 502 }
    );
  }

  return Response.json(
    {
      events: eventsResult.events,
      summary: summarizeTasks(tasksResult.tasks),
      tasks: tasksResult.tasks,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
