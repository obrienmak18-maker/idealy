# ⚡ Idealy Studio

> **L'IDE IA multi-agents avec gamification par Voies (Mage, Ninja, Hunter, Pro), orchestrateur d'escouade et système de puissance Power.**

---

## 🚀 Vue d'ensemble

Idealy est une plateforme de développement et de génération d'applications pilotée par IA. Elle combine une interface de workspace interactive (Chat + Canvas de Preview réactif + Visualiseur de code + Console d'exécution) avec un système multi-agents :
- **Architecte (Lyra / Shikamaru)** : Analyse des besoins, spécification et conception du plan.
- **Builder (Mason / Naruto)** : Génération de code TypeScript/React, écriture de composants et architecture de fichiers.
- **Reviewer (Nova / Sasuke)** : Validation qualité, sécurité, vérification des erreurs et optimisation.

---

## 🛠️ Stack Technique

- **Frontend & App** : [Next.js 16 App Router](https://nextjs.org), React 19, Tailwind CSS v4, Framer Motion, Radix UI
- **IA & Orchestration** : [AI SDK](https://ai-sdk.dev), Supabase Edge Functions (`orchestrate-mission`, `process-ai-request`)
- **Base de données & Auth** : [Supabase](https://supabase.com) (PostgreSQL 17 avec RLS, Supabase Auth, Power System V2)
- **Monétisation** : [Stripe](https://stripe.com) (Abonnements Pro / Business, gestion de portail et webhooks sécurisés)
- **Virtual File System (VFS)** : Journal append-only avec replay séquentiel d'événements et export PKZip immédiat

---

## ⚡ Système Power & Énergie

Chaque utilisateur dispose d'un portefeuille Power rattaché à sa Voie :
- **Mage** : *Mana*
- **Ninja** : *Chakra*
- **Hunter** : *Nen*
- **Professionnel** : *Énergie*

### Plans et Allocations :
| Plan | Tarif | Allocation mensuelle | Coût Mission Simple | Coût Mission Escouade |
|---|---|---|---|---|
| **Découverte (Free)** | 0 € | 100 Power Points | 10 pts | 50 pts |
| **Pro** | 29 € / mois | 1 000 Power Points | 10 pts | 50 pts |
| **Business** | 79 € / mois | 3 000 Power Points | 10 pts | 50 pts |

---

## 📦 Commandes utiles

```bash
# Démarrer le serveur de développement
pnpm dev

# Vérification du typage TypeScript
pnpm typecheck

# Exécuter les tests contractuels backend
node scripts/test-intent-routing.mjs
node scripts/test-mission-squad-contract.mjs
node scripts/test-power-system-v2.mjs

# Build de production
pnpm build
```

---

## 🔒 Sécurité & Bonnes Pratiques

- **Clés API serveur** : Stockées exclusivement dans Supabase Secrets et Edge Functions, chiffrées au repos (AES-GCM).
- **Idempotence garantie** : Toutes les opérations sensibles (Power, facturation, déploiement) sont vérifiées avec clé d'idempotence.
- **RLS stricte** : Toutes les tables métier sont protégées par Row Level Security.
