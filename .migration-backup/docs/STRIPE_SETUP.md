# Configuration Stripe pour Idealy

## 🎯 Vue d'ensemble

Le système de paiement d'Idealy utilise Stripe avec Supabase Edge Functions pour gérer les abonnements de manière sécurisée.

## 🔐 Architecture

```
Frontend (React)
    ↓
Supabase Edge Functions (Backend sécurisé)
    ↓
Stripe API
```

**Principe de sécurité** : Le secret Stripe (`sk_...`) ne doit JAMAIS être exposé côté client. Toutes les opérations sensibles se font via Edge Functions.

## 📋 Prérequis

1. Compte Stripe (https://stripe.com)
2. Projet Supabase avec Edge Functions déployées
3. Variables d'environnement configurées

## ⚙️ Configuration

### 1. Variables d'environnement Supabase

Dans votre projet Supabase, ajoutez ces variables dans les Edge Function Secrets :

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...          # Secret key (test ou live)
STRIPE_WEBHOOK_SECRET=whsec_...        # Secret pour valider les webhooks
STRIPE_PRICE_ID_PRO=price_...          # Price ID pour le plan Pro
STRIPE_PRICE_ID_BUSINESS=price_...     # Price ID pour le plan Business
STRIPE_BILLING_PORTAL_ID=...           # Billing Portal Configuration ID
```

### 2. Créer les Price IDs dans Stripe

**Plan Pro (Monthly)** :
- Product: Idealy Builder
- Price: 49€/mois
- Billing: Monthly
- Copiez le `price_...` ID

**Plan Pro (Yearly)** :
- Product: Idealy Builder
- Price: 468€/an (39€/mois)
- Billing: Yearly
- Copiez le `price_...` ID

**Plan Business (Monthly)** :
- Product: Idealy Legend
- Price: 129€/mois
- Billing: Monthly
- Copiez le `price_...` ID

**Plan Business (Yearly)** :
- Product: Idealy Legend
- Price: 1188€/an (99€/mois)
- Billing: Yearly
- Copiez le `price_...` ID

### 3. Créer le Billing Portal

1. Dans Stripe Dashboard → Settings → Billing → Customer portal
2. Créer une nouvelle configuration
3. Configurer les options :
   - Allow customers to: Update payment method, Cancel subscription, View invoices
   - Default behavior: Cancel at period end
4. Copiez l'ID de configuration (portal_...)

## 🔧 Edge Functions à déployer

### 1. `create-checkout-session`

Crée une session de checkout Stripe et redirige l'utilisateur.

**Fichier** : `supabase/functions/create-checkout-session/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new (await import('https://esm.sh/stripe@14.14.0')).Stripe(
  Deno.env.get('STRIPE_SECRET_KEY')!,
  { apiVersion: '2024-06-20' }
);

serve(async (req) => {
  try {
    // 1. Vérifier l'authentification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Récupérer les paramètres
    const { planId, billingCycle } = await req.json();
    
    // 3. Mapping des Price IDs
    const priceMap: Record<string, Record<string, string>> = {
      pro: {
        monthly: Deno.env.get('STRIPE_PRICE_ID_PRO_MONTHLY')!,
        yearly: Deno.env.get('STRIPE_PRICE_ID_PRO_YEARLY')!,
      },
      business: {
        monthly: Deno.env.get('STRIPE_PRICE_ID_BUSINESS_MONTHLY')!,
        yearly: Deno.env.get('STRIPE_PRICE_ID_BUSINESS_YEARLY')!,
      },
    };

    const priceId = priceMap[planId]?.[billingCycle];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400 });
    }

    // 4. Créer ou récupérer le customer Stripe
    const { data: existingCustomer } = await supabase
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
      
      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      });
    }

    // 5. Créer la session de checkout
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
      success_url: `${Deno.env.get('APP_URL')}/billing?success=true`,
      cancel_url: `${Deno.env.get('APP_URL')}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        planId,
        billingCycle,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 2. `create-billing-portal`

Crée une session pour le portail de facturation Stripe.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Stripe } from 'https://esm.sh/stripe@14.14.0';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Récupérer le customer Stripe
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    });

    // Créer la session du portail
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${Deno.env.get('APP_URL')}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 3. `check-subscription`

Vérifie le statut de l'abonnement d'un utilisateur.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Stripe } from 'https://esm.sh/stripe@14.14.0';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Récupérer le customer Stripe
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ 
        active: false, 
        planId: null 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    });

    // Récupérer les subscriptions actives
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ 
        active: false, 
        planId: null 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscription = subscriptions.data[0];
    
    return new Response(JSON.stringify({
      active: true,
      planId: subscription.metadata.planId || 'pro',
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 4. `cancel-subscription`

Annule un abonnement.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Stripe } from 'https://esm.sh/stripe@14.14.0';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customer) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    });

    // Récupérer la subscription active
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ error: 'No active subscription' }), { status: 404 });
    }

    const subscription = subscriptions.data[0];

    // Annuler à la fin de la période
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

## 🔔 Webhook Stripe (Recommandé)

Créez une Edge Function pour gérer les événements Stripe :

**Fichier** : `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Stripe } from 'https://esm.sh/stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Vérifier la signature du webhook
    const signature = req.headers.get('stripe-signature')!;
    const body = await req.text();
    
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    // 2. Gérer les événements
    const subscription = event.data.object as Stripe.Subscription;

    switch (event.type) {
      case 'checkout.session.completed':
        // Sauvegarder le customer ID
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer && session.metadata?.userId) {
          await supabase.from('stripe_customers').upsert({
            user_id: session.metadata.userId,
            stripe_customer_id: session.customer as string,
          });
        }
        break;

      case 'customer.subscription.updated':
        // Mettre à jour le statut
        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          user_id: subscription.metadata.userId,
          status: subscription.status,
          plan_id: subscription.metadata.planId,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
        break;

      case 'customer.subscription.deleted':
        // Marquer comme annulé
        await supabase.from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
