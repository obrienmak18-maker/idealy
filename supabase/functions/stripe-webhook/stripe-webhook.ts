export type CheckoutSessionCompletedEvent = {
  id: string;
};

export type CheckoutSession = {
  id: string;
  mode?: string | null;
  metadata?: Record<string, string> | null;
};

export type CreditPackCatalog = Record<string, number>;

export type CreditRefill = {
  userId: string;
  amount: number;
  eventId: string;
  sessionId: string;
  reason: string;
  packId: string;
};

/**
 * A Power Pack purchase.
 *
 * `points` is what the wallet receives, `powerPoints` is the canonical amount
 * from the server-owned catalogue. Metadata may only *name* a configured pack;
 * it can never state how much Power that pack is worth.
 */
export type PowerPack = {
  points: number;
  powerPoints: number;
};

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100_000) return null;
  return parsed;
}

export function parseCreditPackCatalog(value: string | undefined): CreditPackCatalog {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([packId, credits]) => {
        const amount = positiveInteger(credits);
        return packId.trim() && amount ? [[packId.trim(), amount]] : [];
      }),
    );
  } catch {
    return {};
  }
}

/**
 * Credit refills are opt-in. The amount always comes from a server-owned
 * pack catalogue; client metadata can only name a configured pack.
 * Subscription checkouts never change a balance.
 */
export function getCreditRefillFromCheckout(
  event: CheckoutSessionCompletedEvent,
  session: CheckoutSession,
  creditPackCatalog: CreditPackCatalog,
): CreditRefill | null {
  if (session.mode !== 'payment') return null;
  const userId = session.metadata?.user_id?.trim();
  const packId = session.metadata?.credit_pack_id?.trim();
  const amount = packId ? positiveInteger(creditPackCatalog[packId]) : null;
  if (!userId || !amount) return null;

  return {
    amount,
    eventId: event.id,
    packId: packId as string,
    reason: `stripe:checkout.session.completed:${session.mode ?? 'payment'}`,
    sessionId: session.id,
    userId,
  };
}

export type PowerPackPurchase = {
  eventId: string;
  packId: string;
  powerPoints: number;
  userId: string;
};

/**
 * Parses the server-owned Power Pack catalogue.
 *
 * The catalogue is the only place that decides how much Power a pack is worth,
 * so a client cannot influence the credited amount.
 */
export function parsePowerPackCatalog(
  value: string | undefined
): Record<string, PowerPack> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([packId, pack]) => {
        if (!packId.trim() || !pack || typeof pack !== "object") return [];
        const entry = pack as Record<string, unknown>;
        const powerPoints = positiveInteger(entry.powerPoints);
        return powerPoints ? [[packId.trim(), { points: 1, powerPoints }]] : [];
      })
    );
  } catch {
    return {};
  }
}

/**
 * Resolves a Power Pack purchase from the server-owned catalogue.
 *
 * The amount is never read from the event: only the configured pack decides how
 * much Power is granted, so a tampered checkout cannot inflate a balance.
 * A subscription checkout is never a pack purchase.
 */
export function getPowerPackFromCheckout(
  event: CheckoutSessionCompletedEvent,
  session: CheckoutSession,
  catalog: Record<string, PowerPack>,
): PowerPackPurchase | null {
  if (session.mode !== "payment") return null;

  const userId = session.metadata?.user_id?.trim();
  const packId = (session.metadata?.power_pack_id ?? "")?.trim();
  if (!userId || !packId) return null;

  const pack = catalog[packId];
  if (!pack) return null;

  const powerPoints = positiveInteger(pack.powerPoints);
  if (!powerPoints) return null;

  // The Stripe event id is the idempotency anchor, so replaying the same event
  // can never credit a second time.
  return { eventId: event.id, packId, powerPoints, userId };
}
