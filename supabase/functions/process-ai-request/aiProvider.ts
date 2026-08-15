import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type Provider = 'groq' | 'openrouter' | 'deepseek';
export type UserMode = 'free' | 'trial' | 'byok';
export type RequestedMode = UserMode | 'auto';

export interface AIProviderResolution {
  mode: UserMode;
  apiKey: string;
  provider: Provider;
  model: string;
}

export interface ResolveAIProviderOptions {
  provider: Provider;
  model: string;
  mode?: RequestedMode;
}

export const PROVIDER_CONFIGS: Record<Provider, { url: string; envKey: string }> = {
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

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('AI_KEY_ENCRYPTION_SECRET');
  if (!secret) throw new Error('AI_KEY_ENCRYPTION_SECRET is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt', 'encrypt']);
}

export async function encryptAIKey(plainText: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(),
    new TextEncoder().encode(plainText),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipherText))}`;
}

export async function decryptAIKey(encryptedValue: string): Promise<string> {
  const [ivPart, cipherPart] = encryptedValue.split('.');
  if (!ivPart || !cipherPart) throw new Error('Stored AI key has an invalid encrypted format.');
  const plainText = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivPart) },
    await encryptionKey(),
    fromBase64(cipherPart),
  );
  return new TextDecoder().decode(plainText);
}

function isProvider(value: unknown): value is Provider {
  return value === 'groq' || value === 'openrouter' || value === 'deepseek';
}

async function resolveUserMode(userId: string, supabaseAdmin: SupabaseClient): Promise<UserMode> {
  const { data } = await supabaseAdmin
    .from('stripe_customers')
    .select('plan, subscription_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (data?.plan === 'trial' || data?.subscription_status === 'trialing') return 'trial';
  return 'free';
}

async function tryResolveBYOK(
  userId: string,
  supabaseAdmin: SupabaseClient,
  provider: Provider,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('user_ai_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) throw new Error(`Unable to read BYOK configuration: ${error.message}`);
  if (!data?.encrypted_key) return null;

  try {
    return await decryptAIKey(data.encrypted_key);
  } catch {
    throw new Error('The configured BYOK key cannot be decrypted.');
  }
}

export async function resolveAIProvider(
  userId: string,
  supabaseAdmin: SupabaseClient,
  options: ResolveAIProviderOptions,
): Promise<AIProviderResolution> {
  const mode = options.mode ?? 'auto';
  const byokKey = mode === 'free' || mode === 'trial'
    ? null
    : await tryResolveBYOK(userId, supabaseAdmin, options.provider);

  if (byokKey) {
    return {
      mode: 'byok',
      apiKey: byokKey,
      provider: options.provider,
      model: options.model,
    };
  }

  if (mode === 'byok') {
    throw new Error(`No BYOK key configured for ${options.provider}.`);
  }

  const apiKey = Deno.env.get(PROVIDER_CONFIGS[options.provider].envKey);
  if (!apiKey) throw new Error(`API key not configured: ${PROVIDER_CONFIGS[options.provider].envKey}`);

  return {
    mode: await resolveUserMode(userId, supabaseAdmin),
    apiKey,
    provider: options.provider,
    model: options.model,
  };
}

export async function consumeManagedCredit(
  supabaseAdmin: SupabaseClient,
  input: { userId: string; missionId?: string | null; idempotencyKey: string; amount: number; reason: string },
): Promise<{ energyRemaining: number; alreadyCharged: boolean }> {
  const { data, error } = await supabaseAdmin.rpc('consume_ai_credit', {
    p_user_id: input.userId,
    p_mission_id: input.missionId ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_amount: input.amount,
    p_reason: input.reason,
  });

  if (error) throw new Error(`Credit debit failed: ${error.message}`);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    energyRemaining: Number(result?.energy_remaining ?? 0),
    alreadyCharged: Boolean(result?.already_charged),
  };
}

export function isSupportedProvider(value: unknown): value is Provider {
  return isProvider(value);
}
