# Backend Idealy intégré

Cette intégration conserve le frontend principal du workspace Next actuel et synchronise les contrats backend utiles du dépôt Idealy `main`. Les routes et composants frontend historiques du dépôt Idealy ne sont pas importés.

## Source canonique

Le backend Supabase officiel est désormais à la racine du workspace, dans `supabase/`. Il s’agit de l’unique copie destinée aux migrations, aux fonctions Edge et au workflow de déploiement. La branche live ne maintient plus une seconde copie concurrente sous `integrations/idealy/supabase`.

Les fonctions Edge couvrent le proxy IA, les intentions et crédits, les missions, le BYOK, Stripe, GitHub, Vercel et les intégrations. Les secrets restent dans les secrets Edge Supabase ou dans le gestionnaire privé du déploiement ; aucune valeur secrète ne doit être ajoutée au dépôt.

## Répartition

| Élément | Emplacement | Rôle |
|---|---|---|
| Frontend principal | `../../app`, `../../components`, `../../hooks` | Interface actuelle du workspace Idealy, conservée sans remplacement par l’ancien frontend |
| Backend chat principal | `../../app/api/chat`, `../../lib/ai`, `../../lib/db` | Auth.js, Postgres applicatif, historique, documents et streaming |
| Supabase canonique | `../../supabase` | Migrations, fonctions Edge, missions, crédits, IA, Stripe et connecteurs |
| API Idealy importée | `api-server` | Service API minimal de santé, extensible sans déplacer la source métier Supabase |
| DB/API contracts | `db`, `api-zod`, `api-spec` | Accès Drizzle minimal, validation et contrat OpenAPI importé |
| Contrats agents et mission | `backend-core/src/agents`, `backend-core/src/core/mission` | Routage d’intention, équipe d’agents, DNA de mission, validation et preflight |
| Mémoire WebContainer | `backend-core/src/core/webcontainer` | Architecture, diagnostics terminal et auto-correction à porter dans le compilateur réel |
| Adaptateurs serveur | `../../app/api/idealy` et `../../lib/idealy` | Pont contrôlé entre Auth.js, Supabase Auth, Supabase REST, Edge et le frontend |
| Contrôle de parité | `../../scripts/verify-idealy-backend.mjs` | Vérifie les fonctions Edge, migrations et contrats backend présents sans réimporter le frontend historique |

## Flux live

Le mode démo est désactivé dans la branche live. Sans session, le middleware redirige vers `/login`. Lorsque Supabase est configuré, l’authentification Auth.js conserve côté serveur le token Supabase et le chat utilise `process-ai-request` comme chemin IA géré.

Pour une mission d’idéation ou d’exécution, le serveur classe l’intention, crée une mission via les policies RLS Supabase, demande un plan structuré, enregistre les runs d’agents puis transmet le `missionId` au streaming Edge. Le plan et l’identifiant de mission sont conservés dans les metadata du flux UI ; ils ne créent pas de panneau parasite dans le canvas.

Le Gateway reste disponible comme fallback explicite, mais ne doit pas contourner la logique de crédits en production. Le chemin recommandé est `IDEALY_AI_PROVIDER=supabase-function`.

## Validation et déploiement

La commande `pnpm backend:verify` contrôle les fonctions et contrats essentiels. La commande `pnpm typecheck` contrôle l’application Next et `pnpm build` valide la compilation avec migration locale lorsqu’une `POSTGRES_URL` est disponible.

Le workflow `Idealy Live Quality` exécute le contrôle backend, le typecheck et le build sur la branche live. Le workflow Playwright est également autorisé sur cette branche mais reste conditionné à la présence des secrets GitHub nécessaires. Le workflow de déploiement Supabase doit être ajouté ou activé dans les secrets GitHub de la branche lorsqu’un déploiement Edge continu sera voulu.

La synchronisation locale ne constitue pas à elle seule un déploiement distant. Aucune migration Supabase distante ni redéploiement de fonction ne doit être lancé avant validation des nouvelles credentials et d’un environnement de test.
