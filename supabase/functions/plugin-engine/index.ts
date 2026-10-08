import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate } from "../_shared/auth.ts";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";
import { decryptIntegrationToken } from "../_shared/integrationCrypto.ts";

type Plan = "free" | "pro" | "business";

type Tool = {
  permissions: string[];
  risk: "read" | "write" | "publish" | "financial";
  requiresConfirmation: boolean;
};

type Manifest = {
  id: string;
  minimumPlan: Plan;
  provider: string | null;
  requiredScopes: string[];
  tools: Record<string, Tool>;
};

const M: Record<string, Manifest> = {
  github: {
    id: "github", minimumPlan: "free", provider: "github", requiredScopes: ["repo", "read:user"],
    tools: {
      "github-list-repositories": { permissions:["tool.execute","repository.read"], risk:"read", requiresConfirmation:false },
      "github-read-repository": { permissions:["tool.execute","repository.read"], risk:"read", requiresConfirmation:false },
      "github-create-branch": { permissions:["tool.execute","repository.write"], risk:"write", requiresConfirmation:true },
      "github-open-pull-request": { permissions:["tool.execute","repository.write"], risk:"write", requiresConfirmation:true },
    },
  },
  "google-drive": {
    id:"google-drive", minimumPlan:"free", provider:"google", requiredScopes:["https://www.googleapis.com/auth/drive.metadata.readonly"],
    tools:{
      "google-drive-list-drive-files": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
      "google-drive-read-drive-metadata": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
    },
  },
  vercel: {
    id:"vercel", minimumPlan:"free", provider:"vercel", requiredScopes:[],
    tools:{
      "vercel-list-projects": {permissions:["tool.execute","deployment.execute"],risk:"read",requiresConfirmation:false},
      "vercel-get-deployment": {permissions:["tool.execute","deployment.execute"],risk:"read",requiresConfirmation:false},
      "vercel-create-preview": {permissions:["tool.execute","deployment.execute"],risk:"publish",requiresConfirmation:true},
      "vercel-deploy-production": {permissions:["tool.execute","deployment.execute"],risk:"publish",requiresConfirmation:true},
    },
  },
  canva: {
    id:"canva", minimumPlan:"free", provider:"canva", requiredScopes:["design:meta:read","design:content:read","design:content:write","asset:read","asset:write"],
    tools:{
      "canva-list-designs": {permissions:["tool.execute","files.read"],risk:"read",requiresConfirmation:false},
      "canva-get-design": {permissions:["tool.execute","files.read"],risk:"read",requiresConfirmation:false},
      "canva-create-design": {permissions:["tool.execute","files.write","asset.generate"],risk:"write",requiresConfirmation:true},
      "canva-export-design": {permissions:["tool.execute","files.read"],risk:"write",requiresConfirmation:true},
    },
  },
  figma: {
    id:"figma", minimumPlan:"free", provider:"figma", requiredScopes:["file_content:read"],
    tools:{
      "figma-read-file": {permissions:["tool.execute","files.read"],risk:"read",requiresConfirmation:false},
      "figma-export-assets": {permissions:["tool.execute","files.read"],risk:"read",requiresConfirmation:false},
    },
  },
  notion: {
    id:"notion", minimumPlan:"free", provider:"notion", requiredScopes:[],
    tools:{
      "notion-search-pages": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
      "notion-read-page": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
      "notion-append-page": {permissions:["tool.execute","project.write"],risk:"write",requiresConfirmation:true},
    },
  },
  slack: {
    id:"slack", minimumPlan:"free", provider:"slack", requiredScopes:["channels:read","chat:write"],
    tools:{
      "slack-list-channels": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
      "slack-send-message": {permissions:["tool.execute","network.access"],risk:"write",requiresConfirmation:true},
    },
  },
  supabase: {
    id:"supabase", minimumPlan:"free", provider:null, requiredScopes: [],
    tools:{
      "supabase-read-mission": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
      "supabase-read-mission-files": {permissions:["tool.execute","files.read"],risk:"read",requiresConfirmation:false},
      "supabase-append-mission-event": {permissions:["tool.execute","project.write"],risk:"write",requiresConfirmation:true},
    },
  },
  stripe: {
    id:"stripe", minimumPlan:"free", provider:null, requiredScopes: [],
    tools:{
      "stripe-read-subscription": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
      "stripe-read-invoice": {permissions:["tool.execute","project.read"],risk:"read",requiresConfirmation:false},
    },
  },
};

