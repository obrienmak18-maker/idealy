import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Provider base URLs
const PROVIDERS: Record<string, { baseUrl: string; envKey: string }> = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    envKey: 'GROQ_API_KEY',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    envKey: 'DEEPSEEK_API_KEY',
  },
};

// Free models mapping
const FREE_MODELS: Record<string, string> = {
  'fast': 'llama3-8b-8192', // Groq free
  'low': 'llama3-8b-8192', // Groq free
  'medium': 'deepseek-chat', // DeepSeek free
  'high': 'meta-llama/llama-3.1-8b-instruct:free', // OpenRouter free
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, complexity = 'medium', provider = 'auto' } = await req.json();

    // Auto-select provider based on complexity
    let selectedProvider = provider;
    let model = messages?.model;

    if (provider === 'auto' || !model) {
      if (complexity === 'high') {
        selectedProvider = 'openrouter';
        model = FREE_MODELS['high'];
      } else if (complexity === 'medium') {
        selectedProvider = 'deepseek';
        model = FREE_MODELS['medium'];
      } else {
        selectedProvider = 'groq';
        model = FREE_MODELS['fast'];
      }
    }

    const config = PROVIDERS[selectedProvider];
    if (!config) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get(config.envKey);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `Provider ${selectedProvider} not configured` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting check (20 requests/hour)
    const { data: rateLimit } = await supabase
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(20);

    if (rateLimit && rateLimit.length >= 20) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log usage
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      provider: selectedProvider,
      model,
      tokens_used: messages.reduce((acc: number, m: { content: string }) => acc + m.content.length, 0),
    });

    // Proxy to AI provider
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});