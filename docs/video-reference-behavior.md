# Référence comportementale vidéo — 22 août 2026

La vidéo confirme deux états principaux. Au démarrage, l’écran est consacré au chat : titre central animé, quatre suggestions courtes, zone de prompt en bas, bouton de régénération des suggestions et microphone. La sidebar peut être ouverte ; elle contient New chat, Mission en cours avec progression, énergie 82/100, Plugins & connecteurs et Bibliothèque.

Lorsqu’une suggestion est choisie, elle doit remplir la zone de prompt avec un prompt détaillé au lieu d’être envoyée immédiatement. Après l’envoi, l’attente et la réponse apparaissent progressivement dans le chat.

Quand la construction commence, l’écran devient split-screen : chat à gauche et canvas à droite. La top bar de construction contient à gauche les contrôles sidebar/nouveau chat et le titre dynamique du projet avec favori et menu ; au centre-droit se trouvent les modes Design, Code et Preview, la résolution Desktop/Tablette/Mobile, le refresh et le sélecteur de version ; à droite se trouvent les actions secondaires, partage, statut et Publish (la vidéo indique que Merge PR doit devenir Publish).

Le canvas doit afficher l’application générée elle-même, avec ses widgets, sans carte d’agents superposée. Le principal problème UX observé est l’absence de poignée permettant de redimensionner manuellement la largeur du chat et du canvas. La référence v0 montre aussi une sidebar extensible, un menu projet complet (Rename, Add to Favorites, Duplicate, Settings, Transfer, Delete), un menu d’actions avec Download ZIP et Show Console, ainsi qu’une console inférieure à deux onglets Logs et Terminal. Un bouton Open in new tab est attendu pour la preview.

Priorité immédiate : utiliser cette vidéo comme source de vérité comportementale, sans inventer un nouveau design. Ne pas confondre le panneau de statut des agents avec le rendu de l’application. Ne pas afficher la console dans la preview par défaut. Remplacer la terminologie Merge PR par Publish dans l’interface utilisateur.
