# Recherche des patterns de builders modernes

Date : 23 août 2026.

## Constats applicables à Idealy

Les documentations officielles de Bolt, v0 et Replit convergent vers un workspace où la **Preview** est une surface de travail interactive, tandis que **Code** expose les fichiers et que les outils de diagnostic restent regroupés dans une zone dédiée plutôt que superposés à l’application générée.

Bolt décrit un passage explicite de Preview à Code depuis une icône du workspace. En Code, l’utilisateur peut ouvrir, modifier, créer et supprimer des fichiers, puis revenir en Preview pour voir le résultat. Bolt propose également un ciblage ou un verrouillage de fichiers afin de limiter le contexte de l’agent.

Replit documente une **location bar** au-dessus de la preview, avec navigation arrière/avant, domaine de l’application et champ de chemin URL. À droite se trouvent le choix de taille d’écran, les developer tools et l’ouverture dans un nouvel onglet. Les developer tools sont organisés en Console, Elements, Network, Resources et Settings ; la Console permet de filtrer et copier les logs, et les outils de preview supportent les tailles responsives.

La documentation v0 indique que la preview doit correspondre à une application réellement interactive et que la Console sert à observer les requêtes serveur et les réponses lorsque l’utilisateur navigue. Elle confirme aussi que Code présente tous les fichiers générés, notamment les routes API et les composants, tandis que les versions doivent préserver les itérations précédentes.

## Décisions d’implémentation

Pour Idealy, la prochaine itération doit ajouter une **barre de contexte de page** dans la topbar ou immédiatement sous celle-ci, affichant le chemin courant de la preview, par exemple `/`, `/settings` ou `/dashboard`. Cette barre doit rester compacte et ne pas devenir une seconde topbar lourde.

La vue Console doit évoluer d’un simple placeholder vers une zone d’outils basse et repliable, avec onglets `Console`, `Network` et `Build`, filtrage visuel des niveaux, bouton d’effacement et état vide clair. Elle ne doit pas recouvrir la preview principale.

La vue Code doit afficher une arborescence de fichiers à gauche et un éditeur/aperçu du contenu à droite. La vue Database doit présenter une liste de tables et un état de connexion ou de configuration, sans prétendre à une connexion réelle en mode démo.

Le split doit utiliser toute la largeur libérée : lorsque le chat est réduit, le panneau preview doit s’étendre jusqu’au bord disponible, sans espace blanc résiduel. Le watermark doit rester attaché au document de preview avec une position fixe, comme dans la version actuelle.

## Validation finale de l’itération

Le build de production a compilé après la correction du chemin interne de preview. L’instance finale a été redémarrée sur le port 3002 et répond HTTP 200. Sur une URL fraîche `?workspace-iteration=3`, l’accueil reste sans canvas avant soumission ; après une mission de démo et la fin du flux, le canvas apparaît avec le chemin `Home/`, la mention `Live preview`, le watermark `Created with Idealy` et la preview générée.

Le sélecteur de page s’ouvre correctement avec `Home /`, `Settings /settings` et `Dashboard /dashboard`. La sélection de `Settings` met à jour le chemin visible en haut du canvas et dans la barre interne `/settings settings`, sans modifier la géométrie du split. Le document srcDoc reçoit aussi l’attribut de chemin Idealy prévu pour les futures navigations internes.

La vue Code affiche une arborescence `Files` avec `page.tsx`, `package.json`, `app/layout.tsx` et `api/chat/route.ts`, suivie du contenu du code généré dans l’éditeur. La vue Database affiche `users`, `projects` et `documents`, un statut `Demo mode` et un message explicitant que la connexion réelle viendra avec le backend.

Le menu More actions expose bien `Download ZIP`, `Show Console` et `Rename project`. Show Console ouvre une surface de travail complète, avec l’en-tête Developer tools, le statut Ready, les onglets Console/Network/Build et le bouton Clear. Network affiche les requêtes de démonstration `/api/chat` et `srcdoc://preview`, tandis que Build affiche les étapes Preview bundle prepared, Responsive viewport mounted et Build ready.

Après retour à Preview, la poignée de split a été focalisée puis une vraie touche `ArrowLeft` a réduit la largeur du chat. La preview s’est étendue immédiatement et a conservé son cadre plein espace, sans laisser de colonne blanche résiduelle. En mode sombre, le panneau étendu conserve un fond anthracite ; en mode clair, la surface hôte reste off-white avec halos premium.

