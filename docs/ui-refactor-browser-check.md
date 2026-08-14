# Vérification navigateur — refactor UI

Date : 2026-08-14

L’instance locale sur `http://127.0.0.1:3000/` s’ouvre correctement en mode démo. La page affiche la sidebar, le composer et le bouton de suggestion. Après clic sur la suggestion « Une app de tâches avec auth et dark mode », le texte est placé dans le composer sans erreur visible. Le test n’a pas encore soumis la mission, car le flux de démonstration actuel nécessite l’étape suivante de clic sur le bouton d’envoi et/ou l’authentification selon le mode.

La structure initiale observée correspond encore à l’ancienne vue lorsqu’aucun Canvas n’est ouvert : la sidebar reste visible, le centre affiche l’état vide et le composer est en bas. Aucun ancien bandeau d’onglets du panneau droit n’est visible dans cet état. Le prochain contrôle doit vérifier le Canvas après une exécution et l’ouverture du terminal via Ctrl+~.

## Test terminal drawer

Le raccourci Ctrl+` (interprété comme Ctrl+~ par le navigateur) ouvre bien un drawer inférieur modal. Le drawer affiche le titre « Terminal de mission », la description du raccourci et la surface XTerm « Idealy Terminal / Connexion au WebContainer ». L’ancien terminal n’est donc plus présenté comme un onglet supérieur.
