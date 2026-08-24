# Vérification locale — démo multi-agents

Date : 24 août 2026.

La route publique `/demo-flow` s’ouvre sans session et conserve le workspace en trois zones : progression et équipe à gauche, conversation de mission au centre, canvas multi-vues à droite. Le premier rendu présente la **Voie Ninja**, ses trois emplacements d’avatars et le canvas Preview.

Le basculement vers la **Voie Hunter** a été vérifié sans rechargement : l’accent visuel, l’objectif de progression, le nom de voie et les trois agents affichés ont été remplacés par Nyra, Oren et Mika. La démo ne sollicite aucune IA externe, ne crée aucune mission persistante et ne déclenche aucune publication.

Le démarrage de mission a ouvert la première étape avec l’agent Nyra, son livrable et une progression à 36 %, tout en basculant le canvas vers la vue Code. La vue **Données** a ensuite affiché le contexte de mission en lecture seule — mission, voie, progression et récompense — avec une mention explicite indiquant qu’aucune synchronisation Supabase n’est réalisée par la démo.

La vue **Console** a affiché le journal de mission, avec l’étape de Nyra validée et les suivantes en attente. L’avancement a ensuite produit le second livrable d’Oren, fait passer la progression à 57 % et mis à jour l’agent actif ainsi que le contenu de la vue Code.

La troisième étape a affiché le livrable de Mika et ramené le canvas sur la Preview au moment où une première interface est disponible. La quatrième étape a achevé le parcours : quatre livrables sont présents, l’état « Première version prête à explorer » et la récompense de la voie sont visibles, puis le bouton permet de rejouer la mission. Aucun appel externe, compte, fichier, publication ou ressource n’a été créé par ces interactions.

Après correction du calcul terminal, un nouveau parcours a été démarré sur la Voie Ninja : la première étape affiche bien Kairo, le livrable `brief.md`, la vue Code et 36 % de progression. La vérification de l’achèvement final se poursuit sur ce build.

Validation terminale : après les quatre étapes de la Voie Ninja, le workspace affiche désormais **100 %**, la récompense « +120 XP · Focus débloqué », les quatre livrables, l’état « Workspace prêt » et l’action « Rejouer la mission ». Le défaut visuel à 99 % est donc corrigé dans le build local validé.
