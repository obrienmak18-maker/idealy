import { auth } from "@/app/(auth)/auth";
import { normalizeMissionFilePath } from "@/lib/idealy/mission-files";
import { saveIdealyMissionFile } from "@/lib/idealy/backend-adapter";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_BYTES = 1_000_000;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { missionId } = await params;
  if (!UUID_PATTERN.test(missionId)) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as {
    path?: unknown;
    content?: unknown;
    expectedVersion?: unknown;
  } | null;

  if (typeof body?.path !== "string" || typeof body.content !== "string") {
    return Response.json(
      { error: "Le chemin et le contenu du fichier sont requis." },
      { status: 400 },
    );
  }

  let path: string;
  try {
    path = normalizeMissionFilePath(body.path);
  } catch {
    return Response.json({ error: "Chemin de fichier invalide." }, { status: 400 });
  }

  if (new TextEncoder().encode(body.content).byteLength > MAX_FILE_BYTES) {
    return Response.json({ error: "Le fichier dépasse la limite de 1 Mo." }, { status: 413 });
  }

  if (
    !Number.isSafeInteger(body.expectedVersion) ||
    Number(body.expectedVersion) < 1
  ) {
    return Response.json({ error: "Version de fichier invalide." }, { status: 400 });
  }

  try {
    const result = await saveIdealyMissionFile({
      content: body.content,
      expectedVersion: Number(body.expectedVersion),
      missionId,
      path,
      request,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 502;
    const message =
      error instanceof Error
        ? error.message
        : "L’enregistrement du fichier a échoué.";
    const code =
      error && typeof error === "object" && "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;
    return Response.json(
      { error: message, ...(code ? { code } : {}) },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
