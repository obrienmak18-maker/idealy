/**
 * provider.ts — Client IA sécurisé.
 *
 * Le navigateur ne contient aucune clé fournisseur. Il envoie uniquement une
 * demande authentifiée à l’Edge Function `process-ai-request`, qui choisit le
 * fournisseur autorisé et conserve les secrets côté serveur.
 */

import { getFirebaseIdToken } from '@/firebaseAuth';
import { getSupabaseClient } from '@/supabaseClient';

export type Complexity = 'low' | 'medium' | 'high' | 'fast';
export type LLMProvider = 'groq' | 'openrouter' | 'deepseek';
export type AIRequestMode = 'auto' | 'free' | 'trial' | 'byok';
export type IntentCategory = 'CONVERSATION' | 'IDEATION' | 'EXECUTION';

export interface IntentRoute {
  category: IntentCategory;
  confidence: number;
  reason: string;
}

export type AgentUIPhase = 'planning' | 'building' | 'validating' | 'completed' | 'needs-fix';

export interface MissionPlanAgent {
  name: string;
  responsibility: string;
  result: string;
  accent?: string;
}

export interface MissionPlan {
  projectKind: string;
  intention: string;
  v1Scope: string;
  agents: MissionPlanAgent[];
  nextStep: string;
}

export interface AgentTimelineData {
  missionId?: string | null;
  phase: AgentUIPhase;
  progress: number;
  strategist: 'queued' | 'active' | 'done';
  builder: 'queued' | 'active' | 'done';
  terminal: 'queued' | 'active' | 'done' | 'error';
}

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
  intentOnly?: boolean;
  intentCategory?: IntentCategory;
  uiStream?: boolean;
  uiPhase?: AgentUIPhase;
  uiProgress?: number;
  planOnly?: boolean;
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
    intentOnly = false,
    intentCategory,
    uiStream = false,
    uiPhase,
    uiProgress,
    planOnly = false,
  } = options;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data: { session } } = await supabase.auth.getSession();
  const firebaseToken = await getFirebaseIdToken().catch(() => null);
  const accessToken = firebaseToken ?? session?.access_token;
  if (!accessToken) throw new Error('Connectez-vous avant de lancer une mission IA.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !anonKey) throw new Error('Configuration publique Supabase incomplète.');

  const config = getModelConfig(complexity);
  return fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
      intentOnly,
      intentCategory,
      uiStream,
      uiPhase,
      uiProgress,
      planOnly,
    }),
  });
}

async function readProxyError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return payload?.error ?? `Erreur IA (${response.status}).`;
}

/** Route l’intention côté serveur sans consommer de crédit IA ni appeler un fournisseur. */
export async function streamAgentUI(options: {
  missionId?: string;
  phase: AgentUIPhase;
  progress?: number;
}): Promise<AgentTimelineData | null> {
  const response = await createProxyRequest({
    prompt: 'État UI de l’escouade.',
    intentOnly: false,
    uiStream: true,
    uiPhase: options.phase,
    uiProgress: options.progress,
    missionId: options.missionId,
    maxTokens: 128,
  });
  if (!response.ok || !response.body) throw new Error(await readProxyError(response));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const chunk = JSON.parse(raw) as { type?: string; data?: AgentTimelineData };
          if (chunk.type === 'data-agent-timeline' && chunk.data) return chunk.data;
        } catch {
          // Ignore incomplete SSE frames.
        }
      }
      // La dernière ligne incomplète est conservée pour le prochain chunk.
      // `lines.pop()` l’a déjà retirée de la boucle ci-dessus.
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return null;
}

export async function routeAIIntent(prompt: string): Promise<IntentRoute> {
  const response = await createProxyRequest({ prompt, intentOnly: true, maxTokens: 128 });
  if (!response.ok) throw new Error(await readProxyError(response));
  const payload = await response.json() as { intent?: IntentRoute };
  if (!payload.intent || !['CONVERSATION', 'IDEATION', 'EXECUTION'].includes(payload.intent.category)) {
    return { category: 'CONVERSATION', confidence: 0, reason: 'Route de repli locale.' };
  }
  return payload.intent;
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
export async function requestMissionPlan(options: {
  prompt: string;
  way?: string;
  profile?: { name?: string; team?: string; role?: string; source?: string };
  missionId?: string;
  idempotencyKey?: string;
}): Promise<MissionPlan> {
  const context = [
    options.way ? `Voie choisie: ${options.way}` : '',
    options.profile?.name ? `Nom: ${options.profile.name}` : '',
    options.profile?.team ? `Taille d'équipe: ${options.profile.team}` : '',
    options.profile?.role ? `Rôle: ${options.profile.role}` : '',
    options.profile?.source ? `Source: ${options.profile.source}` : '',
  ].filter(Boolean).join('\n');
  const response = await createProxyRequest({
    prompt: `${options.prompt.trim()}${context ? `\n\nContexte utilisateur:\n${context}` : ''}`,
    systemPrompt: [
      'Tu es l\'Orchestrateur d\'Idealy.',
      'Analyse le projet et compose une équipe dynamique. Ne crée que les agents nécessaires.',
      'Retourne uniquement un objet JSON valide avec exactement les clés projectKind, intention, v1Scope, agents et nextStep.',
      'agents est un tableau d\'objets {name, responsibility, result}.',
      'Ne présente jamais les voies comme des niveaux tarifaires.',
    ].join('\n'),
    complexity: 'medium',
    mode: 'auto',
    missionId: options.missionId,
    idempotencyKey: options.idempotencyKey,
    intentCategory: 'IDEATION',
    maxTokens: 1800,
    planOnly: true,
  });
  if (!response.ok) throw new Error(await readProxyError(response));
  const payload = await response.json() as { plan?: MissionPlan; message?: string };
  if (!payload.plan) throw new Error('Le plan IA reçu est incomplet.');
  return payload.plan;
}

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
