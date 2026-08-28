# Matrice de traçabilité — Document maître Idealy

> **Statut.** Cette matrice traduit le document maître reçu le 28 août 2026 en exigences contrôlables pour la branche `feat/idealy-live-backend`. Elle est un outil de pilotage : elle ne transforme pas un prototype local, une CI verte ou une maquette en capacité de production. Toute évolution doit préserver le workspace Live, la source de vérité Supabase et les limites de sécurité déjà établies.

## Principes de décision conservés

| Décision | Statut | Conséquence d’implémentation |
|---|---|---|
| **Voie ≠ plan** | À respecter | La voie définit l’identité, le vocabulaire et l’affichage. Le plan définit les droits, limites et allocations. Aucun changement d’offre ne doit réécrire une voie. |
| **Power Points côté serveur** | À étendre | Le stockage et les calculs utilisent un concept générique. Le client traduit seulement le libellé en Mana, Chakra, Nen ou Énergie. |
| **Supabase comme source métier** | Décision existante | Les profils, missions, runs, crédits/puissance, intégrations et paiements restent sous Supabase. `lib/db` ne sert qu’au cache/historique hérité. |
| **Auth.js comme façade de session** | Décision existante | Une migration Firebase créerait une seconde identité incompatible avec les contrôles V1. Google et email/password seront d’abord complétés à travers l’architecture Supabase/Auth.js déjà en place. |
| **Design Live préservé** | Exigence | Les enrichissements sont localisés : indicateur de puissance, voie, onboarding, agents et paywall. Il est interdit de remplacer le workspace par un nouveau design. |
| **Actions externes explicites** | Décision existante | Aucun export, déploiement, achat ou connecteur ne peut être déclenché implicitement. Les fonctions Vercel et design restent désactivées jusqu’à leurs contrats de sécurité. |

## Couverture fonctionnelle

