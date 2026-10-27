import "server-only";

export const FREE_QUOTA_EXCEEDED_MESSAGE =
  "Vous avez atteint votre limite de générations gratuites. Les offres payantes arrivent bientôt. Votre progression est sauvegardée.";

export interface FreeQuotaStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  used: number;
  message: string | null;
}

type QuotaRpcRow = {
  allowed?: unknown;
  quota_limit?: unknown;
  remaining?: unknown;
  used?: unknown;
  message?: unknown;
};

export function getFreeGenerationLimit(): number {
  const envVal = process.env.IDEALY_FREE_GENERATION_LIMIT;
  const parsed = envVal ? Number.parseInt(envVal, 10) : 50;
  // Allow up to 500 generations for demo / evaluation headroom.
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 500 ? parsed : 50;
}

async function callQuotaRpc(
  functionName:
    | "get_idealy_free_generation_status"
    | "reserve_idealy_free_generation"
    | "commit_idealy_free_generation"
    | "refund_idealy_free_generation",
  parameters: Record<string, unknown>
): Promise<unknown> {
  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ""
  ).trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    // Never fall back to an in-memory quota. Serverless instances do not share
    // memory, so that fallback would allow free usage to reset between requests.
    throw new Error("Persistent generation quota is not configured.");
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parameters),
    });
  } catch {
    throw new Error("Persistent generation quota service is unreachable.");
  }

  if (!response.ok) {
    // Do not include response bodies or request headers: they may contain
    // database implementation details. The caller must fail closed.
    throw new Error(`Persistent generation quota failed (HTTP ${response.status}).`);
  }

  const responseText = await response.text();
  if (!responseText.trim()) return null;

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new Error("Persistent generation quota returned an invalid response.");
  }
}

function parseQuotaStatus(payload: unknown, fallbackLimit: number): FreeQuotaStatus {
  const row = (Array.isArray(payload) ? payload[0] : payload) as QuotaRpcRow | null;
  if (!row || typeof row !== "object") {
    throw new Error("Persistent generation quota returned no status.");
  }

  const limit = Number(row.quota_limit ?? fallbackLimit);
  const remaining = Number(row.remaining);
  const used = Number(row.used);
  if (
    !Number.isInteger(limit) || limit < 1 || limit > 500 ||
    !Number.isInteger(remaining) || remaining < 0 ||
    !Number.isInteger(used) || used < 0 ||
    remaining > limit
  ) {
    throw new Error("Persistent generation quota returned an invalid status.");
  }

  const allowed = row.allowed === true && remaining > 0;
  return {
    allowed,
    limit,
    remaining,
    used,
    message: allowed
      ? null
      : typeof row.message === "string" && row.message.trim()
        ? row.message
        : FREE_QUOTA_EXCEEDED_MESSAGE,
  };
}

/**
 * Read the durable count, shared by every Vercel instance and deployment.
 */
export async function getFreeQuotaStatus(userId: string): Promise<FreeQuotaStatus> {
  if (!userId.trim()) throw new Error("An authenticated user is required for quota lookup.");

  const limit = getFreeGenerationLimit();
  const payload = await callQuotaRpc("get_idealy_free_generation_status", {
    p_user_id: userId,
    p_limit: limit,
  });
  return parseQuotaStatus(payload, limit);
}

/**
 * Atomically reserve a free generation slot in PostgreSQL.
 * An idempotent retry will not reserve a second slot. Concurrent requests are
 * serialized per user inside the database, not within a single application
 * process.
 */
export async function reserveFreeGeneration({
  actionType = "generation",
  idempotencyKey,
  userId,
}: {
  actionType?: string;
  idempotencyKey: string;
  userId: string;
}): Promise<FreeQuotaStatus> {
  if (!userId.trim()) throw new Error("An authenticated user is required for quota reservation.");
  if (!idempotencyKey.trim() || idempotencyKey.length > 180) {
    throw new Error("A valid idempotency key is required for quota reservation.");
  }

  const limit = getFreeGenerationLimit();
  const payload = await callQuotaRpc("reserve_idealy_free_generation", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
    p_action_type: actionType,
    p_limit: limit,
  });
  return parseQuotaStatus(payload, limit);
}

/**
 * Permanently count a reservation only after the associated generation has
 * succeeded. This is idempotent if a completion signal is repeated.
 */
export async function commitFreeGeneration({
  idempotencyKey,
  userId,
}: {
  idempotencyKey: string;
  userId: string;
}): Promise<void> {
  if (!userId.trim() || !idempotencyKey.trim()) {
    throw new Error("User ID and idempotency key are required to commit quota.");
  }
  await callQuotaRpc("commit_idealy_free_generation", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
  });
}

/**
 * Release a reservation only while it is still pending. A completed
 * generation is never refunded by a later error handler.
 */
export async function refundFreeGeneration({
  idempotencyKey,
  userId,
}: {
  idempotencyKey: string;
  userId: string;
}): Promise<void> {
  if (!userId.trim() || !idempotencyKey.trim()) {
    throw new Error("User ID and idempotency key are required to refund quota.");
  }
  await callQuotaRpc("refund_idealy_free_generation", {
    p_user_id: userId,
    p_idempotency_key: idempotencyKey,
  });
}
