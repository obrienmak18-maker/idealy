import { auth } from "@/app/(auth)/auth";
import { createHash, randomUUID } from "node:crypto";
import {
  createIdealyMissionCheckpoint,
  listIdealyMissionCheckpoints,
  listIdealyMissionFiles,
} from "@/lib/idealy/backend-adapter";
import type { IdealyMissionCheckpoint } from "@/lib/idealy/backend-adapter";
import type { CheckpointSnapshot } from "@/lib/idealy/checkpoints";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toPublicCheckpoint(snapshot: IdealyMissionCheckpoint): CheckpointSnapshot {
  return {
    checksum: snapshot.checksum,
    createdAt: snapshot.createdAt,
    description: snapshot.description,
    fileCount: snapshot.fileCount,
    files: snapshot.files.map(({ content: _content, language: _language, status: _status, ...file }) => file),
    id: snapshot.id,
    missionId: snapshot.missionId,
    name: snapshot.name,
  };
}

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

  try {
    const checkpoints = await listIdealyMissionCheckpoints({ missionId, request });
    return Response.json(
      { checkpoints: checkpoints.map(toPublicCheckpoint) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Checkpoint listing failed", error);
    return Response.json({ error: "Impossible de lire les checkpoints." }, { status: 502 });
  }
}

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

  try {
    const files = await listIdealyMissionFiles({ missionId, request });
    const latestFiles = files.filter(
      (file, index) => files.findIndex((candidate) => candidate.path === file.path) === index
    );
    const body = (await request.json().catch(() => null)) as {
      description?: string;
      name?: string;
    } | null;
    const snapshot: IdealyMissionCheckpoint = {
      checksum: createHash("sha256")
        .update(JSON.stringify(latestFiles.map(({ checksum, content, path, version }) => ({ checksum, content, path, version }))))
        .digest("hex"),
      createdAt: new Date().toISOString(),
      ...(body?.description?.trim() ? { description: body.description.trim() } : {}),
      fileCount: latestFiles.length,
      files: latestFiles.map((file) => ({
        ...(file.checksum ? { checksum: file.checksum } : {}),
        content: file.content,
        ...(file.language ? { language: file.language } : {}),
        path: file.path,
        status: file.status,
        version: file.version,
      })),
      id: randomUUID(),
      missionId,
      name: body?.name?.trim() || `Checkpoint du ${new Date().toLocaleTimeString("fr-FR")}`,
    };
    const saved = await createIdealyMissionCheckpoint({ missionId, request, snapshot });
    return Response.json({ checkpoint: toPublicCheckpoint(saved), success: true }, { status: 201 });
  } catch (error) {
    console.error("Checkpoint creation failed", error);
    return Response.json(
      { error: "Unable to create checkpoint snapshot" },
      { status: 502 }
    );
  }
}
