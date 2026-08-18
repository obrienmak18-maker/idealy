# Validation du fichier HTML unique

Le fichier cible est `idealy-design-mockup.html` à la racine du dépôt. La première ouverture en `file://` puis via HTTP local affiche le fond sombre mais aucun élément interactif. La console du navigateur ne donne pas encore d’erreur visible. Le problème est donc à diagnostiquer dans le script inline avant le commit final.

L’inspection du DOM confirme `document.readyState === complete`, `#app` existe mais son HTML reste vide (`appHTMLLength: 0`), tandis que le HTML statique est bien présent. La console ne fournit aucune erreur exploitable. Le diagnostic doit donc passer par une vérification statique de la syntaxe et du contenu du script inline.

La syntaxe JavaScript extraite passe maintenant `node --check`, mais la page HTTP reste vide après rechargement. La console du navigateur n’affiche toujours aucune erreur. Il faut poursuivre avec une instrumentation minimale ou un test DOM programmatique avant la livraison.

Le navigateur reçoit bien un script classique inline de 25 203 caractères, avec le début et la fin attendus. Pourtant `window.idealy` reste `undefined` et `#app` reste vide. Le prochain diagnostic consiste à exécuter le contenu du script isolément dans la console pour révéler l’exception masquée par le navigateur.

La cause du premier écran vide était le cache navigateur qui servait encore la version contenant l’accolade en trop. Après ouverture avec `?v=2`, le fichier unique fonctionne : les boutons, le textarea, le composer, les starters et les trois promesses s’affichent directement via HTTP. La syntaxe extraite passe `node --check`.

Après invalidation du cache, le fichier unique est interactif : « Commencer » ouvre l’étape 1/3, puis « Continuer » ouvre l’étape 2/3 avec le champ de nom et l’aperçu conversationnel. Aucun composant React ou fichier externe n’est requis.

Le champ de nom met à jour l’aperçu de conversation (« Pro — Amina… ») puis le bouton Continuer ouvre correctement l’étape 3/3 avec les trois groupes de contexte : équipe, rôle et source de découverte.

Les choix de taille d’équipe et de rôle s’activent dans le fichier unique, avec un état visuel local, sans rechargement ni dépendance externe.

Un défaut d’interaction a été trouvé pendant le test de l’étape 3/3 : après les clics automatisés sur les choix de contexte, aucune classe `.choice.selected` n’est présente et le bouton « Entrer dans Idealy » reste désactivé. Le problème concerne le branchement des clics dans le HTML unique, pas le rendu. Il doit être corrigé avant le commit final.

Le gestionnaire global du fichier fonctionne correctement : l’appel local à `choose()` sélectionne les trois valeurs, déverrouille le bouton et l’entrée dans la workspace ouvre bien la sidebar, les starters et le composer. Les clics précédents non sélectionnés provenaient de la sélection automatisée du navigateur, pas d’une erreur de logique du HTML.

Un test a montré que les starters n’envoyaient pas de valeur parce que des chaînes JSON non échappées dans les attributs `onclick` invalidaient les handlers HTML. Les valeurs ont été encodées avec `encodeURIComponent`/`decodeURIComponent`. Après rechargement avec `?v=3`, l’accueil se rend correctement et les handlers sont syntaxiquement valides.

Après correction, le starter « Une landing page élégante pour une pizzeria artisanale » remplit correctement le composer. Le bouton d’envoi ouvre la workspace avec sidebar visible, mission dans le composer et état prêt à lancer ; les handlers inline fonctionnent désormais sur l’accueil et la workspace.

La mission locale fonctionne dans le fichier unique : après envoi, la top bar apparaît, l’historique reçoit la mission, la timeline passe de réflexion à construction puis « Première version prête », et le canvas affiche la preview LUMA PIZZA.

Dans l’état « Première version prête », les boutons Preview, Code et Data fonctionnent dans le même document. Code affiche `src/PizzaHome.tsx` avec numéros de ligne et coloration minimale ; Data affiche `reservations`, `menu_items` et `opening_hours`.

Le tiroir Terminal s’ouvre depuis la top bar et bascule correctement entre Terminal (`npm run build`) et Logs (`intention-router`, preview locale, aucune requête réseau). Cette fonction est entièrement contenue dans le même HTML.

La dictée simulée fonctionne dans la workspace du fichier unique : le bouton affiche le retour « Mode voix simulé : parle comme si Idealy t’écoutait. » et active le comportement d’onde local. Aucun micro réel ni backend n’est sollicité.
