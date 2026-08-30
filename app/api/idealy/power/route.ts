import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getPowerActionCost, isPowerAction } from "@/lib/idealy/power-policy";
import { parsePowerStatus } from "@/lib/idealy/power-status";

function noStore() {
  return { "Cache-Control": "no-store" };
}

export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!accessToken || !supabaseUrl || !anonKey) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { headers: noStore(), status: 401 }
    );
  }

  const action = new URL(request.url).searchParams.get("action");
  const rpcResponse = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_my_power_status`,
    {
      body: JSON.stringify({ p_action_type: action }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  ).catch(() => null);
  if (!rpcResponse?.ok) {
    return Response.json(
      { error: "L’état Power est momentanément indisponible." },
      { headers: noStore(), status: 502 }
    );
  }

  const payload = await rpcResponse.json().catch(() => null);
  const row = Array.isArray(payload) ? payload[0] : payload;
  const status = parsePowerStatus({
    actionType: row?.action_type ?? null,
    balance: row?.balance,
    canExecute: row?.can_execute,
    costPoints: row?.cost_points ?? null,
    lastMonthlyAllocationAt: row?.last_monthly_allocation_at ?? null,
    lastWayChangeAt: row?.last_way_change_at ?? null,
    plan: row?.plan,
    policyVersion: row?.policy_version,
    resourceLabel: row?.resource_label,
    walletCap: row?.wallet_cap,
    way: row?.way,
  });
  if (!status) {
    return Response.json(
      { error: "L’état Power reçu est invalide." },
      { headers: noStore(), status: 502 }
    );
  }
  if (
    status.actionType &&
    isPowerAction(status.actionType) &&
    status.costPoints !== getPowerActionCost(status.actionType)
  ) {
    return Response.json(
      { error: "La policy Power reçue est incohérente." },
      { headers: noStore(), status: 502 }
    );
  }
  return Response.json(status, { headers: noStore() });
}
