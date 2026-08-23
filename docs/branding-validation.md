# Validation branding Idealy

Date de vérification : 22 août 2026.

Le logo SVG complet est servi correctement par la démo à `/idealy-logo.svg`. Il combine un symbole en forme d’étoile à quatre pointes, deux orbites colorées et le wordmark Idealy. Le rendu observé est net et scalable, avec un dégradé cyan, pétrole, violet et orange.

Le symbole est intégré dans le composant `components/branding/idealy-logo.tsx`, dans l’en-tête de la sidebar et dans l’écran d’authentification. L’animation Framer Motion n’est pas utilisée pour ce symbole : l’animation légère des orbites et du cœur est réalisée en CSS avec une règle `prefers-reduced-motion`.

Le badge `Created with Idealy` est injecté côté serveur dans l’artefact de démonstration par `lib/branding/free-badge.ts`. Il est visible dans l’iframe du canvas, en bas à droite, et ne dépend pas d’un élément React du workspace. Cette approche devra être réutilisée au point de publication pour garantir que le badge du plan gratuit ne soit pas supprimé uniquement depuis le client.

La build Next.js passe après l’intégration du composant, des fichiers SVG, de l’injecteur de badge et des modifications d’authentification démo. L’authentification réelle reste volontairement en pause tant que les variables locales PostgreSQL et Gateway ne sont pas configurées.

Le test navigateur confirme que le composant intégré possède les classes `idealy-mark idealy-mark--animated`, que l’orbite est trouvée et que l’animation calculée est `idealy-orbit-one` avec une durée de `8s`. Les deux autres animations sont définies pour l’orbite secondaire et le cœur, avec arrêt prévu sous `prefers-reduced-motion`.

Le badge SVG indépendant est servi avec `image/svg+xml` et son rendu observé contient le libellé exact `Created with Idealy`.

Après nettoyage des anciennes instances Next.js, une seule démo a été relancée sur le port 3002. L’URL publique cache-bustée charge l’accueil en HTTP 200, puis le parcours suggestion → workspace affiche à nouveau Preview, Code, Database, les contrôles d’appareil et le badge `Created with Idealy` dans l’iframe. Les assets SVG répondent également en HTTP 200 avec le type MIME `image/svg+xml`.

Le test UX du 23 août confirme que l’accueil n’affiche pas le canvas avant l’envoi d’une mission. Le bouton `+` ouvre un menu avec `Importer des fichiers`, `Connecter une source` et `Ouvrir la bibliothèque`. Après envoi et réception du code, le workspace affiche la topbar, le split chat/canvas, l’application dans l’iframe et le badge `Created with Idealy` fixé en bas à droite de la preview.

Mesures navigateur : le séparateur a une largeur de 4 px, une hauteur de 1056 px et une valeur initiale de 40 %. Le conteneur Artifact est en `overflow: hidden`, le conteneur de preview est également en `overflow: hidden`, et l’iframe occupe toute la hauteur disponible. La page hôte ne présente pas de débordement vertical (`scrollHeight === clientHeight`). Le badge interne de l’iframe a bien `position: fixed`, `right: 18px` et `bottom: 18px`, ce qui lui permet de rester visible pendant le défilement de l’application générée.

Le séparateur a également été testé au clavier. Après focalisation, une pression sur `ArrowRight` modifie sa valeur ARIA de 40 % à 44 % et la largeur calculée du chat passe à environ 489 px, tandis que le canvas et son watermark restent visibles.
