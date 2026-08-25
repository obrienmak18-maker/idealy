# Audit initial de finalisation — `feat/idealy-live-backend`

**Référence auditée :** `816676b` sur `feat/idealy-live-backend`. Cet audit est factuel et ne constitue ni une fusion ni une autorisation de modifier `main`.

## Contrats Supabase réellement versionnés

Les migrations versionnées créent les tables métier suivantes : `profiles`, `missions`, `mission_files`, `mission_file_events`, `mission_agent_runs`, `mission_action_confirmations`, `user_credits`, `credit_ledger`, `user_energy`, `subscriptions`, `stripe_customers`, `integrations`, `user_integrations`, `integration_credentials`, `integration_oauth_states`, `oauth_states` et `user_ai_keys`.

| Domaine | Table ou contrat canonique | Contrôle observé |
|---|---|---|
| Mission | `missions` | Ownership utilisateur contrôlé dans les Edge Functions. |
| Fichiers / journal | `mission_files`, `mission_file_events` | Lecture RLS propriétaire ; écritures navigateur révoquées. |
| Runs | `mission_agent_runs` | RLS lecture propriétaire ; écritures navigateur révoquées ; unicité `(mission_id, run_key, step_index)` et `(mission_id, run_key, agent_key)`. |
| Action externe | `mission_action_confirmations` | Jeton haché, expiration et lecture propriétaire. |
| Crédits | `user_credits`, `credit_ledger` | Débit/remboursement RPC côté serveur avec clés d’idempotence. |
| Connecteurs | `user_integrations`, `integration_credentials`, `integration_oauth_states` | Credentials côté serveur et états OAuth séparés. |

> **Décision d’autorité :** aucune route Next, table Drizzle ou mémoire client ne doit devenir une seconde source métier. Auth.js reste une façade de session ; Supabase Auth et les tables ci-dessus restent l’autorité.

## Edge Functions, routes et contrats observés

Le dépôt versionne notamment `process-ai-request`, `orchestrate-mission`, `integration-connect`, `integration-callback`, `integration-status`, `github-export`, `stripe-webhook`, les routes de billing et les adaptateurs Vercel. Les proxies Next dédiés couvrent actuellement l’état billing, le proxy IA et les endpoints de mission `/events` et `/squad`.

| Composant | Contrat constaté | État d’audit |
|---|---|---|
| `process-ai-request` | Auth Supabase, allowlist provider/modèle, résolution managed/BYOK, débit idempotent, `intentOnly`, `planOnly`, `uiStream`, `workspaceStream`. | À conserver comme unique entrée IA. |
| `orchestrate-mission` | Ownership mission, clé de run, réservation des trois runs, Architecte → Builder → Reviewer, aucune action externe. | Réel mais séquentiel ; les rôles sont actuellement fixes. |
| `/api/idealy/missions/[missionId]/squad` | Proxy Next authentifié qui exige une clé d’idempotence. | À conserver mince, sans logique de crédit parallèle. |
| `/api/idealy/missions/[missionId]/events` | Relecture bornée VFS + snapshot sous RLS. | Réel ; prêt pour un protocole d’événements plus progressif. |

## Écarts bloquants identifiés

| Sévérité | Constat vérifié | Décision de correction |
|---|---|---|
| Critique | `lib/idealy/backend-adapter.ts` écrit encore dans `agent_runs`, table absente des migrations versionnées. | Retirer cette écriture héritée du chemin chat ; `mission_agent_runs` devient le seul registre de runs. |
| Haute | `workspaceStream` accumule la réponse fournisseur complète puis parse les fichiers à la fin. | Introduire un protocole de frames structuré et persistant, sans présenter le flux actuel comme token-par-token fichier. |
| Haute | La boucle `buildWithSelfCorrection` de l’ancien backend limite bien à trois tours, mais dépend d’un WebContainer navigateur. | Réutiliser son contrat de validation et rendre explicitement l’indisponibilité du terminal ; ne pas prétendre à une validation serveur inexistante. |
| Moyenne | `orchestrate-mission` réserve actuellement `architect`, `builder`, `reviewer` fixes. | Préserver le fallback et documenter le plan dynamique avant d’autoriser des rôles spécialisés. |

La correction de schéma a retiré les écritures Next vers `projects`, `agent_runs`, `project_id`, `input` et `kind`, qui ne sont pas définis par les migrations live. Une mission est maintenant créée directement dans `missions` avec `title`, `way`, `brief`, `dna` et `status`. Le plan est enregistré dans `missions.dna`, attend explicitement l’action utilisateur **Run squad**, puis l’orchestrateur le réutilise sans créer un second appel de planification ni un second débit d’idéation. Le nouveau contrat CI `test-supabase-table-contract.mjs` refuse les références aux tables ou colonnes non versionnées identifiées.

## Streaming, preview et validation réellement disponibles

Le Builder utilise désormais un protocole NDJSON : `file_started`, `file_content` et `build_log` sont traités à mesure que les lignes complètes arrivent. Le serveur vérifie chaque chemin, écrit d’abord le fichier en état `writing`, calcule son checksum à réception du contenu, enregistre l’état `saved`, puis émet les événements séquencés `file_content` et `file_saved`. Le flux ne conserve plus la réponse complète du fournisseur en mémoire. L’annulation du flux client annule aussi la lecture fournisseur. La migration `20260826000000_workspace_file_content_events.sql` doit être appliquée avant déploiement de cette évolution, car elle ajoute `file_content` et `build_log` au journal autorisé.

