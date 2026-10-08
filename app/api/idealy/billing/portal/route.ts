import { auth } from "@/app/(auth)/auth";
import { getToken } from "next-auth/jwt";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
import { isDevelopmentEnvironment } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await auth();
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const explicitAuthorization = request.headers.get("authorization");
  const supabaseAccessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;

  const authorization =
    explicitAuthorization ??
    (supabaseAccessToken ? `Bearer ${supabaseAccessToken}` : null);

  if (!authorization || (!session?.user && !token)) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401 }
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
      return Response.json({
        url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/welcome#tarifs`,
      });
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
    return Response.json({
      url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/welcome#tarifs`,
    });
  }
}

