# Charte de design Idealy

Cette charte est la source de vérité visuelle et motion pour le frontend Idealy. Elle ne modifie pas les voies Ninja, Mage, Hunter et Pro : celles-ci restent des identités thématiques et narratives, jamais des niveaux tarifaires.

## 1. Direction esthétique

Idealy doit associer la sobriété structurelle de Linear, la précision d’un éditeur de code moderne et l’énergie narrative d’un univers shonen. L’interface reste sombre, respirante et orientée vers une seule action principale : décrire puis suivre une mission.

La composition doit donner la priorité au contenu actif, à la barre de commande et au Canvas. Les effets visuels servent la compréhension de l’état de la mission ; ils ne doivent jamais concurrencer le code, le preview ou le message de l’utilisateur.

## 2. Tokens visuels

| Token | Valeur | Usage |
|---|---|---|
| `--idealy-bg` | `#0a0a0f` | Fond principal de l’application |
| `--idealy-surface` | `#12121a` | Surface secondaire, rail et panneaux |
| `--idealy-border` | `#1f1f2a` | Bordures discrètes et séparateurs |
| `--idealy-text-1` | `#f4f4f5` | Texte principal |
| `--idealy-text-2` | `#a1a1aa` | Texte secondaire et métadonnées |
| `--idealy-accent` | `linear-gradient(90deg, #8b5cf6, #f97316)` | CTA, focus et bordures premium |
| `--idealy-thinking` | `linear-gradient(90deg, #22c55e, #eab308, #3b82f6)` | Réflexion, écriture et progression |

Les accents de voie sont des nuances de la même architecture : Ninja utilise slate/zinc, Mage violet/indigo, Hunter amber/emerald et Pro blue/slate. Aucun accent de voie ne doit être interprété comme un prix ou une permission fonctionnelle.

## 3. Charte des moteurs et des effets

### 3.1 Un moteur par surface

| Surface | Moteur autorisé | Règle |
|---|---|---|
| `/demo` et workspace | Framer Motion | Transitions de MissionFlow, relais, convocation, présence et drawers |
| Landing publique | GSAP | Scroll storytelling et animations de sections, chargé en lazy uniquement |
| Orb du Kage | React Three Fiber | Un seul composant isolé `<KageOrb />`, chargé à la demande |
| Micro-récits | Lottie | Réflexion, succès et « Oui chef ! », chargés à la demande |
| CSS statique | CSS/Tailwind | Shimmer et dégradés légers, sans nouveau moteur |

Un même nœud DOM ne doit jamais être animé par deux moteurs. Framer Motion ne doit pas être importé dans les modules GSAP de la landing, et GSAP ne doit jamais être importé dans `/demo`.

### 3.2 Budget d’effets

Un écran peut afficher au maximum deux effets « wow » simultanément. Les états fréquents privilégient l’opacité, la transformation et les transitions courtes. Les effets non essentiels respectent `prefers-reduced-motion: reduce`.

Les animations d’interface doivent rester généralement inférieures à 300 ms. Les entrées commencent à une échelle proche de la taille finale, par exemple `scale(0.95)` et `opacity: 0`, jamais `scale(0)`.

### 3.3 Effets source-controlled

Les effets inspirés d’Aceternity ou Magic UI ne sont pas ajoutés comme dépendances npm. Le code des effets réellement utilisés est copié, adapté et versionné sous `src/components/ui-effects/`. Chaque effet doit être compatible avec les tokens ci-dessus et ne doit pas introduire une palette parallèle.

## 4. Frontières fonctionnelles

Le redesign est strictement frontend. Les crédits, Stripe, remboursements, intent router, BYOK, Pexels, génération d’images, Edge Functions, VFS et contrats backend existants ne sont pas modifiés par cette charte.

Le code généré est affiché exclusivement dans Monaco. Le fil MissionFlow ne doit jamais devenir un bloc de code ou une seconde surface d’éditeur. Lia reste narrative : elle transmet, annonce et accompagne, mais ne génère ni code ni Canvas.

## 5. Accessibilité et responsive

Les commandes restent accessibles au clavier, disposent d’un focus visible et utilisent des libellés explicites. Les animations non essentielles sont désactivées ou réduites lorsque `prefers-reduced-motion` est actif. Le rail d’icônes doit conserver des tooltips et des labels accessibles sur desktop comme sur mobile.

Toute nouvelle surface doit être vérifiée sur les largeurs desktop, tablette et mobile. Les textes d’état ne doivent pas dépendre d’une couleur seule ; l’icône, le texte ou la structure doivent aussi communiquer l’état.

## 6. Critères de validation

Une étape de redesign est acceptable seulement si le typecheck et le build passent, si le chunk initial reste léger, si les moteurs d’animation respectent leur frontière et si aucune logique backend ou secret n’a été modifié. Chaque étape doit être commitée séparément sur `feat/idealy-complete-system` et ne doit pas être fusionnée vers `main` sans ordre explicite.
