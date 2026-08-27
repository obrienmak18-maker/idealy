# Blueprint — vidéo verticale Idealy

## Intention

Cette vidéo de **50 secondes**, en format **9:16**, présente Idealy comme un workspace créatif qui transforme une intention en mission structurée. La cible regroupe créateurs, entrepreneurs et curieux. Le message n’annonce pas une version déjà commercialisée : il invite à suivre et à contribuer à l’arrivée de la bêta.

> La vidéo ne doit pas reprendre la route `/demo-flow` condensée. Son langage visuel part de la structure du workspace cible : sidebar, conversation prioritaire, bascule progressive vers un canvas de création, onglets Preview/Code/Données et indications de progression. Le workspace authentifié n’est pas capturable sans session utilisateur ; les plans de produit qui l’évoquent sont donc des représentations graphiques cohérentes, sans prétendre être des captures réelles.

## Direction globale

| Élément | Direction retenue |
|---|---|
| Style | Film produit SaaS premium, interface éditoriale nette, mouvements fluides et précis, profondeur légère. |
| Rendu | Motion design 3D discret autour d’un UI 2D lisible ; pas de personnage ni de faux dialogue. |
| Palette | Fond encre bleu nuit, surfaces ivoire chaude, accents bleu ciel, vert pétrole, jaune solaire, orange et rouge Google-like. |
| Narration | Voix française neutre, posée, chaleureuse, à rythme soutenu mais intelligible. |
| Musique | Électro instrumentale lumineuse, 104 BPM, synthés doux, basse ronde et percussions légères. |
| Texte écran | Très court : nom Idealy, étapes et appel final. Aucun prix, promesse de paiement, logo tiers ni affirmation non vérifiée. |

## Découpage et narration

| Temps | Objet narratif | Image et mouvement | Narration française | Son |
|---|---|---|---|---|
| 00:00–00:07 | Accroche | Fond encre, rubans bleu/vert/jaune/rouge convergent vers le signe Idealy ; transition vers un champ d’idée. | « Et si votre prochaine idée ne restait pas dans un carnet ? » | Montée synthétique légère, souffle numérique. |
| 00:07–00:15 | Intention | Un bref apparaît dans une interface de workspace ; la sidebar et la zone de conversation s’organisent naturellement. | « Idealy aide les créateurs, les entrepreneurs et les curieux à transformer une intention en mission claire. » | Pulsation rythmique douce. |
| 00:15–00:24 | Plan | L’idée se fragmente en cartes : objectif, public, étapes et priorité. Le plan se dessine, sans code ni résultats inventés. | « Vous partez d’une idée. Le workspace la cadre, la découpe et vous montre la prochaine étape utile. » | Ajout de percussions feutrées. |
| 00:24–00:34 | Escouade visible | Trois rôles originaux apparaissent sous forme de badges : Architecte, Builder, Reviewer ; une timeline se complète. | « Une escouade rend le travail lisible : imaginer, construire, vérifier, puis avancer ensemble. » | Rythme plus affirmé, petits clics UI. |
| 00:34–00:43 | Canvas | Le canvas s’ouvre à droite ; un aperçu d’application, des fichiers et les onglets Preview, Code et Données se relaient. | « Quand votre projet prend forme, la conversation laisse place à un espace de création, d’aperçu et de suivi. » | Accent mélodique, son de transition doux. |
| 00:43–00:50 | Invitation | Le canvas devient une composition Idealy, avec le texte « Bêta bientôt » puis l’appel à suivre le projet. | « Idealy arrive bientôt en bêta. Suivez le projet, partagez votre idée, et aidez-nous à construire la suite. » | Résolution lumineuse, fin douce. |

## Prompt de narration par segment

La narration sera produite en six segments, à une cadence cible d’environ 2,3 mots par seconde, afin que le discours respire et reste synchronisable avec les images.

