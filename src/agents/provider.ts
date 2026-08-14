/**
 * provider.ts — Client IA sécurisé.
 *
 * Le navigateur ne contient aucune clé fournisseur. Il envoie uniquement une
 * demande authentifiée à l’Edge Function `process-ai-request`, qui choisit le
 * fournisseur autorisé et conserve les secrets côté serveur.
 */

import { getSupabaseClient } from '@/supabaseClient';

export type Complexity = 'low' | 'medium' | 'high' | 'fast';
export type LLMProvider = 'groq' | 'openrouter' | 'deepseek';
export type AIRequestMode = 'auto' | 'free' | 'trial' | 'byok';

export interface ModelConfig {
  provider: LLMProvider;
  model: string;
}

const MODEL_MAP: Record<Complexity, ModelConfig> = {
  fast: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  low: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  medium: { provider: 'deepseek', model: 'deepseek-chat' },
  high: { provider: 'openrouter', model: 'deepseek/deepseek-coder' },
};

export function getModelConfig(complexity: Complexity): ModelConfig {
  return MODEL_MAP[complexity];
}

export interface ProxyCallOptions {
  prompt: string;
  systemPrompt?: string;
  complexity?: Complexity;
  stream?: boolean;
  maxTokens?: number;
  mode?: AIRequestMode;
  missionId?: string;
  idempotencyKey?: string;
}

async function createProxyRequest(options: ProxyCallOptions): Promise<Response> {
  const {
    prompt,
    systemPrompt,
    complexity = 'medium',
    stream = false,
    maxTokens = 8000,
    mode = 'auto',
    missionId,
    idempotencyKey,
  } = options;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Connectez-vous avant de lancer une mission IA.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !anonKey) throw new Error('Configuration publique Supabase incomplète.');

  const config = getModelConfig(complexity);
  return fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      provider: config.provider,
      model: config.model,
      stream,
      maxTokens,
      mode,
      missionId,
      idempotencyKey,
    }),
  });
}

async function readProxyError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? `Erreur IA (${response.status}).`;
}

/** Appel non-streaming vers l’Edge Function ; aucun secret fournisseur ne traverse le navigateur. */
export async function callAIProxy(options: ProxyCallOptions): Promise<string> {
  const response = await createProxyRequest({ ...options, stream: false });
  if (!response.ok) throw new Error(await readProxyError(response));

  const payload = await response.json() as { message?: string };
  return payload.message ?? '';
}

/**
 * Flux de texte via l’Edge Function. Le proxy renvoie des événements SSE
 * OpenAI-compatibles et ce lecteur expose seulement les fragments texte.
 */
export async function streamAIProxy(options: ProxyCallOptions): Promise<AsyncIterable<string>> {
  const response = await createProxyRequest({ ...options, stream: true });
  if (!response.ok || !response.body) throw new Error(await readProxyError(response));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  async function* readEvents(): AsyncGenerator<string> {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch {
            // Ignore incomplete or provider-specific SSE events.
          }
        }
      }

      if (pending.trim()) {
        for (const line of pending.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch {
            // Ignore malformed final SSE event.
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  return readEvents();
}
