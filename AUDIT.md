# Idealy — Audit des fonctionnalités et état du projet

> Généré le 2026-08-05. Ce document liste ce qui fonctionne, ce qui a été corrigé,
> et ce qui reste à faire pour chaque module de l'application.

---

## ✅ Corrigé dans cette session

### 1. Authentification Supabase (critique)
**Problème** : `getSupabaseClient()` lisait uniquement les variables d'environnement
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, ignorant les clés que l'utilisateur entre
dans Paramètres → Connecteurs → Supabase (stockées dans Zustand/localStorage).

**Correction** : `src/supabaseClient.ts` lit d'abord les env vars, puis se rabat sur
`useIdealyStore.getState().connectors.supabaseUrl/supabaseAnonKey`.

**Fichiers** : `artifacts/idealy/src/supabaseClient.ts`

---

### 2. Restauration de session OAuth (critique)
**Problème** : Après un redirect OAuth (Google/GitHub), aucun listener n'était en place
pour recapturer la session Supabase et mettre à jour le store (l'utilisateur restait
en état `guest` malgré la connexion réussie).

**Correction** : `src/app/App.tsx` intègre maintenant `supabase.auth.getSession()` au
montage et `supabase.auth.onAuthStateChange()` pour les changements futurs (SIGNED_IN,
SIGNED_OUT, token refresh).

**Fichiers** : `artifacts/idealy/src/app/App.tsx`

---

### 3. Toggle mode connexion/inscription cassé
**Problème** : Le bouton "Se connecter / S'inscrire" dans `AuthModal` appelait
`useIdealyStore.setState({})` (ne faisait rien).

**Correction** : `AuthModal` gère maintenant son propre état `localMode` ; le toggle
change la vue sans rouvrir la modal. Ajout d'un effacement automatique des erreurs au
changement de mode.

**Fichiers** : `artifacts/idealy/src/components/AuthModal.tsx`

---

### 4. Animation RotatingWords (saut de layout)
**Problème** : Le composant utilisait `display: block` sur le `motion.span` enfant
d'un `inline-block`, ce qui provoquait des sauts de layout (reflow) lors des transitions
entre mots dans le titre principal.

**Correction** : Remplacement par `inline-grid` + `grid-template-areas` avec un élément
fantôme invisible qui maintient la largeur du mot le plus long en permanence. Zéro reflow
pendant les transitions.

**Fichiers** : `artifacts/idealy/src/components/Brand.tsx`

---

### 5. Espace non voulu dans la sidebar du workspace
**Problème** : La zone "Gamification" avait une marge `mt-6` juste après le séparateur,
créant un espace vide trop grand.

**Correction** : Réduit à `mt-2`.

**Fichiers** : `artifacts/idealy/src/routes/WorkspacePage.tsx`

---

## ⚠️ Ce qui ne fonctionne pas encore / nécessite une configuration

### Authentification

| Fonctionnalité | État | Prérequis |
|---|---|---|
| Email + mot de passe | ✅ Fonctionnel (après fix) | Supabase configuré dans Connecteurs |
| Google OAuth | ✅ Redirect OK | Supabase + Google OAuth activé dans Dashboard Supabase |
| GitHub OAuth | ✅ Redirect OK | Supabase + GitHub OAuth activé dans Dashboard Supabase |
| Confirmation e-mail | ⚠️ Requiert config SMTP | Supabase → Auth → Email provider |
| Récupération mot de passe | ❌ Pas encore implémentée | — |
| Session persistante cross-onglets | ✅ Via `onAuthStateChange` | — |

**Action requise** : Dans le Dashboard Supabase → Authentication → URL Configuration,
ajouter l'URL du site (dev + prod) comme "Site URL" et "Redirect URLs".

---

### Stripe / Paiement

