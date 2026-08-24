# Design Engine — audit et architecture

Date : 24 août 2026

## Décision principale

Le Design Engine est une **couche de planification typée et indépendante** qui prépare une Design Specification pour les missions Idealy. Il ne remplace pas le frontend actuel, n’importe pas l’ancien frontend Vite et ne crée pas de nouveau système d’identité, de crédits ou de persistance.

Le workspace reste une application **Next.js App Router** avec Auth.js, le mapping serveur vers Supabase Auth, Drizzle/Postgres local pour les besoins existants et Supabase comme backend canonique des missions, agents et fichiers. La consigne du prompt demandant de supprimer Auth.js/Drizzle est donc incompatible avec l’état validé du projet et est volontairement écartée.

| Sujet | Décision compatible avec l’existant |
|---|---|
| Frontend | Conserver le workspace `ai-chatbot` accepté ; aucune réintégration de `src/app`, `src/components`, `src/routes` ou `src/themes` de l’ancien Vite |
| Identité | Conserver Auth.js et le pont serveur vers Supabase Auth ; ne pas créer de registre utilisateur parallèle |
| Données | Conserver Supabase comme source canonique mission/fichiers ; ne pas ajouter de table pour le Design Engine à ce stade |
| IA | Garder Gateway et les providers Edge existants ; le Design Engine est heuristique d’abord, sans appel LLM obligatoire |
| UI générée | Injecter la Design Specification dans le planner et le Builder ; les dépendances ne sont installées que si sélectionnées |
| Google Stitch | Déclarer une capacité optionnelle et ses limites ; ne pas prétendre disposer d’une intégration runtime non vérifiée |
| Critic | Ajouter un critic statique de préflight ; aucune évaluation visuelle fictive tant que le rendu WebContainer/screenshot n’est pas actif |
| Déploiement | Aucun changement Supabase distant ni déploiement Edge dans cette étape de code |

## Audit des points d’ancrage

### `lib/ai/prompts.ts`

Ce fichier est le hub des prompts du chatbot et des artifacts : prompt assistant, prompt artifacts, `systemPrompt`, code, feuille de calcul et titre. Il reste la source pour le parcours Gateway général. La mission Idealy est orchestrée plus spécifiquement par `app/(chat)/api/chat/route.ts`, ce qui évite de coupler tout le chatbot à une stratégie de design de mission.

### `app/(chat)/api/chat/route.ts`

La route classe l’intention, crée projet/mission, demande le plan `planOnly`, publie les métadonnées de plan, puis lance `workspaceStream` pour une exécution. Le Design Engine est appelé au moment de la création du plan. Sa spécification est ajoutée au plan stocké dans `missions.input` et réinjectée dans le prompt du Builder uniquement pour l’exécution. Les conversations générales et les contrats `intentOnly` restent inchangés.

### `app/globals.css`

Le frontend validé possède déjà les tokens CSS de référence. Le thème clair utilise notamment `--background: oklch(0.965 0.012 250)`, des cartes blanches, un rayon global `0.625rem`, des ombres `--shadow-card`, `--shadow-float` et des halos Idealy bleus, orange, violets et teal. Le thème sombre utilise un fond `oklch(0.195 0 0)`, une sidebar plus sombre et des valeurs de halos dédiées. Le Design Engine ne duplique pas ces tokens : il envoie des règles de direction au Builder, tandis que l’application Idealy continue de prendre ses valeurs dans `app/globals.css`.

### `components.json`

La configuration réelle est `radix-maia`, RSC/TSX activé, CSS variables activées et `app/globals.css` comme feuille de tokens. Les alias `@/components`, `@/components/ui`, `@/lib` et `@/hooks` sont contractuels. La préférence par défaut du moteur est donc `shadcn` + `radix` conceptuellement, sans imposer l’installation de ces paquets dans le workspace déjà équipé.

### `components/chat/artifact.tsx`

Le canvas conserve les vues Preview, Code, Database et Console. Les fichiers affichés viennent désormais des metadata `missionFiles` et de l’endpoint de reprise mission. Le composant ne connaît pas encore le Design Critic, ce qui est intentionnel : les recommandations sont d’abord persistées dans le plan mission avant de créer une surface UI spécifique.

### `components/chat/data-stream-handler.tsx`

Le reducer accepte déjà des metadata extensibles : intention, mission, plan, événements de fichiers et séquence de reprise. Le plan complet contenant `design` et `designCritic` peut donc transiter sans modifier le contrat de l’UI. Un panneau Critic visible pourra être ajouté après validation du rendu réel, sans migration.

### `integrations/idealy/backend-core`