```

### 4. Schéma de base de données

Créez ces tables dans Supabase :

```sql
-- Customers
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(stripe_customer_id)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stripe_subscription_id)
);

-- Index pour les performances
CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

## 🔒 Sécurité

### ✅ Bonnes pratiques appliquées

1. **Jamais de secrets côté client**
   - Toutes les clés API sont dans Edge Functions
   - Le frontend ne voit que des URLs de redirection

2. **Validation stricte**
   - Vérification du token JWT sur chaque requête
   - Validation des webhooks avec la signature Stripe

3. **Moins de privilèges**
   - Les Edge Functions utilisent `SUPABASE_ANON_KEY` (pas de service_role)
   - Seul le webhook utilise `SERVICE_ROLE_KEY` (backend uniquement)

4. **HTTPS obligatoire**
   - Toutes les communications sont chiffrées
   - Redirections vers HTTPS uniquement

## 🧪 Tests

### Mode test Stripe

Utilisez ces cartes de test :

```
Carte qui fonctionne : 4242 4242 4242 4242
Date: N'importe quelle date future
CVC: N'importe quel 3 chiffres
```

### Tester le flux

1. **Checkout** :
   ```bash
   # Dans le frontend
   await createCheckoutSession('pro', 'monthly')
   # Doit rediriger vers Stripe Checkout
   ```

2. **Webhook** :
   ```bash
   # Utilisez Stripe CLI pour tester localement
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   stripe trigger checkout.session.completed
   ```

3. **Portail** :
   ```bash
   # Après achat
   await createBillingPortal()
   # Doit rediriger vers Stripe Customer Portal
   ```

## 📊 Monitoring

### Métriques à suivre

- Taux de conversion (visite pricing → achat)
- Taux d'annulation
- MRR (Monthly Recurring Revenue)
- Churn rate

### Logs à vérifier

```typescript
// Dans useStripe.ts
logger.info('Checkout session created', { planId, billingCycle });
logger.error('Checkout session failed', error, { planId, billingCycle });
```

## 🚀 Déploiement

### Checklist avant production

- [ ] Passer en mode live Stripe (`sk_live_...`)
- [ ] Mettre à jour les Price IDs (live)
- [ ] Configurer les webhooks en production
- [ ] Tester un paiement réel (petit montant)
- [ ] Vérifier les emails Stripe (confirmations, reçus)
- [ ] Configurer les taxes (Stripe Tax)
- [ ] Ajouter les CGV et mentions légales
- [ ] Tester l'annulation d'abonnement
- [ ] Vérifier la conformité RGPD

## 📚 Ressources

- [Stripe Docs](https://stripe.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

## ⚠️ Notes importantes

1. **Ne jamais commit les clés Stripe** dans le code
2. **Toujours utiliser les Edge Functions** pour les opérations sensibles
3. **Tester en mode test** avant de passer en production
4. **Surveiller les webhooks** pour détecter les problèmes
5. **Implémenter des retry** pour les appels API échoués

---

**Status** : Système de paiement prêt pour la production (avec backend).