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

export function getFreeGenerationLimit(): number {
  const envVal = process.env.IDEALY_FREE_GENERATION_LIMIT;
  const parsed = envVal ? parseInt(envVal, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

type QuotaRecord = {
  actionType: string;
  createdAt: number;
  idempotencyKey: string;
  status: "reserved" | "completed" | "refunded";
  userId: string;
};

// Thread-safe in-process store ensuring atomic increments and idempotent runs
const memoryStore = new Map<string, QuotaRecord[]>();

function getUserRecords(userId: string): QuotaRecord[] {
  let list = memoryStore.get(userId);
  if (!list) {
    list = [];
    memoryStore.set(userId, list);
  }
  return list;
}

function countActiveGenerations(records: QuotaRecord[]): number {
  return records.filter(
    (r) => r.status === "reserved" || r.status === "completed"
  ).length;
}

/**
 * Get the current free quota status for a user.
 */
export async function getFreeQuotaStatus(userId: string): Promise<FreeQuotaStatus> {
  const limit = getFreeGenerationLimit();
  const records = getUserRecords(userId);
  const used = countActiveGenerations(records);
  const remaining = Math.max(0, limit - used);
  const allowed = remaining > 0;

  return {
    allowed,
    limit,
    message: allowed ? null : FREE_QUOTA_EXCEEDED_MESSAGE,
    remaining,
    used,
  };
}

/**
 * Atomically reserve a generation slot for an idempotency key.
 * If the idempotency key was already reserved or completed, returns allowed=true without re-incrementing.
 * If quota is reached, returns allowed=false with the friendly French message.
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
  const limit = getFreeGenerationLimit();
  const records = getUserRecords(userId);

  // 1. Idempotency check: if this key already exists and was active, do not double count
  const existing = records.find((r) => r.idempotencyKey === idempotencyKey);
  if (existing) {
    if (existing.status === "reserved" || existing.status === "completed") {
      const used = countActiveGenerations(records);
      return {
        allowed: true,
        limit,
        message: null,
        remaining: Math.max(0, limit - used),
        used,
      };
    }
  }

  // 2. Count current active usage
  const currentUsed = countActiveGenerations(records);
  if (currentUsed >= limit) {
    return {
      allowed: false,
      limit,
      message: FREE_QUOTA_EXCEEDED_MESSAGE,
      remaining: 0,
      used: currentUsed,
    };
  }

  // 3. Atomically record the new reservation
  records.push({
    actionType,
    createdAt: Date.now(),
    idempotencyKey,
    status: "reserved",
    userId,
  });

  const newUsed = countActiveGenerations(records);
  return {
    allowed: true,
    limit,
    message: null,
    remaining: Math.max(0, limit - newUsed),
    used: newUsed,
  };
}

/**
 * Commit a generation reservation after successful completion.
 */
export async function commitFreeGeneration({
  idempotencyKey,
  userId,
}: {
  idempotencyKey: string;
  userId: string;
}): Promise<void> {
  const records = getUserRecords(userId);
  const record = records.find((r) => r.idempotencyKey === idempotencyKey);
  if (record && record.status === "reserved") {
    record.status = "completed";
  }
}

/**
 * Refund / release a generation reservation if a technical failure occurred before output.
 */
export async function refundFreeGeneration({
  idempotencyKey,
  userId,
}: {
  idempotencyKey: string;
  userId: string;
}): Promise<void> {
  const records = getUserRecords(userId);
  const record = records.find((r) => r.idempotencyKey === idempotencyKey);
  if (record && record.status === "reserved") {
    record.status = "refunded";
  }
}

/**
 * Utility for automated test suites to reset counters.
 */
export function resetFreeQuotaForTest(userId?: string): void {
  if (userId) {
    memoryStore.delete(userId);
  } else {
    memoryStore.clear();
  }
}
