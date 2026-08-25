# Handoff développeur — Idealy V1

> **But.** Ce guide permet à une équipe humaine de reprendre la branche `feat/idealy-live-backend` sans deviner les frontières d’autorité ni refaire des intégrations dangereuses. Aucun secret ni valeur d’environnement ne doit être ajouté à ce document.

## Démarrage et règles de branche

Travaillez uniquement sur `feat/idealy-live-backend` tant que le smoke test authentifié et les décisions de publication ne sont pas prouvés. Ne modifiez pas, ne rebasez pas et ne force-pushez pas `main`. Une transition vers `main` suit la procédure dédiée, avec backup, CI, tests et autorisation explicite au moment du merge. [1]

| Vérification | Commande ou action | Résultat attendu |
|---|---|---|
| État de branche | `git status --short --branch` puis `git fetch idealy feat/idealy-live-backend` | Branche live propre ou modifications comprises avant commit. |
| Contrats applicatifs | `pnpm backend:verify`, `pnpm typecheck` | Manifeste et types valides. |
| Contrats ciblés | Scripts sous `scripts/test-*.mjs` | Aucune régression des garanties de sécurité/mission. |
| Build | `pnpm build` | Build Next sans erreur. |
| Base/RLS | CI GitHub uniquement | Supabase local Docker est validé par la CI, pas par ce sandbox. |
| Webhook Stripe | CI GitHub uniquement | Signature et intégrité de crédits vérifiées en environnement local isolé. |

## Carte de code

| Zone | Responsabilité | À ne pas faire |
|---|---|---|
| `app/(chat)` | UX de chat, workspace, canvas et routes héritées. | Faire de `lib/db` une autorité pour missions ou crédits. |
| `app/api/idealy` | Proxys Next sécurisés vers Edge. | Accepter une API key contrôlée par le client ou renvoyer des détails internes. |
| `lib/idealy` | Adaptateur Supabase, design engine, catalogue, personas et type métier. | Introduire un accès direct navigateur aux secrets. |
| `supabase/migrations` | Schéma canonique, RLS et RPC. | Créer une écriture vers une table non migrée ou modifier des données de production à l’aveugle. |
| `supabase/functions` | IA, orchestration, OAuth, paiement, export et gardes de connecteurs. | Déployer un jeton partagé comme capacité utilisateur. |
| `components/chat/data-stream-handler.tsx` | Hydratation des événements et fichiers VFS. | Simuler un état de fichier ou de build inexistant. |
| `scripts/` et `.github/workflows/` | Contrats statiques et CI. | Retirer une garde sans la remplacer par un test équivalent ou meilleur. |

## Variables d’environnement : noms et finalité

| Groupe | Noms attendus | Règle |
|---|---|---|
| Session et site | `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `APP_ORIGIN`, `IDEALY_ALLOWED_ORIGINS` | Valeurs de production fixes et cohérentes avec le domaine ; aucune origine contrôlée par requête ne décide un retour Stripe. |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | La service role reste exclusivement dans les Edge Functions. |
| IA | Variables des fournisseurs autorisés et configuration du provider Idealy | Les modèles doivent figurer dans l’allowlist ; crédits et limites restent côté serveur. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, identifiants de prix configurés | Tester en mode test avant une offre publique ; ne jamais envoyer au client un ID interne inutile. |
| GitHub OAuth | `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` | Scopes minimum, callback fixe et revue de la révocation avant activation large. |
| Chiffrement d’intégration | `INTEGRATION_ENCRYPTION_KEY` | 32 octets une fois décodée ; rotation planifiée, valeur jamais journalisée. |

La variable de chiffrement est validée pour AES-GCM dans le code partagé ; la rotation exige une stratégie de version de clé, pas un remplacement aveugle. [2]

## Séquence de déploiement sûre

1. Lire `todo.md`, vérifier que les éléments réellement terminés sont cochés et exécuter les contrats locaux plus le build.
2. Créer un commit atomique sur `feat/idealy-live-backend`, pousser sans force-push, puis attendre la CI GitHub.
3. Déployer d’abord les seules Edge Functions modifiées, avec `verify_jwt: true` sauf webhook Stripe signé. Lister ensuite les fonctions et consigner version, état `ACTIVE` et configuration JWT.
4. Déployer le frontend Netlify depuis la branche live après la CI et les vérifications Edge. Vérifier l’état `ready`, le scan de secrets et les routes publiques prévues.
5. Exécuter les tests authentifiés séparément lorsque le compte de test est disponible : mission/VFS, OAuth GitHub, puis Stripe **test mode**. Ne jamais combiner un test technique et une publication externe réelle.

> L’orchestrateur de cette itération inclut des directives de voix pour les agents. Le code source ne devient actif en production qu’après un déploiement Edge réussi et une vérification de version.

## Runbooks

### Échec d’une mission

Vérifier d’abord le `missionId`, la clé d’idempotence, les entrées `mission_agent_runs`, `mission_file_events`, `mission_files` et `missions.validation` sous l’utilisateur concerné. Ne relancez pas la mission avec une nouvelle clé avant d’avoir déterminé si un run existant est réutilisable. Un échec doit se conclure par `needs-fix`, jamais par un succès affiché sans fichiers cohérents.

### Incident Stripe

N’éditez ni les crédits ni le statut d’abonnement à la main pour corriger un affichage. Vérifiez le webhook signé, l’événement Stripe, les clés d’idempotence et les écritures Supabase associées. Effectuez ensuite un test Stripe isolé. Les prix, taxes, conditions et conformité de paiement doivent être validés dans Stripe et avec un conseil juridique/comptable compétent avant une ouverture commerciale.

### Incident OAuth ou intégration

Désactivez l’intégration utilisateur concernée, vérifiez le state consommé, la date d’expiration et l’enregistrement chiffré. Ne consignez jamais un access token dans les logs, issues ou messages de commit. Une erreur de callback doit rester générique côté utilisateur ; le diagnostic détaillé appartient aux logs privés.

### Connecteurs volontairement désactivés

`vercel-deploy`, `vercel-status` et `designer-tools` doivent répondre de façon contrôlée. Leur restauration exige un nouveau design de permission utilisateur, une confirmation explicite avant écriture, des limites de débit, des crédits si nécessaire, de l’idempotence et des tests CI dédiés. Ne contournez pas ces gardes avec `VERCEL_TOKEN` ou un token fournisseur partagé.

## Limites V1 à ne pas masquer

| Point | État réel | Prochaine preuve requise |
|---|---|---|
| Agents « en direct » | Événements persistés et replay réels ; orchestration synchrone. | Architecture queue/worker durable si une exécution longue est requise. |
| Paiement | Gardes backend publiées. | Checkout Stripe test, webhook, portail et annulation avec compte de test. |
| GitHub OAuth | State et chiffrement en place. | Test utilisateur, scopes réduits, expiration/révocation ou migration GitHub App. |
| Recherche Google | Fondations SEO publiées. | Domaine propriétaire, Search Console, sitemap soumis et suivi d’indexation. |
| Transition `main` | Procédure préparée uniquement. | Smoke test complet + autorisation fraîche et explicite. |

## Références

[1]: [Procédure de transition contrôlée vers `main`](controlled-main-replacement.md)
[2]: [Chiffrement des intégrations](../supabase/functions/_shared/integrationCrypto.ts)
[3]: [Carte d’architecture V1](architecture-v1.md)
[4]: [Registre de risques et sécurité V1](v1-security-readiness.md)
