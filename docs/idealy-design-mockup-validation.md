# Validation visuelle de la maquette autonome

## 18 août 2026

La route locale `/design-mockup` s’ouvre correctement sur `http://127.0.0.1:4174/design-mockup`. La page d’accueil affiche le logo, les actions Se connecter/Commencer, le titre « Qu’allons-nous construire ? », la zone de prompt, les actions pièce jointe/image/Figma/GitHub/micro, les exemples de missions et les trois promesses principales.

Le bouton « Voir le parcours » fonctionne et ouvre l’étape 1/3 de l’onboarding. L’écran affiche les quatre voies Ninja, Mage, Hunter et Pro, avec le texte explicite indiquant qu’il ne s’agit pas de niveaux de prix. Le rendu est cohérent avec le thème graphite sombre et les accents rose, cyan et jaune. La voie Pro est sélectionnée par défaut et le bouton Continuer est visible.

Le build frontend et le typecheck avaient réussi avant cette vérification visuelle. Les screenshots locaux de ces deux états sont disponibles dans `/home/ubuntu/screenshots/` sous les noms générés par le navigateur.

L’étape 2/3 fonctionne après sélection de la voie. Le champ « Nom de spécialiste » accepte une valeur locale et actualise immédiatement l’aperçu de conversation : avec « Amina », l’aperçu affiche « Pro — “Amina, que voulons-nous construire aujourd’hui ?” ». La barre de progression passe bien à 2/3.

L’étape 3/3 affiche bien les trois groupes de contexte sur une seule vue lisible : taille d’équipe, rôle et source de découverte. Le choix « 2 à 10 personnes » devient visuellement actif avec un fond cyan discret, ce qui confirme le retour d’état sans utiliser un formulaire lourd.

Les choix de rôle et de découverte s’activent indépendamment tout en conservant la taille d’équipe déjà sélectionnée. Les trois groupes affichent chacun leur sélection avec le même traitement cyan, sans perturber la progression ni ajouter d’éléments superflus.

Après l’onboarding, la workspace s’ouvre avec la sidebar visible par défaut et sans top bar de conversation tant qu’aucune mission n’est lancée. Les starters sont accessibles au centre et le clic sur « Une landing page élégante pour une pizzeria artisanale » remplit correctement le composer inférieur sans lancer automatiquement l’action.

Le lancement d’une mission fonctionne : la top bar apparaît seulement après exécution, l’historique reçoit la mission, la colonne de conversation affiche la timeline de réflexion/construction et la preview se met d’abord en attente. Après le délai simulé, l’état « Première version prête » apparaît et la preview affiche une application de pizzeria complète avec navigation, texte, CTA et bloc visuel.

Les vues secondaires fonctionnent après l’état prêt. L’onglet Code affiche un fichier `src/PizzaHome.tsx` avec numéros de ligne, syntaxe colorée et action de copie. L’onglet Data affiche trois structures lisibles — `reservations`, `menu_items` et `opening_hours` — avec un nombre de lignes et une palette d’accent minimale.

Le bouton Terminal ouvre un tiroir flottant indépendant des vues principales. Le tiroir bascule correctement entre « Terminal » et « Logs » : le terminal simule `npm run build` et les logs affichent l’intention, la preview locale et l’absence de requête réseau.

Le tiroir se ferme correctement et le bouton de dictée du composer active un état local avec le message « Mode voix simulé : parle comme si Idealy t’écoutait. ». Cette interaction est volontairement une simulation sans accès micro réel dans le mockup ; elle sert à montrer le comportement visuel attendu.
