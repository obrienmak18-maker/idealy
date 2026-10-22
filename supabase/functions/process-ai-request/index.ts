import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyIntent } from './intentRouter.ts';
import { streamUI, type AgentUIPhase } from './streamUI.ts';
import { createToolEnabledChatResponse } from "./toolCalling.ts";
import {
  consumeManagedCredit,
  isSupportedProvider,
  PROVIDER_CONFIGS,
  resolveAIProvider,
  type Provider,
  type RequestedMode,
} from './aiProvider.ts';

/**
 * process-ai-request — proxy IA sécurisé.
 *
 * Les clés fournisseur ne sont utilisées que dans cette Edge Function.
 * Le navigateur ne reçoit jamais la clé centralisée ni la clé BYOK déchiffrée.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://idealy.app',
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
  intentCategory?: 'CONVERSATION' | 'IDEATION' | 'EXECUTION';
  uiStream?: boolean;
  uiPhase?: AgentUIPhase;
  uiProgress?: number;
  planOnly?: boolean;
  workspaceStream?: boolean;
  squadRun?: boolean;
  language?: string;
};

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-sonnet-4-6',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-3.7-flash',
  groq: 'llama-3.3-70b-versatile',
  moonshot: 'kimi-k3',
  openai: 'gpt-5',
  openrouter: 'openrouter/free',
  together: 'openai/gpt-oss-120b',
};

const DEFAULT_ALLOWED_MODELS: Record<Provider, readonly string[]> = {
  anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-7'],
  deepseek: ['deepseek-chat', 'deepseek-v4-flash', 'deepseek-v4-pro'],
  gemini: ['gemini-3.7-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'],
  groq: ['llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct'],
  moonshot: ['kimi-k3', 'kimi-k2.7-code', 'kimi-k2.6', 'kimi-k2.5'],
  openai: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
  openrouter: ['openrouter/free', 'deepseek/deepseek-coder'],
  together: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
};

function getAllowedModels(): Record<Provider, readonly string[]> {
  const raw = Deno.env.get('IDEALY_PROVIDER_MODELS_JSON');
  if (!raw) return DEFAULT_ALLOWED_MODELS;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const configured = { ...DEFAULT_ALLOWED_MODELS } as Record<Provider, readonly string[]>;
    for (const provider of Object.keys(DEFAULT_ALLOWED_MODELS) as Provider[]) {
      const values = parsed[provider];
      if (Array.isArray(values)) {
        const models = values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        if (models.length > 0) configured[provider] = Array.from(new Set(models)).slice(0, 50);
      }
    }
    return configured;
  } catch {
    return DEFAULT_ALLOWED_MODELS;
  }
}

const MAX_PROMPT_CHARS = 120_000;
const MAX_SYSTEM_PROMPT_CHARS = 20_000;
const MAX_OUTPUT_TOKENS = 8_000;
const MAX_IDEMPOTENCY_KEY_CHARS = 180;
const WORKSPACE_SYSTEM_PROMPT = `
Tu es le Builder d’Idealy. Pour une mission EXECUTION, réponds uniquement avec des lignes NDJSON valides, sans markdown ni texte autour. Une ligne par événement, dans cet ordre pour chaque fichier :
{"type":"file_started","path":"src/App.tsx","language":"tsx"}
{"type":"file_content","path":"src/App.tsx","content":"contenu complet du fichier"}
Tu peux émettre {"type":"build_log","message":"..."} entre les fichiers. N’émets jamais file_saved : le serveur calcule le checksum et confirme l’écriture. Inclus au minimum package.json, index.html, src/main.tsx, src/App.tsx et src/App.css pour une application web. Chaque chemin doit être relatif, sûr, unique ; chaque contenu doit être complet ; aucun secret, chemin absolu ou segment .. n’est autorisé.`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getCorsHeaders(req: Request): Record<string, string> {
  const configuredOrigins = (Deno.env.get('IDEALY_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
  const requestOrigin = req.headers.get('Origin');
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function jsonError(message: string, status: number, headers: Record<string, string>, code?: string): Response {
  return new Response(JSON.stringify({ error: message, ...(code ? { code } : {}) }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function isRequestedMode(value: unknown): value is RequestedMode {
  return value === undefined || value === 'auto' || value === 'free' || value === 'trial' || value === 'byok';
}

function isValidUUID(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function normalizeResponseLanguage(value: unknown): 'fr' | 'en' | 'es' {
  if (value === 'en' || value === 'es' || value === 'fr') return value;
  if (typeof value === 'string') {
    const base = value.trim().toLowerCase().split('-')[0];
    if (base === 'en' || base === 'es' || base === 'fr') return base;
  }
  return 'fr';
}

function isAgentUIPhase(value: unknown): value is AgentUIPhase {
  return value === 'planning' || value === 'building' || value === 'validating' || value === 'completed' || value === 'needs-fix';
}

/**
 * Keep ordinary conversation on the provider's native token stream.
 * The bounded server tool loop is used when the user's request signals live
 * research or media retrieval/generation.
 */
