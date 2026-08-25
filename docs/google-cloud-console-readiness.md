# Préparation Google Cloud Console — Idealy

> **Statut : préparation uniquement.** Google Drive est visible dans le catalogue comme intégration **planifiée**. Aucun client OAuth Google, secret, callback ou accès à des données Google n’est activé par ce document.

## Décision d’architecture

Idealy doit utiliser un **client OAuth de type application Web** distinct pour Google Drive. Le code d’autorisation et les jetons restent dans les Edge Functions Supabase ; le navigateur ne reçoit jamais de secret client. Cette séparation correspond au modèle serveur recommandé par Google pour les applications qui peuvent conserver des informations confidentielles. [1]

La production devra utiliser un domaine dont Idealy est propriétaire. Le sous-domaine partagé `idealy-ai.netlify.app` ne doit pas servir de base à une vérification de marque, car Google demande la vérification des domaines associés à la page d’accueil, aux politiques, aux redirections et aux origines JavaScript. [2] [3]

| Élément | Préparation Idealy | Décision à prendre dans Google Cloud Console |
|---|---|---|
| Projet Google | Aucun projet n’est considéré comme configuré. | Créer deux projets distincts : `Idealy Google OAuth — Test` et `Idealy Google OAuth — Production`. |
| Type de client | Application web serveur / Edge. | Créer un client OAuth **Web application**, jamais un client Android, iOS ou navigateur. |
| Domaine | Définir un domaine Idealy propriétaire avant production. | Vérifier son domaine racine dans Google Search Console avec un compte propriétaire lié au projet Cloud. |
| Accueil public | Les pages `/about`, `/privacy` et `/terms` sont publiques. | Définir l’accueil, la confidentialité et les conditions sur le même domaine propriétaire après son branchement. |
| Callback | Non implémenté pour Google ; ne pas en enregistrer un actif pour le moment. | Après implémentation, enregistrer uniquement l’URL HTTPS exacte de l’Edge Function Google, sans joker ni URL Netlify de test dans le projet de production. |
| Scopes initiaux | Catalogue limité à `drive.metadata.readonly`. | Déclarer uniquement ce scope, puis soumettre une nouvelle revue si une capacité exige davantage. |
| Secrets | Noms prévus : `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`. | Conserver le secret dans les secrets Supabase Edge uniquement ; ne jamais le mettre dans Git, Netlify client ou le chat. |

## Contrat à implémenter avant activation

L’activation Google exigera une fonction de démarrage et une fonction de callback dédiées, ou une généralisation sûre du flux GitHub actuel. Elles devront générer un `state` aléatoire et haché à durée courte, vérifier l’utilisateur Supabase, échanger le code côté Edge, chiffrer le jeton et le refresh token au repos, stocker les scopes accordés, offrir une révocation et renvoyer un statut non sensible au navigateur.

Le callback devra correspondre **exactement** à une URI autorisée dans Google Cloud Console ; Google vérifie le schéma, l’hôte, le port, la casse et le slash final. [1] L’autorisation doit employer HTTPS en production, un scope minimal et une demande contextuelle au moment où l’utilisateur choisit la fonction Drive. [1] [2]

## Checklist à effectuer lorsque les comptes seront accessibles

1. Obtenir un domaine Idealy propre, l’associer au site Netlify et vérifier le domaine racine dans Google Search Console.
2. Créer le projet **Test**, définir l’audience sur test, ajouter uniquement les comptes testeurs et créer un client Web pour les callbacks de test.
3. Finaliser puis faire valider la page confidentialité : finalités, données Google sollicitées, stockage chiffré, durée de conservation, révocation et absence de revente/usage secondaire.
4. Créer le projet **Production**, définir l’identité visuelle Idealy, une adresse de support surveillée et des contacts développeur à jour.
5. Déclarer les domaines autorisés, la page d’accueil, la confidentialité et les conditions sur le domaine vérifié.
6. N’activer que Google Drive API et le scope minimal requis. Les scopes sensibles ou restreints demandent une vérification avant exposition générale. [2]
7. Créer le secret client une seule fois, l’enregistrer directement dans les secrets Supabase Edge, puis lancer le smoke test avec un compte de test. Google recommande une rotation immédiate en cas d’exposition. [4]
8. Soumettre la marque et, si nécessaire, les accès de données à vérification. Ne publier le connecteur dans Idealy qu’après résultat concluant.

## Éléments volontairement interdits

Il ne faut pas utiliser un token Google partagé entre les utilisateurs, demander un scope Drive global par défaut, embarquer le secret dans le frontend, accepter une redirection arbitraire, ni présenter Google Drive comme connecté avant l’autorisation et le test réels.

## Références

[1]: https://developers.google.com/identity/protocols/oauth2/web-server "Google — OAuth 2.0 for Web Server Applications"
[2]: https://developers.google.com/identity/protocols/oauth2/policies "Google — OAuth 2.0 Policies"
[3]: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification "Google — Brand verification"
[4]: https://support.google.com/cloud/answer/15549257 "Google Cloud — Manage OAuth Clients"
