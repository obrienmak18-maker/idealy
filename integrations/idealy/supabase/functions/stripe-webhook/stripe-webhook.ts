export type CheckoutSessionCompletedEvent = {
  id: string;
};

export type CheckoutSession = {
  id: string;
  mode?: string | null;
  metadata?: Record<string, string> | null;
};

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

/**
 * Checkout credit refills are opt-in: a Stripe session must carry both
 * metadata.user_id and metadata.credit_amount. Subscription checkouts without
 * credit metadata do not change the user's balance.
 */
export function getCreditRefillFromCheckout(
  event: CheckoutSessionCompletedEvent,
  session: CheckoutSession,
): CreditRefill | null {
  const userId = session.metadata?.user_id?.trim();
  const amount = positiveInteger(session.metadata?.credit_amount);
  if (!userId || !amount) return null;

  return {
    userId,
    amount,
    eventId: event.id,
    sessionId: session.id,
    reason: `stripe:checkout.session.completed:${session.mode ?? 'payment'}`,
  };
}
