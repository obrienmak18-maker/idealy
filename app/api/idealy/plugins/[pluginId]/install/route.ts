import { getToken } from "next-auth/jwt";
import { createClient } from "@supabase/supabase-js";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { pluginRegistry } from "@/lib/idealy/plugins";
import { resolveGrantablePermissions } from "@/lib/idealy/plugins/permissions";
import {
  getVerifiedUserPlan,
  listPluginInstallations,
} from "@/lib/idealy/plugins/service";

function json(body: unknown, status: number) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pluginId: string }> },
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
    return json({ error: "Plugin inconnu." }, 404);
  }

  const body = (await request.json().catch(() => null)) as {
    permissions?: unknown;
    configuration?: unknown;
    confirmed?: unknown;
    workspaceId?: unknown;
  } | null;

  if (body?.confirmed !== true) {
    return json(
      {
        code: "CONFIRMATION_REQUIRED",
        error: "L'installation et l'autorisation du plugin nécessitent une confirmation explicite.",
        requestedPermissions: manifest.requestedPermissions,
      },
      409,
    );
  }

  const { error: planError, plan } = await getVerifiedUserPlan({ accessToken });
  if (planError || !plan) {
    return json({ error: planError ?? "Plan indisponible." }, 503);
  }

  const { error: existingError, installations } =
    await listPluginInstallations({ accessToken });
  if (existingError) return json({ error: existingError }, 503);

  const requestedPermissions = resolveGrantablePermissions({
    manifest,
    requested: body?.permissions,
  });

  if (requestedPermissions.length !== manifest.requestedPermissions.length) {
    return json(
      {
        code: "PERMISSIONS_REQUIRED",
        error: "Toutes les permissions déclarées par ce plugin doivent être explicitement approuvées avant installation.",
        requestedPermissions: manifest.requestedPermissions,
        missingPermissions: manifest.requestedPermissions.filter(
          (permission) => !requestedPermissions.includes(permission),
        ),
      },
      409,
    );
  }

  const installation = installations.find(
    (entry) => entry.pluginId === pluginId,
  );

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase server is not configured." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const userResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
    {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY?.trim() ?? "",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const user = (await userResponse.json().catch(() => null)) as { id?: string } | null;
  if (!userResponse.ok || !user?.id) {
    return json({ error: "La session Supabase n'a pas pu être vérifiée." }, 401);
  }

  const connectorProvider = manifest.requirements.connectorProvider ?? null;
  let connectorActive = true;
  if (connectorProvider) {
    const { data: connector, error } = await admin
      .from("user_integrations")
      .select("provider,status,scopes")
      .eq("user_id", user.id)
      .eq("provider", connectorProvider)
      .maybeSingle();
    if (error) return json({ error: "État du connecteur indisponible." }, 503);
    connectorActive = connector?.status === "active";

    if (!connectorActive) {
      return json(
        {
          code: "CONNECTOR_REQUIRED",
          error: `Le connecteur ${connectorProvider} doit être connecté avant l'installation.`,
        },
        409,
      );
    }

    const scopes = new Set<string>(
      Array.isArray(connector.scopes)
        ? connector.scopes.filter((scope): scope is string => typeof scope === "string")
        : [],
    );
    const missingScopes = manifest.requirements.requiredScopes.filter(
      (scope) => !scopes.has(scope),
    );
    if (missingScopes.length > 0) {
      return json(
        {
          code: "SCOPES_REQUIRED",
          error: "Le connecteur ne possède pas tous les scopes nécessaires.",
          missingScopes,
        },
        409,
      );
    }
  }

  const configuration =
    body?.configuration &&
    typeof body.configuration === "object" &&
    !Array.isArray(body.configuration)
      ? body.configuration
      : {};

  const baseRecord = {
    user_id: user.id,
    plugin_id: manifest.id,
    plugin_version: manifest.version,
    state: "authorized",
    granted_permissions: requestedPermissions,
    connector_provider: connectorProvider,
    configuration,
    installed_at: new Date().toISOString(),
    configured_at: new Date().toISOString(),
    authorized_at: new Date().toISOString(),
    disabled_at: null,
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error: saveError } = await admin
    .from("plugin_installations")
    .upsert(baseRecord, { onConflict: "user_id,plugin_id" })
    .select("id,plugin_id,plugin_version,state,granted_permissions,connector_provider")
    .single();

  if (saveError || !saved) {
    console.error("plugin install failed", saveError);
    return json({ error: "Impossible d'enregistrer l'installation du plugin." }, 500);
  }

  const eventType = installation ? "plugin_authorized" : "plugin_installed";
  await admin.from("plugin_events").insert({
    user_id: user.id,
    plugin_id: manifest.id,
    event_type: eventType,
    from_state: installation?.state ?? "discovered",
    to_state: "authorized",
    payload: {
      plan,
      grantedPermissions: requestedPermissions,
      connectorProvider,
      reauthorized: Boolean(installation),
    },
  });

  return json(
    {
      installed: true,
      state: "authorized",
      pluginId: manifest.id,
      pluginVersion: manifest.version,
      grantedPermissions: requestedPermissions,
    },
    201,
  );
}
