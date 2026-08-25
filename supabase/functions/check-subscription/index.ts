import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, optionsResponse } from "../_shared/cors.ts";

function json(body: unknown, status: number, req: Request) {
  return corsResponse(body, status, req);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, req);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return json({ error: "Unauthorized" }, 401, req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey)
      return json({ error: "Billing is temporarily unavailable" }, 503, req);

    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authorization.slice("Bearer ".length));
    if (authError || !user) return json({ error: "Unauthorized" }, 401, req);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [
      { data: profile, error: profileError },
      { data: subscription, error: subscriptionError },
      { data: credits, error: creditsError },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("plan")
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
    }, 200, req);
  } catch (error) {
    console.error("check-subscription failed", error);
    return json(
      {
        error:
          "Subscription status could not be retrieved",
      },
      500,
      req,
    );
  }
});
