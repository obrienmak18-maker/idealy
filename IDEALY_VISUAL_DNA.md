# Idealy Visual DNA

> Audit réalisé sur `feat/idealy-live-backend` à `24969a85a72bfab8c28400a6580b066e27cb13d7`. Les références locales `origin/feat/idealy-live-backend` et `origin/feat/idealy-global-ux-ui` pointent aussi sur ce commit après fetch. Aucun fast-forward n’était nécessaire. Le working tree contient les éléments non suivis préexistants `_quarantine/` et `idealy-local-ui-recovery.patch`; ils ont été laissés intacts.
>
> Méthode : lecture des sources du parcours et de ses dépendances, tokens globaux, historique Git et inspection réelle de `/demo-flow` dans le navigateur sur le serveur Next déjà démarré (`localhost:3100`). Le bureau affiché a une largeur de 1280 px. Le test mobile/tablette, l’ensemble des interactions, et les logs complets du serveur n’ont pas pu être vérifiés dans cet audit. L’overlay Next a signalé `ClientFetchError` / erreur de configuration Auth.js; la page et ses interactions visibles se sont néanmoins rendues.

## 1. Visual identity

Idealy exprime une idée qui passe à l’action par un parcours guidé : choisir une voie, clarifier, planifier, construire, vérifier et transmettre. `app/demo-flow/page.tsx` rend ce chemin tangible en juxtaposant la progression, la conversation d’équipe et le résultat exécutable en preview. C’est le principe visuel directeur : rendre le passage de l’intention au logiciel visible, compréhensible et réversible.

La personnalité actuelle combine une interface d’atelier claire, des accents colorés et des métaphores de mission (voies, agents, ressources, livrables). Le logo SVG représente un éclat central entouré d’orbites. L’identité est donc davantage dans la relation entre parcours, activité et résultat que dans un simple fond dégradé.

La page de démonstration est une simulation locale explicite. Ses agents, leur chakra, le code, les données et le journal ne constituent pas une exécution distante. Ce cadrage honnête renforce la confiance et doit rester évident.

## 2. Background system

`app/globals.css` définit `.idealy-app-background` et `.idealy-public-shell` comme des empilements de gradients radiaux diffus sur les tokens de fond. La page de démo ajoute trois grands orbes fixes, floutés et non interactifs (bleu, violet, orange). Cela crée une atmosphère ambiante derrière l’espace de travail, plutôt qu’une image de fond.

Les lueurs sont subtiles dans les variables globales, mais leurs occurrences ne sont pas entièrement centralisées : certains écrans ajoutent leurs propres orbes et la page de bienvenue utilise des animations nettement plus vives. Garder une intensité et un rythme communs entre surfaces est plus important que multiplier ces effets.

## 3. Light / backlight system

Les halos colorés bleus, turquoise, violets et orangés signalent l’activité et la marque. Les ombres `--shadow-float` ajoutent une légère lueur bleu-violet. Le splitter de la conversation et du preview s’éclaire au survol, au focus clavier et pendant le redimensionnement, avec une transition colorée bleu-violet-orange.

La lumière reste une couche d’ambiance ou un signal d’interaction. Elle n’est pas encore systématiquement liée à un état réel de génération. Pour exprimer la transformation d’une idée, les prochains accents lumineux devraient suivre une activité, une validation ou un livrable, au lieu de bouger sans cause.

## 4. Surface / depth system

La profondeur repose sur des bordures fines, des coins arrondis (rayon de base 10 px), des fonds semi-transparents, le flou d’arrière-plan, des ombres à faible contraste et l’empilement header / panneaux / preview. Les panneaux partagent les tokens de surface pour séparer navigation, conversation et résultat sans rupture brutale.

Dans `demo-flow`, la surface principale est une grille de panneaux arrondis et cadrés. C’est lisible, mais les surfaces se ressemblent parfois trop : le panneau conversation et le canvas ont chacun plusieurs barres de contrôle et cadres. Pour renforcer la hiérarchie, le canvas doit lire comme le résultat produit, la conversation comme l’espace d’action, et les panneaux latéraux comme contexte.

## 5. Typography

