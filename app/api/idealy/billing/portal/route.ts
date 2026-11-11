import { getSafeSession, getSafeToken } from "@/lib/auth/session-token";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";

export async function POST(request: Request) {
  const session = await getSafeSession(request);
  const token = await getSafeToken(request);

  const supabaseAccessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;

  const authorization = supabaseAccessToken ? `Bearer ${supabaseAccessToken}` : null;

  if (!authorization || !session?.user || !token) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401 }
    );
  }

  if (process.env.IDEALY_PAYMENTS_ENABLED !== "true") {
    return Response.json(
      {
        code: "PAYMENTS_DISABLED",
        error: "Les paiements sont actuellement désactivés pour cette phase de démonstration.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const isCheckout = body?.planId === "pro" || body?.planId === "business";
    const functionName = isCheckout
      ? "create-checkout-session"
      : "create-billing-portal";
    const response = await fetch(
      getIdealySupabaseFunctionUrl(functionName),
      {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          ...(process.env.SUPABASE_ANON_KEY
            ? { apikey: process.env.SUPABASE_ANON_KEY }
            : {}),
          "x-client-info": "idealy-next-billing",
          ...(session?.user?.id ? { "x-user-id": session.user.id } : {}),
          ...(session?.user?.email ? { "x-user-email": session.user.email } : {}),
        },
        body: JSON.stringify(
          isCheckout
            ? {
                planId: body.planId,
                billingCycle: body.billingCycle,
              }
            : {
                userId: session?.user?.id,
                userEmail: session?.user?.email,
                returnUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`,
              }
        ),
        method: "POST",
      }
    );

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      return Response.json(
        { error: payload || "Billing service is temporarily unavailable." },
        { status: response.status || 503 },
      );
    }

    return new Response(response.body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
      status: response.status,
    });
  } catch {
    return Response.json(
      { error: "Billing service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

