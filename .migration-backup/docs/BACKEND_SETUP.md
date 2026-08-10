# Guide Complet - Backend Production

## 🎯 Objectif

Rendre Idealy 100% sécurisé et fonctionnel pour la production.

## 📦 Fichiers Créés

### Structure Supabase Edge Functions

```
supabase/functions/
├── _shared/
│   ├── cors.ts          # Gestion CORS
│   └── auth.ts          # Authentification
├── ai-proxy/
│   └── index.ts         # Proxy IA sécurisé
├── create-checkout-session/
├── create-billing-portal/
├── check-subscription/
├── cancel-subscription/
├── stripe-webhook/
└── integration-connect/
```

## 🔐 Sécurité Implémentée

### 1. Authentification
- ✅ Vérification JWT sur chaque requête
- ✅ Validation du token Supabase
- ✅ Extraction de l'user ID

### 2. Rate Limiting
- ✅ Limite de 20 requêtes/heure par user
- ✅ Logging de chaque appel IA
- ✅ Protection contre les abus

### 3. Secrets
- ✅ Toutes les clés API en variables d'environnement
- ✅ Jamais exposées au client
- ✅ Rotation possible

## 🗄️ Base de Données

### Tables à créer

```sql
-- AI Usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at);

-- Stripe customers
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

-- Integrations (GitHub, Figma, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- OAuth states for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(state)
);

CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
```

## 🚀 Déploiement

### Étape 1 : Variables d'environnement Supabase

```bash
# AI Providers
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
STRIPE_PRICE_ID_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_ID_BUSINESS_YEARLY=price_...
STRIPE_BILLING_PORTAL_ID=...

# App
APP_URL=https://idealy.app
```

### Étape 2 : Déployer les Edge Functions

```bash
# Installation de Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all functions
supabase functions deploy ai-proxy
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal
supabase functions deploy check-subscription
supabase functions deploy cancel-subscription
supabase functions deploy stripe-webhook
supabase functions deploy integration-connect
```

### Étape 3 : Configuration Stripe

1. Créer les Products et Prices
2. Configurer le Billing Portal
3. Configurer les Webhooks
4. Tester en mode test

### Étape 4 : Tests

```bash
# Test ai-proxy
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ai-proxy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "model": "gpt-4"}'

# Test stripe-webhook
stripe listen --forward-to https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

## 📊 Monitoring

### Logs à vérifier

```bash
# Supabase logs
supabase functions logs ai-proxy --tail

# Stripe logs
stripe logs tail
```

### Métriques à suivre

- Nombre d'appels IA par jour
- Coût par user
- Taux de conversion (pricing → achat)
- Erreurs API
- Performance (latence)

## ✅ Checklist Production

### Sécurité
- [ ] Toutes les clés API en backend
- [ ] Rate limiting activé
- [ ] CORS configuré
- [ ] HTTPS obligatoire
- [ ] Validation des entrées
- [ ] Pas de secrets en dur

### Fonctionnalités
- [ ] Auth fonctionne
- [ ] Payments fonctionnent
- [ ] AI proxy fonctionne
- [ ] Webhooks reçus
- [ ] Integrations marchent

### Performance
- [ ] Temps de réponse < 500ms
- [ ] Pas de timeout
- [ ] Cache fonctionne
- [ ] CDN configuré

### Légal
- [ ] CGV/CGU en ligne
- [ ] Mentions légales
- [ ] Politique confidentialité
- [ ] RGPD compliant

---

**Status** : Prêt pour déploiement après validation de cette checklist.