# Idealy V2 — spécification de la top bar et du layout

## Objectif

La barre supérieure doit rester fixe, indépendante de la preview et visible même lorsque la conversation est réduite. Elle reprend la composition de la référence v0, adaptée à Idealy sans afficher le logo en permanence dans l’espace de travail.

## Ordre visuel desktop

De gauche à droite : contrôle discret pour afficher ou masquer la sidebar, étoile/favori, titre court de la conversation avec menu déroulant, commandes de workspace (Design, Preview, Code, Data), navigation de la preview, indicateur d’appareil et d’environnement, version `Latest`, menu d’actions, partage, état du site et action de publication future.

Les vues `Preview`, `Code`, `Data` et `Console` vivent dans cette top bar ou dans ses menus associés. Elles ne doivent pas être répétées comme une seconde barre collée en haut du WebContainer. La preview garde ainsi toute la hauteur disponible.

## Sidebar

La sidebar est masquée par défaut sur desktop. Seul le contrôle d’ouverture reste visible dans la top bar. Lorsqu’elle est ouverte, elle recouvre temporairement l’espace de travail ; lorsqu’elle est refermée, aucun logo ni rail permanent ne doit rester visible. Sur mobile, elle s’ouvre comme un panneau avec overlay puis se ferme au clic extérieur, avec `Échap` comme raccourci.

## Conversation

Le titre de conversation est court, lisible et persistant dans la top bar. Le menu `…` voisin contient les futures actions : renommer, ajouter aux favoris, dupliquer, ouvrir dans un nouvel onglet, télécharger en ZIP, accéder aux réglages, transférer et supprimer. Dans cette passe, les actions non branchées doivent seulement afficher un état explicite et ne doivent pas toucher au backend.

Seule la colonne de conversation est défilable. La top bar, la zone de preview et la structure générale de la page restent fixes. Le composer reste ancré en bas de la colonne de chat.

## Workspace

La preview est la surface principale et conserve sa hauteur. Les contrôles de navigation, de vue et de console n’occupent pas d’espace vertical permanent dans la preview. `Console` ouvre un panneau compact associé avec deux vues internes `Logs` et `Terminal`; ce panneau peut être fermé.

## Hors périmètre immédiat

Cette passe ne branche pas l’authentification, Supabase, Stripe, les connecteurs réels, le téléchargement ZIP réel, le déploiement, la génération IA réelle ni l’édition low-code Design. Elle prépare uniquement les emplacements et les interactions visuelles sans prétendre que ces fonctions sont déjà actives.

## Vérification intermédiaire

La preview top bar charge avec la sidebar réellement invisible par défaut : aucun logo ni rail permanent ne reste dans l’espace de travail. Le contrôle d’ouverture reste dans la ligne supérieure.

Le titre `Nouvelle conversation` est visible dans la top bar avec un menu adjacent. Le menu affiche les actions demandées : renommer, favoris, dupliquer, ouverture dans un nouvel onglet, téléchargement ZIP, réglages, transfert et suppression. Les actions non branchées affichent un état explicite au lieu de toucher au backend.

La même ligne expose maintenant Design, Preview, Code, Data, Console, navigation de preview, `Latest`, actions, partage, Site et Merge PR. Les contrôles Preview/Code/Data ne sont plus placés dans la surface WebContainer.

La Console s’ouvre depuis la top bar dans un panneau indépendant positionné sous celle-ci. Elle possède deux vues internes, `Logs` et `Terminal`, ainsi que des contrôles copier, effacer et fermer. Le panneau ne réduit pas la zone centrale et ne place plus le terminal en bas du WebContainer.

## Vérification en mission

Après envoi d’une mission, la top bar reste fixe et continue d’afficher le titre court, les commandes Preview/Code/Data/Console et les actions de projet. La conversation occupe la colonne gauche avec son propre défilement, tandis que la preview occupe une colonne droite stable et conserve toute sa hauteur. Aucun rail de logo ni panneau latéral permanent n’est visible.

La mission prête confirme que la preview garde une grande hauteur stable à droite tandis que le chat occupe une colonne indépendante à gauche. La sidebar peut être affichée avec le bouton de la top bar ; elle apparaît comme un panneau temporaire et la fermeture ramènera l’espace sans rail permanent.
