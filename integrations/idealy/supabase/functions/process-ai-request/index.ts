import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  consumeManagedCredit,
  isSupportedProvider,
  PROVIDER_CONFIGS,
  type Provider,
  type RequestedMode,
  resolveAIProvider,
} from "./aiProvider.ts";
import { classifyIntent } from "./intentRouter.ts";
import { type AgentUIPhase, streamUI } from "./streamUI.ts";

/**
 * process-ai-request — proxy IA sécurisé.
 *
 * Les clés fournisseur ne sont utilisées que dans cette Edge Function.
 * Le navigateur ne reçoit jamais la clé centralisée ni la clé BYOK déchiffrée.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://idealy.app",
  "https://idealy-ai.netlify.app",
];

type LLMRequest = {
  prompt: string;
  systemPrompt?: string;
  provider?: Provider;
  model?: string;
  stream?: boolean;
  maxTokens?: number;
  mode?: RequestedMode;
  missionId?: string | null;
  idempotencyKey?: string;
  intentOnly?: boolean;
  intentCategory?: "CONVERSATION" | "IDEATION" | "EXECUTION";
  uiStream?: boolean;
  uiPhase?: AgentUIPhase;
  uiProgress?: number;
  planOnly?: boolean;
};

const DEFAULT_MODELS: Record<Provider, string> = {
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  openrouter: "deepseek/deepseek-coder",
};

const ALLOWED_MODELS: Record<Provider, readonly string[]> = {
  deepseek: ["deepseek-chat"],
  groq: ["llama-3.3-70b-versatile"],
  openrouter: ["deepseek/deepseek-coder", "openrouter/free"],
};

const MAX_PROMPT_CHARS = 120_000;
const MAX_SYSTEM_PROMPT_CHARS = 20_000;
const MAX_OUTPUT_TOKENS = 8000;
const MAX_IDEMPOTENCY_KEY_CHARS = 180;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCorsHeaders(req: Request): Record<string, string> {
  const configuredOrigins = (Deno.env.get("IDEALY_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
  const requestOrigin = req.headers.get("Origin");
  const allowOrigin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

  return {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
  };
}

function jsonError(
  message: string,
  status: number,
  headers: Record<string, string>,
  code?: string
): Response {
  return new Response(
    JSON.stringify({ error: message, ...(code ? { code } : {}) }),
    {
      headers: { ...headers, "Content-Type": "application/json" },
      status,
    }
  );
}

function isRequestedMode(value: unknown): value is RequestedMode {
  return (
    value === undefined ||
    value === "auto" ||
    value === "free" ||
    value === "trial" ||
    value === "byok"
  );
}

function isValidUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isAgentUIPhase(value: unknown): value is AgentUIPhase {
  return (
    value === "planning" ||
    value === "building" ||
    value === "validating" ||
    value === "completed" ||
    value === "needs-fix"
  );
}

type MissionPlanAgent = {
  name: string;
  responsibility: string;
  result: string;
};

type MissionPlan = {
  projectKind: string;
  intention: string;
  v1Scope: string;
  agents: MissionPlanAgent[];
  nextStep: string;
};

function parseMissionPlan(content: unknown): MissionPlan | null {
  if (typeof content !== "string") {
    return null;
  }
  const normalized = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const value = JSON.parse(normalized) as Partial<MissionPlan>;
    if (!value || typeof value !== "object" || !Array.isArray(value.agents)) {
      return null;
    }
    const agents = value.agents
      .filter((agent): agent is MissionPlanAgent =>
        Boolean(agent && typeof agent === "object")
      )
      .map((agent) => ({
        name: typeof agent.name === "string" ? agent.name.trim() : "",
        responsibility:
          typeof agent.responsibility === "string"
            ? agent.responsibility.trim()
            : "",
        result: typeof agent.result === "string" ? agent.result.trim() : "",
      }))
      .filter((agent) => agent.name && agent.responsibility && agent.result)
      .slice(0, 8);
    if (!agents.length) {
      return null;
    }
    const text = (input: unknown, fallback: string) =>
      typeof input === "string" && input.trim() ? input.trim() : fallback;
    return {
      agents,
      intention: text(value.intention, "clarifier le résultat attendu"),
      nextStep: text(value.nextStep, "valider le plan avant la construction"),
      projectKind: text(value.projectKind, "application à préciser"),
      v1Scope: text(value.v1Scope, "premier parcours utilisable"),
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  const headers = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  if (req.method !== "POST") {
    return jsonError("Method not allowed.", 405, headers);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonError(
        "Supabase server configuration is incomplete.",
        500,
        headers
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("Unauthorized.", 401, headers);
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser(authHeader.slice("Bearer ".length));
    if (userError || !user) {
      return jsonError("Unauthorized.", 401, headers);
    }

    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON request.", 400, headers);
    }
    const input = body as Partial<LLMRequest>;

    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    const systemPrompt =
      input.systemPrompt === undefined
        ? undefined
        : typeof input.systemPrompt === "string"
          ? input.systemPrompt.trim()
          : null;
    if (!prompt) {
      return jsonError("Prompt is required.", 400, headers);
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return jsonError("Prompt is too large.", 413, headers);
    }
    if (systemPrompt === null) {
      return jsonError("systemPrompt must be a string.", 400, headers);
    }
    if (systemPrompt && systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      return jsonError("systemPrompt is too large.", 413, headers);
    }
    if (
      input.intentOnly !== undefined &&
      typeof input.intentOnly !== "boolean"
    ) {
      return jsonError("intentOnly must be boolean.", 400, headers);
    }
    if (
      input.intentCategory !== undefined &&
      !["CONVERSATION", "IDEATION", "EXECUTION"].includes(
        input.intentCategory as string
      )
    ) {
      return jsonError("Invalid intentCategory.", 400, headers);
    }
    if (input.uiStream !== undefined && typeof input.uiStream !== "boolean") {
      return jsonError("uiStream must be boolean.", 400, headers);
    }
    if (input.planOnly !== undefined && typeof input.planOnly !== "boolean") {
      return jsonError("planOnly must be boolean.", 400, headers);
    }

    if (input.intentOnly === true) {
      return new Response(JSON.stringify({ intent: classifyIntent(prompt) }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    if (input.uiStream === true) {
      if (!isAgentUIPhase(input.uiPhase)) {
        return jsonError("uiPhase is required for uiStream.", 400, headers);
      }
      if (
        input.uiProgress !== undefined &&
        (typeof input.uiProgress !== "number" ||
          !Number.isFinite(input.uiProgress))
      ) {
        return jsonError("uiProgress must be a finite number.", 400, headers);
      }
      return streamUI({
        headers,
        missionId: input.missionId,
        phase: input.uiPhase,
        progress: input.uiProgress,
      });
    }

    const { data: energySnapshot } = await supabaseAdmin
      .from("user_energy")
      .select("updated_at")
      .eq("id", user.id)
      .maybeSingle();
    if (
      energySnapshot?.updated_at &&
      Date.now() - new Date(energySnapshot.updated_at).getTime() < 3000
    ) {
      return jsonError(
        "Too many requests. Please wait a few seconds.",
        429,
        headers,
        "RATE_LIMIT"
      );
    }

    const provider = input.provider ?? "groq";
    if (!isSupportedProvider(provider)) {
      return jsonError("Unsupported provider.", 400, headers);
    }

    const model = input.model ?? DEFAULT_MODELS[provider];
    if (
      typeof model !== "string" ||
      !ALLOWED_MODELS[provider].includes(model)
    ) {
      return jsonError("Model is not allowed for this provider.", 400, headers);
    }

    const stream = input.stream ?? false;
    if (typeof stream !== "boolean") {
      return jsonError("stream must be boolean.", 400, headers);
    }

    const maxTokens = input.maxTokens ?? MAX_OUTPUT_TOKENS;
    if (
      !Number.isInteger(maxTokens) ||
      maxTokens < 128 ||
      maxTokens > MAX_OUTPUT_TOKENS
    ) {
      return jsonError(
        `maxTokens must be an integer between 128 and ${MAX_OUTPUT_TOKENS}.`,
        400,
        headers
      );
    }

    const mode = input.mode ?? "auto";
    if (!isRequestedMode(mode)) {
      return jsonError("Invalid AI provider mode.", 400, headers);
    }
    if (
      input.missionId !== undefined &&
      input.missionId !== null &&
      (typeof input.missionId !== "string" || !isValidUUID(input.missionId))
    ) {
      return jsonError("missionId must be a UUID.", 400, headers);
    }
    if (
      input.idempotencyKey !== undefined &&
      (typeof input.idempotencyKey !== "string" ||
        input.idempotencyKey.length > MAX_IDEMPOTENCY_KEY_CHARS)
    ) {
      return jsonError("idempotencyKey is invalid.", 400, headers);
    }

    const resolution = await resolveAIProvider(user.id, supabaseAdmin, {
      mode,
      model,
      provider,
    });
    const managed = resolution.mode !== "byok";
    const intentCategory = input.intentCategory ?? "EXECUTION";
    let energyRemaining: number | null = null;

    // Conversation is intentionally free of the managed usage gate. IDEATION
    // and EXECUTION are the only costly pathways; BYOK bypasses managed credits.
    if (managed && intentCategory !== "CONVERSATION") {
      const idempotencyKey =
        input.idempotencyKey?.trim() || `${user.id}:${crypto.randomUUID()}`;
      const amount = intentCategory === "IDEATION" ? 3 : 10;
      try {
        const debit = await consumeManagedCredit(supabaseAdmin, {
          amount,
          idempotencyKey,
          missionId: input.missionId,
          reason: `ai:${intentCategory.toLowerCase()}:${provider}:${model}`,
          userId: user.id,
        });
        energyRemaining = debit.energyRemaining;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/insufficient|energy|credit/i.test(message)) {
          return jsonError(
            "Credits insuffisants pour cette action IA gérée.",
            402,
            headers,
            "CREDITS_REQUIRED"
          );
        }
        throw error;
      }
    }

    const config = PROVIDER_CONFIGS[resolution.provider];
    const messages: { role: "system" | "user"; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ content: systemPrompt, role: "system" });
    }
    messages.push({ content: prompt, role: "user" });

    const llmRes = await fetch(config.url, {
      body: JSON.stringify({
        max_tokens: maxTokens,
        messages,
        model: resolution.model,
        stream,
        temperature: 0.7,
      }),
      headers: {
        Authorization: `Bearer ${resolution.apiKey}`,
        "Content-Type": "application/json",
        ...(resolution.provider === "openrouter"
          ? {
              "HTTP-Referer": "https://idealy-ai.netlify.app",
              "X-Title": "Idealy",
            }
          : {}),
      },
      method: "POST",
    });

    if (!llmRes.ok) {
      const err = await llmRes
        .json()
        .catch(() => ({ error: llmRes.statusText }));
      return jsonError(
        err.error?.message ?? err.error ?? "LLM error.",
        llmRes.status,
        headers
      );
    }

    if (stream) {
      return new Response(llmRes.body, {
        headers: {
          ...headers,
          "Cache-Control": "no-cache",
          "Content-Type": "text/event-stream",
        },
      });
    }

    const result = await llmRes.json();
    const message = result.choices?.[0]?.message?.content ?? "";
    if (input.planOnly === true) {
      const plan = parseMissionPlan(message);
      if (!plan) {
        return jsonError(
          "Le fournisseur IA a renvoyé un plan de mission invalide.",
          502,
          headers,
          "INVALID_MISSION_PLAN"
        );
      }
      return new Response(
        JSON.stringify({
          energyRemaining,
          intentCategory,
          mode: resolution.mode,
          model: resolution.model,
          plan,
          provider: resolution.provider,
        }),
        {
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({
        energyRemaining,
        intentCategory,
        message,
        mode: resolution.mode,
        model: resolution.model,
        provider: resolution.provider,
      }),
      {
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("process-ai-request failed", error);
    const message = error instanceof Error ? error.message : String(error);
    if (/No BYOK key configured/i.test(message)) {
      return jsonError(
        "No BYOK key is configured for this provider.",
        409,
        headers,
        "BYOK_NOT_CONFIGURED"
      );
    }
    if (/AI_KEY_ENCRYPTION_SECRET/i.test(message)) {
      return jsonError(
        "BYOK server encryption is not configured.",
        500,
        headers,
        "BYOK_CONFIG_ERROR"
      );
    }
    return jsonError("Unexpected AI proxy error.", 500, headers);
  }
});