| Domaine du document maître | Exigence vérifiable | État constaté | Classement | Prochain incrément sûr |
|---|---|---|---|---|
| Voies | Quatre voies : Mage, Ninja, Hunter, Pro ; une seule voie active. | Le runtime possède des personas originaux et une valeur `missions.way`. La landing utilise désormais le contrat central. Les migrations `product_profile_foundations` et `profiles_direct_access_hardening` ont été appliquées et vérifiées en production le 28 août 2026 : `profiles.way` existe avec sa contrainte. | **Partiel** | Relier le choix d’onboarding authentifié au profil. |
| Voies | Vocabulaire propre à chaque voie, jamais une imitation de franchise. | Registre `agent-personas.ts` original et séparé des avatars de démo. | **Conforme sur le périmètre runtime** | Réutiliser ce registre pour les labels de puissance, onboarding et paywall. |
| Plan / voie | Une offre Free, Pro ou Business n’altère jamais la voie. | L’énumération `idealy_plan` existe ; le lien fonctionnel voie–plan n’est pas encore formalisé dans un contrat de droits. | **Partiel** | Introduire une politique serveur de droits qui reçoit `plan` et `way` comme axes distincts. |
| Power System | Le backend possède `currentPower`, `maxPower`, régénération quotidienne et allocation mensuelle. | `profiles.energy_balance`, `energy_reset_at` et l’ancienne table `user_energy` se chevauchent ; ni wallet unifié ni allocation mensuelle explicite ne sont présents. | **Manquant / dette à migrer** | Auditer les usages actuels puis définir une migration additive `power_wallets` sans supprimer de colonnes. |
| Power System | Tous les mouvements sont traçables dans un ledger. | `credit_ledger` existe comme surface serveur fermée, mais la correspondance complète coût mission / allocation / recharge / libellé de voie doit être qualifiée. | **Partiel** | Normaliser les raisons, idempotency keys, agent, mission et solde après transaction dans un ledger canonique. |
| Power System | Une estimation et confirmation précèdent les opérations coûteuses. | Préflight de mission et crédits serveur existent ; l’estimation explicite affichée avant exécution n’est pas un parcours public prouvé. | **Partiel** | Ajouter une estimation strictement informative signée côté serveur, puis une confirmation liée au digest de mission. |
| Power System | À zéro, les données restent accessibles et seules les opérations IA sont bloquées. | Les protections de crédits sont côté Edge ; l’expérience utilisateur de puissance épuisée et les parcours de récupération restent incomplets. | **Partiel** | Afficher un état d’épuisement contextualisé sans proposer de prix non configurés. |
| Recharge | Packs et recharge personnalisée ont des prix exclusivement calculés côté serveur. | Aucun pack public ne doit être activé avant un catalogue Stripe, des Price IDs, une règle d’arrondi et un test mode. | **À décider avant implémentation** | Définir les produits Stripe et les bornes de quantité ; ne jamais accepter un prix navigateur. |
| Changement de voie | Action explicite, non exploitable, avec règle de reprise des points. | Aucune règle de conversion approuvée. | **À décider avant implémentation** | Bloquer la modification tant qu’une politique de conservation/expiration n’est pas validée. |
| Agents | Orchestrator pilote les agents, coût, arrêt et erreurs. | Orchestrateur Edge v3 actif, mais le runtime est synchrone et non une file durable. | **Partiel** | Conserver Architecte → Builder → Reviewer ; ajouter les autres rôles seulement avec persistance et observabilité réelles. |
| Agents | Architect, Product Planner, Design Director, Builder, Reviewer, QA, Security, Research, Deployment sont activés selon besoin. | Les trois rôles de base sont persistés ; Design Engine existe ; QA/Security/Research/Deployment ne sont pas des workers autonomes. | **Partiel** | Définir une matrice d’éligibilité par mission avant d’ajouter des runs et coûts d’agents. |
| Agents | L’utilisateur voit une progression et le détail des étapes réelles. | Événements VFS/runs réels et replay existent ; la démo locale est explicitement en mémoire. | **Partiel** | Afficher les événements persistés et ne pas fabriquer de statut de worker durable. |
| Model Router | Sélection par capacité, tâche, contexte, budget, disponibilité et fallback. | Un catalogue fournisseur/modèle et des capacités existent ; le routage stratégique multi-modèle n’est pas encore un contrat unique. | **Partiel** | Extraire une politique de sélection testable qui ne prend que des modèles autorisés et disponibles. |
| Multi-modèle | Éviter qu’un même modèle juge systématiquement sa propre production. | Non prouvé en runtime. | **Manquant** | Ajouter une règle de séparation Builder/Reviewer lorsque plusieurs modèles configurés le permettent. |
| Workspace | Conversation, mission, agents, code, files, preview, logs et itération réunis. | La structure Live et la démo complète locale couvrent les vues ; l’exécution authentifiée de bout en bout reste à tester. | **Partiel** | Effectuer le smoke test utilisateur dès qu’un compte test est disponible. |
| Authentification | Google, email, confirmation, reset, session et logout. | Email/password Supabase + Auth.js sont présents ; parcours Google, confirmation et reset nécessitent encore configuration/test. | **Partiel** | Ne pas introduire Firebase : compléter Supabase Auth avec un parcours OAuth Google et tests contrôlés. |
| Onboarding | Nom, objectif, type de projet, niveau, découverte, voie, espace prêt. | Les migrations en production et la fonction `complete_my_onboarding` valident et enregistrent les données. Le parcours `/onboarding` à six étapes utilise une API Next authentifiée, valide les données avec Zod côté serveur, puis appelle exclusivement la RPC. Il a été vérifié en mode démo local ; une session Supabase utilisateur réelle reste à tester. | **Partiel** | Faire le smoke test authentifié du premier onboarding et décider du parcours d’édition ultérieur. |
| Profil | Les champs de personnalisation sont persistés et le consentement/analytics sont minimisés. | `profiles` reçoit les métadonnées d’onboarding. En production, `anon` ne peut pas lire la table ; `authenticated` ne conserve que `SELECT` sous RLS propriétaire, tandis que la mutation passe par la RPC bornée sans modifier plan, Stripe ni solde. | **Partiel** | Ajouter politique de rétention, libellé de confidentialité et UI de profil. |
| Plans | Free / Pro / Business, droits et allocations gérés côté serveur. | Plan et webhook Stripe existent, mais les promesses d’offres et la configuration réelle de prix sont volontairement prudentes. | **Partiel** | Créer un catalogue de droits serveur configurable, distinct de l’UI de prix. |
| Stripe | Checkout → webhook signé → abonnement → droits → allocation. | Fonctions billing durcies et Edge Functions actives ; checkout et webhook n’ont pas été validés par un test utilisateur en mode test. | **Partiel** | Tester en mode Stripe test avec Price IDs valides, redirection, webhook, portail et annulation. |
| Paywall | Un message contextuel emploie la terminologie de voie. | Page de réglages billing présente ; paywall contextualisé non livré. | **Manquant** | Concevoir une UI sans prix figés, alimentée par droits et solde serveur. |
| Connecteurs | Secrets côté serveur, OAuth individuel et actions intégrées au workspace. | GitHub préparé ; Drive prévu ; Vercel/design désactivés faute d’OAuth individuel/mission/crédits. | **Partiel et sécurisé** | Ne réactiver qu’avec OAuth utilisateur, consentement explicite et confirmation one-shot. |
| Design | Préserver layout premium Live, enrichir avec états de voie sobres. | Base Live présente ; les libellés de voies publics divergent ; le Design Engine est disponible. | **Partiel** | Écrire un Design Contract versionné et le rattacher à la mission. |
| Design Engine | Analyse → stratégie → sélection → génération → critique → itération. | Pipeline existante identifiée, mais son exécution ne doit pas être présentée comme une correction automatique durable. | **Partiel** | Persister les décisions de design et les critiques dans le DNA de mission. |
| Versioning | Prévisualiser, comparer et restaurer une version de mission. | VFS/replay et snapshots existent ; comparaison/restauration utilisateur ne sont pas finalisées. | **Partiel** | Concevoir le modèle de versions avant une UI de restauration. |
| Observabilité | Mission, agent, modèle, temps, tokens, coût, erreur et résultat traçables. | Runs, événements et intégrité existent ; schéma de coût Power et vue produit ne sont pas unifiés. | **Partiel** | Ajouter les champs de coût/routeur au contrat d’exécution et à un journal lisible. |
| Analytics | Mesurer le parcours nécessaire sans surveillance excessive. | Aucun programme analytics complet validé. | **Manquant** | Définir évènements minimaux, finalités, consentement et durée de conservation avant collecte. |
| Déploiement | Build, tests, vérification, publication, URL et rollback. | CI, préflight et confirmations GitHub existent ; Netlify est actuellement bloqué par quota, Vercel est volontairement désactivé. | **Partiel** | Résoudre la capacité de déploiement, puis faire un smoke test avant toute transition vers `main`. |
| Sécurité | Secrets absents du client, permission serveur, idempotence et audit continu. | Durcissements Stripe/connecteurs, RLS, JWT et contrats statiques ont été réalisés ; les smoke tests OAuth/paiement manquent. | **Partiel** | Maintenir l’audit par incrément ; ne pas qualifier l’ensemble « sans faille ». |

