# Smoke test de la maquette ZIP

Date : 2026-08-19
Branche : `feat/idealy-v2-shell`
Commit testé : `866fd34`

## Résultat

La route locale `/design-mockup?zip-backend=1` s’ouvre correctement après le build et affiche la page d’accueil Idealy sans erreur visible, même sans variables `VITE_FIREBASE_*`. Le formulaire d’idée et les quatre exemples de mission sont rendus. Le clic sur l’exemple pizzeria remplit le champ sans crash ; l’action suivante doit être déclenchée depuis le bouton `Commencer` de l’interface.

## Limites constatées

La page affiche encore le libellé de maquette locale et les actions de démonstration prévues par le shell ZIP. Ce smoke test ne constitue pas un test d’authentification Firebase ni un test d’appel IA réel : Firebase n’est pas configuré et une session utilisateur réelle n’a pas été fournie.

## Vérifications déjà passées

- `pnpm run typecheck` : succès.
- `pnpm run build` dans `artifacts/idealy` : succès.
- CI GitHub du commit `866fd34` : succès, jobs `build` et `webhook-test` validés.

## Suite du parcours vérifiée

Le clic sur `Commencer` ouvre bien l’étape 1/3 de l’onboarding. La sélection de la voie `Ninja` est conservée et apparaît dans l’aperçu de conversation. Le bouton `Continuer` ouvre l’étape 2/3, qui demande le nom du spécialiste. Le parcours reste navigable et la voie reste une identité narrative, non un niveau de prix.

L’étape 3/3 s’ouvre après la saisie d’un nom. Elle présente les trois questions de profil prévues (taille du groupe, rôle, source de découverte) et le bouton `Entrer dans Idealy`. Le footer indique honnêtement qu’il s’agit encore d’un parcours de démonstration et que l’authentification réelle est branchée séparément.

Les réponses `Moi seul`, `Fondateur ou dirigeant` et `Une recommandation` débloquent `Entrer dans Idealy`. Le workspace s’ouvre ensuite avec la sidebar d’historique, la voie active `Ninja`, la mission pizzeria préremplie, le compositeur et le bouton d’envoi. Le shell indique encore explicitement que la maquette simule la réflexion, la construction et la preview sans appel backend sur ce parcours local.

Après l’envoi, le shell affiche un `Plan prêt à valider` composé pour la mission, avec l’équipe dynamique `Éclaireur`, `Architecte` et `Designer`. Sans session authentifiée, l’interface précise que le plan réel apparaîtra après connexion et utilise l’aperçu local. Le clic sur `Valider et construire` ouvre la phase `Construction en cours` et la preview reste fermée/attentive avec le message indiquant que la maquette n’a pas lancé WebContainer. Cela confirme le garde-fou de validation et l’absence de preview prématurée dans le fallback local.
