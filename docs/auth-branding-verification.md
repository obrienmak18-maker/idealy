# Vérification locale — authentification et branding Idealy

Date : 24 août 2026.

Le build de production local a été contrôlé sur `/login`. Le document affiche désormais le titre navigateur **Idealy**, un logo Idealy lisible, les libellés français et la composition à halos colorés issue des tokens de l’application. Les éléments visibles hérités du template — titre « Next.js Chatbot Template », logo Next/Vercel, « Powered by AI Gateway », « Chatbot » et prompts génériques — ne sont plus présents sur cet écran.

Le contrôle visuel ne constitue pas une preuve de connexion de bout en bout : aucun compte réel n’a été créé ou modifié pendant cette vérification. Le comportement d’échec/succès Auth.js est couvert par le contrat `test:auth-outcome`; l’authentification avec des identifiants réels restera explicitement à confirmer après déploiement.

Un essai de connexion local avec une adresse de contrôle non existante (`auth-check-do-not-create@invalid.test`) a également été soumis. Il est uniquement destiné à vérifier que le flux ne crée pas de compte et ne peut plus rediriger sur un succès inconditionnel ; son résultat d’interface est contrôlé séparément.

Après ajout d’un message inline accessible dans le formulaire, le build de production local a été régénéré et la tentative non mutative a été préparée sur cette version actualisée pour contrôler le retour rendu.

Résultat contrôlé : la soumission est restée sur `/login` et a affiché un message inline d’indisponibilité du service. Aucun compte n’a été créé, aucun accès protégé n’a été ouvert et aucun faux succès n’a été rendu. Dans cet environnement local, ce message est cohérent avec l’absence de connexion backend utilisable ; le code distingue désormais cette condition d’un succès et l’affichera explicitement sur le site déployé.
