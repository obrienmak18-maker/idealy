import { auth } from "@/app/(auth)/auth";
import { listIdealyMissionFiles } from "@/lib/idealy/backend-adapter";
import { syncMissionToGitHub } from "@/lib/idealy/checkpoints";

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
    branch?: string;
    commitMessage?: string;
    owner?: string;
    repo?: string;
    token?: string;
  } | null;

  const owner = body?.owner?.trim();
  const repo = body?.repo?.trim();
  const branch = body?.branch?.trim() || `idealy-mission-${missionId.slice(0, 8)}`;
  const commitMessage = body?.commitMessage?.trim() || `feat(idealy): export mission ${missionId.slice(0, 8)}`;

  // Token: peut être passé directement ou lu depuis les variables d'environnement / intégrations
  const token = body?.token?.trim() || process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  if (!token) {
    return Response.json(
      {
        actionRequired: "CONNECT_GITHUB",
        error: "Aucun token GitHub disponible. Veuillez renseigner un Personal Access Token ou connecter GitHub dans vos intégrations.",
      },
      { status: 400 }
    );
  }

  if (!owner || !repo) {
    return Response.json(
      { error: "Le propriétaire (owner) et le nom du dépôt (repo) sont obligatoires." },
      { status: 400 }
    );
  }

  try {
    const rawFiles = await listIdealyMissionFiles({ missionId, request });

    if (rawFiles.length === 0) {
      return Response.json(
        { error: "Aucun fichier généré dans cette mission pour le moment." },
        { status: 400 }
      );
    }

    const syncResult = await syncMissionToGitHub({
      branch,
      commitMessage,
      files: rawFiles.map((f) => ({
        ...(f.checksum ? { checksum: f.checksum } : {}),
        content: f.content,
        id: f.id,
        ...(f.language ? { language: f.language } : {}),
        missionId: f.mission_id,
        path: f.path,
        status: f.status,
        version: f.version,
      })),
      owner,
      repo,
      token,
    });

    return Response.json(syncResult, { status: 200 });
  } catch (error) {
    console.error("GitHub sync failed", error);
    const message = error instanceof Error ? error.message : "Échec de la synchronisation GitHub";
    return Response.json({ error: message }, { status: 502 });
  }
}
