# Vérification — Première escouade de démo

La route locale `/demo-flow` a été contrôlée avec la première escouade intégrée. La Voie Ninja affiche les portraits originaux d’Aro, Soren, Celya et Veyr, ainsi que leurs rôles et la jauge « Élan de mission » à 82/100 au démarrage.

La Voie Professionnel a aussi été sélectionnée. Elle affiche le portrait professionnel fourni pour Daniel, le rôle « Pilote d’opérations » et la jauge « Capacité opératoire » à 88/100. Aucun appel IA, écriture de fichier de mission ou opération externe n’a été lancé pendant ce contrôle.

Après deux étapes de la mission Professionnel, Daniel reste l’agent actif, l’incident « Incident de synchronisation simulé » s’affiche avec un correctif explicatif et la capacité opératoire passe de 88 à 48/100. Ce parcours confirme que l’incident est pédagogique : aucun service, connecteur ou base de données n’est modifié.

Après la troisième étape, la capacité atteint 28/100 et la démo affiche « Pause de diagnostic recommandée ». L’action « Faire une pause » restaure la capacité à 62/100 et remet l’action « Étape suivante » à disposition. Cette mécanique reste locale et illustrative : elle ne suspend ni n’exécute un agent externe.

Lors du premier contrôle de livraison publique, le tableau Netlify a signalé un déploiement « Published » déclenché à 21:22. La route publique `/demo-flow?version=squad-01` servait toutefois encore la précédente escouade Kairo/Sena/Rin. Ce décalage est en cours de diagnostic ; la publication de la nouvelle escouade ne sera pas déclarée vérifiée avant que la route publique affiche réellement les portraits et données Aro/Daniel.

Le permalien du déploiement Netlify `6a8cb631490d8cbaae9ef0eb` a ensuite été contrôlé directement. Il sert bien Aro, Soren, Celya et Veyr avec leurs portraits WebP, leurs rôles et la jauge « Élan de mission ». Le décalage concerne donc le domaine principal à cet instant, et non le build ni la démo déployée.

La propagation du domaine principal a finalement été confirmée avec un nouveau paramètre de cache : `https://idealy-ai.netlify.app/demo-flow?version=squad-01b` sert également Aro, Soren, Celya et Veyr. La première étape de mission a été testée sur le permalien unique : Aro produit le brief, la progression atteint 36 % et la vue Code s’active, sans session ni appel IA.
