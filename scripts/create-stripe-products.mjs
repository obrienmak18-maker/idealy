#!/usr/bin/env node
/**
 * create-stripe-products.mjs
 *
 * Crée automatiquement les produits et prix Stripe pour Idealy.
 * Lance avec : node create-stripe-products.mjs
 *
 * Prérequis : STRIPE_SECRET_KEY dans l'environnement
 * (ou colle ta clé directement ici en dev)
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'rk_test_votre_cle_stripe_ici';

async function stripeRequest(path, body) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === 'object') {
      for (const [mk, mv] of Object.entries(v)) {
        params.append(`${k}[${mk}]`, mv);
      }
    } else {
      params.append(k, v);
    }
  }

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error: ${data.error?.message}`);
  return data;
}

async function main() {
  console.log('🚀 Creating Stripe products for Idealy...\n');

  // ─── Pro Plan ───────────────────────────────────────────────────────────────
  console.log('Creating Pro product...');
  const proProd = await stripeRequest('products', {
    name: 'Idealy Pro',
    description: 'Agents IA illimités, génération de code avancée, déploiement Vercel en 1 clic.',
    'metadata[plan]': 'pro',
  });
  console.log(`  ✅ Product created: ${proProd.id}`);

  const proMonthly = await stripeRequest('prices', {
    product: proProd.id,
    unit_amount: 2900,          // 29.00 €
    currency: 'eur',
    'recurring[interval]': 'month',
    'metadata[plan]': 'pro',
    'metadata[cycle]': 'monthly',
  });
  console.log(`  ✅ Pro monthly price: ${proMonthly.id} (29 €/mois)`);

  const proYearly = await stripeRequest('prices', {
    product: proProd.id,
    unit_amount: 24900,         // 249.00 € (économie de ~100€)
    currency: 'eur',
    'recurring[interval]': 'year',
    'metadata[plan]': 'pro',
    'metadata[cycle]': 'yearly',
  });
  console.log(`  ✅ Pro yearly price: ${proYearly.id} (249 €/an)`);

  // ─── Business Plan ──────────────────────────────────────────────────────────
  console.log('\nCreating Business product...');
  const bizProd = await stripeRequest('products', {
    name: 'Idealy Business',
    description: 'Tout Pro + équipes, projets privés, support prioritaire, et accès anticipé aux nouvelles fonctionnalités.',
    'metadata[plan]': 'business',
  });
  console.log(`  ✅ Product created: ${bizProd.id}`);

  const bizMonthly = await stripeRequest('prices', {
    product: bizProd.id,
    unit_amount: 7900,          // 79.00 €
    currency: 'eur',
    'recurring[interval]': 'month',
    'metadata[plan]': 'business',
    'metadata[cycle]': 'monthly',
  });
  console.log(`  ✅ Business monthly price: ${bizMonthly.id} (79 €/mois)`);

  const bizYearly = await stripeRequest('prices', {
    product: bizProd.id,
    unit_amount: 69900,         // 699.00 €
    currency: 'eur',
    'recurring[interval]': 'year',
    'metadata[plan]': 'business',
    'metadata[cycle]': 'yearly',
  });
  console.log(`  ✅ Business yearly price: ${bizYearly.id} (699 €/an)`);

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('✅ DONE! Copy these to your Supabase Edge Function secrets:');
  console.log('════════════════════════════════════════════════════════\n');
  console.log(`STRIPE_PRICE_ID_PRO_MONTHLY=${proMonthly.id}`);
  console.log(`STRIPE_PRICE_ID_PRO_YEARLY=${proYearly.id}`);
  console.log(`STRIPE_PRICE_ID_BUSINESS_MONTHLY=${bizMonthly.id}`);
  console.log(`STRIPE_PRICE_ID_BUSINESS_YEARLY=${bizYearly.id}`);
  console.log('\nAdd via: supabase secrets set STRIPE_PRICE_ID_PRO_MONTHLY=<value>');
}

main().catch(console.error);
