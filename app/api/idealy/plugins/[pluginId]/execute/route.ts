import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { pluginRegistry } from "@/lib/idealy/plugins";
import { authorizeToolExecution } from "@/lib/idealy/plugins/permissions";
import {
  listPluginExecutions,
  listPluginInstallations,
} from "@/lib/idealy/plugins/service";
import { type IdealyPlan, idealyPlans } from "@/lib/idealy/product-contract";

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

  const planParam = new URL(request.url).searchParams.get("plan");
  const plan: IdealyPlan = idealyPlans.includes(planParam as IdealyPlan)
    ? (planParam as IdealyPlan)
    : "free";

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

  return json(
    {
      admissible: true,
      pluginId: manifest.id,
      pluginVersion: manifest.version,
      toolId: body.toolId,
    },
    200
  );
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