| Segment | Durée maximale | Texte |
|---|---:|---|
| N1 | 7 s | « Et si votre prochaine idée ne restait pas dans un carnet ? » |
| N2 | 8 s | « Idealy aide les créateurs, les entrepreneurs et les curieux à transformer une intention en mission claire. » |
| N3 | 9 s | « Vous partez d’une idée. Le workspace la cadre, la découpe et vous montre la prochaine étape utile. » |
| N4 | 10 s | « Une escouade rend le travail lisible : imaginer, construire, vérifier, puis avancer ensemble. » |
| N5 | 9 s | « Quand votre projet prend forme, la conversation laisse place à un espace de création, d’aperçu et de suivi. » |
| N6 | 7 s | « Idealy arrive bientôt en bêta. Suivez le projet, partagez votre idée, et aidez-nous à construire la suite. » |

## Références visuelles à générer

| Référence | Clips | Brief |
|---|---|---|
| `idealy-workspace-anchor` | 1 à 6 | Composition verticale du workspace cible : sidebar sombre à gauche, chat central lumineux, canvas modulaire à droite, éléments UI abstraits sans texte lisible, palette Idealy. |
| `idealy-mission-cards` | 3 et 4 | Cartes de mission flottantes sur fond encre : objectif, plan, revue ; formes et statuts abstraits sans marques ni textes. |
| `idealy-canvas-preview` | 5 et 6 | Canvas vertical avec aperçu d’application, panneaux code/données stylisés et halo de couleurs Idealy, sans texte lisible ni logo tiers. |

## Blueprint musical

| Segment temporel | Émotion | Arrangement |
|---|---|---|
| 00:00–00:07 | Curiosité et possibilité | Pads lumineux, souffle synthétique, pulsation minimale. |
| 00:07–00:24 | Clarté et élan | Basse ronde, percussion légère, arpège doux. |
| 00:24–00:43 | Collaboration et construction | Rythme modéré, arpège plus présent, clics UI subtils. |
| 00:43–00:50 | Invitation et optimisme | Accord ouvert, basse allégée, fin douce et mémorable. |

## Fichier livré et transparence de production

Le fichier final `video-assets/idealy-presentation-vertical.mp4` a été assemblé en H.264/AAC, 720 × 1280, avec une durée vérifiée de 51 secondes. Il combine la narration française, la musique instrumentale originale et un mouvement de caméra sur des références de workspace. L’ouverture est une séquence IA animée ; les autres sections sont des plans produits à partir des références visuelles avec mouvement éditorial. Cette structure conserve une présentation fluide malgré la limite quotidienne de génération de séquences animées rencontrée après la première séquence.

## Révision : sources authentiques disponibles

Une instance locale du code réel, démarrée avec `DEMO_MODE=true` uniquement pour l’inspection visuelle, a permis de confirmer deux sources adaptées au nouveau montage : l’écran réel d’entrée du workspace (`/`), avec sidebar, zone d’idée, suggestions, bouton de régénération et composer ; et la landing réelle (`/welcome`), avec marque Idealy, promesse produit, boutons de démarrage et cartes des voies. Ces deux pages sont produites par le projet Next actuel. La page `/demo-flow` est exclue de la révision parce qu’elle condense volontairement les vues pour une démonstration courte.

La zone de workspace avec canvas ouvert demeure protégée par l’authentification et ne peut pas être capturée honnêtement sans une session de test utilisateur. La révision utilisera donc les écrans réels accessibles, puis une transition graphique explicitement présentée comme une vision du workspace de création, sans la confondre avec une capture de session authentifiée.

## Version révisée

Le fichier `video-assets/idealy-presentation-vertical-revised.mp4` remplace les plans conceptuels centraux par les captures directes du code Idealy local : la landing, puis l’écran d’entrée réel du workspace. Le montage exploite alternativement une vue cadrée sur la promesse de la landing, une vue complète du composer et une vue recadrée de la sidebar et des suggestions. Le résultat garde l’ouverture animée, la narration et la musique d’origine, tout en faisant passer les vrais visuels produit avant toute représentation graphique.
