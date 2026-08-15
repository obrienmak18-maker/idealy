import { readFileSync } from 'node:fs';

const checkout = readFileSync('../supabase/functions/create-checkout-session/index.ts', 'utf8');
const webhook = readFileSync('../supabase/functions/stripe-webhook/index.ts', 'utf8');
const envExample = readFileSync('../.env.example', 'utf8');
const setup = readFileSync('./setup-secrets.sh', 'utf8');

for (const marker of [
  'STRIPE_PRICE_ID_PRO_MONTHLY',
  'STRIPE_PRICE_ID_PRO_YEARLY',
  'STRIPE_PRICE_ID_BUSINESS_MONTHLY',
  'STRIPE_PRICE_ID_BUSINESS_YEARLY',
  'body?.planId ?? body?.plan',
  'body?.billingCycle',
  'PRICE_IDS[plan][billingCycle]',
]) {
  if (!checkout.includes(marker)) throw new Error(`Missing checkout cycle marker: ${marker}`);
}

for (const marker of [
  'STRIPE_PRICE_ID_PRO_MONTHLY',
  'STRIPE_PRICE_ID_PRO_YEARLY',
  'STRIPE_PRICE_ID_BUSINESS_MONTHLY',
  'STRIPE_PRICE_ID_BUSINESS_YEARLY',
]) {
  if (!webhook.includes(marker) || !envExample.includes(marker) || !setup.includes(marker)) {
    throw new Error(`Missing configured cycle marker: ${marker}`);
  }
}

if (/price_[0-9][A-Za-z0-9]+/.test(checkout) || /price_[0-9][A-Za-z0-9]+/.test(webhook)) {
  throw new Error('Stripe Price IDs must not be hard-coded in Edge Functions.');
}

console.log('stripe-price-cycle-contract-smoke: PASS');