La base utilise la pile système sans téléchargement de police distant, l’anticrénelage, des titres resserrés (`letter-spacing: -0.025em`) et une hauteur de ligne globale de 1.6 pour les paragraphes. La démo distingue les titres, les petits libellés capitalisés espacés, les descriptions atténuées et les données d’état.

L’interface d’atelier emploie beaucoup de tailles de 9 à 13 px, notamment pour les descriptions des agents, les états et les contrôles. Le ton est dense et technique; ces microtextes doivent rester secondaires, mais les informations qui expliquent l’avancement ou demandent une décision méritent une taille et un contraste plus confortables.

## 6. Color

Le mode clair part du blanc, de l’ardoise et de bordures bleu-gris. Le mode sombre utilise un fond bleu-noir, des panneaux ardoise et des bordures translucides. Les couleurs d’accent sont le ciel/bleu, le turquoise, le violet, l’orange et parfois le rose. La progression et les cartes de voies héritent d’accents par parcours; les couleurs de succès, avertissement, erreur et activité ont également des tokens sémantiques.

La palette multicolore du logo sert de signature. Elle ne doit pas transformer chaque surface en gradient. Les couleurs métier doivent porter un sens stable et le texte secondaire doit rester suffisamment contrasté. Le preview simulé est explicitement blanc, même quand l’espace de travail environnant peut être sombre.

## 7. Motion

La motion existante est surtout CSS et Framer Motion : fade-up, fade-in, shimmer, pulsation des points, arrivée des messages, respiration du logo et du marqueur de construction, halo lent autour du prompt, curseurs UX simulés et liseré de redimensionnement. Les contrôles emploient principalement des transitions de couleur, largeur et position. Le parcours anime la largeur des barres de progression et la largeur de preview lors du changement d’appareil.

Les curseurs, sélections et traits du « studio UX » sont une illustration en boucle et non des événements de collaboration réelle. Ils rendent l’idée d’itération visible, mais peuvent faire croire à une activité persistante : les distinguer comme démonstration est nécessaire. La page principale dispose d’une règle globale `prefers-reduced-motion`; plusieurs animations de marque et d’UX ont aussi leur propre désactivation.

## 8. Spatial composition

En grand écran, `demo-flow` place une barre de marque en haut et trois zones côte à côte : colonne de mission/équipe, conversation et canvas/preview. Le conteneur est limité à 1800 px, la colonne latérale fait environ 370 px et la conversation partage l’espace avec le canvas. Le canvas peut être agrandi ou présenté; les choix desktop/tablette/mobile ajustent la largeur de la preview.

Le dispositif relie cause et effet dans un seul champ visuel : l’idée saisie reste proche des agents qui la travaillent et du résultat visible. C’est une vraie force. Il y a toutefois beaucoup d’informations et de contrôles à l’écran; l’utilisateur doit pouvoir sentir une priorité claire par étape plutôt que lire simultanément tout le système.

## 9. Interaction states

La démo permet de choisir quatre voies, éditer le prompt, démarrer ou avancer une mission, consulter les étapes passées, changer de preview/code/données/console, simuler trois formats, afficher ou masquer le studio UX, agrandir le canvas, présenter le résultat, changer les pages du prototype et recommencer. Une jauge de ressource peut recommander une pause et proposer une récupération.

Les contrôles sont des boutons natifs avec focus visible, plusieurs panneaux déclarent `aria-expanded` ou `aria-pressed`, et le splitter du produit principal expose une valeur accessible et les flèches clavier. Le modèle d’interaction est riche, mais certains boutons d’agent sont purement informatifs et la densité peut masquer l’action principale. Chaque état devrait expliquer ce qui vient de changer et ce qui est maintenant disponible.

## 10. Canvas language

Le canvas n’est pas ici un canevas de dessin HTML : c’est une zone de travail contenant une preview simulée, le code, un tableau de données ou une console. Le preview de `demo-flow` est un prototype DOM (« Atelier Horizon ») avec Accueil / Mon plan / Progrès; le choix Bureau/Tablette/Mobile change sa largeur. Le studio UX superpose une sélection, des curseurs nommés et une annotation pour évoquer une revue de design.

