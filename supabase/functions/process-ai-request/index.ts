import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { classifyIntent } from './intentRouter.ts';
import { streamUI, type AgentUIPhase } from './streamUI.ts';
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
  'https://idealy-ai.netlify.app',
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
Tu es le Builder d’Idealy. Pour une mission EXECUTION, réponds uniquement avec un JSON valide, sans markdown ni texte autour, selon ce contrat :
{"project":{"name":"nom-kebab-case","description":"description courte","stack":"react-vite-typescript","fileTree":[{"path":"package.json","content":"contenu complet","type":"json"}]}}
Génère une première version verticale réellement utilisable. Inclus au minimum package.json, index.html, src/main.tsx, src/App.tsx et src/App.css pour une application web. Chaque fichier doit avoir un chemin relatif sûr, un contenu complet et aucun secret. N’ajoute jamais de chemin absolu, de segment .., de mot de passe ou de clé API. Retourne tous les fichiers dans fileTree et ne retourne rien d’autre.`;
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

function isAgentUIPhase(value: unknown): value is AgentUIPhase {
  return value === 'planning' || value === 'building' || value === 'validating' || value === 'completed' || value === 'needs-fix';
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

type GeneratedFile = {
  content: string;
  path: string;
  type?: string;
};

function normalizeWorkspacePath(path: string) {
  const normalized = path.trim().replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || normalized.length > 240) {
    throw new Error('Invalid mission file path.');
  }
  return normalized;
}

function generatedFilesFromContent(content: string): GeneratedFile[] {
  const clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const envelope = parsed as { project?: { fileTree?: unknown; files?: unknown } };
  const project = envelope.project;
  if (!project || typeof project !== 'object') return [];
  const result: GeneratedFile[] = [];
  if (Array.isArray(project.fileTree)) {
    for (const candidate of project.fileTree) {
      if (!candidate || typeof candidate !== 'object') continue;
      const file = candidate as { path?: unknown; content?: unknown; type?: unknown };
      if (typeof file.path === 'string' && typeof file.content === 'string') {
        result.push({ content: file.content, path: normalizeWorkspacePath(file.path), type: typeof file.type === 'string' ? file.type : undefined });
      }
    }
  }
  if (result.length === 0 && project.files && typeof project.files === 'object' && !Array.isArray(project.files)) {
    for (const [path, value] of Object.entries(project.files as Record<string, unknown>)) {
      if (typeof value === 'string') result.push({ content: value, path: normalizeWorkspacePath(path) });
    }
  }
  return result.slice(0, 500);
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
  },
) {
  const reader = llmRes.body?.getReader();
  if (!reader) throw new Error('Workspace provider returned no stream.');
  const decoder = new TextDecoder();
  let pending = '';
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\\n');
    pending = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const chunk = JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> };
        accumulated += chunk.choices?.[0]?.delta?.content ?? '';
      } catch {
        // Ignore an incomplete upstream frame.
      }
    }
  }

  const files = generatedFilesFromContent(accumulated);
  if (files.length === 0) throw new Error('The builder returned no valid files.');

  for (const [index, file] of files.entries()) {
    const version = 1;
    const idempotencyBase = `${input.idempotencyKey}:file:${file.path}:${version}`;
    const baseFile = {
      content: file.content,
      language: file.type ?? null,
      mission_id: input.missionId,
      path: file.path,
      source: 'builder',
      status: 'writing',
      version,
    };
    const { error: writingError } = await supabaseAdmin.from('mission_files').upsert(baseFile, { onConflict: 'mission_id,path,version' });
    if (writingError) throw new Error(`Mission file write failed: ${writingError.message}`);
    await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
      eventType: 'file_started',
      file: { missionId: input.missionId, path: file.path, status: 'writing', version },
      fileVersion: version,
      idempotencyKey: `${idempotencyBase}:started`,
      missionId: input.missionId,
      path: file.path,
      payload: { index, total: files.length },
    });

    const fileChecksum = await checksum(file.content);
    const { error: savedError } = await supabaseAdmin.from('mission_files').update({ checksum: fileChecksum, status: 'saved' }).eq('mission_id', input.missionId).eq('path', file.path).eq('version', version);
    if (savedError) throw new Error(`Mission file save failed: ${savedError.message}`);
    await emitMissionFileEvent(controller, encoder, supabaseAdmin, {
      eventType: 'file_saved',
      file: { checksum: fileChecksum, content: file.content, language: file.type, missionId: input.missionId, path: file.path, status: 'saved', version },
      fileVersion: version,
      idempotencyKey: `${idempotencyBase}:saved`,
      missionId: input.missionId,
      path: file.path,
      payload: { index, total: files.length },
    });
  }

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
    payload: { fileCount: files.length },
  });

  const assistantMessage = 'La première version de votre application a été générée et enregistrée dans le workspace. Les fichiers sont disponibles dans l’onglet Code.';
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: assistantMessage } }] })}\\n\\n`));
  controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
}

