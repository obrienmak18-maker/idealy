# Audit d’adoption Material 3 — Idealy

Date : 14 octobre 2026  
Branche d’audit et d’implémentation : `feat/idealy-material3-ui`  
Base : `feat/idealy-live-backend`

## Décision de design

Utiliser Material 3 comme référence de hiérarchie, de surfaces, d’états de focus, de menus et de dialogues — pas comme une refonte complète ni comme une nouvelle bibliothèque UI. Conserver l’identité d’Idealy (palette verte en thème clair, surfaces bleu nuit en thème sombre), les composants métier et les outils de développement. Aucun paquet Material n’est nécessaire pour ce premier lot.

## Modifications réalisées dans ce lot

- Ajout de tokens CSS sémantiques de surfaces : `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`, `outline-variant`, `primary-container`, `on-primary-container` et `on-surface-variant`, avec des valeurs claires et sombres. La palette de base existante n’a pas été remplacée.
- Champs texte et zones de texte : rayons plus cohérents, surface sémantique et anneau de focus moins massif.
- Sélecteurs : surfaces et contour sémantiques, rayon harmonisé et état actif moins dépendant de la couleur d’accent décorative.
- Dialogues et confirmations : contour et surface sémantiques, rayon cohérent et voile de fond moins opaque.
- Menus déroulants et popovers : surface sémantique et élévation plus sobre.
- Infobulles : rayon plus compact.