function shouldUseChatTools(prompt: string): boolean {
  const normalized = prompt.toLocaleLowerCase();
  const researchTerms = [
    "search the web", "web search", "look up", "do research", "research this",
    "find sources", "cite sources", "latest", "current news", "today's", "today",
    "on the internet", "online sources", "fact check", "search online",
    "recherche sur le web", "recherche web", "fais des recherches", "faire des recherches",
    "cherche sur internet", "sur le web", "sources fiables", "sources officielles",
    "références officielles", "actualités", "aujourd'hui", "à jour", "récent",
    "recherches en ligne", "buscar en internet", "busca en la web", "investiga",
    "fuentes oficiales", "noticias actuales", "hoy", "últimas noticias",
  ];
  const imageTerms = [
    "pexels", "stock photos", "real photos", "real images", "search images",
    "find photos", "find images", "generate an image", "generate image",
    "create an image", "make an image", "image generation", "illustration",
    "génère une image", "générer une image", "crée une image", "créer une image",
    "génération d'image", "génération d’images", "cherche des images",
    "chercher des images", "photos réelles", "images réelles", "photos libres",
    "recherche d'images", "buscar imágenes", "genera una imagen", "crear una imagen",
    "fotos reales", "imágenes reales",
  ];
  return researchTerms.some((term) => normalized.includes(term)) ||
    imageTerms.some((term) => normalized.includes(term));
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
  if (typeof content !== 'string') return null;
  const normalized = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const value = JSON.parse(normalized) as Partial<MissionPlan>;
    if (!value || typeof value !== 'object' || !Array.isArray(value.agents)) return null;
    const agents = value.agents
      .filter((agent): agent is MissionPlanAgent => Boolean(agent && typeof agent === 'object'))
      .map((agent) => ({
        name: typeof agent.name === 'string' ? agent.name.trim() : '',
        responsibility: typeof agent.responsibility === 'string' ? agent.responsibility.trim() : '',
        result: typeof agent.result === 'string' ? agent.result.trim() : '',
      }))
      .filter((agent) => agent.name && agent.responsibility && agent.result)
      .slice(0, 8);
    if (!agents.length) return null;
    const text = (input: unknown, fallback: string) => typeof input === 'string' && input.trim() ? input.trim() : fallback;
    return {
      projectKind: text(value.projectKind, 'application à préciser'),
      intention: text(value.intention, 'clarifier le résultat attendu'),
      v1Scope: text(value.v1Scope, 'premier parcours utilisable'),
      agents,
      nextStep: text(value.nextStep, 'valider le plan avant la construction'),
    };
  } catch {
    return null;
  }
}

function normalizeWorkspacePath(path: string) {
  const normalized = path.trim().replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || normalized.length > 240) {
    throw new Error('Invalid mission file path.');
  }
  return normalized;
}

type WorkspaceFrame =
  | { language?: string; path: string; type: 'file_started' }
  | { content: string; path: string; type: 'file_content' }
  | { message: string; type: 'build_log' };

function parseWorkspaceFrame(content: string): WorkspaceFrame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const frame = parsed as { content?: unknown; language?: unknown; message?: unknown; path?: unknown; type?: unknown };
  if (frame.type === 'build_log' && typeof frame.message === 'string') {
    return { message: frame.message.slice(0, 2_000), type: 'build_log' };
  }
  if (frame.type === 'file_started' && typeof frame.path === 'string') {
    return {
      ...(typeof frame.language === 'string' ? { language: frame.language.slice(0, 80) } : {}),
      path: normalizeWorkspacePath(frame.path),
      type: 'file_started',
    };
  }
  if (frame.type === 'file_content' && typeof frame.path === 'string' && typeof frame.content === 'string') {
    if (frame.content.length > 300_000) throw new Error('Generated file content is too large.');
    return { content: frame.content, path: normalizeWorkspacePath(frame.path), type: 'file_content' };
  }
  return null;
}

