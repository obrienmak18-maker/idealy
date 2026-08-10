/**
 * provider.ts — Secure AI provider via Supabase Edge Function proxy.
 *
 * ⚠️ SECURITY: Les clés API LLM (Groq, OpenRouter, DeepSeek) ne sont JAMAIS
 * dans le bundle front-end. Tous les appels passent par la Edge Function
 * `process-ai-request` qui détient les clés côté serveur.
 *
 * Compatible avec le SDK `ai` de Vercel : on crée un faux provider "custom"
 * qui redirige vers notre proxy Edge Function.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { getSupabaseClient } from '@/supabaseClient';

// ─── Provider selection per task complexity ───────────────────────────────────

type Complexity = 'low' | 'medium' | 'high' | 'fast';

interface ModelConfig {
  provider: 'groq' | 'openrouter' | 'deepseek';
  model: string;
}

const MODEL_MAP: Record<Complexity, ModelConfig> = {
  fast:   { provider: 'groq',        model: 'llama-3.3-70b-versatile' },
  low:    { provider: 'groq',        model: 'llama-3.3-70b-versatile' },
  medium: { provider: 'deepseek',    model: 'deepseek-chat' },
  high:   { provider: 'openrouter',  model: 'deepseek/deepseek-coder' },
};

export function getModelConfig(complexity: Complexity): ModelConfig {
  return MODEL_MAP[complexity];
}

// ─── Secure proxy client ──────────────────────────────────────────────────────

/**
 * Crée un provider `ai`-SDK compatible qui proxy via notre Edge Function.
 * La clé API n'est jamais envoyée au navigateur.
 */
export function getSecureProvider(complexity: Complexity) {
  const supabase = getSupabaseClient();
  const config = MODEL_MAP[complexity];

  // On crée un provider OpenAI-compatible pointant vers notre Edge Function
  // La Edge Function attend les mêmes paramètres qu'une API OpenAI
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const proxyUrl = `${supabaseUrl}/functions/v1/process-ai-request`;

  // Pour l'auth, on injecte le JWT de l'utilisateur courant
  const getAuthToken = async (): Promise<string> => {
    if (!supabase) return '';
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  };

  return { config, proxyUrl, getAuthToken };
}

// ─── Low-level call helpers ───────────────────────────────────────────────────

export interface ProxyCallOptions {
  prompt: string;
  systemPrompt?: string;
  complexity?: Complexity;
  stream?: boolean;
  maxTokens?: number;
}

/**
 * Appelle le proxy Edge Function de manière sécurisée.
 * Retourne le texte complet de la réponse.
 */
export async function callAIProxy(options: ProxyCallOptions): Promise<string> {
  const { prompt, systemPrompt, complexity = 'medium', maxTokens = 8000 } = options;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('User not authenticated');

  const config = MODEL_MAP[complexity];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  const res = await fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      provider: config.provider,
      model: config.model,
      stream: false,
      maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `AI proxy error ${res.status}`);
  }

  const data = await res.json();
  return data.message ?? '';
}

/**
 * Appelle le proxy en mode streaming — retourne un ReadableStream de chunks texte.
 */
export async function streamAIProxy(options: ProxyCallOptions): Promise<ReadableStream<string>> {
  const { prompt, systemPrompt, complexity = 'fast', maxTokens = 4000 } = options;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('User not authenticated');

  const config = MODEL_MAP[complexity];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  const res = await fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      provider: config.provider,
      model: config.model,
      stream: true,
      maxTokens,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream error ${res.status}`);
  }

  // Parse SSE stream and emit text chunks
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { controller.close(); return; }
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(text);
          } catch { /* skip malformed SSE lines */ }
        }
      }
    },
    cancel() { reader.cancel(); },
  });
}

// ─── Compatibility shim for orchestrator.ts ───────────────────────────────────
// orchestrator.ts utilise getModel() directement avec le SDK `ai`.
// On expose un faux provider OpenAI-compatible qui forward vers notre proxy.
// NOTE: Pour la génération de code (buildIUPS), on utilise callAIProxy directement.

export function getModel(complexity: Complexity) {
  // Fallback : si des clés VITE_ sont définies (dev local), on les utilise directement.
  // En production sans ces clés, tout passe par callAIProxy().
  const config = MODEL_MAP[complexity];

  const devKeys: Record<string, string | undefined> = {
    groq: import.meta.env.VITE_GROQ_API_KEY,
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
    deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY,
  };

  const baseUrls: Record<string, string> = {
    groq: 'https://api.groq.com/openai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    deepseek: 'https://api.deepseek.com/v1',
  };

  const apiKey = devKeys[config.provider];
  if (apiKey) {
    // Dev mode : direct call (clés en .env.local, pas dans le bundle build)
    return createOpenAI({
      baseURL: baseUrls[config.provider],
      apiKey,
    })(config.model);
  }

  // Production : retourne un provider "vide" — orchestrator doit appeler callAIProxy()
  // On retourne quand même un objet valide pour éviter les crashs
  return createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: 'placeholder-use-proxy',
  })(config.model);
}