import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
};

const DEFAULT_MODELS: Record<Provider, string> = {
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'deepseek/deepseek-coder',
  deepseek: 'deepseek-chat',
};

const ALLOWED_MODELS: Record<Provider, readonly string[]> = {
  groq: ['llama-3.3-70b-versatile'],
  openrouter: ['deepseek/deepseek-coder', 'openrouter/free'],
  deepseek: ['deepseek-chat'],
};

const MAX_PROMPT_CHARS = 120_000;
const MAX_SYSTEM_PROMPT_CHARS = 20_000;
const MAX_OUTPUT_TOKENS = 8_000;
const MAX_IDEMPOTENCY_KEY_CHARS = 180;
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

    const { data: energySnapshot } = await supabaseAdmin
      .from('user_energy')
      .select('updated_at')
      .eq('id', user.id)
      .maybeSingle();
    if (energySnapshot?.updated_at && Date.now() - new Date(energySnapshot.updated_at).getTime() < 3_000) {
      return jsonError('Too many requests. Please wait a few seconds.', 429, headers, 'RATE_LIMIT');
    }

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

    const provider = input.provider ?? 'groq';
    if (!isSupportedProvider(provider)) return jsonError('Unsupported provider.', 400, headers);

    const model = input.model ?? DEFAULT_MODELS[provider];
    if (typeof model !== 'string' || !ALLOWED_MODELS[provider].includes(model)) {
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

    const resolution = await resolveAIProvider(user.id, supabaseAdmin, { provider, model, mode });
    const managed = resolution.mode !== 'byok';
    let energyRemaining: number | null = null;

    if (managed) {
      const idempotencyKey = input.idempotencyKey?.trim() || `${user.id}:${crypto.randomUUID()}`;
      try {
        const debit = await consumeManagedCredit(supabaseAdmin, {
          userId: user.id,
          missionId: input.missionId,
          idempotencyKey,
          amount: 10,
          reason: `ai:${provider}:${model}`,
        });
        energyRemaining = debit.energyRemaining;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/insufficient|energy|credit/i.test(message)) {
          return jsonError('Insufficient energy for a managed AI request.', 402, headers, 'ENERGY_DEPLETED');
        }
        throw error;
      }
    }

    const config = PROVIDER_CONFIGS[resolution.provider];
    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
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
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!llmRes.ok) {
      const err = await llmRes.json().catch(() => ({ error: llmRes.statusText }));
      return jsonError(err.error?.message ?? err.error ?? 'LLM error.', llmRes.status, headers);
    }

    if (stream) {
      return new Response(llmRes.body, {
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const result = await llmRes.json();
    return new Response(JSON.stringify({
      message: result.choices?.[0]?.message?.content ?? '',
      energyRemaining,
      mode: resolution.mode,
      model: resolution.model,
      provider: resolution.provider,
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
