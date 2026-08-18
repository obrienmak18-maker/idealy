# Validation du fichier React/TSX unique

Le composant `artifacts/idealy/src/routes/DesignMockupPage.tsx` est autonome côté maquette : le logo et le contexte agent design sont inclus dans le même fichier, sans import interne vers `Brand`.

Le typecheck complet et le build du frontend passent. La route `/design-mockup` se charge dans le navigateur. Le bouton « Commencer » ouvre correctement l’onboarding 1/3 et affiche les quatre voies Ninja, Mage, Hunter et Pro avec leurs identités narratives.

Le bouton « Continuer » ouvre l’étape 2/3. Le champ de nom accepte `Amina` et met à jour l’aperçu « Pro — Amina, que voulons-nous construire aujourd’hui ? » sans erreur runtime.

Le bouton de l’étape 2/3 ouvre l’étape 3/3. Le choix « 2 à 10 personnes » reçoit bien son état actif visuel dans la carte de contexte React.

Les sélections « Produit ou design » et « Une vidéo ou une démonstration » s’activent indépendamment de l’équipe choisie, avec un état visuel cohérent dans les trois cartes.

Après l’entrée dans la workspace, la sidebar reste visible. Le starter remplit le composer, puis l’envoi affiche la top bar seulement après mission, l’historique, la timeline « Réflexion en cours » et la preview en construction.

La mission passe à « Première version prête » et affiche la preview LUMA PIZZA. L’onglet Code ouvre `src/PizzaHome.tsx` avec numéros de lignes et exemple JSX, toujours sans appel réseau.

Data affiche les tables simulées `reservations`, `menu_items` et `opening_hours`. Le tiroir Terminal/Logs s’ouvre depuis la top bar, montre `npm run build` et reste séparé du contenu principal.
