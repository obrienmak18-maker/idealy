import "server-only";

import { createHash, webcrypto } from "node:crypto";

type JsonObject = Record<string, unknown>;

type ExecutionContext = {
  userId: string;
  provider: string;
  toolId: string;
  input: JsonObject;
};

type IntegrationToken = {
  accessToken: string;
  refreshToken?: string | null;
};

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVER_NOT_CONFIGURED");
  }
  return { url, serviceRoleKey };
}

async function rest<T>(
  table: string,
  method: "GET" | "POST",
  query?: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const { url, serviceRoleKey } = config();
  const target = new URL(url + "/rest/v1/" + table);
  for (const [key, value] of Object.entries(query ?? {})) {
    target.searchParams.set(key, value);
  }
  const response = await fetch(target, {
    method,
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: "Bearer " + serviceRoleKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("SUPABASE_" + response.status + ":" + detail.slice(0, 400));
  }
  if (response.status === 204) return [] as T;
  return (await response.json()) as T;
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64");
}

async function encryptionKey() {
  const encoded = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  const raw = encoded ? decodeBase64(encoded) : Buffer.alloc(0);
  if (raw.byteLength !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY_NOT_CONFIGURED");
  }
  return webcrypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
}

async function decryptCredential(ciphertext: string, iv: string): Promise<IntegrationToken> {
  const plain = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(iv) },
    await encryptionKey(),
    decodeBase64(ciphertext),
  );
  return JSON.parse(Buffer.from(plain).toString("utf8")) as IntegrationToken;
}

async function oauthToken(userId: string, provider: string) {
  const providerKey = provider === "google-drive" ? "google" : provider;
  const integrations = await rest<Array<JsonObject>>("user_integrations", "GET", {
    select: "id,provider,status,user_id",
    user_id: "eq." + userId,
    provider: "eq." + providerKey,
    status: "eq.active",
    limit: "1",
  });
  const integration = integrations[0];
  if (!integration?.id) throw new Error("CONNECTOR_NOT_CONNECTED");

  const credentials = await rest<Array<JsonObject>>("integration_credentials", "GET", {
    select: "ciphertext,iv",
    integration_id: "eq." + String(integration.id),
    limit: "1",
  });
  const credential = credentials[0];
  if (
    typeof credential?.ciphertext !== "string" ||
    typeof credential.iv !== "string"
  ) {
    throw new Error("CONNECTOR_CREDENTIAL_MISSING");
  }
  return decryptCredential(credential.ciphertext, credential.iv);
}

async function providerFetch(
  url: string,
  token: string,
  init: RequestInit = {},
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(async () => ({
    raw: await response.text().catch(() => ""),
  }));
  if (!response.ok) {
    throw new Error(
      "PROVIDER_" + response.status + ":" + JSON.stringify(payload).slice(0, 500),
    );
  }
  return payload;
}

function stringInput(input: JsonObject, key: string, required = true) {
  const value = typeof input[key] === "string" ? String(input[key]).trim() : "";
  if (required && !value) throw new Error("INPUT_REQUIRED:" + key);
  return value;
}

function repositoryParts(input: JsonObject) {
  const repository = stringInput(input, "repository");
  const match = repository.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) throw new Error("INPUT_INVALID:repository");
  return { owner: match[1], repo: match[2] };
}

