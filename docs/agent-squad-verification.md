# Vérification — Première escouade de démo

La route locale `/demo-flow` a été contrôlée avec la première escouade intégrée. La Voie Ninja affiche les portraits originaux d’Aro, Soren, Celya et Veyr, ainsi que leurs rôles et la jauge « Élan de mission » à 82/100 au démarrage.

La Voie Professionnel a aussi été sélectionnée. Elle affiche le portrait professionnel fourni pour Daniel, le rôle « Pilote d’opérations » et la jauge « Capacité opératoire » à 88/100. Aucun appel IA, écriture de fichier de mission ou opération externe n’a été lancé pendant ce contrôle.

Après deux étapes de la mission Professionnel, Daniel reste l’agent actif, l’incident « Incident de synchronisation simulé » s’affiche avec un correctif explicatif et la capacité opératoire passe de 88 à 48/100. Ce parcours confirme que l’incident est pédagogique : aucun service, connecteur ou base de données n’est modifié.

Après la troisième étape, la capacité atteint 28/100 et la démo affiche « Pause de diagnostic recommandée ». L’action « Faire une pause » restaure la capacité à 62/100 et remet l’action « Étape suivante » à disposition. Cette mécanique reste locale et illustrative : elle ne suspend ni n’exécute un agent externe.

Lors du premier contrôle de livraison publique, le tableau Netlify a signalé un déploiement « Published » déclenché à 21:22. La route publique `/demo-flow?version=squad-01` servait toutefois encore la précédente escouade Kairo/Sena/Rin. Ce décalage est en cours de diagnostic ; la publication de la nouvelle escouade ne sera pas déclarée vérifiée avant que la route publique affiche réellement les portraits et données Aro/Daniel.

Le permalien du déploiement Netlify `6a8cb631490d8cbaae9ef0eb` a ensuite été contrôlé directement. Il sert bien Aro, Soren, Celya et Veyr avec leurs portraits WebP, leurs rôles et la jauge « Élan de mission ». Le décalage concerne donc le domaine principal à cet instant, et non le build ni la démo déployée.

La propagation du domaine principal a finalement été confirmée avec un nouveau paramètre de cache : `https://idealy-ai.netlify.app/demo-flow?version=squad-01b` sert également Aro, Soren, Celya et Veyr. La première étape de mission a été testée sur le permalien unique : Aro produit le brief, la progression atteint 36 % et la vue Code s’active, sans session ni appel IA.

Les portraits utilisateur de référence examinés sont tous deux carrés (1024 × 1024) avec un sujet cadré au centre, ce qui convient aux cartes compactes de l’escouade. Le premier visuel est destiné à la voie Ninja ; le portrait professionnel est destiné à Daniel dans la voie Professionnel.

Après remplacement des portraits, la route locale `/demo-flow` affiche bien les huit cartes Ninja issues des fichiers utilisateur : Naruto, Shikamaru, Sakura, Sasuke, Kakashi, Minato, Madara et Orochimaru. La barre de ressource est devenue « Chakra de mission ». Le canvas affiche aussi le studio UX simulé avec les curseurs nommés Naruto, UX Designer et Revue UX, une sélection bleue et une annotation. Le bouton de la barre du canvas permet de masquer ce studio UX.

La voie Hunter a été contrôlée avec Gon, Ging, Merum, Netero et Chrollo, leurs portraits fournis et la jauge « Nen d’analyse ». Le bouton du canvas a ensuite été activé : son libellé est devenu « Afficher le studio UX » et les curseurs, sélection et annotation ont disparu sans modifier la preview elle-même.

Après conversion sans recadrage, l’ensemble des avatars utilisateur pèse environ 1,8 Mo au lieu d’environ 35 Mo. La reconstruction locale affiche encore les portraits WebP correctement. La voie Mage a été contrôlée avec Natsu, Erza, Zeref et Acnologia, ainsi que la jauge « Mana de forge » ; le curseur principal du studio UX prend bien le nom de l’agent actif, ici Natsu.

La voie Professionnel a été contrôlée avec le portrait WebP de Daniel, la jauge « Capacité opératoire » et le studio UX actif. Le curseur principal prend le nom Daniel ; les éléments de collaboration restent une simulation visuelle et ne créent aucune session de co-édition ni appel externe.

La validation complète de branche a été exécutée avec succès : contrôle TypeScript, contrats Design Engine, fichiers de mission, connecteurs, résultat Auth.js, programme de démo, build Next de production et contrôle de diff.