Fichiers modifiés :
- `app/globals.css`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/select.tsx`
- `components/ui/dialog.tsx`
- `components/ui/alert-dialog.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/popover.tsx`
- `components/ui/tooltip.tsx`

### Deuxième passe — workspace et interactions

La deuxième passe étend la même direction visuelle aux composants réellement utilisés dans le workspace :

- `components/ui/button.tsx` : états de survol des boutons et surfaces sémantiques pour les actions secondaires.
- `components/ui/input-group.tsx` : champs groupés et zone de prompt avec un contour plus léger et un focus plus discret.
- `components/ui/command.tsx` : surfaces de palette de commandes et état de sélection lisible.
- `components/ai-elements/model-selector.tsx` : surface du sélecteur de modèles IA.
- `components/ai-elements/prompt-input.tsx` : surface du compositeur de prompt, sans changer son comportement d’envoi.
- `app/(chat)/settings/appearance/page.tsx` : état sélectionné des thèmes et des langues, avec `aria-pressed` pour la sélection du thème.
- `components/ui/sidebar.tsx` et `components/chat/app-sidebar.tsx` : focus clavier, entrée de navigation active et action « Nouvelle discussion ».
- `components/chat/build-top-bar.tsx` : surfaces des menus personnalisés de la barre d’outils du workspace.

Ces changements sont limités aux classes de présentation et à l’attribut d’accessibilité `aria-pressed`. Le moteur IA, l’orchestration des agents, le cycle de vie de l’aperçu, les commandes de l’éditeur et les connecteurs ne sont pas modifiés dans ces fichiers.

### Troisième passe — catalogue et fiches de connecteurs

Cette passe corrige des vues de connecteurs qui utilisaient auparavant des fonds et textes sombres codés en dur, ce qui empêchait leur adaptation normale au thème clair.

Fichiers adaptés :
- `app/(chat)/plugins/page.tsx` : vue catalogue et filtres maintenant basés sur les tokens du thème, états actifs plus visibles et boutons de filtre dotés de `aria-pressed`.
- `components/connectors/connector-card.tsx` : cartes et étiquettes harmonisées sur les surfaces/contours sémantiques.
- `components/connectors/connector-catalog.tsx` : champ de recherche et liste du catalogue adaptés aux tokens.
- `components/connectors/connector-detail-view.tsx` : fiche, état de connexion, capacités, notes de sécurité et périmètre de données adaptés au thème.
- `components/chat/workspace-templates.tsx` : cartes de modèles démarrage et focus clavier harmonisés.
- `app/(chat)/settings/layout.tsx` : surface des contenus de paramètres accordée au système sémantique.

Les changements restent dans le style et quelques états d’accessibilité ; la logique de chargement des intégrations, le flux OAuth et les services de connecteurs ne sont pas modifiés intentionnellement. Le bouton d’état de connexion existant de la fiche détail conserve sa logique locale déjà présente ; cette passe n’en fait pas une validation OAuth réelle.

### Quatrième passe — navigation et paramètres

Les écrans de paramètres partagés ont maintenant les mêmes contours, surfaces et actions que le reste de l’interface :
- `app/(chat)/settings/layout.tsx` : navigation de paramètres avec état actif sémantique, focus clavier et `aria-current="page"`.
- `app/(chat)/settings/notifications/page.tsx` : cartes de préférences, interrupteurs et action d’autorisation navigateur harmonisés.
- `app/(chat)/settings/privacy/page.tsx` : champs de clés, bouclier, sélection de rétention et action de nettoyage harmonisés ; les actions existantes restent inchangées.
- `app/(chat)/settings/data/page.tsx` : cartes de stockage, mémoire, export et réinitialisation harmonisées.
- `app/(chat)/settings/shortcuts/page.tsx` : lignes de raccourcis, touches clavier et boutons de test harmonisés.

Les modifications restent visuelles et accessibilité uniquement ; la logique de facturation, permissions, stockage, rétention et actions existantes n’a pas été réécrite.

## Audit des 28 zones

Important : ce tableau distingue les composants partagés effectivement lus des écrans métier qui restent à localiser et à examiner. « À inspecter » ne veut pas dire que la fonctionnalité manque ; cela signifie que son rendu spécifique n’a pas été validé à partir du code source ou dans l’application en fonctionnement.

| # | Zone | État | Décision |
|---:|---|---|---|
| 1 | Préférences générales | À inspecter | Réutiliser les primitives modifiées ; vérifier le layout réel avant d’y toucher. |
| 2 | Thèmes et apparence | Fondation ajoutée | Tokens clairs/sombres ajoutés ; vérifier contraste, bascule système et réglages propres à Idealy. |
| 3 | Sélecteur de modèle IA | Fondation modifiée | Le composant Select est adapté ; inspecter les cartes/options spécifiques aux modèles. |
| 4 | Menus contextuels | Adapté (primitive) | Dropdown Menu utilise les nouvelles surfaces et les états de sélection cohérents. |
| 5 | Dialogues de confirmation | Adapté (primitives) | Dialog et Alert Dialog harmonisés ; valider les cas destructifs et les longues descriptions à l’écran. |
| 6 | Filtres et vues | À inspecter | Repérer filtres, menus et vues réelles ; réutiliser Select/Dropdown lorsqu’ils sont déjà employés. |
| 7 | Création de projet | À inspecter | Ne pas remplacer le parcours métier sans vérifier les champs, validations et états. |
| 8 | Progression et tâches | À inspecter | Préserver les états de mission et leur sémantique ; appliquer la nouvelle couche uniquement aux contrôles standards. |
| 9 | Choix des agents | À inspecter | Préserver l’identité Ninja/Mage/Hunter/Professionnel et leurs présentations spécifiques. |
| 10 | Réponses IA et streaming | À inspecter | Garder le rendu de flux et les contrôles spécifiques ; aucun changement au moteur de streaming dans ce lot. |
| 11 | Zone de saisie du prompt | Fondation partiellement adaptée | Input/Textarea harmonisés ; localiser le composer réel avant toute modification de sa mise en page. |
| 12 | Sidebar et navigation | À inspecter | Tokens de sidebar existants conservés ; ne pas changer navigation ou état actif sans inspection dédiée. |
| 13 | Barre supérieure | À inspecter | Conserver les contrôles d’espace de travail ; vérifier densité, responsive et actions secondaires. |
| 14 | Aperçu live | À conserver / inspecter | Aucun changement à la surface du canvas ni au cycle de vie de l’aperçu. Vérifier visuellement avant de retoucher. |
| 15 | Éditeur de code | À conserver / inspecter | CodeMirror et ses thèmes restent intacts ; éviter de faire appliquer les styles de formulaire à l’éditeur. |
| 16 | Fichiers et explorateur | À inspecter | Vérifier l’arborescence, les menus de fichiers et les états de sélection avant adaptation. |
| 17 | Console et erreurs | À conserver / inspecter | Aucun changement aux sorties de console ou à la logique d’erreur. |
| 18 | Actions de génération | À inspecter | Contrôler les états en cours, annulé, échoué et réussi ; préserver les actions critiques. |
| 19 | Modèles et fournisseurs IA | À inspecter | Inspecter la configuration métier et les états de disponibilité avant de modifier. |
| 20 | Raccourcis clavier | À inspecter | Garder les commandes clavier et les dialogues de palette fonctionnels. |
| 21 | Compte et sécurité | À inspecter | Ne pas refondre les parcours d’authentification ou de sécurité dans ce lot visuel. |
| 22 | Création et renommage | Fondation modifiée | Les champs standard bénéficient du nouveau style ; vérifier les formulaires inline et les validations. |
| 23 | Notifications et alertes | Partiel / à inspecter | La primitive Alert Dialog est harmonisée ; les notifications toast et alertes métier restent à localiser. |
| 24 | États vides et chargement | À inspecter | Les styles de skeleton globaux sont conservés ; contrôler chaque état en contexte. |
| 25 | Connexion GitHub | À inspecter | Aucun changement à l’OAuth, aux permissions ou à la connexion. |
| 26 | Configuration Supabase | À inspecter | Aucun changement aux connecteurs, clés, variables ou états de liaison. |
| 27 | Connexion Figma | À inspecter | Aucun changement à l’intégration ni aux autorisations. |
| 28 | Suppression et déploiement | Partiel / à inspecter | Confirmation générique harmonisée ; vérifier précisément les avertissements et les actions destructives/déploiement. |

## Vérifications à faire avant fusion

Ces vérifications ne peuvent pas être déclarées réussies sur la seule base d’une écriture via l’API GitHub. Elles doivent être exécutées dans un environnement qui dispose du dépôt et des dépendances :

1. `pnpm typecheck`
2. `pnpm check`
3. `pnpm build`
4. Vérification visuelle en thème clair et sombre, fenêtre étroite et large.
5. Parcours des dialogues destructifs, Select, menus clavier, champs en erreur et focus clavier.
6. Vérifier que le canvas/aperçu, CodeMirror, streaming IA, connexions de services et déploiement n’ont pas régressé.

## Limites connues

- L’arborescence métier complète et tous les écrans ne sont pas encore inspectés ; les entrées « À inspecter » ne sont pas déclarées terminées.
- Les commandes de test et le build n’ont pas été exécutés depuis cette session.
- Cette branche est une proposition isolée. Ne pas fusionner tant que les contrôles locaux et visuels ne sont pas passés.