async function executeGitHub(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "github");
  switch (ctx.toolId) {
    case "github-list-repositories": {
      const page = Number(ctx.input.page ?? 1);
      return providerFetch(
        "https://api.github.com/user/repos?per_page=100&page=" + Math.max(1, Math.min(page, 20)) + "&sort=updated",
        accessToken,
        { headers: { "X-GitHub-Api-Version": "2022-11-28" } },
      );
    }
    case "github-read-repository": {
      const { owner, repo } = repositoryParts(ctx.input);
      return providerFetch(
        "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo),
        accessToken,
        { headers: { "X-GitHub-Api-Version": "2022-11-28" } },
      );
    }
    case "github-create-branch": {
      const { owner, repo } = repositoryParts(ctx.input);
      const branch = stringInput(ctx.input, "branch");
      const from = stringInput(ctx.input, "from", false) || "heads/main";
      const ref = from.startsWith("refs/") ? from : "refs/" + from;
      return providerFetch(
        "https://api.github.com/repos/" + owner + "/" + repo + "/git/refs",
        accessToken,
        {
          method: "POST",
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
          body: JSON.stringify({ ref: "refs/heads/" + branch, sha: String(ctx.input.sha ?? "").trim() || undefined }),
        },
      );
    }
    case "github-open-pull-request": {
      const { owner, repo } = repositoryParts(ctx.input);
      return providerFetch(
        "https://api.github.com/repos/" + owner + "/" + repo + "/pulls",
        accessToken,
        {
          method: "POST",
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
          body: JSON.stringify({
            title: stringInput(ctx.input, "title"),
            head: stringInput(ctx.input, "head"),
            base: stringInput(ctx.input, "base", false) || "main",
            body: typeof ctx.input.body === "string" ? ctx.input.body : "",
            draft: ctx.input.draft === true,
          }),
        },
      );
    }
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeVercel(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "vercel");
  switch (ctx.toolId) {
    case "vercel-list-projects":
      return providerFetch("https://api.vercel.com/v9/projects?limit=100", accessToken);
    case "vercel-get-deployment": {
      const id = stringInput(ctx.input, "deploymentId");
      return providerFetch("https://api.vercel.com/v13/deployments/" + encodeURIComponent(id), accessToken);
    }
    case "vercel-create-preview":
    case "vercel-deploy-production": {
      const projectName = stringInput(ctx.input, "projectName");
      const target = ctx.toolId === "vercel-deploy-production" ? "production" : "preview";
      const files = Array.isArray(ctx.input.files) ? ctx.input.files : [];
      if (files.length === 0) throw new Error("INPUT_REQUIRED:files");
      return providerFetch("https://api.vercel.com/v13/deployments", accessToken, {
        method: "POST",
        body: JSON.stringify({ name: projectName, target, files }),
      });
    }
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeCanva(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "canva");
  switch (ctx.toolId) {
    case "canva-list-designs":
      return providerFetch("https://api.canva.com/rest/v1/designs?limit=100", accessToken);
    case "canva-get-design":
      return providerFetch(
        "https://api.canva.com/rest/v1/designs/" + encodeURIComponent(stringInput(ctx.input, "designId")),
        accessToken,
      );
    case "canva-create-design":
      return providerFetch("https://api.canva.com/rest/v1/designs", accessToken, {
        method: "POST",
        body: JSON.stringify(ctx.input.payload ?? {}),
      });
    case "canva-export-design":
      return providerFetch("https://api.canva.com/rest/v1/exports", accessToken, {
        method: "POST",
        body: JSON.stringify(ctx.input.payload ?? {}),
      });
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeFigma(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "figma");
  switch (ctx.toolId) {
    case "figma-read-file":
      return providerFetch(
        "https://api.figma.com/v1/files/" + encodeURIComponent(stringInput(ctx.input, "fileKey")),
        accessToken,
      );
    case "figma-export-assets": {
      const fileKey = stringInput(ctx.input, "fileKey");
      const ids = stringInput(ctx.input, "nodeIds");
      return providerFetch(
        "https://api.figma.com/v1/images/" + encodeURIComponent(fileKey) + "?ids=" + encodeURIComponent(ids),
        accessToken,
      );
    }
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeGoogleDrive(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "google-drive");
  switch (ctx.toolId) {
    case "google-drive-list-drive-files": {
      const q = typeof ctx.input.q === "string" ? "&q=" + encodeURIComponent(ctx.input.q) : "";
      return providerFetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name,mimeType,modifiedTime,webViewLink),nextPageToken" + q,
        accessToken,
      );
    }
    case "google-drive-read-drive-metadata":
      return providerFetch(
        "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(stringInput(ctx.input, "fileId")) + "?fields=id,name,mimeType,modifiedTime,webViewLink,size",
        accessToken,
      );
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeNotion(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "notion");
  switch (ctx.toolId) {
    case "notion-search-pages":
      return providerFetch("https://api.notion.com/v1/search", accessToken, {
        method: "POST",
        body: JSON.stringify({
          query: typeof ctx.input.query === "string" ? ctx.input.query : undefined,
          page_size: 100,
        }),
        headers: { "Notion-Version": "2022-06-28" },
      });
    case "notion-read-page":
      return providerFetch(
        "https://api.notion.com/v1/pages/" + encodeURIComponent(stringInput(ctx.input, "pageId")),
        accessToken,
        { headers: { "Notion-Version": "2022-06-28" } },
      );
    case "notion-append-page":
      return providerFetch(
        "https://api.notion.com/v1/blocks/" + encodeURIComponent(stringInput(ctx.input, "pageId")) + "/children",
        accessToken,
        {
          method: "PATCH",
          headers: { "Notion-Version": "2022-06-28" },
          body: JSON.stringify({ children: ctx.input.children ?? [] }),
        },
      );
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeSlack(ctx: ExecutionContext) {
  const { accessToken } = await oauthToken(ctx.userId, "slack");
  switch (ctx.toolId) {
    case "slack-list-channels":
      return providerFetch(
        "https://slack.com/api/conversations.list?limit=200",
        accessToken,
      );
    case "slack-send-message":
      return providerFetch("https://slack.com/api/chat.postMessage", accessToken, {
        method: "POST",
        body: JSON.stringify({
          channel: stringInput(ctx.input, "channel"),
          text: stringInput(ctx.input, "text"),
        }),
      });
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeSupabase(ctx: ExecutionContext) {
  const { userId } = ctx;
  switch (ctx.toolId) {
    case "supabase-read-mission":
      return (
        await rest<Array<JsonObject>>("missions", "GET", {
          select: "id,title,status,way,created_at,updated_at",
          id: "eq." + stringInput(ctx.input, "missionId"),
          user_id: "eq." + userId,
          limit: "1",
        })
      )[0] ?? null;
    case "supabase-read-mission-files":
      return rest<Array<JsonObject>>("mission_files", "GET", {
        select: "id,path,language,version,status,checksum,updated_at",
        mission_id: "eq." + stringInput(ctx.input, "missionId"),
        user_id: "eq." + userId,
        status: "eq.saved",
        order: "path.asc",
        limit: "500",
      });
    case "supabase-append-mission-event":
      return rest<Array<JsonObject>>(
        "mission_file_events",
        "POST",
        undefined,
        {
          mission_id: stringInput(ctx.input, "missionId"),
          event_type: "mission_action",
          payload: {
            source: "plugin-engine",
            ...(ctx.input.payload && typeof ctx.input.payload === "object"
              ? ctx.input.payload
              : {}),
          },
        },
      );
    default:
      throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
  }
}

async function executeStripe(ctx: ExecutionContext) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY_NOT_CONFIGURED");

  if (ctx.toolId === "stripe-read-subscription") {
    return (
      await rest<Array<JsonObject>>("subscriptions", "GET", {
        select: "stripe_subscription_id,stripe_price_id,status,plan,current_period_end,cancel_at_period_end",
        user_id: "eq." + ctx.userId,
        order: "current_period_end.desc",
        limit: "1",
      })
    )[0] ?? null;
  }

  if (ctx.toolId === "stripe-read-invoice") {
    const profile = (
      await rest<Array<JsonObject>>("profiles", "GET", {
        select: "stripe_customer_id",
        id: "eq." + ctx.userId,
        limit: "1",
      })
    )[0];
    const customerId = typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : "";
    if (!customerId) throw new Error("STRIPE_CUSTOMER_NOT_CONFIGURED");
    const invoiceId =
      typeof ctx.input.invoiceId === "string" ? ctx.input.invoiceId.trim() : "";
    if (invoiceId) {
      const response = await fetch(
        "https://api.stripe.com/v1/invoices/" + encodeURIComponent(invoiceId),
        { headers: { Authorization: "Bearer " + key } },
      );
      if (!response.ok) throw new Error("STRIPE_" + response.status);
      return response.json();
    }

    const response = await fetch(
      "https://api.stripe.com/v1/invoices?customer=" + encodeURIComponent(customerId) + "&limit=20",
      { headers: { Authorization: "Bearer " + key } },
    );
    if (!response.ok) throw new Error("STRIPE_" + response.status);
    return response.json();
  }

  throw new Error("TOOL_NOT_IMPLEMENTED:" + ctx.toolId);
}

export async function executePluginTool(ctx: ExecutionContext) {
  switch (ctx.provider) {
    case "github":
      return executeGitHub(ctx);
    case "vercel":
      return executeVercel(ctx);
    case "canva":
      return executeCanva(ctx);
    case "figma":
      return executeFigma(ctx);
    case "google-drive":
      return executeGoogleDrive(ctx);
    case "notion":
      return executeNotion(ctx);
    case "slack":
      return executeSlack(ctx);
    case "supabase":
      return executeSupabase(ctx);
    case "stripe":
      return executeStripe(ctx);
    default:
      throw new Error("PROVIDER_NOT_SUPPORTED:" + ctx.provider);
  }
}

export function executionFingerprint(ctx: ExecutionContext) {
  return createHash("sha256")
    .update(JSON.stringify({
      provider: ctx.provider,
      toolId: ctx.toolId,
      input: ctx.input,
      userId: ctx.userId,
    }))
    .digest("hex");
}
