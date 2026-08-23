# Références de conception du workspace v0

## Constats vérifiés

Les pages publiques de v0 décrivent un flux centré sur un chat qui pilote la génération d’une application réelle, avec une preview live utilisée pour vérifier le résultat. Le workspace sépare explicitement la conversation à gauche et l’application en cours d’exécution à droite. La barre de la preview permet de basculer entre **Preview** et **Code**, de changer de page, de tester différentes tailles d’écran, de rafraîchir, d’ouvrir dans une nouvelle fenêtre et d’ouvrir la console.

Le mode Design de v0 s’ouvre depuis un onglet de la barre de la preview. Il fonctionne à côté de l’application en cours d’exécution et fournit la sélection d’éléments, les couches, les contrôles visuels et un panneau d’édition. Les réglages sont appliqués en direct, puis deviennent une nouvelle version lorsque l’utilisateur clique sur Apply. Le mode Design n’est pas disponible sur mobile.

Le flux de travail recommandé est progressif : envoyer un premier prompt, vérifier la preview, tester l’application, consulter le code, puis demander une modification ciblée. La preview doit donc être un environnement de travail actif, pas une simple carte décorative.

## Traduction pour Idealy

L’état initial doit conserver l’interface principale ai-chatbot avec le chat pleine largeur. Quand une construction démarre, le panneau droit doit apparaître et réduire le chat. Ce panneau doit disposer d’une top bar dédiée avec au minimum les onglets **Preview**, **Code** et **Console**, un sélecteur de page, un contrôle de taille responsive, refresh et ouverture dans une nouvelle fenêtre. Le terminal/console doit être séparé de la preview et ne pas remplacer celle-ci.

La preview principale doit être claire, centrée et interactive. Les agents doivent être montrés comme un état de construction autour du flux, tandis que le produit généré reste visible dans la preview. Les contrôles d’agrandissement, de fermeture et d’ouverture en nouvelle fenêtre doivent être des actions réelles et testables.

## Sources

1. https://v0.app/docs/design-mode — documentation publique du mode Design, sélection, panneaux, application et versioning.
2. https://v0.app/ — présentation publique de v0, preview live, intégrations et feedback en temps réel.
3. https://flaviocopes.com/v0-tutorial/ — description du workspace chat à gauche / preview à droite, barre Preview/Code, pages, tailles d’écran, refresh, nouvelle fenêtre et console.
4. https://www.youtube.com/watch?v=41SR07p243Q — démonstration vidéo publique de v0 pour compléter la compréhension pratique de l’interface.
5. https://www.youtube.com/watch?v=Gb3tF3jp4XU — tutoriel vidéo public v0 montrant le flux de construction et de preview.
