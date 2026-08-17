# Direction UX V2 — espace de travail conversationnel

## Décision générale

La coque V2 doit ressembler à un studio de création calme, pas à un tableau de contrôle rempli de boutons. La conversation reste la porte d’entrée. Lorsqu’une mission existe, un espace de travail apparaît à droite et présente en priorité le résultat généré. Le code, les données et le terminal deviennent des outils secondaires accessibles depuis une barre compacte.

Le mot « Canvas » est abandonné dans l’interface. Il décrit une notion technique, mais ne dit pas à l’utilisateur ce qu’il peut faire. Le libellé proposé est « Atelier » pour la zone de création et « Aperçu » pour le résultat visible. Le nom « Espace de travail » peut rester dans l’accessibilité ou la documentation.

## 1. Compositeur

Le bouton `+` ouvre une petite palette d’ajout. La palette se ferme dans les situations suivantes : clic en dehors de sa zone, touche Échap, sélection d’une option et envoi d’un message. L’utilisateur ne doit jamais être obligé de recliquer sur `+` pour fermer la palette. Le comportement doit être piloté par un `ref` et un écouteur `pointerdown` document, avec garde contre les clics à l’intérieur.

Le bouton « Commandes rapides » est remplacé par une aide compréhensible, intitulée « Améliorer l’idée » ou « Aide au prompt », avec une icône de baguette ou d’étincelle. Il ouvre des actions explicites : préciser le résultat attendu, proposer une structure de pages, définir le style visuel, choisir une stack simple et réduire une idée trop large. Une action ne modifie jamais le prompt silencieusement : elle ajoute une proposition visible ou demande une confirmation courte.

## 2. Organisation de l’Atelier

La partie droite ne doit plus être une carte intitulée Canvas avec trois onglets équivalents. Elle devient une surface de travail dominée par l’aperçu, proche de la référence v0 : barre supérieure fine, titre de mission, état de construction, commandes compactes et grande surface centrale.

La hiérarchie proposée est la suivante :

| Niveau | Fonction | Présentation |
|---|---|---|
| Principal | Aperçu de l’application générée | Surface centrale, visible par défaut |
| Secondaire | Code | Bouton compact ouvrant une vue latérale ou remplaçant temporairement l’aperçu |
| Secondaire | Données / Connecteurs | Bouton compact pour le futur registre de services |
| Secondaire | Terminal | Tiroir inférieur, pas une grande carte permanente |
| Futur | Partager / Publier | Actions placées en haut à droite, désactivées tant que non branchées |

Le terminal ne doit pas être un onglet qui concurrence l’aperçu. Il s’ouvre comme un tiroir bas lorsque l’utilisateur le demande. Le code peut être consulté dans un panneau latéral. Ainsi, l’utilisateur voit d’abord ce qu’il construit et non les outils internes.

## 3. Fil de mission et réflexion

La phrase « Idealy travaille avec toi » est remplacée par une activité naturelle liée à la mission. Pendant la construction, l’interface affiche par exemple « Je prépare la première version… » ou « Je mets ton idée en structure… ». La liste actuelle des agents est transformée en une trace discrète : trois étapes courtes, une progression fine et un bouton « Voir les détails » facultatif.

À la fin, la trace se replie en une ligne : « Première version prête ». Les noms internes comme Orchestrateur ou Bâtisseur ne doivent pas occuper l’espace principal ; ils peuvent apparaître dans les détails si cela aide à comprendre ce qui se passe.

## 4. Sidebar

La sidebar devient une navigation de produit, pas seulement un historique. Elle pourra contenir des sections repliables : Historique, Projets, Connecteurs et Plugins. La première passe peut conserver l’historique, mais la structure doit prévoir ces sections sans dupliquer « Nouvelle mission ».

Le bouton « Nouvelle mission » près de la sidebar est supprimé de l’expérience desktop. Le `+` du compositeur devient le point naturel pour ajouter un fichier, un service, un plugin ou démarrer une nouvelle idée. Quand la sidebar est repliée, seul le logo reste visible et il sert de bouton pour la rouvrir et de lien vers l’accueil. Le bouton de repli n’a donc pas besoin de rester visible dans le rail réduit.

## 5. Voies et identité

Les quatre voies restent des identités narratives et ne deviennent pas des tarifs. Pour éviter de surcharger le bas de l’écran, la voie active est présentée comme un petit sélecteur discret dans le compositeur ou la barre de mission. Elle reste accessible pendant le codage, mais ne doit pas prendre autant de place qu’un menu principal.

## 6. Animation et retenue visuelle

La lumière de souris et les particules restent discrètes au repos. Les effets plus expressifs, notamment une silhouette composée de particules correspondant à la voie choisie, doivent être déclenchés par un événement rare — choix initial d’une voie ou lancement d’une mission — et non en boucle permanente. Ils doivent respecter `prefers-reduced-motion` et disparaître avant de gêner la lecture.

## Ordre d’implémentation recommandé

1. Corriger la fermeture extérieure du menu `+` et la touche Échap.
2. Transformer « Commandes rapides » en aide au prompt réellement compréhensible.
3. Renommer Canvas en Atelier et reconstruire la hiérarchie autour de l’aperçu.
4. Convertir Code en panneau secondaire et Terminal en tiroir inférieur.
5. Simplifier la réflexion en trace progressive repliable.
6. Retirer la duplication « Nouvelle mission » de la sidebar.
7. Ajouter ensuite les animations de voie, uniquement après validation de la structure.

Cette direction ne touche ni à l’authentification, ni au backend, ni aux connecteurs réels. Elle vise d’abord une expérience visuelle crédible et cohérente avec la référence fournie.
