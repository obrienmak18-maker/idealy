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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (energyData.current_energy <= 0) {
        return new Response(JSON.stringify({ error: 'Insufficient energy', code: 'ENERGY_DEPLETED' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Parse request
    const body: LLMRequest = await req.json();
    const { prompt, systemPrompt, stream = false, maxTokens = 8000 } = body;

    // Determine provider and model
    const provider: Provider = body.provider ?? 'groq';
    const model = body.model ?? DEFAULT_MODELS[provider];
    const config = PROVIDER_CONFIGS[provider];

    const apiKey = Deno.env.get(config.envKey);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key not configured: ${config.envKey}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: llmRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Stream or return response
    if (stream) {
      // Pass through SSE stream directly to client
      return new Response(llmRes.body, {
        headers: {
          ...corsHeaders,
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