Cette représentation du résultat à côté de la conversation est centrale et doit être conservée. À améliorer : distinguer visuellement l’application produite de l’interface Idealy, rendre les changements d’étape perceptibles dans le preview, et afficher les artefacts comme une conséquence du travail plutôt que comme un second tableau de bord.

## 11. Agent language

Les agents ont noms, portraits, rôle, spécialité et focus; le roster distingue agent courant et agents déjà passés. L’historique associe chaque livrable à une étape et à son agent. Les voies proposent des équipes et objectifs différents. Les portraits observés incluent actuellement des images de personnages d’anime, alors que les identités textuelles sont originales selon le commentaire dans `lib/idealy/demo-program.ts`.

Le récit de l’équipe et la spécialisation par étape sont mémorables, mais l’escouade de huit portraits et la ressource appelée « chakra » peuvent détourner l’attention de la construction logicielle et donner une tonalité de jeu/anime difficile à concilier avec une marque professionnelle. Préserver la collaboration lisible et les relais spécialisés; reconstruire la représentation visuelle et le vocabulaire de ressources autour d’un atelier de création propriétaire.

## 12. Chat language

La conversation se présente comme un échange de mission : idée initiale, voie attribuée, historique d’étapes et composition de texte. Le prompt est rééditable dans la démo, et un appel à l’action principal démarre/avance la mission. Le texte indique clairement que la démonstration ne fait aucun appel IA ni publication.

Le produit réel réutilise la séparation conversation / preview, le compositeur, les messages et les composants d’artefact. `components/chat/greeting.tsx` alterne des promesses marketing à intervalle fixe, affiche une saisie progressive et utilise Framer Motion. Cette animation attire l’œil, mais l’alternance automatique peut déplacer le contenu pendant la lecture et présente des slogans génériques. Le chat devrait plutôt accueillir l’idée, puis laisser l’activité de transformation raconter la suite.

## 13. Preview language

Le preview est placé dans une surface propre, avec une barre de fenêtre, une marque discrète et des commandes de navigation internes. Le prototype « Atelier Horizon » hiérarchise un titre principal et trois étapes — choisir, construire, célébrer — puis superpose les commentaires d’UX.

La preview est la preuve concrète de la valeur d’Idealy : elle doit être la zone visuellement dominante lorsqu’un résultat existe. La démo présente cependant un site de coaching fictif dans une boîte claire, sans véritable chargement, historique de versions ou changement alimenté par le prompt; elle montre le concept mais pas encore le lien causal entre une décision et une modification du logiciel.

## 14. Responsive behavior

La structure passe d’une colonne à trois colonnes à partir du breakpoint `lg`; la colonne latérale peut disparaître quand le canvas est agrandi. Le contrôle d’ouverture de canvas est montré en petit écran, et la preview peut être réglée explicitement sur 320 px (mobile) ou 720 px (tablette). Le contenu de l’application démo a une largeur minimale de 610 px; la navigation de son panneau latéral se masque sous `sm`.

Une inspection visuelle n’a été faite qu’à 1280 px. Le layout en une colonne existe dans les classes, mais le flux vertical, la hauteur des cartes, le scroll imbriqué et le comportement du canvas en vrai viewport étroit restent à vérifier avant toute implémentation responsive. L’émulation de largeur de preview n’est pas équivalente au test d’un écran mobile.

## 15. Accessibility

Atouts visibles dans les sources : éléments HTML natifs, `aria-label` pour commandes icon-only, états `aria-expanded`/`aria-pressed`, outlines de focus, descriptions accessibles pour les portraits et support CSS de réduction du mouvement. Le splitter de l’application réelle offre une valeur min/max et un contrôle clavier.

À vérifier : contraste des textes très petits, focus et annonce des changements de mission/progressions, ordre de tabulation dans les panneaux à scroll, contenu des previews à 320 px, annonce des mouvements simulés et coexistence de la règle de viewport `maximumScale: 1` dans `app/layout.tsx` avec le zoom utilisateur. Les outils de browser dev ont affiché un overlay de configuration auth, à distinguer des problèmes d’accessibilité du contenu.

## 16. Performance

