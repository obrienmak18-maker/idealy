# Vérification locale — authentification et branding Idealy

Date : 24 août 2026.

Le build de production local a été contrôlé sur `/login`. Le document affiche désormais le titre navigateur **Idealy**, un logo Idealy lisible, les libellés français et la composition à halos colorés issue des tokens de l’application. Les éléments visibles hérités du template — titre « Next.js Chatbot Template », logo Next/Vercel, « Powered by AI Gateway », « Chatbot » et prompts génériques — ne sont plus présents sur cet écran.

Le contrôle visuel ne constitue pas une preuve de connexion de bout en bout : aucun compte réel n’a été créé ou modifié pendant cette vérification. Le comportement d’échec/succès Auth.js est couvert par le contrat `test:auth-outcome`; l’authentification avec des identifiants réels restera explicitement à confirmer après déploiement.

Un essai de connexion local avec une adresse de contrôle non existante (`auth-check-do-not-create@invalid.test`) a également été soumis. Il est uniquement destiné à vérifier que le flux ne crée pas de compte et ne peut plus rediriger sur un succès inconditionnel ; son résultat d’interface est contrôlé séparément.

Après ajout d’un message inline accessible dans le formulaire, le build de production local a été régénéré et la tentative non mutative a été préparée sur cette version actualisée pour contrôler le retour rendu.

Résultat contrôlé : la soumission est restée sur `/login` et a affiché un message inline d’indisponibilité du service. Aucun compte n’a été créé, aucun accès protégé n’a été ouvert et aucun faux succès n’a été rendu. Dans cet environnement local, ce message est cohérent avec l’absence de connexion backend utilisable ; le code distingue désormais cette condition d’un succès et l’affichera explicitement sur le site déployé.

Après validation CI, un déploiement Netlify du commit `1b90878` a été déclenché pour le site Idealy existant. Au premier contrôle, l’URL publique servait encore l’ancienne version template, ce qui est attendu tant que le nouveau déploiement n’est pas terminé. Cette observation ne vaut donc pas validation du déploiement public ; l’état final doit être relevé après la fin de la livraison.

Le contrôle public suivant a confirmé que `https://idealy-ai.netlify.app/login` sert désormais le titre **Idealy**, le logo Idealy, le formulaire en français, les halos colorés et les suggestions de mission. Une tentative de connexion invalide et non mutative a été préparée sur cette version pour valider le comportement sans utiliser de compte réel.

Résultat public contrôlé : la tentative invalide est restée sur `/login` et a affiché « L’adresse e-mail ou le mot de passe est incorrect. ». Elle n’a créé aucun compte et n’a ouvert aucun accès protégé. Le correctif du faux succès de l’écran est donc vérifié pour un échec d’authentification réel. La réussite avec un compte réel confirmé reste volontairement hors de ce contrôle non mutatif.

La protection publique de `/plugins` a aussi été contrôlée : hors session, la route redirige vers `/login?callbackUrl=%2Fplugins`. Après une connexion future réussie, l’écran de connexion utilise ce paramètre relatif pour renvoyer la personne vers la route demandée. Cette vérification couvre la protection et le retour attendu, sans déclencher de connexion GitHub OAuth ni créer de ressource externe.
