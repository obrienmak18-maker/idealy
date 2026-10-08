# Idealy — Closure des 29 problèmes / décisions
Date: 2026-10-08
Branche: feat/idealy-live-backend

## Règle
Ce registre suit `IDEALY_PRODUCT_DECISIONS.md` et le principe produit : aucune capacité ne doit être présentée comme live si elle n'est pas réellement exécutée ou vérifiée.

## 29 points

| # | Point | État | Preuve / décision |
|---:|---|---|---|
| 1 | Les 5 agents de Way sont l'équipe d'exécution réelle | ✅ Fermé | Runtime Chief → Builder → Designer → Specialist → Reviewer. |
| 2 | Sélection des sous-agents | ✅ Fermé | Chief choisit le plan; Designer/Specialist restent attachés; sélection supplémentaire seulement si besoin concret et persisté. |
| 3 | Identité runtime canonique | ✅ Fermé | Noms de la Way active; pas de personas neutres concurrents. |
| 4 | Affichage agent + rôle | ✅ Décidé | Affichage combiné selon le contexte; les surfaces compactes peuvent afficher le rôle seul. |
| 5 | Custom Power | ✅ Fermé | Visible mais indisponible/non facturable tant que le contrat serveur n'est pas prêt. |
| 6 | Auth locale de secours | ✅ Fermé | Fail closed; aucune identité mémoire/local fallback en production. |
| 7 | Stratégie de consommation Power | ✅ Fermé | Coût mesuré = reserve → execute → settle/release; coût fixe approuvé uniquement pour charge directe. |
| 8 | OAuth GitHub utilisateurs finaux | ⚠️ Externe | Infrastructure Edge OAuth présente; validation finale des credentials/redirects sur Supabase + Netlify requiert configuration de compte. |
| 9 | Publication + CI de cette étape | ⚠️ Vérification | Les workflows sont configurés sur la branche; aucune exécution GitHub Actions récente exploitable n'a été renvoyée par le connecteur. |
| 10 | Rapport main → live | ✅ Fermé | La branche live est auditée séparément; aucune modification de `main` n'est nécessaire pour fermer ce point. |
| 11 | Exports / snapshots / preview / connecteurs | ⚠️ Partiel | Snapshots, VFS et preview ont des contrats persistants; les écritures fournisseurs nécessitent encore des tests avec comptes connectés. |
| 12 | Audit final des connecteurs avec utilisateur réel | ⚠️ Externe | Impossible de déclarer CONNECTED sans compte OAuth réel et état fournisseur vérifié. |
| 13 | Smoke test authentifié mission/squad/VFS/replay | ⚠️ Externe | Le code et les fonctions live sont présents; il manque une session utilisateur réelle pour l'E2E final. |
| 14 | Domaine Idealy + Google Test/Prod | ⚠️ Externe | Configuration DNS/Google Cloud hors dépôt. |
| 15 | OAuth Google utilisateur + refresh + révocation | ⚠️ Externe | Callback Edge et stockage d'état/PKCE sont présents; secrets et test réel manquent. |
| 16 | Search Console | ⚠️ Externe | Vérification du domaine et soumission nécessitent le compte Search Console. |
| 17 | Registre de risques / beta criteria / payment readiness | ✅ Fermé | Ce registre apporte la traçabilité des risques et bloque les affirmations non prouvées. |
| 18 | Audit sécurité par scénario | ✅ Fermé | RLS/advisors Supabase audités; les SECURITY DEFINER exposées sont des RPC utilisateur bornées par `auth.uid()`, à conserver tant qu'elles restent ainsi. |
| 19 | Progression runs/fichiers lisible en direct | ✅ Fermé au niveau code | Le workspace consomme les événements/fichiers persistés et le panneau Build construit son état à partir de signaux réels; aucun succès simulé ne doit être ajouté. |
| 20 | Monétisation sans paiement réel | ✅ Contrat | Les chemins Stripe et Power sont séparés des tests; aucun paiement réel n'est requis pour les contrats. |
| 21 | Transition vers main | ⏸️ Gate | Doit rester une décision de release après preuves V1; jamais automatique. |
| 22 | Quota Netlify / nouveau déploiement ready | ⚠️ Externe | Dépend du quota/compte Netlify. |
| 23 | Voie vs Power vs progression vs abonnement | ✅ Fermé | Les contrats produit et le wallet Power V2 séparent désormais ces concepts. |
| 24 | Estimation/consommation Power serveur | ✅ Fermé pour V1 | Contrat borné actif: simple 10, squad 50; pas de prix dynamique inventé. |
| 25 | Multi-agent gradué | ✅ Fermé | L'Edge Function live exécute les cinq rôles Way; les anciennes références Architecte → Builder → Reviewer restantes ne doivent plus être présentées comme le runtime canonique. |
| 26 | Dépendances sécurité/paiement/exploitation avant public | ⚠️ Gate | Le code est contrôlé; les vérifications fournisseurs externes restent bloquantes pour une publication publique. |
| 27 | IA: estimation, blocage à zéro, Way change 30 jours | ✅ Fermé | Wallet/RPC Power V2, réservation idempotente et cooldown 30 jours présents sur Supabase live. |
| 28 | Power contextualisé par Way dans le workspace | ✅ Fermé au niveau code | `PowerStatusBadge` et `usePowerStatus` utilisent l'état réel et les libellés Chakra/Mana/Nen/Énergie. |
| 29 | Validation Power CI + Supabase | ✅ Partiellement vérifié | Migrations Power V2 présentes dans le projet Supabase live et policies/fonctions vérifiables; exécution GitHub CI finale reste à observer sur un run accessible. |

## État live vérifié

Le projet Supabase IDEALY est actif et sain. Les tables de missions, tâches, événements d'orchestration et réservations Power existent avec RLS. Le projet contient aussi les Edge Functions de connexion/intégration, orchestration et déploiement.

Le runtime live `orchestrate-mission` définit réellement cinq agents par Way et réserve 50 points pour une mission squad avant exécution, puis utilise le cycle de règlement/libération.

## Blocages qui ne doivent pas être maquillés

Les éléments marqués ⚠️ ou ⏸️ ne sont pas des bugs que le code peut résoudre seul. Ils dépendent d'un compte tiers, de credentials OAuth, d'un domaine, d'une session utilisateur réelle, d'un quota de déploiement ou d'une décision de release.

## Règle de sortie

Tant qu'un fournisseur externe n'a pas été testé avec un compte réel, son état UI doit rester non connecté/non vérifié. Tant qu'une action n'a pas réellement produit son effet, Idealy ne doit jamais annoncer qu'elle a été effectuée.