const PLAN_RANK: Record<Plan, number> = { free:0, pro:1, business:2 };

function json(req: Request, body: unknown, status = 200) {
  return corsResponse(body, status, req);
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{32,180}$/;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(stableJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => JSON.stringify(key) + ":" + stableJson(item));
    return "{" + entries.join(",") + "}";
  }
  return JSON.stringify(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function pluginPayloadDigest({
  input,
  missionId,
  pluginId,
  toolId,
}: {
  input: Record<string, unknown>;
  missionId: string;
  pluginId: string;
  toolId: string;
}) {
  return sha256(
    stableJson({
      input,
      missionId,
      pluginId,
      toolId,
    }),
  );
}

async function requireConnectorReady(
  admin: ReturnType<typeof createClient>,
  userId: string,
  manifest: Manifest,
) {
  if (!manifest.provider) return null;

  const { data: integration, error } = await admin
    .from("user_integrations")
    .select("id,status,scopes")
    .eq("user_id", userId)
    .eq("provider", manifest.provider)
    .maybeSingle();

  if (error || !integration || integration.status !== "active") {
    throw new Error("CONNECTOR_NOT_ACTIVE");
  }

  const grantedScopes = new Set<string>(
    Array.isArray(integration.scopes)
      ? integration.scopes.filter((scope): scope is string => typeof scope === "string")
      : [],
  );

  const missingScopes = manifest.requiredScopes.filter((scope) =>
    !grantedScopes.has(scope)
  );

  if (missingScopes.length > 0) {
    throw new Error(`CONNECTOR_SCOPES_MISSING:${missingScopes.join(",")}`);
  }

  return integration.id as string;
}

async function readToken(admin: ReturnType<typeof createClient>, userId: string, provider: string) {
  const { data: integration, error } = await admin
    .from("user_integrations")
    .select("id,status")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !integration || integration.status !== "active") {
    throw new Error("CONNECTOR_NOT_ACTIVE");
  }
  const { data: credential } = await admin
    .from("integration_credentials")
    .select("ciphertext,iv")
    .eq("integration_id", integration.id)
    .maybeSingle();
  if (!credential) throw new Error("CONNECTOR_CREDENTIAL_MISSING");

  const decrypted = await decryptIntegrationToken(
    credential.ciphertext,
    credential.iv,
  );

  try {
    const parsed = JSON.parse(decrypted) as { accessToken?: unknown };
    if (typeof parsed.accessToken === "string" && parsed.accessToken.length > 0) {
      return parsed.accessToken;
    }
  } catch {
    // Older connector credentials may contain the raw token string.
  }

  if (decrypted.trim().length === 0) {
    throw new Error("CONNECTOR_CREDENTIAL_INVALID");
  }

  return decrypted;
}

async function providerFetch(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : `PROVIDER_HTTP_${response.status}`;
    throw new Error(message);
  }

  if (
    data &&
    typeof data === "object" &&
    "ok" in data &&
    (data as { ok?: unknown }).ok === false
  ) {
    const message =
      "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? String((data as { error: string }).error)
        : "PROVIDER_RESPONSE_NOT_OK";
    throw new Error(message);
  }

  return data;
}