Les arrière-plans utilisent plusieurs grands flous CSS; les orbes de bienvenue animent transform, hue et brightness à grande amplitude. Le studio UX animé est CSS et ne requiert pas de rendu 3D. Les composants de mouvement emploient Framer Motion; les dépendances incluent également le package `motion`, ce qui suggère deux entrées de bibliothèque à rationaliser avant d’ajouter une autre solution. Le code récupère certaines images d’agents depuis les assets locaux.

Les effets floutés, filtres animés, boucles simultanées et grande liste d’agents peuvent coûter sur appareils modestes. Privilégier transform/opacity, limiter les zones floutées, suspendre les animations hors écran et respecter reduced motion. Pas de preuve d’usage de WebGL/WebGPU/Worker pour ce parcours; ajouter ces couches introduirait coût, complexité et fallback sans besoin démontré.

## 17. What must be preserved

- Le lien spatial entre l’idée, le travail de l’équipe, les décisions et l’application visible.
- La progression par étapes et la visibilité des livrables associés à ces étapes.
- Une identité Idealy reconnaissable par son éclat central, ses orbites et sa palette en accents mesurés.
- Les surfaces claires et sombres fondées sur des tokens partagés, la hiérarchie accessible et le focus clavier.
- La conversation redimensionnable avec preview; l’agrandissement et les formats de preview lorsque ces contrôles sont utiles.
- La réduction de mouvement et le cadrage transparent des simulations, états de chargement et actions réelles.
- Les rôles d’agents spécialisés et le récit de relais, sous une représentation visuelle originale et cohérente.

## 18. What must be replaced

- Le vocabulaire et l’imagerie de jeu/anime (dont « chakra » et les portraits issus de franchises) par une métaphore d’atelier Idealy originale, liée aux tâches de conception et d’ingénierie.
- Les ornements animés sans lien direct avec un changement d’état par une motion sobre déclenchée par l’activité réelle.
- Les promesses marketing génériques et la rotation automatique de `Greeting` par un accueil stable qui aide à formuler l’idée.
- La répétition de cadres et barres de commande par une hiérarchie plus nette entre mission, chat et résultat.
- Le prototype statique lorsque l’expérience sera implémentée : montrer le rapport concret entre étape, artefact, changement en preview et validation.
- Les différences de traitement dispersées entre pages par un usage cohérent des tokens, du contraste, de l’espacement et des états.

## 19. What must never be introduced

- Un gradient multicolore appliqué à toutes les cartes, boutons et fonds au point d’effacer la hiérarchie.
- Des halos, particules, curseurs, scintillements ou animations en boucle sans raison liée à une action de transformation.
- Une fausse activité d’agent présentée comme un travail réellement exécuté, une fausse progression ou une publication fictive.
- Une nouvelle bibliothèque lourde ou une scène WebGL/WebGPU uniquement pour donner un aspect spectaculaire.
- Des changements qui rendent l’interface illisible, non navigable au clavier, incompatible avec reduced motion ou dépendante d’un effet visuel pour communiquer un état.
- Une refonte décorative de « SaaS moderne » qui sépare l’idée du résultat logiciel au lieu de montrer leur transformation.

## Technology audit

### Déjà présent

- **Next.js 16, React 19, TypeScript, Tailwind CSS 4** pour routes, composants, styles utilitaires et surfaces responsives.
- **Framer Motion 12** est utilisé par le chat, l’accueil et certains composants de workspace. **`motion` 12** est aussi déclaré; vérifier si les deux paquets sont nécessaires avant de standardiser.
- **CSS moderne** : variables CSS, gradients radiaux, `color-mix()`, couleurs OKLCH, backdrop filters, media queries, transitions, keyframes, `prefers-reduced-motion`.
- **SVG** pour le symbole Idealy et de petites illustrations/icônes; **Lucide** pour les commandes.
- DOM React pour la preview locale, les états du workspace et l’illustration du canvas. CodeMirror pour éditeur de code.

### À envisager selon un besoin produit précis

