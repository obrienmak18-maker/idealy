-- Allow failed, released Power reservations to be retried safely with the
-- same idempotency key. Held reservations remain idempotent; settled ones can
-- never be charged a second time.

CREATE OR REPLACE FUNCTION public.reserve_power_points(
  p_user_id UUID,
  p_operation TEXT,
  p_reserved_points INTEGER,
  p_idempotency_key TEXT,
  p_mission_id UUID DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(reservation_id UUID, reserved_points INTEGER, already_reserved BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_wallet RECORD;
  v_reservation public.power_reservations%ROWTYPE;
  v_balance INTEGER;
  v_hold_key TEXT;
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

  -- Serialize all retries of the same operation, including when no row exists yet.
  PERFORM pg_advisory_xact_lock(hashtextextended(trim(p_idempotency_key), 0));

  SELECT *
    INTO v_reservation
    FROM public.power_reservations
   WHERE idempotency_key = trim(p_idempotency_key)
   FOR UPDATE;

  IF FOUND THEN
    IF v_reservation.user_id <> p_user_id THEN
      RAISE EXCEPTION 'Power reservation key belongs to another user';
    END IF;

    IF v_reservation.status = 'held' OR v_reservation.status = 'settled' THEN
      RETURN QUERY SELECT v_reservation.id, v_reservation.reserved_points, TRUE;
      RETURN;
    END IF;

    IF v_reservation.status = 'released' THEN
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

      -- A released reservation already has a :hold transaction; create a unique
      -- attempt key so retries stay auditable without weakening idempotency.
      v_hold_key := trim(p_idempotency_key) || ':hold:retry:' || gen_random_uuid()::TEXT;
      INSERT INTO public.power_transactions (
        user_id, mission_id, idempotency_key, transaction_type, action_type,
        amount_points, balance_before, balance_after, reason, way_at_operation,
        policy_version, metadata
      ) VALUES (
        p_user_id, p_mission_id, v_hold_key, 'reservation_hold', NULL,
        0, v_wallet.balance, v_balance,
        left('Réservation relancée: ' || trim(p_operation), 200),
        NULL, v_wallet.policy_version,
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('reserved_points', p_reserved_points)
      );

      UPDATE public.power_reservations
         SET mission_id = COALESCE(p_mission_id, mission_id),
             task_id = COALESCE(p_task_id, task_id),
             operation = trim(p_operation),
             reserved_points = p_reserved_points,
             charged_points = NULL,
             status = 'held',
             metadata = COALESCE(p_metadata, '{}'::jsonb),
             created_at = now(),
             settled_at = NULL
       WHERE id = v_reservation.id;

      RETURN QUERY SELECT v_reservation.id, p_reserved_points, FALSE;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Power reservation has an invalid state';
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
    amount_points, balance_before, balance_after, reason, way_at_operation,
    policy_version, metadata
  ) VALUES (
    p_user_id, p_mission_id, trim(p_idempotency_key) || ':hold',
    'reservation_hold', NULL, 0, v_wallet.balance, v_balance,
    left('Réservation: ' || trim(p_operation), 200), NULL,
    v_wallet.policy_version,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('reserved_points', p_reserved_points)
  );

  INSERT INTO public.power_reservations (
    user_id, mission_id, task_id, operation, idempotency_key,
    reserved_points, metadata
  ) VALUES (
    p_user_id, p_mission_id, p_task_id, trim(p_operation), trim(p_idempotency_key),
    p_reserved_points, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_reservation.id;

  RETURN QUERY SELECT v_reservation.id, p_reserved_points, FALSE;
END;
$function$;
