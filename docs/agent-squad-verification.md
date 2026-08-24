# Vérification — Première escouade de démo

La route locale `/demo-flow` a été contrôlée avec la première escouade intégrée. La Voie Ninja affiche les portraits originaux d’Aro, Soren, Celya et Veyr, ainsi que leurs rôles et la jauge « Élan de mission » à 82/100 au démarrage.

La Voie Professionnel a aussi été sélectionnée. Elle affiche le portrait professionnel fourni pour Daniel, le rôle « Pilote d’opérations » et la jauge « Capacité opératoire » à 88/100. Aucun appel IA, écriture de fichier de mission ou opération externe n’a été lancé pendant ce contrôle.

Après deux étapes de la mission Professionnel, Daniel reste l’agent actif, l’incident « Incident de synchronisation simulé » s’affiche avec un correctif explicatif et la capacité opératoire passe de 88 à 48/100. Ce parcours confirme que l’incident est pédagogique : aucun service, connecteur ou base de données n’est modifié.

Après la troisième étape, la capacité atteint 28/100 et la démo affiche « Pause de diagnostic recommandée ». L’action « Faire une pause » restaure la capacité à 62/100 et remet l’action « Étape suivante » à disposition. Cette mécanique reste locale et illustrative : elle ne suspend ni n’exécute un agent externe.
