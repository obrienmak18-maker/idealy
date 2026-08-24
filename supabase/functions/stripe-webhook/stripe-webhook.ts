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
 * Subscription checkouts never change a credit balance.
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
    userId,
    amount,
    eventId: event.id,
    sessionId: session.id,
    reason: `stripe:checkout.session.completed:${session.mode ?? 'payment'}`,
  };
}
