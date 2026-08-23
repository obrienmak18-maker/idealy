# Référence de structure Bolt.new

Date d’observation : 23 août 2026.

## Constats vérifiés

La page officielle de Bolt.new présente une entrée de création centrée autour d’un prompt principal, avec un bouton d’ajout de contexte et un bouton de lancement. La documentation officielle indique que le workspace affiche par défaut le chat et la preview de l’application, puis permet de passer à la vue Code grâce à une icône dédiée. La vue Code sert à ouvrir, modifier, créer et supprimer les fichiers, tandis que Preview permet de revoir le rendu de l’application.

Pour Idealy, cela confirme que la zone de preview doit être traitée comme un espace de travail plein cadre et non comme une petite carte blanche flottante. La topbar doit être une barre de contrôle compacte séparée du contenu de l’application. Le contenu de l’iframe doit remplir toute la surface restante, sans padding excessif ni seconde barre de défilement côté hôte.

Le bouton `+` de l’accueil Bolt sert à ajouter du contexte au prompt. Idealy reprend ce principe avec un menu dédié comprenant l’importation de fichiers, les connecteurs et la bibliothèque, sans ouvrir directement un importateur au premier clic.

## Sources

1. https://bolt.new/ — Page officielle Bolt.new et composition de l’entrée de création.
2. https://support.bolt.new/building/using-bolt/code-view — Documentation officielle de la séparation Preview/Code et du rôle de la vue Code.

## Validation Idealy après refonte

La dernière build rend le logo de la sidebar à 40 px dans un bouton de 48 px avec `overflow: visible`, au lieu du précédent rendu compressé à 16 px dans un bouton de 32 px. Le canvas desktop est désormais sans `max-width`, sans padding extérieur et sans bordure arrondie : l’iframe remplit toute la zone droite sous la topbar. Les vues tablette et mobile conservent un cadre centré pour matérialiser le device.

La vérification sombre calcule `--background` à environ `lab(6.7% 0 0)` et `--sidebar` à environ `lab(4.84% 0 0)`, avec le halo bleu `#2563eb29` (environ 16 %). Le workspace devient anthracite sans réintroduire la surface beige et le prompt conserve son contour multicolore.

Le test de mission en mode sombre confirme que l’accueil reste entièrement anthracite avant l’ouverture du canvas. Après l’envoi, la topbar et le panneau de preview sont déclenchés par le flux de construction comme prévu.

La comparaison finale du workspace confirme : en sombre, le chat et la topbar utilisent une base anthracite et la preview occupe toute la colonne droite ; en clair, la surface hôte reste off-white avec transparence et halos subtils, tandis que l’application générée remplit toujours la zone sans cadre flottant desktop. La vue Preview conserve le badge de provenance en bas à droite de l’iframe.

La callback d’ouverture dans une nouvelle fenêtre réutilise désormais le même HTML de preview enrichi que l’iframe, y compris le watermark généré et la règle de masquage des scrollbars. Cette correction n’ajoute aucun hook conditionnel.

Dernière instance fraîche : `?preview-polish-final=3`. Le viewport du navigateur est de 1280 × 1100, le logo Idealy est mesuré à 40 × 40 px et l’instance répond HTTP 200. Le build de production compile avec succès, avec TypeScript terminé sans erreur.

Parcours frais vérifié : avant l’envoi, l’accueil occupe la surface sans canvas ; après submit, le workspace se met en place et la topbar affiche le nom du projet, Preview/Code/Database, les devices, refresh, actions externes, collaboration et Publish.

Le menu `+` a été ouvert sans déclencher directement l’importateur et affiche les trois entrées attendues : Importer des fichiers, Connecter une source et Ouvrir la bibliothèque. Escape le ferme correctement. Le mode mobile a été activé : la preview devient un cadre étroit centré dans la colonne, avec le contenu responsive visible, tandis que la topbar reste compacte.

Le mode tablette a également été activé. Mesures dans l’instance fraîche : panneau Artifact à 739 × 1100 px, iframe à 736 × 1098 px, sans padding externe visible ; `body.scrollHeight` et `documentElement.scrollHeight` de l’hôte sont égaux à leur hauteur cliente (1100), et le watermark `Created with Idealy` est présent dans le document de preview.

Le bouton d’ouverture externe a été déclenché sans erreur apparente et partage désormais le HTML enrichi de l’iframe. La poignée de split est présente avec le rôle `separator`, une hauteur de 1052 px, une largeur de 4 px, l’étiquette `Redimensionner le chat et la preview` et `tabIndex=0`, ce qui confirme son accessibilité pour le redimensionnement au clavier.

Une dernière capture fraîche en desktop sombre confirme visuellement le rendu final : sidebar et chat anthracite, topbar compacte, canvas continu sous la topbar, preview sans carte blanche ni barre flottante parasite, et watermark fixé dans l’iframe.
