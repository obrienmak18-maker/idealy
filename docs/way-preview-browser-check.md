# Vérification visuelle — PreviewBrowser et Voie

Date : 2026-08-14

En mode démo local, l’activation de la mission ouvre le Canvas avec une transition visible. Le chrome de preview affiche les trois boutons macOS, l’adresse `localhost:5173`, le bouton Refresh et les trois choix Desktop/Tablette/Mobile. Pendant le boot WebContainer, un skeleton animé avec le logo Idealy et des barres de shimmer est affiché au lieu d’un écran noir.

Le header expose maintenant un bouton Focus. La preview porte la bordure et les indicateurs de la Voie active, ici la Voie du Ninja. Les contrôles Code, Terminal, ZIP et les contrôles de périphérique sont visibles sans ancien bandeau d’onglets.

## Focus Mode et mobile

Le bouton Focus retire la sidebar et laisse le Canvas occuper toute la largeur. Le header propose « Quitter le focus » et conserve les commandes essentielles. Le mode Mobile centre la preview dans un cadre vertical arrondi de type téléphone, tandis que le skeleton reste lisible pendant le boot.