La dernière capture sombre fraîche confirme visuellement : sidebar et chat anthracite, topbar rapprochée, canvas continu sous la topbar, preview générée occupant la zone libérée et watermark fixé en bas à droite de l’iframe.

La vérification finale du build produit confirme : compilation Next.js réussie, TypeScript terminé sans erreur, génération des pages réussie. Les avertissements de migration indiquent simplement que `POSTGRES_URL` n’est pas défini dans le mode démo actuel.

## Credentials backend à préparer plus tard

Les liens officiels ont été regroupés dans `docs/backend-credentials-map.md`. La clé AI Gateway se crée depuis la page API Keys Vercel ; la chaîne Postgres et les clés Supabase se récupèrent depuis les tableaux de bord Connect/API Keys ; Stripe fournit ses clés et secrets de webhook depuis les pages Developers. Aucun secret ne doit être envoyé dans le chat, placé dans Git ou exposé au navigateur.

## Références

[1]: https://support.bolt.new/building/using-bolt/code-view — Bolt, Use Code View.
[2]: https://support.bolt.new/troubleshooting/preview-issues — Bolt, Preview issues.
[3]: https://vercel.com/academy/vercel-foundations/v0-way — Vercel Academy, The v0 Way.
[4]: https://docs.replit.com/features/editor/preview — Replit, Preview.
[5]: https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys — Vercel AI Gateway, API Keys.
[6]: https://supabase.com/docs/guides/getting-started/api-keys — Supabase, Understanding API keys.
[7]: https://supabase.com/docs/guides/database/connecting-to-postgres — Supabase, Connect to your database.


## Validation de l’itération preview-clean-build=2

Le build de production a compilé avec succès après la suppression de l’en-tête interne gris, du badge `Live preview` et de l’ancien dashboard de démonstration. La mission fraîche affiche d’abord l’écran `Idealy prépare votre application` avec le logo animé et le libellé `Compilation en cours`, puis remplace automatiquement cet écran par la page générée une fois le stream terminé.

Le plein écran est piloté par la topbar globale. La topbar reste visible avec une hauteur mesurée de 48 px, tandis que l’Artifact démarre à y=48. En mode étendu, l’Artifact mesurait 1222 px de largeur et 1100 px de hauteur ; la colonne de chat et le composer avaient `visibility:hidden` et `pointer-events:none`. La page hôte restait sans débordement (`scrollHeight` égal à `innerHeight`).

Le rendu final ne contient plus le faux header de l’application générée, le bouton `Preview live`, le CTA `Start building` ni les cartes latérales. Il conserve une page de résultat pleine surface avec le watermark fixe `Created with Idealy`. Le divider du split est maintenant une zone de saisie de 12 px avec une forme irrégulière, une poignée gradient et un état focus/resize accessible au clavier.

Le mode démo reste volontairement limité : l’écran de compilation et la preview sont des représentations locales, pas encore une compilation WebContainer réelle. Le backend, les secrets et les modèles réels restent désactivés jusqu’à l’audit de raccordement.


## Contrôles fullscreen et mobile — preview-clean-build=2

Le bouton `Expand preview` devient `Exit fullscreen`. En mode étendu, le canvas commence sous la topbar globale, celle-ci reste interactive, la colonne de chat et le composer sont masqués visuellement et désactivés, et l’overflow de la page hôte reste nul. Après sortie du plein écran, le split normal revient sans perte de preview. Le mode mobile conserve un cadre étroit centré dans la surface disponible et la page générée reste lisible.


## Vérification sombre de l’itération preview-clean-build=2

En mode sombre temporaire, les tokens calculés sont `--background: lab(6.69783% 0 0)` et `--sidebar: lab(4.8411% 0 0)`. La topbar reste lisible, la preview conserve ses halos bleu/violet et le canvas généré reste continu sans surface beige ni ancien panneau interne.


## Capture claire finale

La démo a été replacée en mode clair avec `--background: lab(95.9296% -1.30308 -4.28033)` et `--sidebar: lab(93.6095% -1.30218 -4.27984)`. La surface hôte reste claire et haloée ; le document généré conserve volontairement son propre rendu applicatif sombre, sans réintroduire de carte blanche, d’en-tête interne ou de badge `Live preview`.
