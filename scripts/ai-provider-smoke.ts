import {
  consumeManagedCredit,
  encryptAIKey,
  resolveAIProvider,
} from '../supabase/functions/process-ai-request/aiProvider.ts';

type Row = Record<string, unknown>;

class FakeQuery {
  private table = '';
  private filters: Record<string, unknown> = {};

  constructor(private readonly rows: Record<string, Row | null>) {}
  from(table: string) { this.table = table; return this; }
  select(_columns: string) { return this; }
  eq(column: string, value: unknown) { this.filters[column] = value; return this; }
  async maybeSingle() {
    const row = this.rows[this.table];
    if (!row || Object.entries(this.filters).some(([key, value]) => row[key] !== value)) return { data: null, error: null };
    return { data: row, error: null };
  }
}

class FakeSupabase {
  constructor(private readonly rows: Record<string, Row | null>) {}
  from(table: string) { return new FakeQuery(this.rows).from(table); }
  async rpc(_name: string, args: Record<string, unknown>) {
    if (args.p_idempotency_key !== 'mission:attempt-1') throw new Error('RPC idempotency key was not forwarded');
    return { data: { energy_remaining: 40, already_charged: false }, error: null };
  }
}

(globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno = {
  env: {
    get: (key) => ({
      AI_KEY_ENCRYPTION_SECRET: 'smoke-only-secret',
      GROQ_API_KEY: 'central-managed-key',
    } as Record<string, string>)[key],
  },
};

const managed = await resolveAIProvider(
  '00000000-0000-4000-8000-000000000001',
  new FakeSupabase({
    user_ai_keys: null,
    stripe_customers: { user_id: '00000000-0000-4000-8000-000000000001', plan: 'trial', subscription_status: 'trialing' },
  }) as never,
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
);
if (managed.mode !== 'trial' || managed.apiKey !== 'central-managed-key') throw new Error('Free/Trial routing failed');

const encrypted = await encryptAIKey('byok-smoke-key');
const byok = await resolveAIProvider(
  '00000000-0000-4000-8000-000000000001',
  new FakeSupabase({ user_ai_keys: { user_id: '00000000-0000-4000-8000-000000000001', provider: 'groq', encrypted_key: encrypted }, stripe_customers: null }) as never,
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
);
if (byok.mode !== 'byok' || byok.apiKey !== 'byok-smoke-key') throw new Error('BYOK routing failed');

const debit = await consumeManagedCredit(new FakeSupabase({}) as never, {
  userId: '00000000-0000-4000-8000-000000000001',
  missionId: null,
  idempotencyKey: 'mission:attempt-1',
  amount: 10,
  reason: 'smoke',
});
if (debit.energyRemaining !== 40 || debit.alreadyCharged) throw new Error('Managed credit RPC contract failed');

console.log('ai-provider-smoke: PASS');
