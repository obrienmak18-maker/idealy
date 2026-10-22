-- Reconcile Power reservation ledger constraints with actual held-balance
-- movements. A hold is a negative ledger movement; settlement converts the hold
-- entry into a final consumption entry, and a failed attempt gets a positive release.

ALTER TABLE public.power_transactions
  DROP CONSTRAINT IF EXISTS power_transactions_check;
ALTER TABLE public.power_transactions
  DROP CONSTRAINT IF EXISTS power_transactions_amount_shape_check;

ALTER TABLE public.power_transactions
  ADD CONSTRAINT power_transactions_amount_shape_check
  CHECK (
    (
      transaction_type = 'consumption'
      AND amount_points < 0
      AND action_type IS NOT NULL
      AND way_at_operation IS NOT NULL
    )
    OR (
      transaction_type = 'way_change'
      AND amount_points = 0
      AND action_type IS NULL
      AND way_at_operation IS NOT NULL
    )
    OR (
      transaction_type IN ('opening_balance', 'monthly_allocation')
      AND action_type IS NULL
    )
    OR (
      transaction_type IN ('power_pack_purchase', 'reservation_release', 'refund')
      AND amount_points >= 0
      AND action_type IS NULL
    )
    OR (
      transaction_type = 'reservation_hold'
      AND amount_points < 0
      AND action_type IS NULL
    )
  );

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
  v_metadata JSONB;
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
    SELECT 1
      FROM public.missions AS mission
     WHERE mission.id = p_mission_id
       AND mission.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Mission does not belong to user';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(trim(p_idempotency_key), 0));

  SELECT reservation.*
    INTO v_reservation
    FROM public.power_reservations AS reservation
   WHERE reservation.idempotency_key = trim(p_idempotency_key)
   FOR UPDATE;

  IF FOUND THEN
    IF v_reservation.user_id <> p_user_id THEN
      RAISE EXCEPTION 'Power reservation key belongs to another user';
    END IF;

    IF v_reservation.status IN ('held', 'settled') THEN
      RETURN QUERY SELECT v_reservation.id, v_reservation.reserved_points, TRUE;
      RETURN;
    END IF;

    IF v_reservation.status = 'released' THEN
      SELECT wallet_row.balance, wallet_row.wallet_cap, wallet_row.policy_version
        INTO v_wallet
        FROM public.ensure_power_wallet(p_user_id) AS wallet_row
        FOR UPDATE;

      IF v_wallet.balance < p_reserved_points THEN
        RAISE EXCEPTION 'Insufficient Power to reserve';
      END IF;

      v_balance := v_wallet.balance - p_reserved_points;
      v_hold_key := 'power-hold-retry:' || gen_random_uuid()::TEXT;
      v_metadata := COALESCE(p_metadata, '{}'::jsonb) ||
        jsonb_build_object(
          'reserved_points', p_reserved_points,
          'hold_transaction_key', v_hold_key
        );

      UPDATE public.power_wallets AS wallet
         SET balance = v_balance,
             updated_at = now()
       WHERE wallet.user_id = p_user_id;

      INSERT INTO public.power_transactions (
        user_id, mission_id, idempotency_key, transaction_type, action_type,
        amount_points, balance_before, balance_after, reason, way_at_operation,
        policy_version, metadata
      ) VALUES (
        p_user_id, p_mission_id, v_hold_key, 'reservation_hold', NULL,
        -p_reserved_points, v_wallet.balance, v_balance,
        left('Réservation relancée: ' || trim(p_operation), 200),
        NULL, v_wallet.policy_version, v_metadata
      );

      UPDATE public.power_reservations AS reservation
         SET mission_id = COALESCE(p_mission_id, reservation.mission_id),
             task_id = COALESCE(p_task_id, reservation.task_id),
             operation = trim(p_operation),
             reserved_points = p_reserved_points,
             charged_points = NULL,
             status = 'held',
             metadata = v_metadata,
             created_at = now(),
             settled_at = NULL
       WHERE reservation.id = v_reservation.id;

      RETURN QUERY SELECT v_reservation.id, p_reserved_points, FALSE;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Power reservation has an invalid state';
  END IF;

  SELECT wallet_row.balance, wallet_row.wallet_cap, wallet_row.policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(p_user_id) AS wallet_row
    FOR UPDATE;

  IF v_wallet.balance < p_reserved_points THEN
    RAISE EXCEPTION 'Insufficient Power to reserve';
  END IF;

  v_balance := v_wallet.balance - p_reserved_points;
  v_hold_key := CASE
    WHEN length(trim(p_idempotency_key)) <= 195
      THEN trim(p_idempotency_key) || ':hold'
    ELSE 'power-hold:' || md5(trim(p_idempotency_key))
  END;
  v_metadata := COALESCE(p_metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'reserved_points', p_reserved_points,
      'hold_transaction_key', v_hold_key
    );

  UPDATE public.power_wallets AS wallet
     SET balance = v_balance,
         updated_at = now()
   WHERE wallet.user_id = p_user_id;

  INSERT INTO public.power_transactions (
    user_id, mission_id, idempotency_key, transaction_type, action_type,
    amount_points, balance_before, balance_after, reason, way_at_operation,
    policy_version, metadata
  ) VALUES (
    p_user_id, p_mission_id, v_hold_key, 'reservation_hold', NULL,
    -p_reserved_points, v_wallet.balance, v_balance,
    left('Réservation: ' || trim(p_operation), 200), NULL,
    v_wallet.policy_version, v_metadata
  );

  INSERT INTO public.power_reservations (
    user_id, mission_id, task_id, operation, idempotency_key, reserved_points, metadata
  ) VALUES (
    p_user_id, p_mission_id, p_task_id, trim(p_operation), trim(p_idempotency_key),
    p_reserved_points, v_metadata
  )
  RETURNING id INTO v_reservation.id;

  RETURN QUERY SELECT v_reservation.id, p_reserved_points, FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_power_reservation(
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(released_points INTEGER, balance INTEGER, already_released BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_reservation public.power_reservations%ROWTYPE;
  v_wallet RECORD;
  v_balance INTEGER;
  v_release_key TEXT;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 1 AND 240 THEN
    RAISE EXCEPTION 'Invalid Power reservation key';
  END IF;

  SELECT reservation.*
    INTO v_reservation
    FROM public.power_reservations AS reservation
   WHERE reservation.idempotency_key = trim(p_idempotency_key)
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Power reservation not found';
  END IF;

  IF v_reservation.status <> 'held' THEN
    SELECT wallet.balance
      INTO v_balance
      FROM public.power_wallets AS wallet
     WHERE wallet.user_id = v_reservation.user_id;
    RETURN QUERY SELECT 0, v_balance, TRUE;
    RETURN;
  END IF;

  SELECT wallet_row.balance, wallet_row.wallet_cap, wallet_row.policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(v_reservation.user_id) AS wallet_row
    FOR UPDATE;

  v_balance := v_wallet.balance + v_reservation.reserved_points;
  UPDATE public.power_wallets AS wallet
     SET balance = v_balance,
         updated_at = now()
   WHERE wallet.user_id = v_reservation.user_id;

  v_release_key := 'power-release:' || md5(trim(p_idempotency_key)) || ':' || gen_random_uuid()::TEXT;
  INSERT INTO public.power_transactions (
    user_id, mission_id, idempotency_key, transaction_type, action_type,
    amount_points, balance_before, balance_after, reason, way_at_operation,
    policy_version, metadata
  ) VALUES (
    v_reservation.user_id,
    v_reservation.mission_id,
    v_release_key,
    'reservation_release',
    NULL,
    v_reservation.reserved_points,
    v_wallet.balance,
    v_balance,
    left(coalesce('Annulation: ' || p_reason, 'Annulation: ' || v_reservation.operation), 200),
    NULL,
    v_wallet.policy_version,
    jsonb_build_object('reservation_id', v_reservation.id)
  );

  UPDATE public.power_reservations AS reservation
     SET status = 'released',
         settled_at = now()
   WHERE reservation.id = v_reservation.id;

  RETURN QUERY SELECT v_reservation.reserved_points, v_balance, FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_power_reservation(
  p_idempotency_key TEXT,
  p_actual_points INTEGER
)
RETURNS TABLE(charged_points INTEGER, released_points INTEGER, balance INTEGER, already_settled BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_reservation public.power_reservations%ROWTYPE;
  v_wallet RECORD;
  v_charged INTEGER;
  v_released INTEGER;
  v_balance INTEGER;
  v_hold_key TEXT;
  v_charge_key TEXT;
  v_action_type TEXT;
  v_way TEXT;
BEGIN
  IF p_actual_points IS NULL OR p_actual_points < 0 OR p_actual_points > 100000 THEN
    RAISE EXCEPTION 'Invalid settled amount';
  END IF;

  SELECT reservation.*
    INTO v_reservation
    FROM public.power_reservations AS reservation
   WHERE reservation.idempotency_key = trim(p_idempotency_key)
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Power reservation not found';
  END IF;

  IF v_reservation.status <> 'held' THEN
    SELECT wallet.balance
      INTO v_balance
      FROM public.power_wallets AS wallet
     WHERE wallet.user_id = v_reservation.user_id;
    RETURN QUERY SELECT COALESCE(v_reservation.charged_points, 0), 0, v_balance, TRUE;
    RETURN;
  END IF;

  v_charged := LEAST(p_actual_points, v_reservation.reserved_points);
  v_released := v_reservation.reserved_points - v_charged;

  SELECT wallet_row.balance, wallet_row.wallet_cap, wallet_row.policy_version
    INTO v_wallet
    FROM public.ensure_power_wallet(v_reservation.user_id) AS wallet_row
    FOR UPDATE;

  v_balance := v_wallet.balance + v_released;
  UPDATE public.power_wallets AS wallet
     SET balance = v_balance,
         updated_at = now()
   WHERE wallet.user_id = v_reservation.user_id;

  v_hold_key := COALESCE(
    v_reservation.metadata ->> 'hold_transaction_key',
    CASE
      WHEN length(trim(p_idempotency_key)) <= 195 THEN trim(p_idempotency_key) || ':hold'
      ELSE 'power-hold:' || md5(trim(p_idempotency_key))
    END
  );

  IF v_charged > 0 THEN
    v_action_type := CASE v_reservation.operation
      WHEN 'mission_simple' THEN 'mission_simple'
      WHEN 'mission_squad' THEN 'mission_squad'
      ELSE NULL
    END;
    IF v_action_type IS NULL THEN
      RAISE EXCEPTION 'Unsupported Power reservation operation';
    END IF;

    SELECT profile.way::TEXT
      INTO v_way
      FROM public.profiles AS profile
     WHERE profile.id = v_reservation.user_id;
    IF v_way NOT IN ('mage', 'ninja', 'hunter', 'professional') THEN
      RAISE EXCEPTION 'A completed Idealy Way is required';
    END IF;

    v_charge_key := CASE
      WHEN length(trim(p_idempotency_key)) <= 193 THEN trim(p_idempotency_key) || ':charge'
      ELSE 'power-charge:' || md5(trim(p_idempotency_key))
    END;

    UPDATE public.power_transactions AS transaction_row
       SET idempotency_key = v_charge_key,
           transaction_type = 'consumption',
           action_type = v_action_type,
           amount_points = -v_charged,
           balance_after = transaction_row.balance_before - v_charged,
           reason = CASE v_action_type
             WHEN 'mission_simple' THEN 'Mission IA simple'
             ELSE 'Mission d’escouade multi-agents'
           END,
           way_at_operation = v_way,
           policy_version = v_wallet.policy_version,
           metadata = COALESCE(transaction_row.metadata, '{}'::jsonb) ||
             jsonb_build_object(
               'reservation_id', v_reservation.id,
               'reserved_points', v_reservation.reserved_points,
               'charged_points', v_charged,
               'released_points', v_released
             )
     WHERE transaction_row.idempotency_key = v_hold_key
       AND transaction_row.transaction_type = 'reservation_hold';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Power reservation hold transaction is missing';
    END IF;
  ELSE
    UPDATE public.power_transactions AS transaction_row
       SET transaction_type = 'reservation_release',
           action_type = NULL,
           amount_points = 0,
           balance_after = transaction_row.balance_before,
           reason = 'Réservation annulée: aucune consommation IA',
           way_at_operation = NULL,
           policy_version = v_wallet.policy_version,
           metadata = COALESCE(transaction_row.metadata, '{}'::jsonb) ||
             jsonb_build_object(
               'reservation_id', v_reservation.id,
               'reserved_points', v_reservation.reserved_points,
               'charged_points', 0,
               'released_points', v_released
             )
     WHERE transaction_row.idempotency_key = v_hold_key
       AND transaction_row.transaction_type = 'reservation_hold';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Power reservation hold transaction is missing';
    END IF;
  END IF;

  UPDATE public.power_reservations AS reservation
     SET status = 'settled',
         charged_points = v_charged,
         settled_at = now()
   WHERE reservation.id = v_reservation.id;

  RETURN QUERY SELECT v_charged, v_released, v_balance, FALSE;
END;
$function$;