Le canvas reste fermé pendant les événements de mission et de début d’écriture. Il ne s’ouvre qu’après un fichier `saved` ou `validated` avec contenu ; le VFS réhydraté reste la référence de rendu. L’ancien panneau de base de données ne prétend plus afficher une connexion ou des tables `projects` fictives.

L’orchestrateur produit maintenant un **préflight structurel déterministe** sur les fichiers sauvegardés : présence de `package.json` et `index.html`, checksum, statut et chemin relatif sûr. Il persiste ce rapport dans `missions.validation` et un événement `validation_result`. Une mission avec préflight `needs-fix` reste en cet état au lieu d’être marquée prête. La boucle complète de compilation et d’auto-correction de `main` reste indisponible côté Edge/Netlify tant qu’un environnement de validation compatible n’est pas explicitement fourni ; elle n’est donc pas annoncée comme active.

## Décision sur les sources résiduelles

| Entité | Source obligatoire | Rôle actuel hors Supabase |
|---|---|---|
| Utilisateur et session métier | Supabase Auth | Auth.js ne doit porter que la session Next et le jeton Supabase associé. |
| Profil, missions, plan, validation et snapshots | Supabase | Aucune écriture Drizzle ne doit décider de ces états. |
| Runs | `mission_agent_runs` | Les trois étapes techniques sont réservées uniquement par `orchestrate-mission`. |
| Fichiers et événements | `mission_files` et `mission_file_events` | Le VFS navigateur est un cache de rendu réhydraté, jamais une autorité. |
| Crédits, BYOK, intégrations et Stripe | Tables et Edge Functions Supabase, puis Stripe comme source externe | Aucune donnée de ce domaine ne passe par `lib/db`. |
| Historique de chat et documents génériques | `lib/db` / Drizzle provisoirement | Cache d’interface et historique non critique uniquement ; sa migration vers Supabase reste ouverte avant remplacement de `main`. |

## Crédits, connecteurs et CI

Le chemin IA live centralise la résolution BYOK et le débit managed dans `process-ai-request`. Le remboursement d’interruption et le webhook Stripe sont versionnés séparément. L’audit détaillé des retries de mission, du replay et du Builder reste à compléter avant toute affirmation de non-double-débit de bout en bout.

Le test local du webhook Stripe couvre désormais un retry de `consume_ai_credit` avec la même clé d’idempotence et vérifie qu’il ne débite pas deux fois. Le test de base Supabase/Stripe restera exécuté par la CI, car le sandbox courant ne fournit pas Docker pour ce scénario.

Le catalogue distingue déjà les intégrations planifiées des intégrations configurées. GitHub reste le seul OAuth utilisateur amorcé dans le runtime ; les autres fournisseurs ne doivent pas être affichés comme connectés sans callback, scopes, stockage chiffré, révocation et test.

L’export GitHub exige maintenant une confirmation persistante `github:export` liée au propriétaire, à la mission, à l’intégration GitHub, au digest des fichiers et à un jeton à usage unique expirant. Une préparation crée l’intention, une approbation explicite la rend consommable et l’export la consomme atomiquement avant toute écriture GitHub. Aucun autre fournisseur ni serveur MCP utilisateur n’est activé par cette évolution.

## État de production vérifié le 25 août 2026

| Surface | État observé | Conséquence |
|---|---|---|
| Supabase migrations | Production contient jusqu’à `mission_agent_orchestration`; `20260826000000_workspace_file_content_events.sql` est locale. | Appliquer cette migration additive avant de déployer `process-ai-request` révisée. |
| Supabase Edge | `process-ai-request` v16 et `orchestrate-mission` v1 sont actives, donc antérieures à cette itération locale. | Déployer séparément les nouvelles versions après CI verte. |
| Netlify | Le déploiement `6a8ce1ca5dcd8dec441125c6` est `ready`; son scan de secrets n’a trouvé aucune correspondance. Il est étiqueté `main` par un upload API, sans merge Git. | Ne pas l’assimiler à la branche Git `main`; publier seulement après validation de la branche live. |
| OAuth GitHub | Les fonctions sont actives, mais l’outil de lecture Netlify ne fournit pas les noms de variables d’environnement. | Ne pas affirmer que les secrets OAuth sont configurés ; le flux devra être vérifié avec un compte utilisateur autorisé. |

Le workflow `Idealy Live Quality` s’exécute sur les pushes de `feat/idealy-live-backend`, les pull requests vers `main` ou la branche live, et déclenche manuellement. Il contrôle le typecheck, le build, les contrats statiques, le reset Supabase local/RLS et le webhook Stripe local. Il ne prouve pas à lui seul un déploiement Supabase ou Netlify de production.

## Suite ordonnée

La première correction est l’élimination de l’écriture `agent_runs` absente du schéma, accompagnée d’un test de table autorisée. Ensuite seulement viendront les frames VFS progressives, la validation déterministe bornée, l’idempotence renforcée et les smoke tests authentifiés autorisés.
