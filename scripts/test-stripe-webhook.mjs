import { createHmac, randomBytes } from 'node:crypto';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const webhookSecret = required('STRIPE_WEBHOOK_SECRET');
const webhookUrl = process.env.WEBHOOK_URL || 'http://127.0.0.1:54321/functions/v1/stripe-webhook';
const proPriceId = process.env.TEST_STRIPE_PRICE_ID_PRO || 'price_test_pro';
const businessPriceId = process.env.TEST_STRIPE_PRICE_ID_BUSINESS || 'price_test_business';
const keepData = process.env.KEEP_TEST_DATA === '1';
const runId = `${Date.now()}_${randomBytes(4).toString('hex')}`;
const email = `idealy-webhook-${runId}@example.invalid`;
const password = `WebhookTest-${randomBytes(18).toString('base64url')}!`;
const customerId = `cus_idealy_test_${runId}`;
const subscriptionId = `sub_idealy_test_${runId}`;
const apiHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function readResponse(response) {
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep non-JSON response text for diagnostics.
  }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`${response.status} ${response.statusText}: ${detail.slice(0, 500)}`);
  }
  return body;
}

async function supabaseRequest(path, options = {}) {
  return readResponse(await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: { ...apiHeaders, ...(options.headers || {}) },
  }));
}

function signatureFor(payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function subscriptionEvent(type, { status, priceId, cancelAtPeriodEnd = false }) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_idealy_test_${runId}_${type.replaceAll('.', '_')}`,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: now,
    livemode: false,
    pending_webhooks: 1,
    type,
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
        customer: customerId,
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: now + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          has_more: false,
          url: `/v1/subscription_items?subscription=${subscriptionId}`,
          data: [{
            id: `si_idealy_test_${runId}`,
            object: 'subscription_item',
            price: { id: priceId, object: 'price' },
          }],
        },
      },
    },
  };
}

async function sendEvent(event) {
  const payload = JSON.stringify(event);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signatureFor(payload),
      ...(supabaseAnonKey
        ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
        : {}),
    },
    body: payload,
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook ${event.type} returned ${response.status}: ${body.slice(0, 500)}`);
  }
  console.log(`✓ ${event.type} accepted (${response.status})`);
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const rows = await supabaseRequest(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
    );
    if (Array.isArray(rows) && rows.length > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('The auth trigger did not create a profiles row within 10 seconds.');
}

async function readState(userId) {
  const subscriptions = await supabaseRequest(
    `/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=user_id,stripe_customer_id,stripe_subscription_id,stripe_price_id,status,plan,cancel_at_period_end&limit=1`,
  );
  const profiles = await supabaseRequest(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,stripe_customer_id,plan&limit=1`,
  );
  return { subscription: subscriptions[0], profile: profiles[0] };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

let userId;
try {
  const user = await supabaseRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Idealy webhook automation' },
    }),
  });
  userId = user.id;
  await waitForProfile(userId);

  await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ stripe_customer_id: customerId, plan: 'free' }),
  });

  await sendEvent(subscriptionEvent('customer.subscription.created', {
    status: 'trialing',
    priceId: proPriceId,
  }));
  let state = await readState(userId);
  assertEqual(state.subscription?.user_id, userId, 'created.user_id');
  assertEqual(state.subscription?.stripe_customer_id, customerId, 'created.customer');
  assertEqual(state.subscription?.stripe_price_id, proPriceId, 'created.price');
  assertEqual(state.subscription?.status, 'trialing', 'created.status');
  assertEqual(state.subscription?.plan, 'pro', 'created.plan');
  assertEqual(state.profile?.plan, 'pro', 'created.profile.plan');
  console.log('✓ created state persisted in profiles and subscriptions');

  await sendEvent(subscriptionEvent('customer.subscription.updated', {
    status: 'active',
    priceId: businessPriceId,
  }));
  state = await readState(userId);
  assertEqual(state.subscription?.stripe_price_id, businessPriceId, 'updated.price');
  assertEqual(state.subscription?.status, 'active', 'updated.status');
  assertEqual(state.subscription?.plan, 'business', 'updated.plan');
  assertEqual(state.profile?.plan, 'business', 'updated.profile.plan');
  console.log('✓ updated state persisted in profiles and subscriptions');

  await sendEvent(subscriptionEvent('customer.subscription.deleted', {
    status: 'canceled',
    priceId: businessPriceId,
  }));
  state = await readState(userId);
  assertEqual(state.subscription?.status, 'canceled', 'deleted.status');
  assertEqual(state.subscription?.plan, 'free', 'deleted.plan');
  assertEqual(state.profile?.plan, 'free', 'deleted.profile.plan');
  console.log('✓ deleted state downgraded the profile to free');

  console.log(`Webhook integration test passed for temporary user ${userId}.`);
} finally {
  if (userId && !keepData) {
    await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    console.log('✓ temporary Auth user and dependent rows cleaned up');
  } else if (userId) {
    console.log(`KEEP_TEST_DATA=1: retained temporary user ${userId} for inspection.`);
  }
}
