# Plan de raccordement backend Idealy

Date : 23 août 2026.

## État vérifié

Le dépôt de référence `obrienmak18-maker/idealy` a été audité dans un dossier séparé. Le projet Supabase distant `IDEALY` a été identifié sous la référence `vhucjkyktdflwocrmzhe`, en région `eu-west-3`, avec un état `ACTIVE_HEALTHY`. L’instance distante contient déjà les tables de projets, messages, profils, abonnements, missions, runs d’agents, compétences, intégrations et crédits. Les structures sont protégées par RLS.

Le projet Supabase expose actuellement les fonctions Edge suivantes : `process-ai-request`, `ai-proxy`, `integration-connect`, `integration-callback`, `integration-status`, `github-export`, `vercel-deploy`, `vercel-status`, `create-billing-portal`, `check-subscription`, `cancel-subscription`, `stripe-webhook`, ainsi que les anciennes fonctions Checkout/Portal qui devront être dépréciées seulement après vérification de compatibilité.

## Mapping vers le workspace actuel

| Besoin Idealy | Point backend existant | Adaptation dans le workspace Vercel |
|---|---|---|
| Conversation et streaming | Route `/api/chat` + `streamText` + persistance Postgres/Drizzle | Conserver l’API UI actuelle comme façade ; ajouter un adaptateur de provider derrière `getLanguageModel` ou une route dédiée |
| Plan avant construction | Edge Function `process-ai-request` avec `planOnly` et `MissionPlan` structuré | Ajouter une étape plan dans le flux réel avant les outils de document et demander une approbation utilisateur |
| Classification | `intentOnly` et `classifyIntent` dans la fonction Edge | Utiliser `CONVERSATION`, `IDEATION`, `EXECUTION` pour le routage et les crédits |
| Agents spécialisés | Tables `skills` et `agent_runs`, agents `agent_type` avec états `queued`, `planning`, `running`, `succeeded`, `failed`, `cancelled` | Faire correspondre Planner/Product, Architect, Builder, Reviewer/QA et Security à des runs visibles dans le chat, sans cartes superposées à la preview |
| Projets et fichiers | `projects.files` JSONB, `missions`, `documents` et versions | Créer une couche d’export/import entre l’artefact Vercel et le projet Idealy ; ne pas dupliquer les sources de vérité sans identifiant de projet |
| Authentification | Auth.js actuel côté workspace ; Supabase Auth côté Idealy | Choisir une identité canonique. Le pont recommandé est d’échanger un jeton Supabase côté serveur ou de synchroniser un identifiant stable ; ne jamais comparer uniquement un email côté client |
| Crédits et abonnements | `profiles.energy_balance`, `subscriptions`, `credit_ledger`, RPC de crédit | Appeler les fonctions Edge côté serveur ; ne jamais débiter dans le navigateur ni afficher un crédit déduit avant confirmation du serveur |
| BYOK | `user_ai_keys` chiffrées AES-GCM dans les Edge Functions | Garder les clés uniquement dans Supabase Edge/serveur ; le workspace ne reçoit qu’un statut masqué du provider |
| GitHub | `github-export`, `user_integrations`, `integration_credentials` | Déclencher une approbation explicite avant export ou écriture ; afficher les erreurs et le dépôt cible dans la console |
| Vercel | `vercel-deploy`, `vercel-status` | Réserver Publish à une action confirmée ; envoyer seulement un bundle validé par les checks |
| Stripe | `stripe-webhook` et fonctions d’abonnement | Maintenir `profiles.stripe_customer_id` et `subscriptions` comme source moderne ; ne pas utiliser les tables legacy sans migration contrôlée |
| Logs et debug | `agent_runs`, console et logs d’Edge Functions | Alimenter Console/Network/Build avec des événements structurés, un niveau, un timestamp, un run et une action Ask AI |

## Contrat recommandé pour le premier branchement

Le premier branchement ne doit pas remplacer brutalement `/api/chat`. Il doit introduire une interface serveur `IdealyBackendAdapter` avec des opérations `createMission`, `createAgentRun`, `streamPlan`, `approvePlan`, `streamBuild`, `recordBuildEvent`, `completeMission` et `cancelMission`. En mode démo, cette interface utilise les événements locaux actuels. En production, elle délègue à Supabase Edge avec les en-têtes serveur nécessaires et conserve le même contrat UI.

Le flux recommandé est le suivant : le serveur reçoit le message et l’identité Auth.js, crée ou retrouve le projet et la mission, lance le Planner, stream un plan structuré, attend une approbation si le changement est important, lance l’Architect puis le Builder, compile dans un sandbox isolé, transmet les événements Build/Network/Console et laisse le Reviewer valider la preview. L’export GitHub, le déploiement Vercel, les paiements et les actions destructrices restent derrière une confirmation explicite.

## Décisions de sécurité

Aucune clé n’a été copiée, demandée dans le chat ou ajoutée au dépôt. Le proxy local actuel relaie déjà l’Authorization vers la fonction Edge, mais l’appel ne doit être activé en production que lorsque le serveur sait obtenir un jeton Supabase valide pour l’utilisateur Auth.js. Une clé publishable Supabase peut être utilisée dans le navigateur pour les opérations prévues par les policies ; les clés service role, les clés fournisseurs, la clé d’encryption BYOK et les secrets Stripe restent strictement côté serveur/Edge.