Le backend-core contient les contrats agents, orchestration et WebContainer historiques, notamment une boucle de correction qui reçoit un projet complet. Il n’est pas le chemin actuellement utilisé par la route Next vers Supabase `workspaceStream`. La première intégration Design Engine se fait donc dans le chemin live actuel ; le contrat backend-core pourra recevoir la même spécification lors de l’activation réelle du Builder/WebContainer.

### Supabase Edge `process-ai-request`

La fonction Edge garde son contrat `planOnly` existant et accepte déjà le `systemPrompt` transmis par Next. L’injection de la Design Specification depuis Next évite une migration de schéma et préserve les comportements conversationnels. La fonction doit recevoir une version future du contrat si l’on veut qu’elle valide elle-même la Design Specification, mais ce n’est pas nécessaire pour cette première tranche.

## Contrats du Design Engine

Le module `lib/idealy/design-engine` expose :

| Élément | Rôle |
|---|---|
| `DesignProvider` | Métadonnées d’un provider : catégorie, frameworks, plateformes, forces, limites, dépendances, conflits, combinaisons et instructions |
| `DesignAnalysis` | Analyse heuristique : produit, secteur, audience, framework, plateforme, densité, ton, motion, charts, 3D et accessibilité |
| `DesignSpecification` | Stack sélectionnée, tokens, contraintes, dépendances, instructions et graine stable |
| `buildDesignSpecification()` | Analyse, détection des choix explicites, filtrage et sélection déterministe |
| `designSpecificationToPrompt()` | Sérialisation concise pour le planner et le Builder |
| `runDesignCritic()` | Contrôle statique avant rendu, sans prétendre juger une capture d’écran |
| `listDesignProviders()` | Point d’extension pour inspecter le registre ou ajouter un provider documenté |

Le registre contient les catégories UI systems, design AI, icons, motion, data et 3D. Il inclut shadcn, Radix, Material UI, Chakra, Ant Design, Mantine, Headless UI, HeroUI, Stitch, v0 patterns, Lucide, Material Symbols, Phosphor, Tabler, Motion, GSAP, Lottie, CSS, Recharts, ECharts, D3, Three.js, React Three Fiber et Drei.

## Règles de sélection

Une demande explicite est détectée avant le scoring : « use Material UI », « Three.js », « Stitch », « Recharts », « Framer Motion », etc. Un choix compatible est conservé même si son score général est inférieur. En cas d’incompatibilité de framework ou de plateforme, le moteur ajoute une contrainte expliquant le problème et une alternative ; il ne remplace pas silencieusement la technologie.

Sans choix explicite, le score prend en compte la priorité du provider, le type de produit, le secteur, le framework, la plateforme, l’accessibilité, la densité, les graphiques, la motion et la 3D. La variation est contrôlée par un hash stable de la demande, et non par `Math.random()`. La stack est minimale : un système UI, une famille d’icônes, une stratégie motion et uniquement les catégories demandées par le produit.

La 3D n’est jamais ajoutée pour décorer un dashboard ou un SaaS ordinaire. Elle nécessite une demande explicite ou un cas spatial convaincant et ajoute automatiquement les contraintes de fallback, réduction de mouvement, mobile, performance et accessibilité.

## Design Critic de préflight

Le critic vérifie notamment le mélange de plusieurs systèmes UI complets, l’excès de dépendances, la 3D mobile sans garde-fous, l’absence de fallback 3D, les graphiques mobiles sans alternative, les choix d’icônes en contexte d’accessibilité renforcée et les providers explicites non sélectionnés. Il retourne un score, `passed` et une liste d’issues structurées avec recommandation.

Ce critic ne vérifie pas encore pixels, captures, contraste calculé depuis un rendu ou cohérence d’un iframe. Ces contrôles appartiendront à une phase ultérieure, après activation effective du rendu WebContainer et d’un pipeline de screenshot contrôlé.

## Persistance et sécurité

La Design Specification et le Critic sont stockés dans la metadata existante du plan mission, sous `missions.input`. Aucune clé, token provider ou secret n’est incluse. Les secrets IA restent dans les variables Edge-only. Aucun DDL Supabase n’est requis pour le Design Engine.

La migration `mission_files` et le déploiement de la fonction Edge restent une étape séparée et staged. Ils ne doivent pas être considérés comme live tant qu’ils ne sont pas appliqués puis testés sur la cible Supabase canonique.

## Suite recommandée

La prochaine tranche doit ajouter des tests déterministes couvrant un choix Material UI, un choix Three.js, un choix Stitch, un conflit de systèmes UI, la stabilité de la graine et les garde-fous mobile/3D. Ensuite, elle peut afficher un résumé Design Stack/Critic dans les metadata du workspace, puis propager le même contrat dans l’orchestrateur WebContainer lors de son activation réelle.