| Technologie | Usage possible | Problème résolu | Coût / recommandation |
| --- | --- | --- | --- |
| Motion (choisir un seul package d’API) | Transitions d’étapes, entrée/sortie de panneaux, présence d’un agent actif | Cohérence des transitions basées sur l’état React | Dépendance et travail JS; conserver Framer Motion si déjà adopté, rationaliser le doublon `motion` avant extension. |
| GSAP | Séquence de lancement de mission si elle comporte plusieurs phases coordonnées | Timeline complexe avec synchronisation fine | Taille et complexité supplémentaires; pas nécessaire pour transitions courtes de panneaux ou barres. |
| SVG | Schéma DAG, connecteurs, marque et annotations vectorielles | Relations spatiales nettes, zoomables et accessibles | Peu coûteux à taille raisonnable; bon choix pour la visualisation de graphe et les traits du canvas. |
| Canvas 2D | Grand graphe interactif ou visualisation dense mesurée | Dessiner de nombreux nœuds/liaisons plus efficacement que DOM | Accessibilité et hit-testing à refaire en HTML; ne pas l’utiliser pour le layout standard ou le preview applicatif. |
| Web Workers | Analyse locale lourde ou calcul de layout de graphe qui bloque réellement l’interface | Déplacer CPU hors du thread UI | Transfert/sérialisation et cycle de vie supplémentaires; hors besoin démontré sur la démo actuelle. |
| View Transitions API | Transition de navigation entre une mission et sa vue de résultat | Conserver visuellement un objet partagé entre routes | Progressive enhancement et respect des préférences de mouvement; utile seulement si les routes et la transition apportent de la continuité. |

### À éviter pour l’instant

| Technologie | Raison |
| --- | --- |
| Three.js / React Three Fiber / WebGL | Le produit doit expliquer tâches, code, changements et preview DOM; aucun besoin 3D n’est démontré. Coûts GPU, bundle, hydratation, accessibilité et fallback seraient élevés. |
| WebGPU | Support et disponibilité dépendent des navigateurs et matériels; aucune charge de calcul GPU dans l’expérience auditée ne justifie ce risque. |
| GSAP supplémentaire | Ajoute une seconde couche d’animation alors que CSS et Framer Motion couvrent déjà les besoins visibles. |
| `<canvas>` comme interface de workspace | Perd le texte natif, l’accessibilité et la flexibilité de layout; réserver un canvas technique à une visualisation vraiment dense avec équivalent DOM. |

## Visual inspection notes

- `/demo-flow` s’est affiché dans le navigateur sur `localhost:3100` avec les trois zones et le preview « Atelier Horizon » visibles à 1280 px.
- L’état initial expose la voie, les agents, une ressource, l’idée, le bouton de démarrage, quatre vues de canvas, les trois formats de preview, le studio UX et les commandes de présentation.
- Le studio UX est affiché par défaut : des curseurs et une sélection couvrent le hero du preview. Cela aide à illustrer la revue mais masque partiellement le titre et peut être pris pour une collaboration live.
- Le navigateur a signalé un problème `ClientFetchError` Auth.js (« problem with server configuration ») dans l’overlay Next. L’écran reste rendu; l’erreur doit être corrigée ou expliquée avant de considérer cette route propre en environnement local.
- Le serveur local était déjà en cours sur le port 3100. Le lancement secondaire sur 3000 a échoué car un autre serveur détient le verrou `.next`; aucun processus existant n’a été arrêté.
- La taille mobile, les animations au fil du temps et la console serveur n’ont pas été vérifiées; ne pas interpréter cet audit comme une validation responsive ou de configuration d’authentification.

## Recovery and implementation recommendation

L’historique contient plusieurs jalons utiles : `6bd4c54` (démo workspace locale), `174b2fc` (canvas redimensionnable), `7da0551` (contrôles workspace vérifiés) et `795499c` (présence Idealy originale). Aucun de ces intitulés seuls ne prouve qu’un commit est « la meilleure identité visuelle »; l’identité la plus défendable est la composition de l’expérience actuelle autour du parcours, du canvas et de la marque, pas un ancien snapshot choisi uniquement sur son titre.

**Premier système à implémenter : le workspace de mission desktop, centré sur le canvas et le fil de transformation.** Partir de l’écran `demo-flow` comme référence comportementale, conserver le split chat/preview, puis concevoir le langage d’un seul cycle réel : idée → étape et agent actif → artefact → changement visible dans le preview → validation. Cela établira les tokens de surface, l’éclairage d’activité, les états d’agent et la motion avant de propager le système à la landing et aux autres routes. Aucune implémentation n’a été faite dans cet audit.