L’audit distant signale trois avis `INFO` `rls_enabled_no_policy` sur `public.credit_ledger`, `public.user_ai_keys` et `public.user_credits`. Ils sont cohérents avec le choix actuel de bloquer tout accès direct aux rôles client et de passer par des RPC ou fonctions `SECURITY DEFINER`; ils ne doivent pas être « corrigés » en ajoutant des policies permissives sans analyse.

Le dépôt local indique également une divergence historique entre l’ancien registre `stripe_customers` et le registre moderne `profiles`/`subscriptions`. Aucune suppression ni migration distante ne doit être lancée pendant le raccordement du chat. La normalisation Stripe doit être traitée comme une passe séparée avec tests de webhook et vérification de l’état réel.

## Prochaine tranche d’implémentation

La prochaine tranche technique devrait ajouter l’adaptateur serveur, le contrôle de configuration `IDEALY_BACKEND_MODE=demo|supabase`, la conversion Auth.js vers un jeton Supabase côté serveur, puis un premier appel `intentOnly` ou `planOnly` non destructif. Ensuite seulement, nous pouvons brancher le streaming de plan et la création d’un `agent_run`. Le rendu WebContainer réel viendra après ce contrat, car il dépend de limites d’exécution, de fichiers, de dépendances et de permissions qu’il faut isoler avant d’afficher une build comme réussie.

## Références

[1]: https://docs.replit.com/features/editor/preview — Replit Preview et developer tools.
[2]: https://atoms.dev/ai-agents — Atoms AI Agents et agents spécialisés.
[3]: https://www.anthropic.com/engineering/building-effective-agents — Anthropic, workflows, agents, vérification et principes d’ACI.
[4]: https://docs.lovable.dev/introduction/welcome — Lovable, workspace full-stack, ownership et cycle de livraison.
[5]: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy — Supabase, avis RLS enabled without policy.
[6]: https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys — Vercel AI Gateway, API keys.


## Synchronisation de la branche live

Une branche dédiée `feat/idealy-live-backend` a été créée et publiée sur [le dépôt GitHub Idealy](https://github.com/obrienmak18-maker/idealy). Elle contient le workspace visuel, le mode démo désactivé, la redirection d’authentification live, le pont Auth.js vers Supabase côté serveur, le proxy Edge et une copie synchronisée des fonctions Supabase du `main` Idealy.

Le serveur Express importé dans `integrations/idealy/api-server` reste une sonde minimale exposant seulement `/api/healthz`. La logique métier réelle du dépôt `main` se trouve dans les Edge Functions Supabase, notamment `process-ai-request`, `ai-proxy`, les fonctions de crédit/abonnement, les intégrations et les fonctions Vercel. Les modules `src/core/mission`, `src/core/webcontainer` et `src/agents` du dépôt source sont identifiés comme contrats à porter progressivement : équipe d’agents, planification, validation, mémoire d’architecture, diagnostics terminal et auto-correction.

Le premier palier live a été validé par build Next.js/TypeScript. Avec les variables locales actuelles, l’application redirige un visiteur sans session vers `/login` au lieu de créer un guest de démonstration. Une tentative de mission sans `POSTGRES_URL` échoue encore côté persistance, avec `ECONNREFUSED`; ce résultat est attendu tant que l’environnement de déploiement n’a pas reçu la base et les credentials réels. Aucun secret n’a été ajouté ou publié.

La synchronisation du dossier Supabase a été faite depuis le checkout de `main` du dépôt source le 23 août 2026. Elle n’a pas appliqué de migration distante et n’a pas redéployé de fonction. Les déploiements Edge et la configuration des secrets devront être traités séparément après rotation des clés et validation de l’identité Auth.js/Supabase.

Référence source : [obrienmak18-maker/idealy](https://github.com/obrienmak18-maker/idealy), branche `main` et branche de travail `feat/idealy-live-backend`.


## Raccordement du chat au provider Edge

Le flux `/api/chat` accepte désormais `IDEALY_AI_PROVIDER=supabase-function`. Dans ce mode, il conserve la persistance des messages et du titre dans Postgres, récupère le JWT Supabase associé au token Auth.js côté serveur, appelle `process-ai-request` en streaming et convertit les fragments OpenAI-compatibles en événements UI du chatbot. Le chemin Gateway et les outils Vercel AI restent disponibles lorsque `IDEALY_AI_PROVIDER=gateway`.

Le helper `lib/idealy/supabase-auth.ts` tente de synchroniser une connexion ou une inscription email/mot de passe Auth.js avec Supabase Auth lorsque `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont configurés. Le jeton Supabase est conservé uniquement dans le JWT serveur Auth.js et n’est pas copié dans la session publique.

Le build passe avec le provider Edge câblé. Le test de bout en bout ne peut pas encore appeler le modèle, car l’environnement local courant ne possède ni `POSTGRES_URL`, ni `SUPABASE_URL`, ni clé IA Edge. Aucun fallback démo n’est réactivé ; le blocage restant est donc un blocage de configuration runtime, pas de code.
