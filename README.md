# ⚡ Idealy Studio

> **L’assistant/workspace Idealy pour transformer une idée en logiciel avec la bonne équipe d’agents, organisée par Voies.**

---

## 🚀 Vue d'ensemble

Idealy est une plateforme de développement et de génération d'applications pilotée par IA. Elle combine une interface de workspace interactive (Chat + Canvas de Preview réactif + Visualiseur de code + Console d'exécution) avec un système multi-agents organisé par **Voies**. Chaque Voie possède cinq agents spécialisés ; Alvin reçoit les demandes et les transmet à la Voie active. L'exécution combine architecture, construction, design, QA/sécurité, performance et validation selon la mission.

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
| Niveau | Tarif mensuel | Allocation mensuelle | Plafond portefeuille |
|---|---:|---:|---:|
| **Free** | 0 € | 200 Power Points | 250 |
| **Pro** | 19 € | 2 500 Power Points | 3 500 |
| **Business / Team** | 49 € | 4 000 Power Points | 7 000 |
| **Enterprise** | Sur devis | Sur mesure | Sur mesure |

Les coûts d’une mission sont déterminés par sa complexité et son exécution réelle. Ils ne doivent pas être présentés comme un prix fixe tant que la politique de calcul n’est pas finalisée.

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
