import { auth } from "@/app/(auth)/auth";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

const allowedPlans = new Set(["pro", "business"]);
const allowedCycles = new Set(["monthly", "yearly"]);

export async function POST(request: Request) {
  const session = await auth();
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;

  if (!session?.user || !accessToken || session.user.type === "guest") {
    return Response.json(
      { error: "Connectez-vous à un compte Idealy avant de choisir un abonnement." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const plan = body?.planId;
  const billingCycle = body?.billingCycle;
  if (
    typeof plan !== "string" ||
    !allowedPlans.has(plan) ||
    typeof billingCycle !== "string" ||
    !allowedCycles.has(billingCycle)
  ) {
    return Response.json({ error: "Cette formule de facturation n’est pas disponible." }, { status: 400 });
  }

  try {
    const response = await fetch(
      getIdealySupabaseFunctionUrl("create-checkout-session"),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(process.env.SUPABASE_ANON_KEY
            ? { apikey: process.env.SUPABASE_ANON_KEY }
            : {}),
          "x-client-info": "idealy-next-billing",
        },
        body: JSON.stringify({ planId: plan, billingCycle }),
        cache: "no-store",
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json(
        { error: payload.error ?? "Le paiement n’a pas pu être préparé." },
        { status: response.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const checkoutUrl = payload.url;
    if (
      typeof checkoutUrl !== "string" ||
      new URL(checkoutUrl).hostname !== "checkout.stripe.com"
    ) {
      return Response.json(
        { error: "Stripe a renvoyé une adresse de paiement invalide." },
        { status: 502 }
      );
    }
    return Response.json(
      { url: checkoutUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { error: "Le service de paiement est momentanément indisponible." },
      { status: 502 }
    );
  }
}
