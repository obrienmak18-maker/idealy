-- Qualify columns that collide with RETURNS TABLE output parameters.
-- Without this, the Power wallet initializer can raise "column reference is ambiguous"
-- before a balance or reservation can be read.

CREATE OR REPLACE FUNCTION public.ensure_power_wallet(p_user_id UUID)
RETURNS TABLE (
  balance INTEGER,
  wallet_cap INTEGER,
  plan_snapshot TEXT,
  policy_version TEXT,
  last_way_change_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_plan TEXT;
  v_cap INTEGER;
  v_policy_version TEXT;
  v_seeded_balance INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Power wallet user is required';
  END IF;

  SELECT profile.plan::TEXT
    INTO v_plan
    FROM public.profiles AS profile
   WHERE profile.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile provisioning is incomplete';
  END IF;

  SELECT plan_policy.wallet_cap, plan_policy.policy_version
    INTO v_cap, v_policy_version
    FROM public.power_plan_policies AS plan_policy
   WHERE plan_policy.plan = v_plan
     AND plan_policy.is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active Power policy is unavailable';
  END IF;

  SELECT LEAST(
    GREATEST(COALESCE(credits.balance, energy.current_energy, 0), 0),
    v_cap
  )
    INTO v_seeded_balance
    FROM public.profiles AS profile
    LEFT JOIN public.user_credits AS credits ON credits.user_id = profile.id
    LEFT JOIN public.user_energy AS energy ON energy.id = profile.id
   WHERE profile.id = p_user_id;

  INSERT INTO public.power_wallets (
    user_id, balance, wallet_cap, plan_snapshot, policy_version, legacy_seeded_balance
  ) VALUES (
    p_user_id, v_seeded_balance, v_cap, v_plan, v_policy_version, v_seeded_balance
  ) ON CONFLICT (user_id) DO NOTHING;

  SELECT wallet.balance, wallet.wallet_cap, wallet.plan_snapshot,
         wallet.policy_version, wallet.last_way_change_at
    INTO balance, wallet_cap, plan_snapshot, policy_version, last_way_change_at
    FROM public.power_wallets AS wallet
   WHERE wallet.user_id = p_user_id
   FOR UPDATE;

  INSERT INTO public.power_transactions (
    user_id, idempotency_key, transaction_type, amount_points, balance_before,
    balance_after, reason, policy_version
  ) VALUES (
    p_user_id,
    'power-v1:opening:' || p_user_id::TEXT,
    'opening_balance',
    balance,
    0,
    balance,
    'Initialisation du wallet Power V1 depuis le solde géré existant',
    policy_version
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEXT;
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

  IF EXISTS (
    SELECT 1
      FROM public.power_transactions AS transaction_row
     WHERE transaction_row.idempotency_key = trim(p_idempotency_key) || ':release'
  ) THEN
    v_release_key := trim(p_idempotency_key) || ':release:retry:' || gen_random_uuid()::TEXT;
  ELSE
    v_release_key := trim(p_idempotency_key) || ':release';
  END IF;

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
BEGIN
  IF p_actual_points IS NULL OR p_actual_points < 0 OR p_actual_points > 100000 THEN
    RAISE EXCEPTION 'Invalid settled amount';
  END IF;

  SELECT reservation.*
    INTO v_reservation
    FROM public.power_reservations AS reservation
   WHERE reservation.idempotency_key = p_idempotency_key
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Power reservation not found';
  END IF;

  IF v_reservation.status <> 'held' THEN
    SELECT wallet.balance
      INTO v_balance
      FROM public.power_wallets AS wallet
     WHERE wallet.user_id = v_reservation.user_id;
    RETURN QUERY SELECT v_reservation.charged_points, 0, v_balance, TRUE;
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

  IF v_charged > 0 THEN
    INSERT INTO public.power_transactions (
      user_id, mission_id, idempotency_key, transaction_type, action_type,
      amount_points, balance_before, balance_after, reason, way_at_operation,
      policy_version, metadata
    ) VALUES (
      v_reservation.user_id,
      v_reservation.mission_id,
      trim(p_idempotency_key) || ':charge',
      'consumption',
      NULL,
      -v_charged,
      v_wallet.balance,
      v_wallet.balance - v_charged,
      left('Consommation mesurée: ' || v_reservation.operation, 200),
      (SELECT profile.way FROM public.profiles AS profile WHERE profile.id = v_reservation.user_id),
      v_wallet.policy_version,
      jsonb_build_object('reservation_id', v_reservation.id, 'measured_points', p_actual_points)
    );
  END IF;

  IF v_released > 0 THEN
    INSERT INTO public.power_transactions (
      user_id, mission_id, idempotency_key, transaction_type, action_type,
      amount_points, balance_before, balance_after, reason, way_at_operation,
      policy_version, metadata
    ) VALUES (
      v_reservation.user_id,
      v_reservation.mission_id,
      trim(p_idempotency_key) || ':release:settlement',
      'reservation_release',
      NULL,
      v_released,
      v_wallet.balance - v_charged,
      v_balance,
      left('Libération du surplus réservé: ' || v_reservation.operation, 200),
      NULL,
      v_wallet.policy_version,
      jsonb_build_object('reservation_id', v_reservation.id)
    );
  END IF;

  UPDATE public.power_reservations AS reservation
     SET status = 'settled',
         charged_points = v_charged,
         settled_at = now()
   WHERE reservation.id = v_reservation.id;

  RETURN QUERY SELECT v_charged, v_released, v_balance, FALSE;
END;
$function$;
