-- Power Pack purchases and reservations.
--
-- Stripe credited public.user_credits while missions spend from
-- public.power_wallets, so a paid purchase never produced usable Power. A
-- purchase now credits the Power wallet through public.grant_power_pack
-- (defined in 20260815010000) and is journalled in the same append-only ledger
-- as every other Power movement.

-- The transaction_type CHECK predates purchases, so it is widened additively.
ALTER TABLE public.power_transactions
  DROP CONSTRAINT IF EXISTS power_transactions_transaction_type_check;

ALTER TABLE public.power_transactions
  ADD CONSTRAINT power_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'opening_balance', 'monthly_allocation', 'consumption',
    'way_change', 'power_pack_purchase', 'reservation_hold',
    'reservation_release', 'refund'
  ));

-- The ledger's cross-field invariant is re-stated so a purchase can never be
-- recorded as a consumption, and a consumption cannot carry a null action.
ALTER TABLE public.power_transactions
  DROP CONSTRAINT IF EXISTS power_transactions_transaction_type_check1;

ALTER TABLE public.power_transactions
  ADD CONSTRAINT power_transactions_amount_shape_check CHECK (
    (transaction_type = 'consumption' AND amount_points < 0 AND action_type IS NOT NULL AND way_at_operation IS NOT NULL)
    OR (transaction_type = 'way_change' AND amount_points = 0 AND action_type IS NULL AND way_at_operation IS NOT NULL)
    OR (transaction_type IN ('opening_balance', 'monthly_allocation') AND action_type IS NULL)
    OR (transaction_type IN ('power_pack_purchase', 'reservation_release', 'refund') AND amount_points >= 0 AND action_type IS NULL)
    OR (transaction_type = 'reservation_hold' AND amount_points = 0 AND action_type IS NULL)
  );

-- Reservations let a failing operation be measured and settled instead of being
-- charged twice or losing its hold on a crash.
CREATE TABLE IF NOT EXISTS public.power_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  task_id UUID,
  operation TEXT NOT NULL CHECK (char_length(operation) BETWEEN 3 AND 120),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 200),
  reserved_points INTEGER NOT NULL CHECK (reserved_points > 0),
  charged_points INTEGER NOT NULL DEFAULT 0 CHECK (charged_points >= 0),
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'settled', 'released')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  CHECK (charged_points <= reserved_points)
);

CREATE INDEX IF NOT EXISTS power_reservations_user_status_idx
  ON public.power_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS power_reservations_mission_idx
  ON public.power_reservations(mission_id, created_at DESC)
  WHERE mission_id IS NOT NULL;

