# Audit comparatif — `main` vers `feat/idealy-live-backend`

**Date :** 25 août 2026. **Périmètre :** comparaison en lecture seule de `main` et de `feat/idealy-live-backend`, sans modification de `main`. Le document joint référence `main` au commit `10b0994` et live au commit `5767ba0`; la branche live a continué depuis avec les commits d’orchestration et de documentation. Les conclusions portent sur l’arbre actuellement disponible, pas sur une promesse de remplacement immédiat de `main`.

## Résumé exécutif

La branche live contient déjà la grande majorité du backend Idealy qui est rangé sous `integrations/idealy/` dans `main`, mais à la racine du projet et avec des protections supplémentaires. Elle ne doit donc **pas** recopier ce répertoire aveuglément. Les migrations historiques, `process-ai-request`, Stripe, BYOK, les connecteurs et le workspace sont déjà présents dans live. Les ajouts propres à live — intégrité de facturation, verrou atomique de cadence, fichiers de mission, intégrations versionnées et runs d’escouade — doivent être conservés.

| Domaine | `main` | `feat/idealy-live-backend` | Décision |
|---|---|---|---|
| Fonctions Edge IA, Stripe et connecteurs | Présentes sous `integrations/idealy/supabase/functions/`. | Présentes à la racine avec `process-ai-request`, Stripe, OAuth, Vercel et l’orchestrateur. | **Conserver live** ; comparer les régressions fonctionnelles fichier par fichier, ne pas importer le dossier historique. |
| Migrations Supabase historiques | Présentes jusqu’aux contrats mission, intégrations, BYOK et crédits. | Mêmes migrations, plus `billing_integrity`, cadence IA, `mission_files`, intégrations versionnées et orchestration. | **Conserver l’ordre live** ; ne jamais réappliquer des migrations historiques sous un autre nom. |
| Identité métier | Auth.js et Drizzle existent encore dans le shell chatbot. | Supabase est déjà la référence des missions, crédits, énergie, BYOK, connecteurs et Stripe. | **Supabase canonique pour le métier.** Auth.js ne doit rester qu’une façade de session compatible. |
| Chat, messages, documents, votes | Stockage Drizzle historique dans le chatbot Vercel. | Toujours utilisé par plusieurs routes et composants chat. | Les traiter provisoirement comme **cache/UI non autoritaire**. Une migration Supabase des historiques demande un chantier dédié et une migration de données. |
| Crédits et Stripe | Logique historique présente. | Ledger, idempotence, remboursement cumulé borné, webhook signé et catalogue serveur publiés. | **Conserver live** ; ne pas revenir à un montant de recharge issu des métadonnées cliente. |
| Workspace fichiers | Contrats mission historiques. | `mission_files`, `mission_file_events`, RLS, checksums, versions et événements. | **Conserver live** comme référence VFS et preview. |
| Orchestration | Pas de fonction live équivalente distincte vérifiée dans le dossier historique. | `orchestrate-mission`, runs d’agents, confirmations d’actions et proxy Next. | **Conserver live**, puis enrichir avec le planificateur dynamique. |
| Connecteurs | OAuth, callback, chiffrement, statut et export GitHub. | Même modèle de base, catalogue explicite et schéma `user_integrations`. | **Conserver live** ; n’activer un fournisseur que lorsque son OAuth est réellement configuré. |

## Sources d’autorité retenues

> Aucune identité, mission, énergie, crédit, connecteur, jeton OAuth, fichier de mission ou confirmation d’action ne doit devenir autoritaire dans Auth.js, Drizzle ou un état navigateur.

| Capacité | Référence canonique | État observé |
|---|---|---|
| Identité métier et autorisations | Supabase Auth + `auth.uid()` + fonctions Edge | Conforme pour missions, fichiers, crédits, intégrations et escouade. |
| Session shell Next.js | Auth.js seulement comme façade, avec transmission du JWT Supabase aux fonctions Edge | À préserver ; ne pas créer une identité métier parallèle. |
| IA | `supabase/functions/process-ai-request` | Canonique ; la route Next est un proxy. |
| Orchestration | `supabase/functions/orchestrate-mission` | Canonique ; JWT, propriété de mission, idempotence et journal présents. |
| Fichiers et événements | `mission_files` + `mission_file_events` | Canonique pour la construction et le VFS. |
| Crédits et billing | ledger, RPC service-role et webhook Stripe Supabase | Canonique ; pas de solde client. |
| Connecteurs | `user_integrations`, `integration_credentials`, `integration_oauth_states` | Canonique ; secrets chiffrés côté serveur. |
| Chat historique | Drizzle / `lib/db` | **Non canonique pour le métier.** À conserver comme cache historique jusqu’à une migration explicitement planifiée. |

## Écarts et risques confirmés