## Ordre de réalisation retenu

La phase fondation du document est adaptée à l’architecture actuelle, plutôt que recopiée littéralement. L’ordre sûr est : **(1)** contrat de voie et profil, **(2)** wallet/ledger et droits serveur, **(3)** onboarding, **(4)** policy de routage de modèles, **(5)** extension graduelle des agents, **(6)** UX de puissance et paywall, **(7)** test Stripe/OAuth, puis **(8)** publication et décision séparée sur `main`.

Les éléments nécessitant une décision produit avant code sont : la politique de changement de voie, la règle de régénération, les allocations Free/Pro/Business, les packs, le prix personnalisé, les modèles autorisés par plan et la gouvernance de collaboration Business. Aucun de ces paramètres ne sera inventé dans le navigateur ou présenté comme actif avant configuration serveur et test.

## Jalons de conformité

| Jalon | Conditions minimales de sortie |
|---|---|
| Fondation Power | Énumération unique des voies ; profil enrichi ; wallet et ledger server-first ; tests de concurrence/idempotence. |
| Onboarding | Six étapes validées, reprise sûre, voie persistée, aucun droit décidé par le client. |
| Agents / Router | Sélection testable, observabilité par run, fallback autorisé, affichage de progression fidèle. |
| Monétisation | Catalogue Stripe configuré, checkout test, webhook test, allocation idempotente, paywall contextualisé. |
| Publication | CI verte, Edge Functions vérifiées, smoke test authentifié, scan de secrets, déploiement `ready`. |
| Promotion `main` | Autorisation fraîche de l’utilisateur après le jalon Publication ; backup/PR/merge normal selon `controlled-main-replacement.md`. |

## Références internes

[D1]: [Document maître transmis](../../upload/pasted_content.txt)
[D2]: [Architecture V1 existante](architecture-v1.md)
[D3]: [Registre de sécurité V1](v1-security-readiness.md)
[D4]: [Procédure de transition contrôlée vers main](controlled-main-replacement.md)
[D5]: [Migration initiale profil/énergie](../supabase/migrations/00001_init_schema.sql)
[D6]: [Migration Stripe/abonnement](../supabase/migrations/20260811000000_stripe_webhook_schema.sql)
