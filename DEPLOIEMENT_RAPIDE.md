# 🚀 Déploiement Rapide - 100% Gratuit

## 🎯 Objectif
Lancer Idealy en production avec UNIQUEMENT les quotas gratuits.

## 📋 Étape par Étape

### Étape 1 : Créer un compte Supabase (GRATUIT)

1. Va sur https://supabase.com
2. Clique "Start your project"
3. Crée un compte (email ou GitHub)
4. Crée un nouveau projet :
   - Nom : idealy
   - Mot de passe : [génère un mot de passe fort]
   - Région : Europe (Paris ou Frankfurt)
5. Note les clés :
   - Project URL (ex: https://xyz.supabase.co)
   - anon public key (eyJ...)

### Étape 2 : Configurer les variables d'environnement

Ouvre `project/.env` et mets à jour :
```env
VITE_SUPABASE_URL=https://TON_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJTON_ANON_KEY
```

### Étape 3 : Créer les tables SQL

1. Dans Supabase Dashboard → SQL Editor
2. Copie le contenu de `project/supabase/schema.sql`
3. Clique "Run"

### Étape 4 : Déployer les Edge Functions

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Lier le projet
cd project
supabase link --project-ref TON_PROJECT_REF

# Déployer les fonctions
supabase functions deploy ai-proxy
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal
supabase functions deploy check-subscription
supabase functions deploy cancel-subscription
supabase functions deploy stripe-webhook
supabase functions deploy integration-connect
supabase functions deploy github-export
```

### Étape 5 : Configurer les secrets

```bash
# Clés IA (gratuites)
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-TON_CLE
supabase secrets set GROQ_API_KEY=gsk_TON_CLE
supabase secrets set DEEPSEEK_API_KEY=sk_TON_CLE

# App
supabase secrets set APP_URL=https://TON_DOMAINE.vercel.app
```

### Étape 6 : Déployer sur Vercel (GRATUIT)

1. Va sur https://vercel.com
2. Connecte-toi avec GitHub
3. Clique "New Project"
4. Importe le dossier `project`
5. Configure :
   - Framework : Vite
   - Build command : `npm run build`
   - Output directory : `dist`
6. Ajoute les variables d'environnement :
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_OPENROUTER_API_KEY
   - VITE_GROQ_API_KEY
   - VITE_DEEPSEEK_API_KEY
7. Clique "Deploy"

### Étape 7 : Tester

1. Ouvre ton URL Vercel
2. Crée un compte
3. Choisis une voie
4. Lance une mission
5. Vérifie que l'IA répond

## 🎯 Modèles IA GRATUITS utilisés

| Complexité | Provider | Modèle | Coût |
|------------|----------|--------|------|
| Simple | Groq | llama3-8b-8192 | $0 |
| Moyen | DeepSeek | deepseek-chat | $0 |
| Complexe | OpenRouter | llama-3.1-8b:free | $0 |

## ⚠️ Limites des quotas gratuits

| Provider | Limite gratuite |
|----------|----------------|
| Groq | 14,400 req/jour |
| DeepSeek | 1M tokens/jour |
| OpenRouter | 50 req/jour (modèles :free) |
| Supabase | 500MB DB, 2GB bandwidth |

## ✅ Checklist finale

- [ ] Supabase créé
- [ ] .env configuré
- [ ] Tables SQL créées
- [ ] Edge Functions déployées
- [ ] Secrets configurés
- [ ] Vercel déployé
- [ ] Testé avec un compte

## 🎉 Félicitations !

**Ton application est en ligne, fonctionnelle, et 100% gratuite.**

**Tu peux maintenant la montrer à Yumi Denzel avec confiance.**