async function executeProvider(
  admin: ReturnType<typeof createClient>,
  userId: string,
  pluginId: string,
  toolId: string,
  input: Record<string, unknown>,
  req: Request,
) {
  if (pluginId === "supabase") {
    const missionId = typeof input.missionId === "string" ? input.missionId : "";
    if (!missionId) throw new Error("MISSION_ID_REQUIRED");
    if (toolId === "supabase-read-mission") {
      const { data, error } = await admin.from("missions").select("*").eq("id", missionId).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("MISSION_NOT_FOUND");
      return data;
    }
    if (toolId === "supabase-read-mission-files") {
      const { data, error } = await admin.from("mission_files").select("path,language,checksum,status,version,content").eq("mission_id", missionId).order("path");
      if (error) throw error;
      return data ?? [];
    }
    if (toolId === "supabase-append-mission-event") {
      const type = typeof input.eventType === "string" ? input.eventType : "task_progress";
      const message = typeof input.message === "string" ? input.message : "Plugin event";
      const { data, error } = await admin.rpc("append_orchestration_event", {
        p_mission_id: missionId,
        p_user_id: userId,
        p_event_type: type,
        p_message: message,
        p_task_key: typeof input.taskKey === "string" ? input.taskKey : null,
        p_payload: safeObject(input.payload),
        p_idempotency_key: typeof input.idempotencyKey === "string" ? input.idempotencyKey : crypto.randomUUID(),
      });
      if (error) throw error;
      return data;
    }
  }

  if (pluginId === "stripe") {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!stripeSecret) throw new Error("STRIPE_NOT_CONFIGURED");
    const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
    if (!profile?.stripe_customer_id) throw new Error("BILLING_PROFILE_NOT_FOUND");
    if (toolId === "stripe-read-subscription") {
      return providerFetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(profile.stripe_customer_id)}&limit=10`, stripeSecret, {
        headers: { Authorization: `Bearer ${stripeSecret}` },
      });
    }
    if (toolId === "stripe-read-invoice") {
      return providerFetch(`https://api.stripe.com/v1/invoices?customer=${encodeURIComponent(profile.stripe_customer_id)}&limit=10`, stripeSecret, {
        headers: { Authorization: `Bearer ${stripeSecret}` },
      });
    }
  }

  const manifest = M[pluginId];
  const provider = manifest?.provider;
  if (!provider) throw new Error("UNSUPPORTED_PLUGIN_PROVIDER");

  const token = await readToken(admin, userId, provider);

  switch (toolId) {
    case "github-list-repositories":
      return providerFetch("https://api.github.com/user/repos?per_page=100&sort=updated", token, {
        headers: {"X-GitHub-Api-Version":"2022-11-28","Accept":"application/vnd.github+json"},
      });
    case "github-read-repository": {
      const owner = String(input.owner ?? "");
      const repo = String(input.repo ?? "");
      if (!owner || !repo) throw new Error("OWNER_AND_REPO_REQUIRED");
      return providerFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token, {
        headers: {"X-GitHub-Api-Version":"2022-11-28","Accept":"application/vnd.github+json"},
      });
    }
    case "github-create-branch": {
      const owner = String(input.owner ?? "");
      const repo = String(input.repo ?? "");
      const branch = String(input.branch ?? "");
      const fromBranch = String(input.fromBranch ?? "main");
      if (!owner || !repo || !branch) throw new Error("BRANCH_INPUT_REQUIRED");
      const base = await providerFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(fromBranch)}`, token, {
        headers: {"X-GitHub-Api-Version":"2022-11-28","Accept":"application/vnd.github+json"},
      });
      return providerFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, token, {
        method:"POST",
        headers: {"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json","Accept":"application/vnd.github+json"},
        body: JSON.stringify({ref:`refs/heads/${branch}`,sha:base.object.sha}),
      });
    }
    case "github-open-pull-request": {
      const owner = String(input.owner ?? "");
      const repo = String(input.repo ?? "");
      const head = String(input.head ?? "");
      const base = String(input.base ?? "main");
      const title = String(input.title ?? "");
      const body = String(input.body ?? "");
      if (!owner || !repo || !head || !title) throw new Error("PULL_REQUEST_INPUT_REQUIRED");
      return providerFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, token, {
        method:"POST",
        headers: {"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json","Accept":"application/vnd.github+json"},
        body: JSON.stringify({head,base,title,body}),
      });
    }
    case "google-drive-list-drive-files": {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("pageSize", String(Math.min(Number(input.pageSize ?? 50) || 50, 100)));
      url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken");
      if (typeof input.query === "string" && input.query.trim()) url.searchParams.set("q", input.query.trim());
      return providerFetch(url.toString(), token);
    }
    case "google-drive-read-drive-metadata": {
      const fileId = String(input.fileId ?? "");
      if (!fileId) throw new Error("FILE_ID_REQUIRED");
      return providerFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,modifiedTime,webViewLink,parents,size,owners`, token);
    }
    case "vercel-list-projects":
      return providerFetch("https://api.vercel.com/v9/projects?limit=100", token);
    case "vercel-get-deployment": {
      const id = String(input.id ?? input.url ?? "");
      if (!id) throw new Error("DEPLOYMENT_ID_REQUIRED");
      return providerFetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(id)}`, token);
    }
    case "canva-list-designs":
      return providerFetch("https://api.canva.com/rest/v1/designs?limit=100", token);
    case "canva-get-design": {
      const id = String(input.designId ?? "");
      if (!id) throw new Error("DESIGN_ID_REQUIRED");
      return providerFetch(`https://api.canva.com/rest/v1/designs/${encodeURIComponent(id)}`, token);
    }
    case "canva-create-design": {
      const title = typeof input.title === "string" ? input.title.slice(0, 255) : undefined;
      const designType = safeObject(input.designType);
      const assetId = typeof input.assetId === "string" ? input.assetId : undefined;
      const name = typeof designType.name === "string" ? designType.name : "doc";
      const payload = {
        type: "type_and_asset",
        design_type: { type: "preset", name },
        ...(assetId ? { asset_id: assetId } : {}),
        ...(title ? { title } : {}),
      };
      return providerFetch("https://api.canva.com/rest/v1/designs", token, {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload),
      });
    }
    case "canva-export-design": {
      const designId = String(input.designId ?? "");
      const format = safeObject(input.format);
      const formatType = typeof format.type === "string" ? format.type : "pdf";
      if (!designId) throw new Error("DESIGN_ID_REQUIRED");
      return providerFetch("https://api.canva.com/rest/v1/exports", token, {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          design_id: designId,
          format: {
            type: formatType,
            ...(typeof format.size === "string" ? { size: format.size } : {}),
            ...(Array.isArray(format.pages) ? { pages: format.pages } : {}),
          },
        }),
      });
    }
    case "figma-read-file": {
      const key = String(input.fileKey ?? "");
      if (!key) throw new Error("FIGMA_FILE_KEY_REQUIRED");
      return providerFetch(`https://api.figma.com/v1/files/${encodeURIComponent(key)}`, token);
    }
    case "figma-export-assets": {
      const key = String(input.fileKey ?? "");
      const ids = typeof input.ids === "string" ? input.ids : "";
      if (!key || !ids) throw new Error("FIGMA_FILE_AND_NODE_IDS_REQUIRED");
      const url = new URL(`https://api.figma.com/v1/images/${encodeURIComponent(key)}`);
      url.searchParams.set("ids", ids);
      url.searchParams.set("format", typeof input.format === "string" ? input.format : "png");
      if (typeof input.scale === "number") url.searchParams.set("scale", String(Math.min(Math.max(input.scale, 0.01), 4)));
      return providerFetch(url.toString(), token);
    }
    case "notion-search-pages":
      return providerFetch("https://api.notion.com/v1/search", token, {
        method:"POST",
        headers: {"Content-Type":"application/json","Notion-Version":"2022-06-28"},
        body: JSON.stringify({
          query: typeof input.query === "string" ? input.query : undefined,
          page_size: Math.min(Number(input.pageSize ?? 50) || 50, 100),
        }),
      });
    case "notion-read-page": {
      const id = String(input.pageId ?? "");
      if (!id) throw new Error("NOTION_PAGE_ID_REQUIRED");
      return providerFetch(`https://api.notion.com/v1/pages/${encodeURIComponent(id)}`, token, {
        headers: {"Notion-Version":"2022-06-28"},
      });
    }
    case "notion-append-page": {
      const id = String(input.pageId ?? "");
      const text = String(input.text ?? "");
      if (!id || !text) throw new Error("NOTION_PAGE_AND_TEXT_REQUIRED");
      return providerFetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(id)}/children`, token, {
        method:"PATCH",
        headers: {"Content-Type":"application/json","Notion-Version":"2022-06-28"},
        body: JSON.stringify({children:[{object:"block",type:"paragraph",paragraph:{rich_text:[{type:"text",text:{content:text.slice(0,2000)}}]}}]}),
      });
    }
    case "slack-list-channels":
      return providerFetch("https://slack.com/api/conversations.list?limit=100&exclude_archived=true", token);
    case "slack-send-message": {
      const channel = String(input.channel ?? "");
      const text = String(input.text ?? "");
      if (!channel || !text) throw new Error("SLACK_CHANNEL_AND_TEXT_REQUIRED");
      return providerFetch("https://slack.com/api/chat.postMessage", token, {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({channel,text:text.slice(0,40000)}),
      });
    }
    default:
      if (pluginId === "vercel" && (toolId === "vercel-create-preview" || toolId === "vercel-deploy-production")) {
        const fn = toolId === "vercel-create-preview" ? "vercel-deploy" : "vercel-deploy";
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const accessToken = req.headers.get("Authorization") ?? "";
        if (!supabaseUrl || !anonKey || !accessToken) throw new Error("VERCEL_DEPLOY_CONFIG_MISSING");
        return providerFetch(`${supabaseUrl}/functions/v1/${fn}`, accessToken.replace(/^Bearer /i,""), {
          method:"POST",
          headers: {"Content-Type":"application/json","Authorization":accessToken,"apikey":anonKey},
          body: JSON.stringify({
            missionId: typeof input.missionId === "string" ? input.missionId : undefined,
            confirmationToken: typeof input.confirmationToken === "string" ? input.confirmationToken : undefined,
            projectName: typeof input.projectName === "string" ? input.projectName : undefined,
            target: toolId === "vercel-deploy-production" ? "production" : "preview",
          }),
        });
      }
      throw new Error("TOOL_NOT_IMPLEMENTED");
  }
}

async function currentPlan(admin: ReturnType<typeof createClient>, userId: string): Promise<Plan> {
  const { data } = await admin.from("subscriptions").select("status,plan").eq("user_id", userId).in("status",["active","trialing"]).order("current_period_end",{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
  const plan = data?.plan;
  return data && (plan === "business" || plan === "pro") ? plan : "free";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (request.method !== "POST") return json(request, { error:"Method not allowed" }, 405);

  const auth = await authenticate(request);
  if ("error" in auth) return json(request, {error:auth.error}, auth.status);

  const body = safeObject(await request.json().catch(() => ({})));
  const action = typeof body.action === "string" ? body.action : "execute";
  const pluginId = typeof body.pluginId === "string" ? body.pluginId : "";
  const manifest = M[pluginId];
  if (!manifest) return json(request,{error:"Unknown plugin."},404);

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  if (action === "install") {
    if (body.confirmed !== true) {
      return json(request, {
        code: "CONFIRMATION_REQUIRED",
        error: "Plugin installation requires explicit confirmation.",
      }, 409);
    }

    const plan = await currentPlan(admin, auth.user.id);
    if (PLAN_RANK[plan] < PLAN_RANK[manifest.minimumPlan]) {
      return json(request, { code: "PLAN_INSUFFICIENT", status: "denied" }, 403);
    }

    let connectorIntegrationId: string | null = null;
    try {
      connectorIntegrationId = await requireConnectorReady(admin, auth.user.id, manifest);
    } catch (error) {
      return json(
        request,
        {
          code: error instanceof Error ? error.message.split(":")[0] : "CONNECTOR_NOT_READY",
          status: "denied",
          error: "Le connecteur requis n’est pas connecté ou ne possède pas les scopes nécessaires.",
        },
        409,
      );
    }

    const requested = Array.isArray(body.requestedPermissions)
      ? body.requestedPermissions.filter((x): x is string => typeof x === "string")
      : [];
    const allowed = new Set<string>(
      Object.values(manifest.tools).flatMap((tool) => tool.permissions),
    );
    const granted = requested.filter((permission) => allowed.has(permission));
    if (
      granted.length !== new Set(manifest.tools ? Object.values(manifest.tools).flatMap((tool) => tool.permissions) : []).size
      && granted.length === 0
    ) {
      return json(
        request,
        {
          code: "PERMISSIONS_REQUIRED",
          error: "Toutes les permissions nécessaires doivent être explicitement approuvées.",
          status: "denied",
        },
        409,
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("plugin_installations")
      .upsert({
        user_id: auth.user.id,
        plugin_id: pluginId,
        plugin_version: "1.0.0",
        state: "installed",
        granted_permissions: granted,
        connector_provider: manifest.provider,
        configuration: {
          connectorIntegrationId,
        },
        installed_at: now,
        updated_at: now,
      }, { onConflict: "user_id,plugin_id" })
      .select("*")
      .single();

    if (error) return json(request, { error: error.message }, 500);

    await admin.from("plugin_events").insert({
      user_id: auth.user.id,
      plugin_id: pluginId,
      event_type: "plugin_installed",
      to_state: "installed",
      payload: { grantedPermissions: granted, source: "edge_install" },
    });

    return json(request, { installation: data }, 200);
  }

  if (action !== "execute") return json(request,{error:"Unsupported action."},400);

  const toolId = typeof body.toolId === "string" ? body.toolId : "";
  const tool = manifest.tools[toolId];
  if (!tool) return json(request,{error:"Unknown tool."},404);

  const plan = await currentPlan(admin, auth.user.id);
  if (PLAN_RANK[plan] < PLAN_RANK[manifest.minimumPlan]) return json(request,{code:"PLAN_INSUFFICIENT",status:"denied"},403);

  let connectorIntegrationId: string | null = null;
  try {
    connectorIntegrationId = await requireConnectorReady(admin, auth.user.id, manifest);
  } catch (error) {
    return json(
      request,
      {
        code: error instanceof Error ? error.message.split(":")[0] : "CONNECTOR_NOT_READY",
        error: "Le connecteur requis n’est pas connecté ou ne possède pas les scopes nécessaires.",
        status: "denied",
      },
      409,
    );
  }

  const {data:installation,error:installationError}=await admin.from("plugin_installations").select("*").eq("user_id",auth.user.id).eq("plugin_id",pluginId).maybeSingle();
  if(installationError) return json(request,{error:installationError.message},500);
  if(!installation) return json(request,{code:"PLUGIN_NOT_AVAILABLE",error:"Le connecteur doit d'abord être activé dans Idealy.",status:"denied"},409);
  const granted = Array.isArray(installation.granted_permissions) ? installation.granted_permissions as string[] : [];
  const missing = tool.permissions.filter(permission => !granted.includes(permission));
  if(missing.length > 0) return json(request,{code:"PERMISSION_NOT_GRANTED",missingPermissions:missing,status:"denied"},403);
  const missionId = typeof body.missionId === "string" ? body.missionId : "";
  const input = safeObject(body.input);

  let confirmationId: string | null = null;
  if (tool.requiresConfirmation) {
    const confirmationToken =
      typeof body.confirmationToken === "string" ? body.confirmationToken : "";

    if (!TOKEN_PATTERN.test(confirmationToken) || !missionId) {
      return json(
        request,
        {
          code: "CONFIRMATION_REQUIRED",
          error: "Une confirmation à usage unique et liée à la mission est requise.",
          operation: `${pluginId}:${toolId}`,
          status: "denied",
        },
        409,
      );
    }

    const digest = await pluginPayloadDigest({
      input,
      missionId,
      pluginId,
      toolId,
    });

    const { data: confirmation, error: confirmationError } = await admin
      .from("mission_action_confirmations")
      .select("id,resource_snapshot")
      .eq("mission_id", missionId)
      .eq("user_id", auth.user.id)
      .eq("operation", `${pluginId}:${toolId}`)
      .eq("confirmation_token_hash", await sha256(confirmationToken))
      .eq("status", "approved")
      .gt("expires_at", new Date().toISOString())
      .is("consumed_at", null)
      .maybeSingle();

    const snapshot = confirmation?.resource_snapshot as { payload_digest?: unknown } | null;
    if (
      confirmationError ||
      !confirmation ||
      snapshot?.payload_digest !== digest
    ) {
      return json(
        request,
        {
          code: "CONFIRMATION_INVALID",
          error: "La confirmation est expirée, déjà consommée ou ne correspond pas exactement à cette action.",
          status: "denied",
        },
        409,
      );
    }

    confirmationId = confirmation.id;
  }

  const executionKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length >= 8 ? body.idempotencyKey : crypto.randomUUID();
  const {data:existing}=await admin.from("plugin_executions").select("*").eq("user_id",auth.user.id).eq("idempotency_key",executionKey).maybeSingle();
  if(existing) return json(request,{ok:existing.status==="succeeded",execution:existing,output:existing.output??null},200);

  const startedAt=new Date().toISOString();
  const {data:execution,error:executionError}=await admin.from("plugin_executions").insert({
    user_id:auth.user.id,
    workspace_id:typeof body.workspaceId === "string" ? body.workspaceId : null,
    plugin_installation_id:installation.id,
    plugin_id:pluginId,
    plugin_version:"1.0.0",
    tool_id:toolId,
    mission_id:typeof body.missionId === "string" ? body.missionId : null,
    task_id:typeof body.taskId === "string" ? body.taskId : null,
    idempotency_key:executionKey,
    input:body.input ?? {},
    status:"running",
    attempts:1,
    started_at:startedAt,
  }).select("*").single();
  if(executionError) return json(request,{error:executionError.message},500);

  await admin.from("plugin_events").insert({user_id:auth.user.id,plugin_id:pluginId,execution_id:execution.id,event_type:"execution_started",from_state:"available",to_state:"executing",payload:{toolId,executionKey}});

  try {
    const output=await executeProvider(admin,auth.user.id,pluginId,toolId,input,request);
    const completedAt=new Date().toISOString();
    await admin.from("plugin_executions").update({status:"succeeded",output,completed_at:completedAt,duration_ms:Date.parse(completedAt)-Date.parse(startedAt)}).eq("id",execution.id);
    if (confirmationId) {
      const { error: consumeConfirmationError } = await admin
        .from("mission_action_confirmations")
        .update({
          consumed_at: new Date().toISOString(),
          status: "consumed",
        })
        .eq("id", confirmationId)
        .eq("user_id", auth.user.id)
        .eq("status", "approved")
        .is("consumed_at", null);

      if (consumeConfirmationError) {
        return json(
          request,
          {
            error: "L’action externe a été exécutée mais sa confirmation n’a pas pu être consommée. Ne relancez pas automatiquement.",
            code: "CONFIRMATION_CONSUME_FAILED",
          },
          500,
        );
      }
    }

    await admin.from("plugin_events").insert({user_id:auth.user.id,plugin_id:pluginId,execution_id:execution.id,event_type:"execution_succeeded",from_state:"executing",to_state:"available",payload:{toolId,connectorIntegrationId}});
    return json(request,{ok:true,executionId:execution.id,output},200);
  } catch(error) {
    const completedAt=new Date().toISOString();
    const message=error instanceof Error ? error.message : String(error);
    await admin.from("plugin_executions").update({status:"failed",error:message,error_code:message.includes("401")||message.includes("403")?"permission":"provider_failure",completed_at:completedAt,duration_ms:Date.parse(completedAt)-Date.parse(startedAt)}).eq("id",execution.id);
    await admin.from("plugin_events").insert({user_id:auth.user.id,plugin_id:pluginId,execution_id:execution.id,event_type:"execution_failed",from_state:"executing",to_state:"available",payload:{toolId,error:message.slice(0,300)}});
    return json(request,{ok:false,executionId:execution.id,error:message,status:"failed"},502);
  }
});