async function checksum(content: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function appendMissionFileEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: {
    eventType: string;
    fileVersion?: number;
    missionId: string;
    path?: string;
    payload?: Record<string, unknown>;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabaseAdmin.rpc('append_mission_file_event', {
    p_event_type: input.eventType,
    p_file_version: input.fileVersion ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_mission_id: input.missionId,
    p_path: input.path ?? null,
    p_payload: input.payload ?? {},
  });
  if (error) throw new Error(`Mission file event persistence failed: ${error.message}`);
  return Number(data);
}

async function emitMissionFileEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  supabaseAdmin: ReturnType<typeof createClient>,
  event: {
    eventType: string;
    file?: Record<string, unknown>;
    fileVersion?: number;
    missionId: string;
    path?: string;
    payload?: Record<string, unknown>;
    idempotencyKey: string;
  },
) {
  const sequence = await appendMissionFileEvent(supabaseAdmin, event);
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    event: { ...event, idempotencyKey: undefined, sequence },
    type: 'idealy_file_event',
  })}\\n\\n`));
}

async function streamWorkspaceBuild(
  llmRes: Response,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  supabaseAdmin: ReturnType<typeof createClient>,
  input: {
    idempotencyKey: string;
    missionId: string;
    signal?: AbortSignal;
  },
) {
  const reader = llmRes.body?.getReader();
  if (!reader) throw new Error('Workspace provider returned no stream.');
  const decoder = new TextDecoder();
  let pending = '';
  let providerPending = '';
  const pendingFiles = new Map<string, { language?: string; version: number }>();
  let savedFileCount = 0;

  const persistFrame = async (frame: WorkspaceFrame) => {
    if (input.signal?.aborted) throw new DOMException('Workspace stream cancelled.', 'AbortError');
    if (frame.type === 'build_log') {
      await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
        eventType: 'build_log',
        idempotencyKey: `${input.idempotencyKey}:log:${savedFileCount}:${await checksum(frame.message)}`,
        missionId: input.missionId,
        payload: { message: frame.message },
      });
      return;
    }

    if (frame.type === 'file_started') {
      if (pendingFiles.has(frame.path)) throw new Error(`Duplicate file_started frame for ${frame.path}.`);
      const version = 1;
      const { error } = await supabaseAdmin.from('mission_files').upsert({
        content: '',
        language: frame.language ?? null,
        mission_id: input.missionId,
        path: frame.path,
        source: 'builder',
        status: 'writing',
        version,
      }, { onConflict: 'mission_id,path,version' });
      if (error) throw new Error(`Mission file write failed: ${error.message}`);
      pendingFiles.set(frame.path, { language: frame.language, version });
      await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
        eventType: 'file_started',
        file: { missionId: input.missionId, path: frame.path, status: 'writing', version },
        fileVersion: version,
        idempotencyKey: `${input.idempotencyKey}:file:${frame.path}:${version}:started`,
        missionId: input.missionId,
        path: frame.path,
        payload: { language: frame.language ?? null },
      });
      return;
    }

    const pendingFile = pendingFiles.get(frame.path);
    if (!pendingFile) throw new Error(`file_content requires a preceding file_started frame for ${frame.path}.`);
    const fileChecksum = await checksum(frame.content);
    const { error } = await supabaseAdmin.from('mission_files').update({
      checksum: fileChecksum,
      content: frame.content,
      status: 'saved',
    }).eq('mission_id', input.missionId).eq('path', frame.path).eq('version', pendingFile.version);
    if (error) throw new Error(`Mission file save failed: ${error.message}`);
    await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
      eventType: 'file_content',
      file: { content: frame.content, language: pendingFile.language, missionId: input.missionId, path: frame.path, status: 'writing', version: pendingFile.version },
      fileVersion: pendingFile.version,
      idempotencyKey: `${input.idempotencyKey}:file:${frame.path}:${pendingFile.version}:content`,
      missionId: input.missionId,
      path: frame.path,
      payload: { bytes: frame.content.length },
    });
    await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
      eventType: 'file_saved',
      file: { checksum: fileChecksum, content: frame.content, language: pendingFile.language, missionId: input.missionId, path: frame.path, status: 'saved', version: pendingFile.version },
      fileVersion: pendingFile.version,
      idempotencyKey: `${input.idempotencyKey}:file:${frame.path}:${pendingFile.version}:saved`,
      missionId: input.missionId,
      path: frame.path,
      payload: { checksum: fileChecksum },
    });
    pendingFiles.delete(frame.path);
    savedFileCount += 1;
  };

  const consumeProviderLine = async (line: string) => {
    if (!line.startsWith('data: ')) return;
    const raw = line.slice(6).trim();
    if (!raw || raw === '[DONE]') return;
    const chunk = JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> };
    const content = chunk.choices?.[0]?.delta?.content;
    if (!content) return;
    pending += content;
    const frames = pending.split('\n');
    pending = frames.pop() ?? '';
    for (const frameLine of frames) {
      const frame = parseWorkspaceFrame(frameLine.trim());
      if (!frame) throw new Error('Builder emitted an invalid workspace frame.');
      await persistFrame(frame);
    }
  };

  try {
    while (true) {
      if (input.signal?.aborted) throw new DOMException('Workspace stream cancelled.', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      providerPending += decoder.decode(value, { stream: true });
      const providerLines = providerPending.split('\n');
      providerPending = providerLines.pop() ?? '';
      for (const line of providerLines) await consumeProviderLine(line);
    }
    if (providerPending.trim()) await consumeProviderLine(providerPending);
    const tail = pending.trim();
    if (tail) {
      const frame = parseWorkspaceFrame(tail);
      if (!frame) throw new Error('Builder ended with an invalid workspace frame.');
      await persistFrame(frame);
    }
  } finally {
    if (input.signal?.aborted) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  if (pendingFiles.size > 0) throw new Error('Builder ended before saving every started file.');
  if (savedFileCount === 0) throw new Error('The builder returned no valid files.');

  await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
    eventType: 'validation_result',
    idempotencyKey: `${input.idempotencyKey}:validation`,
    missionId: input.missionId,
    payload: { status: 'pending', source: 'workspace-persistence' },
  });
  await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
    eventType: 'mission_completed',
    idempotencyKey: `${input.idempotencyKey}:completed`,
    missionId: input.missionId,
    payload: { fileCount: savedFileCount },
  });

  const assistantMessage = 'La première version de votre application a été générée et enregistrée dans le workspace. Les fichiers sont disponibles dans l’onglet Code.';
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: assistantMessage } }] })}\\n\\n`));
  controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
}


