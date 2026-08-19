# Recherche de référence v0/Vercel — 17 août 2026

## Sources consultées

1. [What is v0?](https://v0.app/docs)
2. [Agentic features](https://v0.app/docs/agentic-features)

## Constats vérifiés

La documentation officielle présente v0 comme un agent qui transforme un prompt en vrai code et applications full-stack, avec une preview en temps réel et des indicateurs visuels de progression. La documentation cite explicitement les « visual progress indicators » et un retour riche pour les actions de l’agent.

La page des fonctions agentiques confirme que l’interface doit rendre visibles les actions pendant le travail : indicateurs de progression, captures d’écran lors de l’usage du navigateur, cartes d’exécution pour les commandes terminal et outils externes, et contrôle permettant d’arrêter ou de poursuivre l’agent.

La documentation indique que v0 peut exécuter des commandes dans un sandbox pour tester, inspecter le dépôt et corriger automatiquement les erreurs. Les intégrations Marketplace sont accessibles depuis un panneau Connect dans la barre latérale du chat. Ces éléments expliquent pourquoi la référence présente une conversation centrale accompagnée d’une grande zone de résultat et de contrôles secondaires plutôt qu’une simple liste d’onglets.

## Implications pour Idealy

La reproduction fidèle doit prévoir : une zone de chat avec compositeur bas, une grande surface d’aperçu à droite, une barre supérieure compacte, des actions secondaires explicites, une sortie de progression visible pendant l’agent, et un accès distinct au terminal et au code. La progression ne doit pas être un faux message conversationnel ; elle doit ressembler à un état d’action de l’agent.

La reproduction ne doit pas afficher le mot « Atelier » dans la zone de preview, conformément à la décision de l’utilisateur. Aucun backend, connecteur réel ou authentification ne doit être modifié pendant cette passe de reproduction visuelle.


## Code et terminal

La page Code editing indique que le Code est un onglet situé à côté de la preview, et qu’il donne accès à un vrai éditeur : coloration syntaxique, recherche globale, vues diff, édition scindée, explorateur de fichiers et actions de barre d’outils. La logique à reproduire n’est donc pas seulement « afficher du code » : le code est une vue secondaire de l’application, reliée à la preview, avec des actions contextuelles.

La page Terminal commands confirme que le terminal sert à tester, inspecter et déboguer le projet dans le même sandbox. Elle décrit trois modes de permission — Ask, Auto et Full — et précise que le bouton Tools de la barre du compositeur ouvre le menu correspondant. Pour Idealy, le terminal doit donc rester un outil accessible depuis la barre de travail, tandis que ses résultats apparaissent comme des cartes d’action ou une surface secondaire, sans prendre la place de l’aperçu par défaut.


## Design mode et page publique

La page Design mode confirme que v0 superpose ses outils directement à la preview en cours. Le bouton Design se trouve dans la barre du compositeur. L’utilisateur peut sélectionner un élément dans l’aperçu, voir des poignées et un panneau de réglages, modifier visuellement puis appliquer les changements au code. `Escape` désélectionne ; un bouton Inspect permet de basculer entre sélection et interaction normale. Les modifications restent temporaires jusqu’à Apply, avec undo, redo, reset et comparaison avant/après.

Sur la page publique de v0, le compositeur est central et comprend une zone de saisie, un sélecteur de modèle, des contrôles secondaires et des suggestions de démarrage. Les suggestions sont des actions concrètes — Contact Form, Image Editor, Mini Game, Finance Calculator — plutôt qu’un bouton abstrait. La page expose aussi des catégories de templates sous le compositeur. Cela confirme que les commandes rapides d’Idealy doivent devenir des suggestions compréhensibles et directement utilisables.

## Conclusion de l’étape de recherche

La référence attendue n’est pas un simple chat avec une preview accolée. C’est un chat de construction avec : un compositeur riche, des outils secondaires organisés, une preview dominante, un code editor adjacent, un terminal accessible, une progression agent visible et, plus tard, une capacité d’édition visuelle au-dessus de la preview. La prochaine implémentation doit reproduire cette structure et non créer une nouvelle terminologie visible.

## Chat v0 partagé : inventaire réel observé

Le chat partagé `UI/UX analysis` expose réellement les contrôles suivants : titre du chat, favori, barre de versions `Latest`, onglets de l’espace de travail `Preview`, `Code` et `Data`, barre d’URL de la preview, boutons de navigation de preview, puis fil de messages dans lequel les états d’agent sont des éléments repliables.

Les états visibles dans ce fil sont nommés par l’action et le résultat : `Thought for 3s`, `Thème planifié`, `Explore • 3 Files • 1 Search`, `Tokens réparés`, `Couleurs claires réparées`, `Mode clair ajouté`, `Sélecteur thème ajouté`, `Thème branché visuellement`, `Bouton thème ajouté`, `Thème validé`, `Thèmes testés`. Ces libellés ne sont pas une liste décorative permanente : ils représentent des étapes d’agent et peuvent être développés pour voir les détails.

La zone de travail utilise des onglets identifiables techniquement comme `vm-tab-preview`, `vm-tab-code` et `vm-tab-data`. Le fil dispose également d’une séparation Chat / Preview. La preview semble donc être la sortie principale, avec le code et les données comme vues de travail secondaires. Cette structure correspond précisément à la demande de reproduire la référence avant de décider quoi enlever.

## Première vérification Idealy V2

La preview V2 reconstruite charge correctement sans afficher « Canvas » ni « Atelier » dans la zone visible. La sidebar affiche maintenant le symbole Idealy seul, et le header propose « Nouvelle idée », connexion et inscription comme la référence publique.

L’ancien bouton « Commandes rapides » est devenu « Améliorer l’idée ». Son menu contient quatre actions lisibles : « Préciser le résultat », « Structurer les écrans », « Définir le style » et « Réduire le périmètre ». Le comportement visuel est plus proche des suggestions v0 que d’un contrôle technique abstrait.

Le clic extérieur et la touche Échap sont branchés au niveau document pour fermer les menus contextuels ; leur test complet sera réalisé après lancement d’une mission.

## Vérification en mission

Après envoi de la mission pizzeria, la sidebar se replie automatiquement en rail, la conversation reste à gauche et l’espace de résultat s’ouvre à droite. La surface droite affiche maintenant une barre de titre avec la mission et `Latest`, des actions Masquer / Partager / Ouvrir / Plus, puis les onglets `Preview`, `Code` et `Data`, avec les contrôles précédent / suivant / actualiser et l’indicateur `preview.local`.

La timeline est devenue un seul bloc repliable intitulé « Construction en cours », avec un détail court et une flèche. Elle n’impose plus une longue liste verticale. Le terminal apparaît comme contrôle dans la barre basse, conformément à la hiérarchie observée dans v0.

La mission prête affiche bien la preview Forno dans une grande surface claire. L’onglet Code montre `src/App.tsx` dans une surface sombre avec statut synchronisé. L’onglet Data montre une surface « Sources du projet » avec Supabase et un autre service en attente de connexion. Les trois vues sont réellement cliquables et ne sont plus des onglets décoratifs.

Le Terminal s’ouvre bien depuis la barre basse dans un tiroir superposé, avec la sortie de build visible sans remplacer la surface de travail. La trace de mission se déplie sur clic et affiche trois étapes — intention, structure, preview — puis peut être repliée ; le comportement correspond à l’idée des cartes d’actions v0.

Le menu d’ajout se ferme bien en un seul clic extérieur : après ouverture de la Paperclip, un clic sur l’onglet Data a fermé le menu et a conservé l’action sur l’onglet. Le comportement demandé est donc validé. Le tiroir Terminal reste ouvert indépendamment du menu, ce qui confirme la séparation des contextes.
