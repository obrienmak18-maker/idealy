import "server-only";
import { PLUGIN_MANIFESTS } from "./catalog";
import { sanitizeGrantedPermissions } from "./permissions";
import {
  type EnvironmentFacts,
  missingRequirements,
  resolveState,
  toPublicPlugin,
} from "./registry";
import type {
  PluginInstallation,
  PluginLifecycleState,
  PublicPlugin,
  ValidPluginManifest,
} from "./types";

/**
 * Server-only bridge between the plugin engine and Supabase.
 *
 * Reads go through PostgREST with the caller's own JWT, so RLS is what actually
 * decides whether a user may see a row. Writes never happen here: they belong
 * to the Edge Function that owns the service role.
 */

export const PLUGIN_TABLES = {
  events: "plugin_events",
  executions: "plugin_executions",
  installations: "plugin_installations",
} as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseConfig = {
  accessToken: string;
  anonKey: string;
  supabaseUrl: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return null;
  }
  return { accessToken: "", anonKey, supabaseUrl };
}

async function restGet<T>(
  config: SupabaseConfig,
  path: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        apikey: config.anonKey,
      },
    });
    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` };
    }
    return { data: (await response.json()) as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

function mapInstallationRow(row: Record<string, unknown>): PluginInstallation {
  return {
    authorizedAt: (row.authorized_at as string | null) ?? null,
    configuration: (row.configuration as Record<string, unknown>) ?? {},
    configuredAt: (row.configured_at as string | null) ?? null,
    connectorProvider: (row.connector_provider as string | null) ?? null,
    disabledAt: (row.disabled_at as string | null) ?? null,
    // Stored strings are re-validated: a row can never widen the permission
    // vocabulary the engine enforces.
    grantedPermissions: sanitizeGrantedPermissions(row.granted_permissions),
    installedAt: (row.installed_at as string | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
    pluginId: String(row.plugin_id),
    pluginVersion: String(row.plugin_version),
    state: row.state as PluginLifecycleState,
    userId: String(row.user_id),
    workspaceId: (row.workspace_id as string | null) ?? null,
  };
}

/** Reads the caller's own installations. RLS guarantees the user boundary. */
export async function listPluginInstallations({
  accessToken,
}: {
  accessToken: string;
}): Promise<{ error: string | null; installations: PluginInstallation[] }> {
  const base = getSupabaseConfig();
  if (!base) {
    return { error: "Supabase is not configured.", installations: [] };
  }
  const { data, error } = await restGet<Record<string, unknown>[]>(
    { ...base, accessToken },
    `${PLUGIN_TABLES.installations}?select=*&order=created_at`
  );
  if (error || !data) {
    return {
      error: error ?? "Unable to read plugin installations.",
      installations: [],
    };
  }
  return { error: null, installations: data.map(mapInstallationRow) };
}

/** Recent executions, for the audit surface. Never returns another user's rows. */
export async function listPluginExecutions({
  accessToken,
  limit = 25,
  missionId,
}: {
  accessToken: string;
  limit?: number;
  missionId?: string | null;
}): Promise<{ error: string | null; executions: Record<string, unknown>[] }> {
  const base = getSupabaseConfig();
  if (!base) {
    return { error: "Supabase is not configured.", executions: [] };
  }
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const missionFilter =
    missionId && UUID_PATTERN.test(missionId)
      ? `&mission_id=eq.${missionId}`
      : "";
  const { data, error } = await restGet<Record<string, unknown>[]>(
    { ...base, accessToken },
    `${PLUGIN_TABLES.executions}?select=*&order=created_at.desc&limit=${safeLimit}${missionFilter}`
  );
  return { error: error ?? null, executions: data ?? [] };
}

/**
 * Builds the environment facts for a plugin from real, observable state.
 *
 * A secret counts as present only when the server actually holds it, and a
 * connector counts as active only when a verified row exists. This is what
 * keeps the UI from claiming `CONNECTED` without a real credential.
 */
export async function buildEnvironmentFacts({
  accessToken,
  manifest,
}: {
  accessToken: string;
  manifest: ValidPluginManifest;
}): Promise<EnvironmentFacts> {
  const presentSecretEnvNames = new Set(
    manifest.requirements.requiredSecretEnvNames.filter((name) =>
      Boolean(process.env[name]?.trim())
    )
  );

  let grantedScopes = new Set<string>();
  let connectorActive = false;
  const base = getSupabaseConfig();
  const provider = manifest.requirements.connectorProvider;

  if (base && provider) {
    const { data } = await restGet<Record<string, unknown>[]>(
      { ...base, accessToken },
      `user_integrations?select=scopes,status&provider=eq.${encodeURIComponent(provider)}&limit=1`
    );
    const row = data?.[0];
    if (row) {
      connectorActive = row.status === "active";
      grantedScopes = new Set((row.scopes as string[]) ?? []);
    }
  }

  return {
    connectorActive,
    grantedScopes,
    hasConfiguration: true,
    presentSecretEnvNames,
  };
}

/** Projects every catalogued plugin into its honest, browser-safe state. */
export async function describePlugins({
  accessToken,
  plan,
}: {
  accessToken: string;
  plan: "free" | "pro" | "business";
}): Promise<{ error: string | null; plugins: PublicPlugin[] }> {
  const { error, installations } = await listPluginInstallations({
    accessToken,
  });
  if (error && installations.length === 0) {
    return { error, plugins: [] };
  }

  const byPluginId = new Map(
    installations.map((installation) => [installation.pluginId, installation])
  );

  const plugins = await Promise.all(
    PLUGIN_MANIFESTS.map(async (manifest) => {
      const installation = byPluginId.get(manifest.id) ?? null;
      const facts = await buildEnvironmentFacts({ accessToken, manifest });
      // A plugin counts as configured once the user stored its configuration.
      facts.hasConfiguration = installation !== null;
      return toPublicPlugin({ facts, installation, manifest, userPlan: plan });
    })
  );

  return { error: null, plugins };
}

/** Diagnostics used by the health endpoint to explain configuration gaps. */
export function explainPluginReadiness(
  manifest: ValidPluginManifest,
  facts: EnvironmentFacts
) {
  return {
    id: manifest.id,
    missing: missingRequirements({ facts, manifest }),
    state: resolveState({ facts, installation: null, manifest }),
  };
}

export { findPluginManifest } from "./catalog";