/**
 * Use configured server-side providers automatically. The client never needs
 * to choose a vendor, and one missing secret must not disable every other key.
 */
const AUTOMATIC_PROVIDER_ORDER: Provider[] = [
  "groq",
  "openrouter",
  "gemini",
  "deepseek",
  "openai",
  "anthropic",
  "together",
  "moonshot",
];

type ResolvedProvider = Awaited<ReturnType<typeof resolveAIProvider>>;

async function resolveConfiguredAIProvider(
  userId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  preferredProvider: Provider,
  preferredModel: string,
  mode: RequestedMode,
): Promise<ResolvedProvider> {
  const candidates = mode === "byok"
    ? [preferredProvider]
    : Array.from(new Set([preferredProvider, ...AUTOMATIC_PROVIDER_ORDER]));
  let lastError: unknown = null;

  for (const candidate of candidates) {
    if (
      candidate !== preferredProvider &&
      !Deno.env.get(PROVIDER_CONFIGS[candidate].envKey)?.trim()
    ) {
      continue;
    }
    try {
      return await resolveAIProvider(userId, supabaseAdmin, {
        provider: candidate,
        model: candidate === preferredProvider ? preferredModel : DEFAULT_MODELS[candidate],
        mode,
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Continue only when the selected provider has no configured managed key.
      // Database failures and invalid encryption settings need real fixes, not masking.
      if (mode === "byok" || !/API key not configured:/i.test(message)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("No configured AI provider is available.");
}

const RETRYABLE_PROVIDER_STATUSES = new Set([400, 401, 402, 403, 404, 408, 409, 429, 500, 502, 503, 504]);
const MAX_PROVIDER_ATTEMPTS = 3;

async function adaptAnthropicResponse(response: Response, stream: boolean): Promise<Response> {
  if (!response.ok) return response;

  if (!stream) {
    const payload = await response.json().catch(() => null) as
      | { content?: Array<{ type?: string; text?: string }> }
      | null;
    const content = Array.isArray(payload?.content)
      ? payload.content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("")
      : "";
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (!response.body) return new Response(null, { status: 502 });
  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const transformed = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        let pending = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            let event: { type?: string; delta?: { text?: unknown } };
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }
            if (event.type === "content_block_delta" && typeof event.delta?.text === "string") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text } }] })}\n\n`));
            }
            if (event.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              await reader.cancel().catch(() => undefined);
              return;
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      })().catch((error) => controller.error(error));
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return new Response(transformed, {
    status: response.status,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

async function fetchProviderWithFallback(input: {
  primary: ResolvedProvider;
  messages: Array<{ role: "system" | "user"; content: string }>;
  maxTokens: number;
  stream: boolean;
  signal: AbortSignal;
  responseHeaders: Record<string, string>;
}): Promise<{ response: Response; resolution: ResolvedProvider }> {
  const candidates = input.primary.mode === "byok"
    ? [input.primary.provider]
    : Array.from(new Set([input.primary.provider, ...AUTOMATIC_PROVIDER_ORDER]));
  let attempts = 0;
  let lastResponse: Response | null = null;
  let lastResolution = input.primary;

  for (const candidate of candidates) {
    if (attempts >= MAX_PROVIDER_ATTEMPTS) break;
    let resolution: ResolvedProvider = input.primary;
    if (candidate !== input.primary.provider) {
      const apiKey = Deno.env.get(PROVIDER_CONFIGS[candidate].envKey)?.trim();
      if (!apiKey) continue;
      resolution = {
        ...input.primary,
        apiKey,
        provider: candidate,
        model: DEFAULT_MODELS[candidate],
      };
    }

    const config = PROVIDER_CONFIGS[resolution.provider];
    const isAnthropic = resolution.provider === "anthropic";
    const providerMessages = input.messages.filter((message) => message.role !== "system");
    const systemText = input.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const body = isAnthropic
      ? {
          model: resolution.model,
          max_tokens: input.maxTokens,
          stream: input.stream,
          ...(systemText ? { system: systemText } : {}),
          messages: providerMessages.map((message) => ({ role: "user", content: message.content })),
        }
      : {
          model: resolution.model,
          messages: input.messages,
          stream: input.stream,
          max_tokens: input.maxTokens,
          ...(resolution.provider === "moonshot" && resolution.model === "kimi-k3"
            ? { reasoning_effort: "high" }
            : {}),
          ...(resolution.provider === "moonshot" || resolution.provider === "gemini"
            ? {}
            : { temperature: 0.7 }),
        };

    attempts += 1;
    lastResolution = resolution;
    let response: Response;
    try {
      response = await fetch(config.url, {
        method: "POST",
        headers: isAnthropic
          ? {
              "x-api-key": resolution.apiKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            }
          : {
              Authorization: `Bearer ${resolution.apiKey}`,
              "Content-Type": "application/json",
              ...(resolution.provider === "openrouter"
                ? {
                    "HTTP-Referer": Deno.env.get("APP_ORIGIN") ?? "https://idealy.app",
                    "X-Title": "Idealy",
                  }
                : {}),
            },
        body: JSON.stringify(body),
        signal: input.signal,
      });
    } catch (error) {
      if (input.signal.aborted) throw error;
      console.warn(`AI provider request failed before a response (provider=${resolution.provider}); checking configured fallback.`);
      continue;
    }

    if (response.ok) {
      return {
        response: isAnthropic ? await adaptAnthropicResponse(response, input.stream) : response,
        resolution,
      };
    }

    lastResponse = response;
    if (!RETRYABLE_PROVIDER_STATUSES.has(response.status) || attempts >= MAX_PROVIDER_ATTEMPTS) {
      return { response, resolution };
    }

    console.warn(`AI provider returned HTTP ${response.status} (provider=${resolution.provider}); checking configured fallback.`);
    if (response.body) await response.body.cancel().catch(() => undefined);
  }

  return {
    response: lastResponse ?? jsonError(
      "Aucun fournisseur IA configuré ne peut répondre pour le moment.",
      503,
      input.responseHeaders,
      "AI_PROVIDER_UNAVAILABLE",
    ),
    resolution: lastResolution,
  };
}

Deno.serve(async (req) => {
  const headers = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return jsonError('Method not allowed.', 405, headers);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonError('Supabase server configuration is incomplete.', 500, headers);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonError('Unauthorized.', 401, headers);

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.slice('Bearer '.length));
    if (userError || !user) return jsonError('Unauthorized.', 401, headers);

    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return jsonError('Invalid JSON request.', 400, headers);
    const input = body as Partial<LLMRequest>;

    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    const systemPrompt = input.systemPrompt === undefined
      ? undefined
      : typeof input.systemPrompt === 'string'
        ? input.systemPrompt.trim()
        : null;
    if (!prompt) return jsonError('Prompt is required.', 400, headers);
    if (prompt.length > MAX_PROMPT_CHARS) return jsonError('Prompt is too large.', 413, headers);
    if (systemPrompt === null) return jsonError('systemPrompt must be a string.', 400, headers);
    if (systemPrompt && systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) return jsonError('systemPrompt is too large.', 413, headers);
    if (input.intentOnly !== undefined && typeof input.intentOnly !== 'boolean') return jsonError('intentOnly must be boolean.', 400, headers);
    if (input.intentCategory !== undefined && !['CONVERSATION', 'IDEATION', 'EXECUTION'].includes(input.intentCategory as string)) return jsonError('Invalid intentCategory.', 400, headers);
    if (input.uiStream !== undefined && typeof input.uiStream !== 'boolean') return jsonError('uiStream must be boolean.', 400, headers);
    if (input.planOnly !== undefined && typeof input.planOnly !== 'boolean') return jsonError('planOnly must be boolean.', 400, headers);
    if (input.workspaceStream !== undefined && typeof input.workspaceStream !== 'boolean') return jsonError('workspaceStream must be boolean.', 400, headers);
    if (input.squadRun !== undefined && typeof input.squadRun !== 'boolean') return jsonError('squadRun must be boolean.', 400, headers);
    if (input.language !== undefined && typeof input.language !== 'string') return jsonError('language must be a string.', 400, headers);
    if (input.language !== undefined && !['fr','en','es'].includes(normalizeResponseLanguage(input.language))) return jsonError('Unsupported language.', 400, headers);
    if (input.workspaceStream === true && (!input.missionId || !isValidUUID(input.missionId))) return jsonError('workspaceStream requires a missionId.', 400, headers);

    if (input.intentOnly === true) {
      return new Response(JSON.stringify({ intent: classifyIntent(prompt) }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (input.uiStream === true) {
      if (!isAgentUIPhase(input.uiPhase)) return jsonError('uiPhase is required for uiStream.', 400, headers);
      if (input.uiProgress !== undefined && (typeof input.uiProgress !== 'number' || !Number.isFinite(input.uiProgress))) {
        return jsonError('uiProgress must be a finite number.', 400, headers);
      }
      return streamUI({ headers, missionId: input.missionId, phase: input.uiPhase, progress: input.uiProgress });
    }

    const { data: requestSlot, error: requestSlotError } = await supabaseAdmin
      .rpc('acquire_ai_request_slot', {
        p_minimum_interval_seconds: 3,
        p_user_id: user.id,
      });
    if (requestSlotError) {
      throw new Error(`AI request rate guard failed: ${requestSlotError.message}`);
    }
    if (requestSlot !== true) {
      return jsonError('Too many requests. Please wait a few seconds.', 429, headers, 'RATE_LIMIT');
    }

    const provider = input.provider ?? 'groq';
    if (!isSupportedProvider(provider)) return jsonError('Unsupported provider.', 400, headers);

    const model = input.model ?? DEFAULT_MODELS[provider];
    const allowedModels = getAllowedModels();
    if (typeof model !== 'string' || !allowedModels[provider].includes(model)) {
      return jsonError('Model is not allowed for this provider.', 400, headers);
    }

    const stream = input.stream ?? false;
    if (typeof stream !== 'boolean') return jsonError('stream must be boolean.', 400, headers);

    const maxTokens = input.maxTokens ?? MAX_OUTPUT_TOKENS;
    if (!Number.isInteger(maxTokens) || maxTokens < 128 || maxTokens > MAX_OUTPUT_TOKENS) {
      return jsonError(`maxTokens must be an integer between 128 and ${MAX_OUTPUT_TOKENS}.`, 400, headers);
    }

    const mode = input.mode ?? 'auto';
    if (!isRequestedMode(mode)) return jsonError('Invalid AI provider mode.', 400, headers);
    if (input.missionId !== undefined && input.missionId !== null && (typeof input.missionId !== 'string' || !isValidUUID(input.missionId))) {
      return jsonError('missionId must be a UUID.', 400, headers);
    }
    if (input.idempotencyKey !== undefined && (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length > MAX_IDEMPOTENCY_KEY_CHARS)) {
      return jsonError('idempotencyKey is invalid.', 400, headers);
    }

    if (input.workspaceStream && input.missionId) {
      const { data: mission, error: missionError } = await supabaseAdmin
        .from('missions')
        .select('id')
        .eq('id', input.missionId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (missionError) {
        throw new Error(`Mission ownership check failed: ${missionError.message}`);
      }
      if (!mission) {
        return jsonError('Mission not found.', 404, headers, 'MISSION_NOT_FOUND');
      }
    }

    let resolution = await resolveConfiguredAIProvider(user.id, supabaseAdmin, provider, model, mode);
    const managed = resolution.mode !== 'byok';
    const intentCategory = input.intentCategory ?? 'EXECUTION';
    let energyRemaining: number | null = null;

    // Mission execution is billed by the canonical Power contract.
    // Simple runs reserve points immediately before the provider call and settle
    // them only after a provider returns HTTP success. Squad runs have their own
    // reserve -> execute -> settle/release lifecycle in orchestrate-mission.
    const isSimpleMission =
      Boolean(input.missionId) &&
      input.squadRun !== true &&
      intentCategory === 'EXECUTION' &&
      input.workspaceStream !== true;
    const isMissionRuntime = Boolean(input.missionId);

    // Legacy managed credits remain only for non-mission chat/ideation.
    // Mission execution is already accounted for by Power and must not debit
    // the legacy user_credits ledger a second time. BYOK never debits either.
    if (managed && !isMissionRuntime) {
      const idempotencyKey = input.idempotencyKey?.trim() || `${user.id}:${crypto.randomUUID()}`;
      const amount = intentCategory === 'CONVERSATION' ? 1 : 3;
      try {
        const debit = await consumeManagedCredit(supabaseAdmin, {
          userId: user.id,
          missionId: null,
          idempotencyKey,
          amount,
          reason: `ai:${intentCategory.toLowerCase()}:${resolution.provider}:${resolution.model}`,
        });
        energyRemaining = debit.energyRemaining;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/insufficient|energy|credit/i.test(message)) {
          return jsonError('Credits insuffisants pour cette action IA gérée.', 402, headers, 'CREDITS_REQUIRED');
        }
        throw error;
      }
    }

    const config = PROVIDER_CONFIGS[resolution.provider];
    const languageFromRequest = input.language ? normalizeResponseLanguage(input.language) : null;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .maybeSingle();
    const responseLanguage = languageFromRequest ?? normalizeResponseLanguage(profile?.preferred_language);
    const languageInstruction =
      responseLanguage === 'en'
        ? 'Always respond in English.'
        : responseLanguage === 'es'
          ? 'Responde siempre en español.'
          : 'Réponds toujours en français.';
    const messages: { role: 'system' | 'user'; content: string }[] = [];
    const effectiveSystemPrompt = input.workspaceStream
      ? `${systemPrompt ?? ''}\n${WORKSPACE_SYSTEM_PROMPT}\n${languageInstruction}`.trim()
      : [systemPrompt, languageInstruction].filter(Boolean).join('\n');
    if (effectiveSystemPrompt) messages.push({ role: 'system', content: effectiveSystemPrompt });
    messages.push({ role: 'user', content: prompt });

    // Production chat and ideation can call the same real research/image tools
    // as the direct AI SDK path. Mission builders keep their strict NDJSON contract.
    const canUseChatTools =
      stream &&
      !input.workspaceStream &&
      input.planOnly !== true &&
      input.squadRun !== true &&
      !input.missionId &&
      intentCategory !== "EXECUTION" &&
      shouldUseChatTools(prompt) &&
      resolution.provider !== "anthropic";

    if (canUseChatTools) {
      return createToolEnabledChatResponse({
        apiUrl: config.url,
        apiKey: resolution.apiKey,
        provider: resolution.provider,
        model: resolution.model,
        messages,
        maxTokens,
        language: responseLanguage,
        responseHeaders: headers,
        requestSignal: req.signal,
      });
    }

    let simplePowerReservationKey: string | null = null;
    let simplePowerReservedPoints = 0;
    if (managed && isSimpleMission && input.missionId) {
      const { data: policy, error: policyError } = await supabaseAdmin
        .from('power_action_policies')
        .select('cost_points')
        .eq('action_type', 'mission_simple')
        .eq('is_active', true)
        .maybeSingle();

      if (policyError || !Number.isInteger(policy?.cost_points) || policy.cost_points <= 0) {
        console.error('Simple mission Power policy unavailable.');
        return jsonError('Le calcul Power est momentanément indisponible. Aucun point n’a été débité.', 503, headers, 'POWER_POLICY_UNAVAILABLE');
      }

      simplePowerReservedPoints = policy.cost_points;
      const basePowerKey = input.idempotencyKey?.trim() || `${user.id}:mission-simple:${input.missionId}`;
      simplePowerReservationKey = `${basePowerKey}:power:simple`;
      if (simplePowerReservationKey.length > 200) {
        return jsonError('La clé de mission est trop longue pour réserver Power.', 400, headers, 'INVALID_POWER_KEY');
      }

      const { data: reservation, error: reserveError } = await supabaseAdmin.rpc('reserve_power_points', {
        p_user_id: user.id,
        p_operation: 'mission_simple',
        p_reserved_points: simplePowerReservedPoints,
        p_idempotency_key: simplePowerReservationKey,
        p_mission_id: input.missionId,
        p_task_id: null,
        p_metadata: { source: 'process-ai-request', providerMode: resolution.mode },
      });

      if (reserveError || !Array.isArray(reservation) || !reservation[0]?.reservation_id) {
        const message = reserveError?.message ?? 'Power reservation returned no result.';
        if (/insufficient|power/i.test(message)) {
          return jsonError('Power insuffisant pour cette mission.', 402, headers, 'POWER_REQUIRED');
        }
        console.error('Simple mission Power reservation failed.');
        return jsonError('La réservation Power a échoué. Réessayez sans relancer plusieurs fois.', 503, headers, 'POWER_RESERVATION_FAILED');
      }
    }

    let providerAttempt: { response: Response; resolution: ResolvedProvider };
    try {
      providerAttempt = await fetchProviderWithFallback({
        primary: resolution,
        messages,
        maxTokens,
        stream,
        signal: req.signal,
        responseHeaders: headers,
      });
    } catch (error) {
      if (simplePowerReservationKey) {
        const { error: releaseError } = await supabaseAdmin.rpc('release_power_reservation', {
          p_idempotency_key: simplePowerReservationKey,
          p_reason: 'AI provider request failed before a response',
        });
        if (releaseError) console.error('Simple mission Power release failed after provider error.');
      }
      throw error;
    }
    const llmRes = providerAttempt.response;
    resolution = providerAttempt.resolution;

    if (!llmRes.ok) {
      if (simplePowerReservationKey) {
        const { error: releaseError } = await supabaseAdmin.rpc('release_power_reservation', {
          p_idempotency_key: simplePowerReservationKey,
          p_reason: `AI provider returned HTTP ${llmRes.status}`,
        });
        if (releaseError) {
          console.error('Simple mission Power reservation remains held after provider failure.');
        }
      }
      const err = await llmRes.json().catch(() => ({ error: llmRes.statusText }));
      return jsonError(err.error?.message ?? err.error ?? 'LLM error.', llmRes.status, headers);
    }

    if (simplePowerReservationKey) {
      const { error: settleError } = await supabaseAdmin.rpc('settle_power_reservation', {
        p_idempotency_key: simplePowerReservationKey,
        p_actual_points: simplePowerReservedPoints,
      });
      if (settleError) {
        await llmRes.body?.cancel().catch(() => undefined);
        const { error: releaseError } = await supabaseAdmin.rpc('release_power_reservation', {
          p_idempotency_key: simplePowerReservationKey,
          p_reason: 'Power settlement failed before output was returned',
        });
        if (releaseError) console.error('Simple mission Power reservation remains held after settlement failure.');
        return jsonError('La génération n’a pas pu être confirmée dans Power. Réessayez dans un instant.', 503, headers, 'POWER_SETTLEMENT_FAILED');
      }
    }

    if (stream) {
      if (input.workspaceStream && input.missionId) {
        const encoder = new TextEncoder();
        const abortController = new AbortController();
        const workspaceReadable = new ReadableStream<Uint8Array>({
          start(controller) {
            streamWorkspaceBuild(llmRes, controller, encoder, supabaseAdmin, {
              idempotencyKey: input.idempotencyKey?.trim() || `${user.id}:${input.missionId}:workspace`,
              missionId: input.missionId as string,
              signal: abortController.signal,
            })
              .then(() => controller.close())
              .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'idealy_file_event', event: { eventType: 'mission_error', missionId: input.missionId, path: undefined, payload: { code: 'WORKSPACE_BUILD_FAILED', message }, sequence: 0 } })}\\n\\n`));
                controller.close();
              });
          },
          cancel() {
            abortController.abort();
            void llmRes.body?.cancel();
          },
        });
        return new Response(workspaceReadable, {
          headers: {
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }
      return new Response(llmRes.body, {
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const result = await llmRes.json();
    const message = result.choices?.[0]?.message?.content ?? '';
    if (input.planOnly === true) {
      const plan = parseMissionPlan(message);
      if (!plan) return jsonError('Le fournisseur IA a renvoyé un plan de mission invalide.', 502, headers, 'INVALID_MISSION_PLAN');
      return new Response(JSON.stringify({
        plan,
        energyRemaining,
        mode: resolution.mode,
        model: resolution.model,
        provider: resolution.provider,
        intentCategory,
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      message,
      energyRemaining,
      mode: resolution.mode,
      model: resolution.model,
      provider: resolution.provider,
      intentCategory,
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('process-ai-request failed', error);
    const message = error instanceof Error ? error.message : String(error);
    if (/No BYOK key configured/i.test(message)) return jsonError('No BYOK key is configured for this provider.', 409, headers, 'BYOK_NOT_CONFIGURED');
    if (/AI_KEY_ENCRYPTION_SECRET/i.test(message)) return jsonError('BYOK server encryption is not configured.', 500, headers, 'BYOK_CONFIG_ERROR');
    return jsonError('Unexpected AI proxy error.', 500, headers);
  }
});
