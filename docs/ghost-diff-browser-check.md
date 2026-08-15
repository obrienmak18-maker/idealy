# Vérification navigateur — Ghost Diff et Crash Overlay

Date : 2026-08-14

L’instance locale se charge sans erreur visible. La démo ouvre le Canvas et conserve le chrome PreviewBrowser. Le panneau Code s’ouvre avec les fichiers index.html, package.json, App.tsx, main.tsx et styles.css, ainsi que le bouton « Demander à Idealy », Copier, Sauvegarder et la textarea de l’éditeur.

Le flux de revue est câblé pour distinguer le schéma stable du schéma proposé : le WebContainer reçoit uniquement le schéma stable, tandis que le panneau Code peut afficher une proposition en mode Ghost Diff. L’acceptation promeut ensuite la proposition et déclenche la preview. Le CrashOverlay est superposé à la surface preview et transmet les logs au pipeline de correction sans écriture automatique.
