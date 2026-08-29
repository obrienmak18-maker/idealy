import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
import { getPowerActionCost, isPowerAction, POWER_LOW_BALANCE_COST_MULTIPLIER } from "@/lib/idealy/power-policy";
import { formatPowerPoints, getWayPresentation, normalizeIdealyWay } from "@/lib/idealy/product-contract";

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

function powerState(balance: number, cost: number) {
  if (balance <= 0) return "depleted";
  if (balance < cost) return "insufficient";
  if (balance < cost * POWER_LOW_BALANCE_COST_MULTIPLIER) return "low";
  return "normal";
}

export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  if (typeof token?.supabaseAccessToken !== "string") {
    return response({ error: "Une session Idealy authentifiée est requise." }, 401);
  }

  const action = new URL(request.url).searchParams.get("action") ?? "mission_simple";
  if (!isPowerAction(action)) {
    return response({ error: "Le type d’action Power demandé est invalide." }, 400);
  }

  const fallbackCost = getPowerActionCost(action);
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return response({
      actionType: action,
      canExecute: null,
      costLabel: formatPowerPoints(fallbackCost, "professional"),
      costPoints: fallbackCost,
      error: "La configuration Supabase est incomplète.",
      policyVersion: "power-v1",
      resourceLabel: getWayPresentation("professional").resourceLabel,
      state: "unknown",
      way: "professional",
    }, 503);
  }

  const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/get_my_power_status`, {
    body: JSON.stringify({ p_action_type: action }),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token.supabaseAccessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      "x-client-info": "idealy-next-power",
    },
    method: "POST",
  });
  const payload = await rpc.json().catch(() => null) as Record<string, unknown> | Record<string, unknown>[] | null;

  if (!rpc.ok) {
    return response({
      actionType: action,
      canExecute: null,
      costPoints: fallbackCost,
      error: "L’état Power est momentanément indisponible.",
      policyVersion: "power-v1",
      state: "unknown",
    }, rpc.status === 401 ? 401 : 503);
  }

  const status = Array.isArray(payload) ? payload[0] : payload;
  const way = normalizeIdealyWay(status?.way);
  const costPoints = Number(status?.cost_points ?? fallbackCost);
  const balance = Number(status?.balance ?? 0);
  const cap = Number(status?.wallet_cap ?? 0);
  const currentState = typeof status?.state === "string" ? status.state : powerState(balance, costPoints);

  return response({
    actionType: action,
    balance,
    balanceLabel: formatPowerPoints(balance, way),
    canExecute: Boolean(status?.can_execute),
    costLabel: formatPowerPoints(costPoints, way),
    costPoints,
    nextMonthlyCycle: status?.next_monthly_cycle ?? null,
    plan: status?.plan ?? null,
    policyVersion: status?.policy_version ?? "power-v1",
    resourceLabel: getWayPresentation(way).resourceLabel,
    state: currentState,
    walletCap: cap,
    walletCapLabel: formatPowerPoints(cap, way),
    walletId: status?.wallet_id ?? null,
    way,
  });
}
