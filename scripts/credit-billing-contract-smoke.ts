import { readFileSync } from 'node:fs';

const migration = readFileSync('../supabase/migrations/20260815010000_user_credits_and_stripe_refills.sql', 'utf8');
const proxy = readFileSync('../supabase/functions/process-ai-request/index.ts', 'utf8');
const webhook = readFileSync('../supabase/functions/stripe-webhook/index.ts', 'utf8');

for (const marker of [
  'CREATE TABLE IF NOT EXISTS public.user_credits',
  'CREATE OR REPLACE FUNCTION public.consume_ai_credit',
  'CREATE OR REPLACE FUNCTION public.grant_user_credits',
  'ON CONFLICT (user_id) DO NOTHING',
  'Idempotency key belongs to another user',
]) {
  if (!migration.includes(marker)) throw new Error(`Missing migration marker: ${marker}`);
}

for (const marker of [
  "intentCategory !== 'CONVERSATION'",
  "intentCategory === 'IDEATION' ? 3 : 10",
  "CREDITS_REQUIRED",
  "resolution.mode !== 'byok'",
]) {
  if (!proxy.includes(marker)) throw new Error(`Missing proxy billing marker: ${marker}`);
}

for (const marker of [
  'checkout.session.completed',
  'grant_user_credits',
  'stripe:event:${refill.eventId}',
]) {
  if (!webhook.includes(marker)) throw new Error(`Missing Stripe refill marker: ${marker}`);
}

console.log('credit-billing-contract-smoke: PASS');
