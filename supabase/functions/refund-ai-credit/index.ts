import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://idealy.app',
  'https://idealy-ai.netlify.app',
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RefundInput = {
  missionId: string;
  debitIdempotencyKey: string;
  refundIdempotencyKey: string;
  amount: number;
};

function corsHeaders(req: Request): Record<string, string> {
  const configured = (Deno.env.get('IDEALY_ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowed = configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
  const requestOrigin = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(data: Record<string, unknown>, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function isValidKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 180;
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'Server configuration is incomplete.' }, 500, headers);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized.' }, 401, headers);
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.slice('Bearer '.length));
    if (userError || !user) return json({ error: 'Unauthorized.' }, 401, headers);

    const body = await req.json().catch(() => null) as Partial<RefundInput> | null;
    if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON request.' }, 400, headers);
    if (!isValidKey(body.missionId) || !UUID_PATTERN.test(body.missionId)) return json({ error: 'missionId must be a UUID.' }, 400, headers);
    if (!isValidKey(body.debitIdempotencyKey) || !isValidKey(body.refundIdempotencyKey)) return json({ error: 'Idempotency keys are required.' }, 400, headers);
    if (body.debitIdempotencyKey === body.refundIdempotencyKey) return json({ error: 'Refund key must differ from debit key.' }, 400, headers);
    if (!Number.isInteger(body.amount) || body.amount <= 0 || body.amount > 100) return json({ error: 'amount must be an integer between 1 and 100.' }, 400, headers);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin.rpc('refund_ai_credit', {
      p_user_id: user.id,
      p_mission_id: body.missionId,
      p_debit_idempotency_key: body.debitIdempotencyKey,
      p_refund_idempotency_key: body.refundIdempotencyKey,
      p_amount: body.amount,
      p_reason: 'ai:mission-stop-refund',
    }).single();
    if (error) {
      console.error('[refund-ai-credit] RPC failed', error);
      return json({ error: 'Refund could not be applied.', code: 'REFUND_FAILED' }, 409, headers);
    }

    return json({ balance: data?.balance ?? null, alreadyRefunded: Boolean(data?.already_refunded) }, 200, headers);
  } catch (error) {
    console.error('[refund-ai-credit] unexpected error', error);
    return json({ error: 'Unexpected refund error.' }, 500, headers);
  }
});
