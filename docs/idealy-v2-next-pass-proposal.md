# Idealy V2 — prochaine passe proposée

## Décision immédiate

La top bar ne doit pas exister dans l’état vide. Avant le premier message, Idealy doit montrer une page calme avec seulement le compositeur, les suggestions et l’identité visuelle minimale. Après l’envoi d’une mission, la top bar apparaît avec le titre court, la preview et les commandes de workspace.

La barre doit être desserrée en trois zones : conversation à gauche, outils de workspace au centre, actions du projet à droite. Les libellés `FR` et `Site` sont retirés. `Ouvrir dans un nouvel onglet` rejoint les actions du workspace ; le menu près du titre conserve renommer, favori, dupliquer, réglages, transfert et suppression. `Télécharger en ZIP` peut rester près du nom ou rejoindre le menu d’actions du workspace, mais il ne doit pas encombrer l’écran vide.

## Ce qui est réellement installé

Le monorepo contient React, Tailwind, Framer Motion, Lucide, Radix, Zustand, React Resizable Panels, Monaco, xterm, WebContainer, l’AI SDK, Supabase JS, GSAP, Lottie, Three/R3F, Yjs et le diff viewer. La page V2 utilise directement **Framer Motion** et **Lucide**. Les autres bibliothèques existent pour les surfaces Workspace et les futures fonctions, mais elles ne sont pas toutes intégrées visuellement à la coque V2.

Les « sept bibliothèques » ne sont pas nommées dans le prompt fourni. Il serait donc faux de dire qu’un ensemble précis de sept bibliothèques a été mélangé. La bonne décision est de ne pas ajouter des dépendances uniquement pour donner une impression de puissance : chaque bibliothèque doit correspondre à une interaction réelle.

## Fonctions IDE à prioriser

| Priorité | Fonction | Valeur pour Idealy |
|---|---|---|
| 1 | Preview principale stable | Voir immédiatement l’application créée |
| 2 | Design mode sélectif | Cliquer un élément dans la preview, modifier style et contenu, comparer avant/après, puis appliquer |
| 3 | Code secondaire Monaco | Lire un fichier, naviguer entre fichiers et voir les changements sans voler la place à la preview |
| 4 | Console Logs/Terminal | Voir les commandes réellement exécutées, les erreurs et les corrections |
| 5 | Historique et diff | Comparer les versions, annuler, restaurer et comprendre ce qui a changé |
| 6 | Recherche / palette de commandes | Retrouver une action sans multiplier les boutons |
| 7 | Données / connecteurs | Montrer les sources du projet, puis permettre leur configuration dans une phase dédiée |
| 8 | Publication | Ajouter Netlify ou une autre cible après la validation de la coque et de la pipeline réelle |

## Ce que je propose comme différence Idealy

La fonction propriétaire devrait être une **Mission Trace vérifiable**. Au lieu d’afficher une fausse réflexion, Idealy montrerait une ligne courte par événement réel : prompt compris, fichiers concernés, commande exécutée, résultat du build, erreur trouvée, correction appliquée, preview mise à jour. Chaque ligne pourrait s’ouvrir pour montrer la preuve utile, sans exposer une chaîne de pensée privée.

Le bouton principal de correction deviendrait **« Fixer avec Idealy »**. Il transmettrait uniquement le fichier concerné et le message d’erreur au moteur de correction, puis afficherait le diff avant de demander l’accord. Ce serait plus utile qu’une animation de pensée et cohérent avec le modèle d’agent documenté par v0.

## Direction visuelle

Je recommande une palette sombre graphite inspirée de la lisibilité et de la vivacité des outils Canva, sans prétendre copier sa charte exacte : fond presque noir, surfaces légèrement bleutées, texte ivoire, accents violet-corail, et une couleur vive seulement pour l’action active. Les gradients doivent apparaître sur les états importants — lancement, correction, version prête — et non derrière toute la page.

## Hors périmètre de cette passe

Pas d’authentification, pas de Supabase réel, pas de Stripe, pas de connecteurs réels, pas de déploiement, pas d’édition complète du code et pas de prétendue exécution IA. Ces fonctions seront ajoutées quand leurs événements réels pourront alimenter la Mission Trace.

## Références

[1] [v0 — Design mode](https://v0.app/docs/design-mode)

[2] [v0 — Agentic features](https://v0.app/docs/agentic-features)

[3] [VS Code — User interface](https://code.visualstudio.com/docs/editing/userinterface)

[4] [VS Code — Source control](https://code.visualstudio.com/docs/sourcecontrol/overview)

[5] [Canva — Color tools](https://www.canva.com/colors/)
