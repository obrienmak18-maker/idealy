import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { pluginRegistry } from "@/lib/idealy/plugins";
import { authorizeToolExecution } from "@/lib/idealy/plugins/permissions";
import {
  describePlugins,
  getVerifiedUserPlan,
  listPluginExecutions,
  listPluginInstallations,
} from "@/lib/idealy/plugins/service";

const MAX_INPUT_BYTES = 64 * 1024;

function json(body: unknown, status: number) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

/**
 * GET: the caller's own execution history for this plugin.
 * POST: asks the permission gate whether the tool may run.
 *
 * The provider itself lives behind an Edge Function; this route only decides
 * whether the call is admissible. A denial is returned as a denial, never as a
 * successful no-op.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const { pluginId } = await params;

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
    return json({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const manifest = pluginRegistry.get(pluginId);
  if (!manifest) {
    return json({ error: `Le plugin "${pluginId}" est inconnu.` }, 404);
  }

  const body = (await request.json().catch(() => null)) as {
    confirmed?: unknown;
    missionId?: unknown;
    permissions?: unknown;
    taskId?: unknown;
    toolId?: unknown;
    workspaceId?: unknown;
    confirmationToken?: unknown;
    idempotencyKey?: unknown;
  } | null;

  if (!body || typeof body.toolId !== "string") {
    return json({ error: "Un toolId est requis." }, 400);
  }

  // An oversized payload is rejected before it reaches any provider.
  const inputSize = JSON.stringify(body).length;
  if (inputSize > MAX_INPUT_BYTES) {
    return json({ error: "La charge utile est trop volumineuse." }, 413);
  }

  const { error: readError, installations } = await listPluginInstallations({
    accessToken,
  });
  if (readError) {
    return json({ error: readError }, 503);
  }

  const installation =
    installations.find((entry) => entry.pluginId === pluginId) ?? null;
  const installedPluginIds = new Set(
    installations.map((entry) => entry.pluginId)
  );

  const { error: planError, plan } = await getVerifiedUserPlan({ accessToken });
  if (planError || !plan) {
    return json(
      { error: planError ?? "Le plan n’a pas pu être vérifié.", status: "unavailable" },
      503
    );
  }

  // Re-evaluate connector authorization, scopes, server configuration and
  // installation state for this request. A stored permission grant alone is
  // never proof that the provider is currently available.
  const { error: readinessError, plugins } = await describePlugins({
    accessToken,
    installations,
    plan,
  });
  if (readinessError) {
    return json({ error: readinessError, status: "unavailable" }, 503);
  }
  const readiness = plugins.find((plugin) => plugin.id === pluginId);
  if (!readiness?.available) {
    return json(
      {
        code: "PLUGIN_NOT_AVAILABLE",
        error: "Le connecteur n’est pas prêt pour cette exécution.",
        missingRequirements: readiness?.missingRequirements ?? [],
        status: "denied",
      },
      409
    );
  }

  const decision = authorizeToolExecution({
    confirmed: body.confirmed === true,
    grantedPermissions: installation?.grantedPermissions ?? [],
    installation,
    installedPluginIds,
    manifest,
    toolId: body.toolId,
    userPlan: plan,
  });

  if (!decision.allowed) {
    return json(
      {
        code: decision.code,
        error: decision.reason,
        missingPermissions: decision.missingPermissions,
        status: "denied",
      },
      decision.code === "PLUGIN_NOT_AVAILABLE" ? 409 : 403
    );
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
    const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anonKey) {
      return json({ error: "Le moteur plugin n’est pas configuré.", status: "unavailable" }, 503);
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/plugin-engine`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
          "Content-Type": "application/json",
          "x-client-info": "idealy-plugin-executor",
        },
        body: JSON.stringify({
          action: "execute",
          pluginId: manifest.id,
          toolId: body.toolId,
          confirmed: body.confirmed === true,
          input: (body as Record<string, unknown>).input ?? {},
          missionId: body.missionId,
          taskId: body.taskId,
          workspaceId: body.workspaceId,
          confirmationToken: body.confirmationToken,
          idempotencyKey: body.idempotencyKey,
        }),
      }
    );
    const payload = await response.json().catch(() => null);
    return json(payload ?? { error: "Réponse plugin invalide." }, response.status);
  } catch {
    return json({ error: "Le moteur plugin est momentanément indisponible.", status: "unavailable" }, 502);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const { pluginId } = await params;

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
    return json({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  if (!pluginRegistry.get(pluginId)) {
    return json({ error: `Le plugin "${pluginId}" est inconnu.` }, 404);
  }

  const { error, executions } = await listPluginExecutions({ accessToken });
  if (error) {
    return json({ error }, 503);
  }
  return json(
    { executions: executions.filter((row) => row.plugin_id === pluginId) },
    200
  );
}
