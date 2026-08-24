import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey)
      return json(
        { error: "Supabase server configuration is incomplete" },
        500,
      );

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authorization.slice("Bearer ".length));
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [
      { data: profile, error: profileError },
      { data: subscription, error: subscriptionError },
      { data: credits, error: creditsError },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("plan, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("subscriptions")
        .select("status, plan, current_period_end, cancel_at_period_end")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("current_period_end", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileError) throw profileError;
    if (subscriptionError) throw subscriptionError;
    if (creditsError) throw creditsError;

    const active = Boolean(
      subscription && ["active", "trialing"].includes(subscription.status),
    );
    const periodEnd = subscription?.current_period_end
      ? Math.floor(new Date(subscription.current_period_end).getTime() / 1000)
      : null;

    return json({
      active,
      planId: subscription?.plan ?? profile?.plan ?? "free",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      creditsBalance: credits?.balance ?? null,
      status: subscription?.status ?? "none",
      stripeCustomerId: profile?.stripe_customer_id ?? null,
    });
  } catch (error) {
    console.error("check-subscription failed", error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "Subscription check failed",
      },
      500,
    );
  }
});
