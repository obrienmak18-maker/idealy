# Idealy Design Engine

Version : 1.0

## Philosophie

Idealy ne force pas un style unique. Le Design Engine analyse le produit, l’audience, la plateforme et les contraintes avant de choisir une **Design Stack minimale mais puissante**. Le frontend actuel d’Idealy conserve sa direction validée ; ce moteur guide les applications générées et les missions futures.

La règle de priorité est stricte : une technologie explicitement demandée par l’utilisateur devient obligatoire lorsqu’elle est compatible. Si elle ne l’est pas, le moteur doit expliquer le conflit et proposer une alternative. En l’absence de choix explicite, la sélection est déterministe, scorée et légèrement variable par une graine stable dérivée de la demande ; elle n’est jamais aléatoire sans contrainte.

## Tokens de base

| Dimension | Règle |
|---|---|
| Couleur | Base neutre, un accent principal, états sémantiques ; les halos et gradients restent réservés aux moments qui le justifient |
| Typographie | Hiérarchie claire, texte lisible, nombres tabulaires dans les dashboards |
| Espacement | Échelle 4/8/16/24/32 par défaut ; 4/8/12/16/24 pour les interfaces compactes |
| Radius | Modéré par défaut ; expressif seulement pour une direction ludique |
| Ombres | Élévation au service de la hiérarchie, pas d’empilement de cartes |
| Bordures | Bordure neutre fine, états focus visibles, bordures translucides seulement dans une direction futuriste |
| Icônes | Une famille principale, taille et poids cohérents, nom accessible pour toute icône interactive |
| Motion | Transform/opacity d’abord, 120–320 ms, respect de `prefers-reduced-motion` |
| Responsive | Mobile utilisable sans perte de contenu ; aucun overflow horizontal accidentel |
| Accessibilité | HTML sémantique, clavier, focus visible, contraste et alternative non visuelle pour graphiques/3D |

## Providers enregistrés

Le registre exécutable se trouve dans `lib/idealy/design-engine/providers.ts`. Chaque provider contient une catégorie, ses frameworks et plateformes, dépendances, forces, limites, cas d’utilisation, priorité, combinaisons autorisées, conflits et instructions destinées au Builder.

### Systèmes UI

`shadcn`, `radix`, `material-ui`, `chakra`, `ant-design`, `mantine`, `headless-ui` et `heroui`.

### Design assisté

`stitch` et `v0` sont des capacités d’exploration de directions, écrans, layouts et variantes. Leur présence dans le registre ne prétend pas qu’un accès runtime direct est configuré. Toute intégration externe devra passer par un connecteur officiel disponible.

### Icônes

`lucide`, `material-symbols`, `tabler` et les familles supplémentaires peuvent être ajoutés sans modifier l’orchestrateur. Une seule famille principale est choisie par défaut.

### Motion

`motion`, `gsap`, `lottie` et `css-animation`. Motion est privilégié pour les interfaces React ; GSAP est réservé aux timelines complexes ; Lottie est réservé aux moments de marque avec fallback statique ; CSS reste le choix sans dépendance.

### Data

`recharts`, `echarts` et `d3`. Recharts est privilégié pour les analytics React courants, ECharts pour les dashboards denses et D3 pour une visualisation véritablement sur mesure avec alternative tabulaire.

### 3D

`three`, `react-three-fiber` et `drei`. La 3D n’est activée que sur demande explicite ou lorsqu’elle apporte une valeur spatiale claire. Toute scène doit prévoir chargement, erreur, fallback, accessibilité, mobile et réduction de mouvement.

## Pipeline

```text
USER
  ↓
PRODUCT ANALYSIS
  ↓
DESIGN INTELLIGENCE
  ↓
DESIGN STRATEGY
  ↓
DESIGN PROVIDER SELECTION
  ↓
DESIGN SPECIFICATION
  ↓
UI GENERATION
  ↓
CODE GENERATION
  ↓
RENDER
  ↓
DESIGN CRITIC
  ↓
ITERATION
```

La fonction `buildDesignSpecification()` produit une spécification structurée avant le Builder. `designSpecificationToPrompt()` transforme cette spécification en instructions contrôlées. Le Builder reçoit donc une direction, des tokens, des dépendances autorisées et des contraintes au lieu d’inventer seul la direction artistique.

## Critic et validation

La passe Critic doit vérifier les incohérences de spacing, contraste, hiérarchie, couleur, gradients, cartes, icônes, motion, responsive, accessibilité, typographie, 3D et performance. Elle doit produire des corrections ciblées et non réécrire l’intention du produit. Les validations minimales sont le typecheck, le build, les tests de contrats, l’absence de chemins dangereux et la vérification visuelle du rendu.

## Préservation de l’existant

Le Design Engine ne remplace pas `app/globals.css`, les composants acceptés, le registre des modèles IA ni le contrat Supabase. Il les complète. Les dépendances d’un provider ne sont installées dans une application générée que si la Design Stack les sélectionne réellement.