-- Reserve -> execute -> measure -> settle. The hold leaves the spendable
-- balance immediately so concurrent operations cannot over-spend it, and only
-- the measured amount is finally charged.
CREATE OR REPLACE FUNCTION public.reserve_power_points(
  p_user_id UUID,
  p_operation TEXT,
  p_reserved_points INTEGER,
  p_idempotency_key TEXT,
  p_mission_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  reservation_id UUID,
  reserved_points INTEGER,
  already_reserved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_existing UUID;
  v_balance INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid reservation user';
  END IF;
  IF p_operation IS NULL OR length(trim(p_operation)) NOT BETWEEN 3 AND 120 THEN
    RAISE EXCEPTION 'Invalid reservation operation';
  END IF;
  IF p_reserved_points IS NULL OR p_reserved_points <= 0 OR p_reserved_points > 100000 THEN
    RAISE EXCEPTION 'Invalid reservation amount';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid reservation idempotency key';
  END IF;
  IF p_mission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.missions WHERE id = p_mission_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.power_reservations
    WHERE idempotency_key = p_idempotency_key AND user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'Power reservation key belongs to another user';
  END IF;

  SELECT id INTO v_existing
  FROM public.power_reservations
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing, p_reserved_points, TRUE;
    RETURN;
  END IF;

  SELECT balance, wallet_cap, policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(p_user_id)
    FOR UPDATE;

  IF v_wallet.balance < p_reserved_points THEN
    RAISE EXCEPTION 'Insufficient Power to reserve';
  END IF;

  v_balance := v_wallet.balance - p_reserved_points;

  UPDATE public.power_wallets
    SET balance = v_balance,
        updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.power_transactions (
    user_id, mission_id, idempotency_key, transaction_type, action_type,
    amount_points, balance_before, balance_after, reason,
    way_at_operation, policy_version, metadata
  ) VALUES (
    p_user_id, p_mission_id, trim(p_idempotency_key) || ':hold', 'reservation_hold', NULL,
    0, v_wallet.balance, v_balance,
    left('Réservation: ' || trim(p_operation), 200),
    NULL, v_wallet.policy_version,
    p_metadata || jsonb_build_object('reserved_points', p_reserved_points)
  );

  INSERT INTO public.power_reservations (
    user_id, mission_id, task_id, operation, idempotency_key,
    reserved_points, metadata
-- Settles a reservation at its measured cost and returns the unused surplus.
CREATE OR REPLACE FUNCTION public.settle_power_reservation(
  p_idempotency_key TEXT,
  p_actual_points INTEGER
)
RETURNS TABLE(
  charged_points INTEGER,
  released_points INTEGER,
  balance INTEGER,
  already_settled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.power_reservations%ROWTYPE;
  v_wallet RECORD;
  v_charged INTEGER;
  v_released INTEGER;
  v_balance INTEGER;
BEGIN
  IF p_actual_points IS NULL OR p_actual_points < 0 OR p_actual_points > 100000 THEN
    RAISE EXCEPTION 'Invalid settled amount';
  END IF;

  SELECT * INTO v_reservation
  FROM public.power_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Power reservation not found';
  END IF;
  IF v_reservation.status <> 'held' THEN
    -- Replaying a settlement must not charge a second time.
    SELECT balance INTO v_balance FROM public.power_wallets WHERE user_id = v_reservation.user_id;
    RETURN QUERY SELECT v_reservation.charged_points, 0, v_balance, TRUE;
    RETURN;
  END IF;

  v_charged := LEAST(p_actual_points, v_reservation.reserved_points);
  v_released := v_reservation.reserved_points - v_charged;

  SELECT balance, wallet_cap, policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(v_reservation.user_id)
    FOR UPDATE;

  v_balance := v_wallet.balance + v_released;

  UPDATE public.power_wallets
    SET balance = v_balance,
        updated_at = now()
    WHERE user_id = v_reservation.user_id;

  IF v_charged > 0 THEN
    INSERT INTO public.power_transactions (
      user_id, mission_id, idempotency_key, transaction_type, action_type,
      amount_points, balance_before, balance_after, reason,
      way_at_operation, policy_version, metadata
    ) VALUES (
      v_reservation.user_id, v_reservation.mission_id,
      trim(p_idempotency_key) || ':charge', 'consumption', NULL,
      -v_charged, v_wallet.balance, v_balance,
      left('Consommation mesurée: ' || v_reservation.operation, 200),
      (SELECT way FROM public.profiles WHERE id = v_reservation.user_id),
      v_wallet.policy_version,
      jsonb_build_object('reservation_id', v_reservation.id, 'measured_points', p_actual_points)
    );
  END IF;

  IF v_released > 0 THEN
    INSERT INTO public.power_transactions (
      user_id, mission_id, idempotency_key, transaction_type, action_type,
      amount_points, balance_before, balance_after, reason,
      way_at_operation, policy_version, metadata
    ) VALUES (
      v_reservation.user_id, v_reservation.mission_id,
      trim(p_idempotency_key) || ':release', 'reservation_release', NULL,
      v_released, v_wallet.balance, v_balance,
      left('Libération du surplus réservé: ' || v_reservation.operation, 200),
      NULL, v_wallet.policy_version,
      jsonb_build_object('reservation_id', v_reservation.id)
    );
  END IF;

  UPDATE public.power_reservations
  SET status = 'settled',
      charged_points = v_charged,
      settled_at = now()
  WHERE id = v_reservation.id;

  RETURN QUERY SELECT v_charged, v_released, v_balance, FALSE;
END;
$$;

-- Returns the whole hold when an operation never produced a result.
CREATE OR REPLACE FUNCTION public.release_power_reservation(
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(released_points INTEGER, balance INTEGER, already_released BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.power_reservations%ROWTYPE;
  v_wallet RECORD;
  v_balance INTEGER;
BEGIN
  SELECT * INTO v_reservation
  FROM public.power_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Power reservation not found';
  END IF;
  IF v_reservation.status <> 'held' THEN
    SELECT balance INTO v_balance FROM public.power_wallets WHERE user_id = v_reservation.user_id;
    RETURN QUERY SELECT 0, v_balance, TRUE;
    RETURN;
  END IF;

  SELECT balance, wallet_cap, policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(v_reservation.user_id)
    FOR UPDATE;

  v_balance := v_wallet.balance + v_reservation.reserved_points;

  UPDATE public.power_wallets
    SET balance = v_balance,
        updated_at = now()
    WHERE user_id = v_reservation.user_id;

  INSERT INTO public.power_transactions (
    user_id, mission_id, idempotency_key, transaction_type, action_type,
    amount_points, balance_before, balance_after, reason,
    way_at_operation, policy_version, metadata
  ) VALUES (
    v_reservation.user_id, v_reservation.mission_id,
    trim(p_idempotency_key) || ':release', 'reservation_release', NULL,
    v_reservation.reserved_points, v_wallet.balance, v_balance,
    left(coalesce('Annulation: ' || p_reason, 'Annulation: ' || v_reservation.operation), 200),
    NULL, v_wallet.policy_version,
    jsonb_build_object('reservation_id', v_reservation.id)
  );

  UPDATE public.power_reservations
  SET status = 'released', settled_at = now()
  WHERE id = v_reservation.id;

  RETURN QUERY SELECT v_reservation.reserved_points, v_balance, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_power_points(UUID, TEXT, INTEGER, TEXT, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_power_reservation(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_power_reservation(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_power_points(UUID, TEXT, INTEGER, TEXT, UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_power_reservation(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_power_reservation(TEXT, TEXT) TO service_role;
  ) VALUES (
    p_user_id, p_mission_id, p_task_id, trim(p_operation), trim(p_idempotency_key),
    p_reserved_points, p_metadata
  ) RETURNING id INTO v_existing;

  RETURN QUERY SELECT v_existing, p_reserved_points, FALSE;
END;
$$;
ALTER TABLE public.power_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS power_reservations_select_own ON public.power_reservations;
CREATE POLICY power_reservations_select_own
  ON public.power_reservations FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON public.power_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.power_reservations TO authenticated;