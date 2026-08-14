import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * process-ai-request — Secure LLM proxy.
 *
 * Receives: { prompt, systemPrompt, model, stream, maxTokens }
 * - Authenticates user via JWT
 * - Checks + decrements energy
 * - Proxies to the chosen LLM provider (DeepSeek / Groq / OpenRouter)
 * - Supports streaming via SSE
 *
 * This is the ONLY place where LLM API keys are used.
 * They are NEVER sent to the frontend.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://idealy.app',
];

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

type Provider = 'groq' | 'openrouter' | 'deepseek';

interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  provider?: Provider;
  model?: string;
  stream?: boolean;
  maxTokens?: number;
}

const PROVIDER_CONFIGS: Record<Provider, { url: string; envKey: string }> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    envKey: 'GROQ_API_KEY',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY',
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
  },
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

function isProvider(value: unknown): value is Provider {
  return value === 'groq' || value === 'openrouter' || value === 'deepseek';
}

function jsonError(message: string, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const headers = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // 1. Authenticate user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Verify token with anon client
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check energy & Rate limit
    const { data: energyData, error: energyError } = await supabaseAdmin
      .from('user_energy')
      .select('current_energy, updated_at')
      .eq('id', user.id)
      .single();

    if (energyError || !energyData) {
      // Auto-create energy record if missing
      await supabaseAdmin.from('user_energy').insert({ id: user.id, current_energy: 50 });
    } else {
      // Rate Limit: 3 seconds per user to prevent spam / race conditions
      const lastUpdate = new Date(energyData.updated_at).getTime();
      const now = Date.now();
      if (now - lastUpdate < 3000) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please wait a few seconds.', code: 'RATE_LIMIT' }), {
          status: 429, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (energyData.current_energy <= 0) {
        return new Response(JSON.stringify({ error: 'Insufficient energy', code: 'ENERGY_DEPLETED' }), {
          status: 402, headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Parse and validate request before selecting a provider or consuming energy
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON request.', 400, headers);
    }

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
    if (systemPrompt && systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      return jsonError('systemPrompt is too large.', 413, headers);
    }

    const providerValue = input.provider ?? 'groq';
    if (!isProvider(providerValue)) return jsonError('Unsupported provider.', 400, headers);
    const provider = providerValue;

    const model = input.model ?? DEFAULT_MODELS[provider];
    if (typeof model !== 'string' || !ALLOWED_MODELS[provider].includes(model)) {
      return jsonError('Model is not allowed for this provider.', 400, headers);
    }

    const stream = input.stream ?? false;
    if (typeof stream !== 'boolean') return jsonError('stream must be boolean.', 400, headers);

    const maxTokens = input.maxTokens ?? MAX_OUTPUT_TOKENS;
    if (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens) || maxTokens < 128 || maxTokens > MAX_OUTPUT_TOKENS) {
      return jsonError(`maxTokens must be an integer between 128 and ${MAX_OUTPUT_TOKENS}.`, 400, headers);
    }

    const config = PROVIDER_CONFIGS[provider];

    const apiKey = Deno.env.get(config.envKey);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key not configured: ${config.envKey}` }), {
        status: 500, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 4. Decrement energy (and update timestamp)
    const currentEnergy = energyData?.current_energy ?? 50;
    await supabaseAdmin
      .from('user_energy')
      .update({ 
        current_energy: Math.max(0, currentEnergy - 10),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // 5. Build messages
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    // 6. Call LLM
    const llmRes = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': 'https://idealy.app',
          'X-Title': 'Idealy',
        } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!llmRes.ok) {
      const err = await llmRes.json().catch(() => ({ error: llmRes.statusText }));
      return new Response(JSON.stringify({ error: err.error?.message ?? err.error ?? 'LLM error' }), {
        status: llmRes.status, headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 7. Stream or return response
    if (stream) {
      // Pass through SSE stream directly to client
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
      energyRemaining: Math.max(0, currentEnergy - 10),
      model,
      provider,
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('process-ai-request failed', error);
    return jsonError('Unexpected AI proxy error.', 500, headers);
  }
});