| Fonctionnalité | État | Prérequis |
|---|---|---|
| Modal Paywall (UI) | ✅ Interface complète | — |
| Checkout Stripe | ❌ Nécessite une Edge Function Supabase | `create-checkout-session` Edge Function à déployer |
| Webhooks Stripe | ❌ Non implémentés | Edge Function `stripe-webhook` à créer |
| Plans Pro / Business | ❌ Prix à configurer | Stripe Dashboard → Products |

**Fichiers concernés** : `artifacts/idealy/src/components/workspace/PaywallModal.tsx`

**Plan d'action** :
1. Créer les produits/prix dans Stripe Dashboard
2. Déployer une Edge Function Supabase `create-checkout-session` qui crée une
   `checkout.Session` Stripe et renvoie `{ url }`
3. Ajouter la clé Stripe dans Paramètres → Connecteurs (le store est prêt)

---

### Génération IA (orchestrateur)

| Fonctionnalité | État | Prérequis |
|---|---|---|
| Analyse d'intention (fast model) | ✅ Code prêt | Clé Groq dans Paramètres → IA |
| Génération IUPS (Claude/Llama) | ✅ Code prêt | Clé OpenRouter dans Paramètres → IA |
| Messages agents streamés | ✅ Code prêt | — |
| Fallback JSON malformé | ✅ Géré | — |

**Notes** : Les clés IA (`IDEALY_GROQ_KEY`, `IDEALY_OPENROUTER_KEY`) sont stockées dans
le localStorage de l'utilisateur, jamais envoyées au serveur. Entrez-les dans
Paramètres → Clés IA.

---

### Preview WebContainer

| Fonctionnalité | État | Notes |
|---|---|---|
| Preview iframe (HTML brut) | ✅ Fonctionne | Pour les projets avec `index.html` généré |
| WebContainer (Expo/React Native) | ⚠️ Partiel | Nécessite `@webcontainer/api` + Cross-Origin Isolation |
| Hot reload | ❌ Non implémenté | Complexe ; nécessite WebSocket dans le WC |

**Problème COOP/COEP** : `WebContainerPreview` nécessite les en-têtes HTTP
`Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: require-corp`.
Ces en-têtes ne sont pas configurés sur le serveur de dev Vite actuel.

---

### Export de projets

| Format | État |
|---|---|
| ZIP (téléchargement) | ✅ Implémenté (`projectDownloader.ts`) |
| React | ⚠️ Dépend de la qualité de l'IUPS généré |
| Vue / Nuxt / SvelteKit | ❌ Pas encore de convertisseur IUPS → autre framework |
| Expo / Flutter | ❌ Non implémenté |
| GitHub push | ❌ Nécessite le token GitHub + l'Edge Function `integration-connect` |
| Vercel deploy | ❌ Nécessite le token Vercel + `DeployPanel` complet |

---

### Collaboration temps-réel (Yjs)

| Fonctionnalité | État |
|---|---|
| Infrastructure Yjs/WebRTC | ✅ Dépendances installées |
| Interface collaborative | ❌ Non câblée dans le workspace |

---

### Backend / Base de données

| Composant | État |
|---|---|
| Serveur Express (`api-server`) | ✅ Démarre (health check `/api/healthz`) |
| Schéma Drizzle | ❌ Vide — aucune table définie |
| Routes métier | ❌ Aucune route créée au-delà du health check |
| `DATABASE_URL` | ✅ Disponible dans l'environnement |

---

## 🔮 Prochaines priorités suggérées

1. **Configurer Supabase Auth** : activer Google + GitHub dans le Dashboard, configurer les URLs de redirect
2. **Stripe Paywall** : créer l'Edge Function `create-checkout-session`
3. **Schéma de base de données** : définir les tables `users`, `projects`, `missions` dans Drizzle
4. **Convertisseurs d'export** : transformer l'IUPS en projets Vue, Nuxt, SvelteKit
5. **Headers Cross-Origin** : activer COOP/COEP pour débloquer WebContainer

---

*Ce fichier est un snapshot d'audit — mettez-le à jour à chaque sprint.*
