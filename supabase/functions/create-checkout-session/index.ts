import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Stripe } from 'https://esm.sh/stripe@14.14.0';
import { authenticate, getAppUrl } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }

    const { planId, billingCycle } = await req.json();
    const { user, supabaseAdmin } = auth;
    const body = await req.json();
    const planId = body.planId ?? body.plan;
    const billingCycle = body.billingCycle ?? 'monthly';
    const priceMap: Record<string, Record<string, string>> = {
      pro: {
        monthly: Deno.env.get('STRIPE_PRICE_ID_PRO_MONTHLY') ?? '',
        monthly: Deno.env.get('STRIPE_PRICE_ID_PRO_MONTHLY') ?? '',
        yearly: Deno.env.get('STRIPE_PRICE_ID_PRO_YEARLY') ?? '',
      },
      business: {
        monthly: Deno.env.get('STRIPE_PRICE_ID_BUSINESS_MONTHLY') ?? '',
        yearly: Deno.env.get('STRIPE_PRICE_ID_BUSINESS_YEARLY') ?? '',
      },
    };

    const priceId = priceMap[planId]?.[billingCycle];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Plan ou cycle de facturation invalide.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Missing environment variable: STRIPE_SECRET_KEY');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existingCustomer?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { userId: user.id },
      });

      customerId = customer.id;

      const { error: customerError } = await supabaseAdmin.from('stripe_customers').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
      });
      if (customerError) {
        throw customerError;
      }
    }

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${appUrl}?checkout=success`,
      cancel_url: `${appUrl}?checkout=canceled`,
      metadata: {
        userId: user.id,
        planId,
        billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId,
          billingCycle,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
