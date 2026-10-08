-- Product-approved Power V2 policy.
-- Keep V1 rows for history; only V2 is active.
UPDATE public.power_plan_policies
SET is_active = FALSE, updated_at = now()
WHERE is_active = TRUE;

INSERT INTO public.power_plan_policies(
  policy_version, plan, monthly_allocation, wallet_cap, renewal_cadence, is_active
)
VALUES
  ('power-v2', 'free', 200, 250, 'monthly', TRUE),
  ('power-v2', 'pro', 2500, 3500, 'monthly', TRUE),
  ('power-v2', 'business', 4000, 7000, 'monthly', TRUE)
ON CONFLICT (policy_version, plan) DO UPDATE SET
  monthly_allocation = EXCLUDED.monthly_allocation,
  wallet_cap = EXCLUDED.wallet_cap,
  renewal_cadence = EXCLUDED.renewal_cadence,
  is_active = TRUE,
  updated_at = now();

UPDATE public.power_action_policies
SET is_active = FALSE, updated_at = now()
WHERE is_active = TRUE;

INSERT INTO public.power_action_policies(
  policy_version, action_type, cost_points, is_active
)
VALUES
  ('power-v2', 'mission_simple', 10, TRUE),
  ('power-v2', 'mission_squad', 50, TRUE)
ON CONFLICT (policy_version, action_type) DO UPDATE SET
  cost_points = EXCLUDED.cost_points,
  is_active = TRUE,
  updated_at = now();
