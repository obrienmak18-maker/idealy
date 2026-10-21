import { auth } from "@/app/(auth)/auth";
import {
  getIdealyMissionDatabaseRecord,
  listIdealyMissionAgentRuns,
  listIdealyMissionFileEvents,
} from "@/lib/idealy/backend-adapter";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Read-only database snapshot for the workspace inspector.
 * Every query uses the signed-in user's Supabase token, so database RLS
 * remains the authority for which rows can be returned.
 *
 * Individual table failures are returned separately: one missing/unavailable
 * table must not hide successful reads from the other tables.
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

  const [missionResult, agentRunsResult, eventsResult] = await Promise.allSettled([
    getIdealyMissionDatabaseRecord({ missionId, request }),
    listIdealyMissionAgentRuns({ missionId, request }),
    listIdealyMissionFileEvents({ afterSequence: 0, missionId, request }),
  ]);

  if (missionResult.status === "rejected") {
    console.error("Database inspector could not read mission row", missionResult.reason);
  }
  if (agentRunsResult.status === "rejected") {
    console.error("Database inspector could not read agent runs", agentRunsResult.reason);
  }
  if (eventsResult.status === "rejected") {
    console.error("Database inspector could not read mission file events", eventsResult.reason);
  }

  return Response.json(
    {
      mission: missionResult.status === "fulfilled" ? missionResult.value : null,
      agentRuns: agentRunsResult.status === "fulfilled" ? agentRunsResult.value : [],
      events: eventsResult.status === "fulfilled" ? eventsResult.value : [],
      errors: {
        mission: missionResult.status === "rejected" ? "unavailable" : null,
        agentRuns: agentRunsResult.status === "rejected" ? "unavailable" : null,
        events: eventsResult.status === "rejected" ? "unavailable" : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
