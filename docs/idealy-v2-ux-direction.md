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

## Retour utilisateur et recherche complémentaire — août 2026

### Corrections obligatoires

Avant toute mission, l’écran doit rester un état vide respirant : pas de top bar de workspace, pas de Preview/Code/Data/Console, pas de titre de conversation ni de split. Ces éléments doivent apparaître seulement après le premier message envoyé ou l’ouverture d’une conversation existante.

Après le début d’une conversation, la top bar doit être moins serrée. Le titre court de la conversation reste à gauche, tandis que les contrôles de preview et de workspace restent séparés et regroupés dans leur propre zone. Les libellés inutiles `FR`, `Site` et les actions qui ne concernent pas Idealy doivent disparaître. `Ouvrir dans un nouvel onglet` doit être déplacé vers les actions du workspace ; le menu voisin du titre doit rester réservé aux actions de conversation comme renommer, favori et suppression.

La sidebar invisible au repos est validée et doit être conservée.

### Constat officiel v0

La documentation v0 décrit Design mode comme une couche visuelle au-dessus de l’application en cours dans la vue Preview. Il permet de sélectionner un élément, de modifier typographie, couleur, fond, layout, bordure, apparence, ombre et contenu, puis d’appliquer les changements au code. Le mode est activé depuis la barre du prompt, et les modifications restent en attente jusqu’à `Apply`. Les commandes Inspect, désélection, annuler, refaire, reset et comparaison avant/après font partie du modèle documenté.

La documentation v0 décrit aussi un agent capable de recherche web, usage du navigateur, commandes terminal et correction automatique d’erreurs. La correction est alimentée par les logs d’erreur et couvre notamment dépendances manquantes, syntaxe, erreurs runtime et imports/exports. Pour Idealy, cela confirme qu’un panneau de réflexion utile doit montrer des états réels — recherche, fichiers, build, erreurs, correction — et non une animation décorative prétendant avoir exécuté des opérations inexistantes.


### Fonctions IDE confirmées par VS Code

La documentation officielle VS Code structure un workspace autour d’un éditeur principal, d’une sidebar primaire pour l’explorateur et les vues, d’une sidebar secondaire pour le chat, d’une barre d’activité, d’une barre de statut et d’un panneau inférieur pour la sortie, les erreurs, les avertissements et le terminal. Elle met aussi en avant le split d’éditeur, les groupes d’éditeurs, la palette de commandes, les onglets, l’outline, la timeline et l’historique local.

La documentation officielle du contrôle de source confirme les fonctions de base suivantes : revoir les changements, stage et commit, synchroniser avec les remotes, résoudre les conflits, gérer branches/worktrees/stash, voir l’historique et collaborer avec GitHub. Pour Idealy, ces fonctions doivent apparaître comme une surface de confiance dans l’application générée, pas comme une deuxième barre permanente qui encombre le premier écran.


## Vérification de la passe palette et layout conditionnel

L’état vide charge maintenant sans top bar, sans Preview/Code/Data/Console et sans split conversation/preview. Les suggestions et le compositeur restent seuls au centre.

Après envoi, la top bar apparaît avec les outils Preview, Code, Data, Console et l’action `Ouvrir dans un nouvel onglet` regroupée avec les outils de preview. Les libellés `Site` et `FR` ne sont plus visibles ; `Publier` et `Équipe` les remplacent comme actions Idealy explicites.

La réflexion apparaît dans le flux sans carte de message complète : le statut reste lisible, mais l’espace autour est plus ouvert. Le fil de conversation garde son conteneur de scroll clavier avec scrollbar masquée ; le composer reste ancré en bas.


Le test de défilement global ne déplace pas la page : le navigateur a dû cibler un conteneur interne de conversation. La preview reste fixe et aucune barre de défilement n’est visible dans l’interface. Cette vérification correspond à la demande de laisser le clavier et le fil de messages gérer le défilement, sans ajouter de lignes ou rails visibles.


## Vérification visuelle de la sidebar et du parcours

La preview V2 affiche désormais la sidebar dans l’état vide, tandis que la top bar du workspace est absente. Cela correspond à la correction demandée.

La route `/onboarding` publique reste la landing page marketing ; le parcours `OnboardingPage` est déclenché par l’état d’authentification du store après connexion. Le test complet doit donc passer par un état local `stage: choosing-way` ou `creating-profile`, sans modifier Supabase ni l’authentification réelle.


Le test local de l’état `choosing-way` ouvre correctement `OnboardingPage` à la racine. L’écran affiche `Ton espace prend forme`, la progression `1 / 3`, le battement visuel du cœur, les quatre voies et le bouton Continuer désactivé tant qu’aucune voie n’est choisie. Aucun backend n’a été appelé pour ce test.


Le parcours local a été parcouru jusqu’à l’étape `3 / 3` : sélection Ninja, saisie du nom `Amina`, puis écran avec les trois questions demandées. L’interface affiche bien les choix de taille d’équipe, rôle et source de découverte, avec le bouton final désactivé tant que les trois réponses ne sont pas sélectionnées.


Les trois réponses ont été sélectionnées avec leurs états actifs : `Moi seul`, `Fondateur ou dirigeant` et `Une recommandation`. Le bouton final s’est activé. Après validation, le store local est passé à `ready` et l’application a ouvert le quartier général existant avec `Amina`, `Voie du Ninja`, `Chakra 100%` et les premières missions. Le flux réel de l’interface est donc préservé après l’onboarding enrichi.