serve(async (req) => {
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

    const resolution = await resolveAIProvider(user.id, supabaseAdmin, { provider, model, mode });
    const managed = resolution.mode !== 'byok';
    const intentCategory = input.intentCategory ?? 'EXECUTION';
    let energyRemaining: number | null = null;

    // Every centrally managed inference consumes credits. BYOK requests still
    // bypass the managed balance, but not the server-side request pacing.
    if (managed) {
      const idempotencyKey = input.idempotencyKey?.trim() || `${user.id}:${crypto.randomUUID()}`;
      const amount = intentCategory === 'CONVERSATION'
        ? 1
        : intentCategory === 'IDEATION'
          ? 3
          : 10;
      try {
        const debit = await consumeManagedCredit(supabaseAdmin, {
          userId: user.id,
          missionId: input.missionId,
          idempotencyKey,
          amount,
          reason: `ai:${intentCategory.toLowerCase()}:${provider}:${model}`,
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
    const messages: { role: 'system' | 'user'; content: string }[] = [];
    const effectiveSystemPrompt = input.workspaceStream
      ? `${systemPrompt ?? ''}\n${WORKSPACE_SYSTEM_PROMPT}`.trim()
      : systemPrompt;
    if (effectiveSystemPrompt) messages.push({ role: 'system', content: effectiveSystemPrompt });
    messages.push({ role: 'user', content: prompt });

    const llmRes = await fetch(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolution.apiKey}`,
        'Content-Type': 'application/json',
        ...(resolution.provider === 'openrouter' ? {
          'HTTP-Referer': 'https://idealy-ai.netlify.app',
          'X-Title': 'Idealy',
        } : {}),
      },
      body: JSON.stringify({
        model: resolution.model,
        messages,
        stream,
        ...(provider === 'moonshot' && model === 'kimi-k3'
          ? { reasoning_effort: 'high' }
          : {}),
        max_tokens: maxTokens,
        ...(provider === 'moonshot' || provider === 'gemini'
          ? {}
          : { temperature: 0.7 }),
      }),
    });

    if (!llmRes.ok) {
      const err = await llmRes.json().catch(() => ({ error: llmRes.statusText }));
      return jsonError(err.error?.message ?? err.error ?? 'LLM error.', llmRes.status, headers);
    }

    if (stream) {
      if (input.workspaceStream && input.missionId) {
        const encoder = new TextEncoder();
        const workspaceReadable = new ReadableStream<Uint8Array>({
          start(controller) {
            streamWorkspaceBuild(llmRes, controller, encoder, supabaseAdmin, {
              idempotencyKey: input.idempotencyKey?.trim() || `${user.id}:${input.missionId}:workspace`,
              missionId: input.missionId as string,
            })
              .then(() => controller.close())
              .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'idealy_file_event', event: { eventType: 'mission_error', missionId: input.missionId, path: undefined, payload: { code: 'WORKSPACE_BUILD_FAILED', message }, sequence: 0 } })}\\n\\n`));
                controller.close();
              });
          },
          cancel() {
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
