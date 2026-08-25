# Revue sécurité et préparation V1 — Idealy

> **Statut : audit en cours.** Ce document consigne les protections réellement vérifiées et les limites ouvertes. Il ne constitue pas une promesse d’absence de vulnérabilité ni une certification de conformité.

## Méthode

La revue examine les routes Next, les Edge Functions, les migrations, les contrats CI et les surfaces de sortie externe en reprenant les risques d’autorisation objet, consommation de ressources, authentification, OAuth, stockage de jetons et paiement. L’OWASP API Security Top 10 identifie notamment les contrôles d’autorisation et la consommation non bornée comme des risques prioritaires pour les APIs. [1]

## Corrections appliquées dans cette itération

| Surface | Risque constaté | Correction apportée | Preuve automatisée |
|---|---|---|---|
| Checkout, portail, annulation et statut Stripe | Repli CORS `*`, URL de retour contrôlable via `Origin`, erreurs détaillées et exposition de l’identifiant client Stripe. | Origines issues du helper autorisé, retour fixé sur `APP_ORIGIN`, messages publics génériques et retrait des IDs Stripe côté navigateur. | `test-billing-security-contract.mjs` |
| Création de checkout | Risque de création concurrente de session ou d’abonnement. | Recherche d’abonnement actif, idempotence Stripe du client et de la session, profil requis. | `test-billing-security-contract.mjs` |
| Vercel | Un jeton serveur partagé pouvait théoriquement publier pour n’importe quel utilisateur authentifié. | Les routes de déploiement et de statut sont désactivées jusqu’à OAuth individuel et confirmation one-shot. | `test-shared-external-connector-guard.mjs` |
| Outils de conception | Recherche/génération d’image authentifiée mais sans mission, débit, crédits ni idempotence. | La fonction est désactivée jusqu’à un contrat mission, cadence, crédits, idempotence et politique fournisseur. | `test-shared-external-connector-guard.mjs` |
| Import d’images héritées | Nom de Blob fourni par le client, global et prévisible ; risque de collision ou d’écrasement. | Chemin public désormais segmenté par utilisateur avec UUID non prédictible ; formats JPEG/PNG et 5 Mo restent imposés. Les imports sont toujours publics par conception : ils ne doivent contenir aucune donnée sensible. | `test-legacy-api-security-contract.mjs` |
| Documents hérités | Écriture de contenu non bornée et suppression d’un document absent susceptible de produire une erreur serveur. | Contenu plafonné à 1 000 000 caractères, titre borné et ressource absente renvoyée en 404 contrôlée. | `test-legacy-api-security-contract.mjs` |
| Requêtes de chat héritées | Tableaux et identifiants de modèle insuffisamment bornés ; URL de pièce jointe non contrainte au transport sécurisé. | Taille des listes plafonnée et URLs d’images limitées à HTTPS. | `test-chat-request-contract.mjs` |
| Proxy IA Next | L’appelant pouvait substituer l’en-tête `apikey` relayé au backend. | La clé anonyme utilisée par le proxy vient exclusivement de sa configuration serveur ; un bearer demeure obligatoire. | `test-next-ai-proxy-contract.mjs` |

Ces protections ont été publiées le 25 août 2026 : `create-checkout-session` v27, `create-billing-portal` v11, `check-subscription` v12, `cancel-subscription` v11, `vercel-deploy` v11, `vercel-status` v11 et `designer-tools` v1 sont toutes `ACTIVE` avec vérification JWT. Les fonctions sont désactivées par une réponse contrôlée, et non supprimées : leur réactivation impose donc de livrer le contrat de sécurité décrit dans le tableau ci-dessus.

## État GitHub OAuth

Le flux actuel garde déjà un state aléatoire haché à durée courte, une consommation atomique, un callback fixe et un chiffrement des tokens côté serveur. Cependant, la demande `repo user` reste large et la V1 ne stocke pas encore de refresh token expirable ni de vérificateur PKCE. GitHub recommande des scopes minimaux, des tokens expirables et le PKCE pour le flux authorization-code ; GitHub Apps sont préférables quand les permissions fines par dépôt sont requises. [2] [3] [4]

| Décision V1 | État |
|---|---|
| Aucune écriture GitHub silencieuse | Appliqué : export soumis à confirmation one-shot liée à la mission et au digest. |
| OAuth GitHub utilisable publiquement | Non certifié : configuration et test réel d’un compte utilisateur manquent. |
| Scopes minimaux et migration vers GitHub App | Chantier recommandé avant extension du connecteur à la production large. |
| Révocation utilisateur et expiration/rotation token | Chantier requis avant certification complète. |

## Frontières d’identité et routes héritées

Supabase Auth et les tables Supabase restent l’autorité des missions, crédits, intégrations, paiements, runs et fichiers de workspace. Auth.js ne fait que porter une session chiffrée côté serveur afin de donner au runtime Next un accès contrôlé au JWT Supabase ; le callback de session ne sérialise pas ces jetons vers `session.user`. `lib/db` garde encore l’historique conversationnel et les artefacts hérités, avec une correspondance locale–Supabase : il ne doit pas devenir une seconde autorité métier.

L’audit statique a confirmé que l’API d’escouade relaie vers l’Edge Function sous JWT, laquelle applique l’autorisation de mission ; que le guest flow est réservé au mode démo dans sa route dédiée ; et que les routes d’historique, de vote et de documents vérifient le propriétaire local avant lecture ou écriture. L’architecture conserve cependant deux couches pour l’historique de chat ; sa suppression ou migration ne doit pas être faite sans migration de données et test de régression.

## Paiements et crédits : qualification honnête

Les contrôles backend de crédits, webhook signé, idempotence et remboursement borné sont couverts par les contrats locaux/CI. Les pages publiques n’annoncent pas de prix réels non configurés. En revanche, aucun smoke test utilisateur complet de checkout n’a été exécuté dans cette session et l’interface ne propose pas encore un parcours d’achat de production validé. Idealy peut être préparé pour une bêta payante, mais ne doit pas être qualifié de paiement public certifié avant ce test et la validation du catalogue Stripe.

## Risques ouverts avant V1 publique

| Priorité | Point ouvert | Condition de fermeture |
|---|---|---|
| Haute | Smoke test authentifié mission, crédits, escouade, VFS et replay. | Compte de test disponible, exécution réelle sans export externe. |
| Haute | Configuration et test OAuth GitHub de bout en bout. | Compte de test, scopes documentés, callback, révocation et statut vérifiés. |
| Haute | Parcours checkout réel Stripe. | Produits/prix validés, mode test, webhook, portail et annulation contrôlés sans paiement réel. |
| Moyenne | Intégrations Vercel et designer. | OAuth individuel, confirmations persistantes, limites, crédits et tests dédiés. |
| Moyenne | Validation de build/auto-correction. | Environnement de validation explicite ; ne pas annoncer WebContainer tant qu’il n’est pas réellement exécutable. |

## Références

[1]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "OWASP API Security Top 10 — 2023"
[2]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app "GitHub — OAuth App best practices"
[3]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps "GitHub — OAuth App scopes"
[4]: https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/ "GitHub — PKCE support for OAuth"
