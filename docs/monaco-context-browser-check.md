# Vérification navigateur — Monaco et menu contextuel

Date : 2026-08-15

L’instance locale se charge. Après activation de la démo, le panneau Code affiche Monaco : le DOM expose un conteneur `role="code"`, les numéros de lignes, le rendu syntaxique et le champ d’édition interne Monaco. Le panneau ne rend plus la textarea applicative utilisée par l’ancien CodeEditor.

Le bouton « Demander à Idealy » ouvre bien un menu Radix intitulé « Fichier actif ». Sans sélection, les trois actions visibles sont : « Améliorer ce fichier » en EXECUTION, « Détecter les failles » en IDEATION et « Ajouter des commentaires » en EXECUTION. La séparation est affichée dans le menu et les actions sont contextualisées par rapport au fichier actif.