| Gravité | Écart vérifié | Conséquence | Décision de convergence |
|---|---|---|---|
| Haute | Des routes de chat, messages, documents, suggestions et votes lisent encore `lib/db`. | Une migration non préparée pourrait casser l’historique de chat. | Ne pas supprimer Drizzle maintenant ; interdire son usage pour les nouvelles missions, droits, crédits et intégrations. |
| Haute | `workspaceStream` lit réellement le flux fournisseur mais accumule le contenu complet avant `generatedFilesFromContent`. | Les événements fichiers ne sont pas encore envoyés pendant que chaque fichier est généré ; la reprise exacte du texte pendant génération reste à finaliser. | Une route bornée réhydrate désormais le journal et le snapshot VFS par séquence ; la priorité suivante reste des frames `file_started` / `file_chunk` / `file_saved` structurées à l’amont. |
| Moyenne | L’escouade actuelle est sécurisée et persistante, mais emploie le fallback Architecte → Builder → Reviewer. | L’équipe n’est pas encore dérivée d’un plan dynamique par domaine. | Ajouter `planOnly` avant la réservation des agents, puis limiter les agents aux rôles réellement nécessaires. |
| Moyenne | GitHub est le seul OAuth réellement câblé ; Canva, Figma, Notion, Slack et Vercel sont un catalogue à configurer. | Les afficher comme connectés créerait une fausse promesse. | Maintenir le statut « À configurer » jusqu’aux apps OAuth et tests de révocation. |
| Moyenne | Les actions externes sont préparées mais aucun connecteur tiers n’est automatiquement appelé par l’escouade. | Pas d’export ou de déploiement autonome à ce stade. | Conserver le blocage : confirmation expirable, snapshot de ressource et consommation unique avant écriture. |
| Information | Le prompt de convergence demande WebContainer, prévisualisation et self-correction complète. | Ces capacités nécessitent une instrumentation navigateur et un protocole de frames, absents du socle Edge seul. | Implémenter après le streaming structuré ; ne pas prétendre qu’elles sont prêtes aujourd’hui. |

## Vérifications de sécurité déjà présentes dans live

Les migrations et fonctions live couvrent le ledger de crédits côté service, le plafond de remboursements cumulés, la cadence atomique, la signature et l’idempotence Stripe, la propriété de mission avant écriture, les tables de runs et les confirmations à usage unique. Les rôles navigateur ne peuvent pas insérer ou mettre à jour directement les tables `mission_agent_runs` et `mission_action_confirmations` déployées.

## Vérification de production en lecture seule

Le 25 août 2026, l’inventaire du projet Supabase de production `vhucjkyktdflwocrmzhe` a confirmé les fonctions actives `process-ai-request` (version 16), `orchestrate-mission` (version 1, JWT vérifié), `integration-connect`, `integration-callback`, `integration-status`, `github-export`, `stripe-webhook`, les sessions Stripe et les adaptateurs Vercel. Les migrations `mission_files`, `billing_integrity`, `ai_request_first_slot`, `user_integrations_schema` et `mission_agent_orchestration` sont également présentes. Cette vérification ne lit ni ne divulgue aucune variable d’environnement ; elle ne remplace pas un test authentifié par un utilisateur.

La branche live expose désormais `GET /api/idealy/missions/:missionId/events?afterSequence=N`. La route consulte `mission_file_events` et `mission_files` avec le JWT Supabase de la session ; la RLS conserve donc l’autorisation de lecture au propriétaire de la mission. Le client fusionne les événements strictement croissants avec le snapshot de fichiers après une interruption de flux. Cette amélioration rend la réhydratation robuste, mais ne transforme pas encore le flux fournisseur en chunks de fichier persistés à mesure de leur génération.

## Périmètre sûr de la prochaine itération

1. Stabiliser un contrat d’intention partagé `CONVERSATION` / `IDEATION` / `EXECUTION` entre la route Next et `process-ai-request`.
2. Dériver l’escouade dynamique d’un `planOnly`, avec le fallback sécurisé actuel si le plan est invalide.
3. Remplacer l’accumulation de `workspaceStream` par des frames structurées persistées et récupérables par séquence.
4. Raccorder l’arborescence, le VFS et la preview uniquement aux événements de fichiers validés.
5. Ajouter les OAuth fournisseurs un à un, après configuration de leurs applications et tests d’autorisation, révocation et confirmation d’écriture.

## Non inclus dans cette convergence immédiate

Le remplacement de `main`, une migration de données Drizzle complète, un déploiement de production par agent, un serveur MCP arbitraire, l’exécution d’actions externes automatiques et une promesse de preview WebContainer complète ne sont pas prêts à être déclarés terminés. Ils requièrent des contrats supplémentaires et des tests authentifiés avant toute bascule.
