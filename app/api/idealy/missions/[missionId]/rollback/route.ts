import { auth } from "@/app/(auth)/auth";
import { restoreIdealyMissionCheckpoint } from "@/lib/idealy/backend-adapter";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
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

  const body = (await request.json().catch(() => null)) as {
    checkpointId?: string;
    filePath?: string;
    targetVersion?: number;
  } | null;

  if (!body?.checkpointId && !body?.targetVersion) {
    return Response.json(
      { error: "Veuillez fournir un checkpointId ou une targetVersion pour le rollback." },
      { status: 400 }
    );
  }

  if (!body.checkpointId) {
    return Response.json(
      { error: "La restauration par version n’est pas disponible sans checkpoint." },
      { status: 400 }
    );
  }

  try {
    const restored = await restoreIdealyMissionCheckpoint({
      checkpointId: body.checkpointId,
      missionId,
      request,
    });
    return Response.json({ ...restored, success: true });
  } catch (error) {
    console.error("Rollback execution failed", error);
    return Response.json({ error: "Impossible de restaurer ce checkpoint." }, { status: 502 });
  }
}
