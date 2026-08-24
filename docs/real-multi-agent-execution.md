# Exécution multi-agent réelle — architecture Idealy

## État de départ

Le produit possède déjà les fondations utiles : une mission appartient à un utilisateur, les événements et fichiers de mission sont persistés, les requêtes IA passent par une fonction Edge authentifiée et les crédits sont débités côté serveur. La démo `/demo-flow` reste une représentation visuelle locale ; elle ne déclenche ni agents externes, ni écriture dans les tables de mission, ni connecteur tiers.

> **Règle produit :** un agent n’est réel que si son étape, son entrée, sa sortie, son coût, son autorisation et son résultat sont persistés et vérifiables.

## Modèle cible

| Couche | Responsabilité | Source d’autorité | Interdictions |
|---|---|---|---|
| Mission | Brief, propriétaire, objectif, état global | `missions.user_id` | Aucun `userId` fourni par le navigateur ne décide de la propriété. |
| Orchestrateur | Transforme le brief en plan borné, ordonne les étapes et annule proprement | Edge Function authentifiée | Pas de boucle infinie, pas d’agent auto-déployé, pas de secret dans les événements. |
| Étape d’agent | Un rôle, un prompt immuable, des limites d’entrée/sortie, un budget et une clé d’idempotence | `mission_agent_runs` à ajouter | Aucun rôle ne peut appeler un outil hors de son contrat. |
| Outils/connecteurs | Lecture limitée ou action préparée | `user_integrations` + consentement de mission | Toute écriture, publication, message ou dépense nécessite une confirmation. |
| Validation | Tests déterministes, relecture IA bornée, état d’acceptation | événements de mission et fichiers versionnés | Une réponse IA seule ne marque jamais une livraison comme publiée. |

## Parcours d’une mission de production

1. Le navigateur crée une mission avec son brief via une route authentifiée. Le serveur attache le propriétaire à partir du JWT.
2. L’orchestrateur débite une unité de planification, verrouille une clé d’idempotence et inscrit un événement `mission_started`.
3. Un agent **Architecte** produit un plan JSON limité à huit étapes. Le serveur valide strictement le schéma, les capacités et le budget de chaque étape.
4. Les agents lisent uniquement les artefacts autorisés de la mission. Le **Builder** peut proposer ou écrire des fichiers versionnés ; le **Reviewer** ne peut pas publier ; le **Release manager** ne peut que préparer une action de publication.
5. Après chaque étape, le serveur stocke une sortie bornée, un statut, la consommation de crédits, les erreurs et une empreinte. Un nouvel essai reprend la même clé d’idempotence ou crée une tentative explicitement autorisée.
6. Lorsqu’une étape externe est demandée, l’interface présente un résumé exact : compte, ressource, changement, environnement et conséquence. Seule une confirmation de l’utilisateur crée le jeton d’action à usage unique.
7. L’orchestrateur s’arrête sur succès, refus de confirmation, erreur non récupérable, annulation de l’utilisateur ou budget épuisé. Un remboursement ne peut concerner qu’un débit identifié et déjà borné par le ledger.

## Schéma à ajouter avant d’activer les agents

La prochaine migration doit introduire une table `mission_agent_runs` avec les champs suivants : `id`, `mission_id`, `parent_run_id`, `agent_key`, `status`, `input_digest`, `output_summary`, `credit_debit_key`, `tool_policy`, `started_at`, `finished_at`, `error_code` et `attempt`. Elle doit avoir une contrainte d’unicité sur `(mission_id, agent_key, attempt)` et des RLS de lecture uniquement pour le propriétaire de la mission.

Une table `mission_action_confirmations` doit enregistrer la demande d’action externe : `mission_id`, `integration_id`, `operation`, `resource_snapshot`, `confirmation_token_hash`, `expires_at`, `consumed_at` et `approved_at`. Seul le serveur crée, consomme ou annule ces entrées.

## Contrat minimal d’outil

```ts
type AgentToolRequest = {
  missionId: string;
  agentRunId: string;
  integrationId: string;
  operation: string;
  resource: Record<string, string>;
  confirmationToken?: string;
};
```

Avant d’exécuter une opération, le serveur vérifie successivement : propriété de la mission, intégration active appartenant au même utilisateur, opération présente dans le catalogue, politique de l’agent, plafond de coût, confirmation requise et jeton de confirmation à usage unique. Les opérations `publish`, `write` et `financial` restent impossibles sans confirmation.

## Premier périmètre réaliste

| Version | Agents réels | Connecteurs | Sortie attendue |
|---|---|---|---|
| V1 | Architecte, Builder, Reviewer | Aucun outil externe pendant la construction | Plan, fichiers de workspace, rapport de validation. |
| V1.1 | Architecte, Builder, Reviewer, GitHub préparateur | GitHub OAuth déjà amorcé | Branche ou pull request **préparée après confirmation**, jamais vers `main`. |
| V1.2 | Agent documentation et agent design | GitHub, puis un seul fournisseur de design validé | Documentation et assets proposés dans la mission. |
| V2 | Orchestration parallèle limitée | Connecteurs sélectionnés par l’utilisateur | Plusieurs étapes indépendantes, journalées et plafonnées. |

## Ce qui ne doit pas être activé sans préparation

Canva, Figma, Notion, Slack et Vercel restent affichés comme **à configurer** tant que leur OAuth, leurs redirections, leurs scopes minimaux, leur stockage chiffré de jetons, leurs revocations et leur test de bout en bout ne sont pas déployés. Les connecteurs activés dans une session d’administration ne deviennent pas automatiquement des connecteurs runtime pour les clients d’Idealy.

## Conditions de mise en production

Avant de retirer l’étiquette de simulation, il faut déployer la migration d’exécution, créer l’endpoint d’orchestration, valider les tests de propriété/idempotence/annulation, tester un compte GitHub de test et démontrer un parcours complet : brief → plan → fichiers → validation → confirmation → branche ou pull request de test. Aucune publication de production, aucun paiement et aucun message externe ne doivent servir de test initial.
