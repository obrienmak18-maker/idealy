# Carte des connecteurs et outils utiles à Idealy

Dernière vérification : 2026-10-22

Ce document sépare les **intégrations de l’application Idealy** des **outils de production accessibles dans ChatGPT**. Les deux catégories ne sont pas interchangeables.

## 1. Connecteurs destinés à être intégrés dans Idealy

| Fournisseur | Utilité dans Idealy | État du code vérifié | Prérequis avant d'annoncer « connecté » |
|---|---|---|---|
| GitHub | Lire/exporter du code, synchroniser les dépôts et suivre les changements | Flux OAuth et export présents dans le backend | Client OAuth configuré, consentement utilisateur et test réel lecture/écriture sur un dépôt autorisé |
| Supabase | Base de données, Auth, Storage et Edge Functions des apps générées | Projet Idealy actif; fonctions backend en place | Projet cible sélectionné, droits minimaux et test réel de schéma/données |
| Vercel | Créer une preview et déployer une application | Flux et fonctions de statut/déploiement présents; projet Idealy lié à GitHub | OAuth ou secret serveur configuré, test de preview, puis confirmation explicite avant production |
| Canva | Accéder aux designs et ressources choisis par l'utilisateur | Fournisseur OAuth prévu dans integration-connect | Clés OAuth configurées et test sur un design explicitement choisi |
| Figma | Lire les fichiers et spécifications de design autorisés | Fournisseur OAuth prévu; compte Figma accessible dans l'environnement de travail avec droits de visualisation | Clés OAuth et scopes nécessaires; ne pas supposer de droits d'édition |
| Google Drive | Retrouver des documents utiles aux missions | Fournisseur OAuth prévu | Clés OAuth, consentement, puis lecture limitée aux fichiers autorisés |
| Notion | Lire les pages/documents de projet autorisés | Fournisseur OAuth prévu | Clés OAuth et test de lecture d'une page autorisée |
| Slack | Lire les canaux autorisés et, si permission explicite, envoyer des messages | Fournisseur OAuth prévu | Clés OAuth, scopes minimaux et confirmation avant tout envoi |
| Stripe | Checkout, abonnements et portail de facturation | Fonctions backend et webhooks existent; registre indique une configuration serveur | Clés de test d'abord, webhook signé et tests de paiement avant production |
| Azure | Exécution cloud et fonctions | Adaptateur marqué comme planifié dans le registre | Ne pas présenter comme fonctionnel avant implémentation et test complet |

### Règles de sécurité

- Les clés secrètes et jetons d'accès restent côté serveur; ils ne doivent jamais être envoyés au navigateur ni commités dans Git.
- Un fournisseur dans le catalogue n'est pas automatiquement connecté. L'état doit provenir du backend et d'une vérification réelle.
- Les actions externes d'écriture, de publication, de déploiement et de facturation nécessitent une confirmation explicite et une gestion des erreurs.
- Les intégrations doivent être activées une par une avec un test de connexion, un test de capacité, un test de révocation/expiration et un contrôle après rafraîchissement.
- Ne pas ajouter un fournisseur uniquement pour afficher son logo. Chaque carte doit correspondre à des capacités réellement testées.

## 2. Outils de production utilisables pour aider l'équipe Idealy

Ces outils sont utiles pour fabriquer les livrables du projet, mais leur connexion dans ChatGPT ne crée pas automatiquement une intégration dans l'application Idealy.

| Outil | Usage concret |
|---|---|
| Canva | Infographies explicatives, présentations, supports marketing et assets existants |
| Figma | Inspection des composants et spécifications de design; les droits disponibles peuvent être limités à la visualisation |
| GitHub | Inspection et modification du code, branches, commits et revues |
| Supabase | Vérification des fonctions backend, du schéma et des statuts du projet |
| Vercel | Vérification des projets liés, des déploiements et des journaux disponibles |
| Exa / Browser | Recherche et lecture de documentation ou de pages de référence |
| HeyGen | Préparer une vidéo explicative avec avatar/voix si ce format est souhaité |
| AI Music Maker / Vocuno | Composer une musique originale pour une vidéo de présentation, sous réserve des crédits et limites du service |
| Adobe | Retouche, montage et déclinaisons d'assets existants |
| Gamma | Présentation de pitch ou dossier explicatif |
| SSHOW | Explorer ou présenter un projet dans l'espace de travail SSHOW, selon les autorisations disponibles |

## 3. Limite essentielle

Les outils et connecteurs disponibles dans ChatGPT ne peuvent pas être copiés directement dans Idealy. Pour qu'un fournisseur fonctionne dans l'application, Idealy doit avoir son propre flux d'autorisation (OAuth ou API), les secrets côté serveur, des permissions explicites et des tests de bout en bout. Certains outils, comme un convertisseur GIF/WebP, sont des utilitaires ponctuels et ne constituent pas forcément un connecteur à intégrer au produit.

## 4. Parcours de livraison recommandé

1. Confirmer les statuts réels depuis la page Connecteurs d'Idealy avec un utilisateur connecté.
2. Valider GitHub de bout en bout : autorisation, dépôt choisi, lecture, écriture contrôlée et révocation.
3. Valider Canva et Figma pour les ressources explicitement sélectionnées.
4. Valider Vercel en preview avant toute publication en production.
5. Vérifier séparément Supabase et Stripe, car ce sont des intégrations serveur et non de simples connexions OAuth utilisateur.
6. N'activer Google Drive, Notion et Slack qu'après configuration des secrets OAuth et tests de leurs permissions.

