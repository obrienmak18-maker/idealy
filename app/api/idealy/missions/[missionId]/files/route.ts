import { auth } from "@/app/(auth)/auth";
import {
  listIdealyMissionFileEvents,
  listIdealyMissionFiles,
} from "@/lib/idealy/backend-adapter";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseAfterSequence(value: string | null) {
  if (!value) return 0;
  if (!/^\d+$/.test(value)) return null;
  const sequence = Number(value);
  return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : null;
}

/**
 * Endpoint de synchronisation des fichiers de mission.
 * Récupère les fichiers actuels et la dernière séquence VFS.
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

  const afterSequence = parseAfterSequence(
    new URL(request.url).searchParams.get("afterSequence")
  );
  if (afterSequence === null) {
    return Response.json({ error: "Invalid afterSequence" }, { status: 400 });
  }

  try {
    const [files, events] = await Promise.all([
      listIdealyMissionFiles({ missionId, request }),
      listIdealyMissionFileEvents({ afterSequence, missionId, request }),
    ]);
    const lastSequence = events.at(-1)?.sequence ?? afterSequence;

    return Response.json(
      { files, lastSequence },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Mission files fetch failed", error);
    return Response.json(
      { error: "Unable to load mission files" },
      { status: 502 }
    );
  }
}
