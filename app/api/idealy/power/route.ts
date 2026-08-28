import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getPowerActionCost, isPowerAction } from "@/lib/idealy/power-policy";

export async function GET(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  if (typeof token?.supabaseAccessToken !== "string") {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const action = new URL(request.url).searchParams.get("action") ?? "mission_simple";
  if (!isPowerAction(action)) {
    return Response.json(
      { error: "Le type d’action Power demandé est invalide." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    {
      actionType: action,
      costPoints: getPowerActionCost(action),
      policyVersion: "power-v1",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
