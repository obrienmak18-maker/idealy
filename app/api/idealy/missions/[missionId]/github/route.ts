import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
import { listIdealyMissionFiles } from "@/lib/idealy/backend-adapter";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!accessToken || !anonKey) {
    return Response.json({ error: "Une session Idealy authentifiée est requise." }, { status: 401 });
  }

  const { missionId } = await params;
  if (!UUID_PATTERN.test(missionId)) {
    return Response.json({ error: "Invalid mission id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    branch?: unknown;
    confirmationToken?: unknown;
    owner?: unknown;
    repo?: unknown;
  } | null;

  const owner = typeof body?.owner === "string" ? body.owner.trim() : "";
  const repo = typeof body?.repo === "string" ? body.repo.trim() : "";
  const branch =
    typeof body?.branch === "string" && body.branch.trim()
      ? body.branch.trim()
      : `idealy/mission-${missionId.slice(0, 8)}`;
  const confirmationToken =
    typeof body?.confirmationToken === "string"
      ? body.confirmationToken
      : "";

  if (!owner || !repo) {
    return Response.json(
      { error: "Le propriétaire et le dépôt GitHub sont obligatoires." },
      { status: 400 },
    );
  }

  if (!confirmationToken || confirmationToken.length < 32) {
    return Response.json(
      {
        code: "CONFIRMATION_REQUIRED",
        error: "Une confirmation GitHub à usage unique est requise.",
      },
      { status: 409 },
    );
  }

  try {
    const files = await listIdealyMissionFiles({ missionId, request });
    if (files.length === 0) {
      return Response.json(
        { error: "Aucun fichier généré dans cette mission pour le moment." },
        { status: 400 },
      );
    }

    const response = await fetch(getIdealySupabaseFunctionUrl("github-sync"), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        confirmationToken,
        files: Object.fromEntries(
          files.map((file) => [file.path, file.content]),
        ),
        missionId,
        owner,
        repo,
        branch,
        projectName: repo,
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    return Response.json(
      payload ?? { error: "GitHub sync returned an empty response." },
      { status: response.status },
    );
  } catch (error) {
    console.error("GitHub sync failed", error);
    return Response.json(
      { error: "Échec de la synchronisation GitHub." },
      { status: 502 },
    );
  }
}
