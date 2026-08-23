# Backend Idealy intégré

Cette copie contient les backends et contrats métier d’Idealy sous `integrations/idealy`. Elle a été synchronisée depuis la branche `main` du dépôt source le 23 août 2026. Le frontend principal reste celui du workspace Next actuel ; les routes et composants frontend de l’ancien dépôt ne sont pas importés dans cette intégration.

Le serveur API Idealy peut être démarré séparément depuis `api-server` après installation de ses dépendances et configuration de son environnement. Le proxy Next utilise `IDEALY_API_URL` pour sa sonde `/api/idealy/health`. Le chat principal peut utiliser le provider Edge avec `IDEALY_AI_PROVIDER=supabase-function` et appelle alors `process-ai-request` via le serveur Next.

Les secrets ne doivent pas être copiés dans ce répertoire. Utiliser les fichiers `.env.example` comme inventaire de configuration, puis renseigner les variables uniquement dans l’environnement d’exécution ou les secrets du fournisseur de déploiement.

## Répartition

| Élément | Emplacement | Rôle |
|---|---|---|
| Frontend principal | `../../app`, `../../components`, `../../hooks` | Interface actuelle du workspace Idealy |
| Backend chat principal | `../../app/api/chat`, `../../lib/ai`, `../../lib/db` | Auth.js, Postgres, historique, documents et streaming |
| API Idealy importée | `api-server` | Service API minimal de santé, extensible si des routes persistantes y sont ajoutées |
| Fonctions Edge | `supabase/functions` | Provider IA, missions, crédits, Stripe, intégrations GitHub/Vercel et statut |
| Schéma et migrations | `supabase/migrations`, `supabase/schema.sql` | Contrat de données Supabase d’Idealy |
| DB/API contracts | `db`, `api-zod`, `api-spec` | Accès Drizzle, validation et contrat d’API |
| Contrats agents et mission | `backend-core/src/agents`, `backend-core/src/core/mission` | Routage d’intention, équipe d’agents, DNA de mission, validation et préflight |
| Mémoire WebContainer | `backend-core/src/core/webcontainer` | Architecture, diagnostics terminal et auto-correction à porter dans le compilateur réel |
| Adaptateurs serveur | `../../app/api/idealy` et `../../lib/idealy` | Pont contrôlé entre Auth.js, Postgres, Supabase Edge et le frontend |

## État du raccordement

Le mode démo est désactivé dans la branche live. Sans session, le middleware redirige vers `/login`. Après authentification, le flux conserve les messages dans Postgres. Lorsque le provider Supabase est activé dans l’environnement de déploiement, le serveur transmet le JWT Supabase au backend Edge et adapte le streaming au format UI du chatbot. Le Gateway reste disponible comme chemin de repli tant que le provider Edge n’est pas sélectionné.

La copie locale du backend ne constitue pas un déploiement Supabase : aucune migration distante et aucun redéploiement Edge ne sont lancés automatiquement par ce dossier. Cette étape doit être faite après rotation des credentials et validation des secrets dans l’environnement sécurisé du déploiement.
