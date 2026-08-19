# Audit du ZIP `Idealy-Studio`

## Conclusion courte

Le ZIP est **exploitable comme base frontend de démonstration avancée**, mais ce n’est pas encore une application Idealy complète avec backend fonctionnel. Sa valeur principale est la maquette React interactive : elle contient déjà le parcours de clarification, la planification avant construction et une première composition dynamique d’agents selon le type de projet. Il faut conserver ces idées et les intégrer progressivement dans l’application Idealy existante, sans remplacer le backend Supabase/Stripe déjà construit.

## Ce que contient réellement le ZIP

Le projet est un workspace pnpm avec deux artifacts principaux : `artifacts/mockup-sandbox` et `artifacts/api-server`.

| Partie | État réel | Valeur |
|---|---|---|
| `mockup-sandbox` | React + Vite + Tailwind + Framer Motion + Lucide + Radix | Maquette interactive exploitable pour l’UX. |
| `DesignMockupPage.tsx` | Parcours accueil, onboarding, workspace, mission et preview | Base la plus utile du ZIP. |
| `ClarificationPhaseMockup.tsx` | Flux séparé idée → clarification → planning | Très bon concept à intégrer avant la construction. |
| `api-server` | Express, CORS, JSON et `GET /api/healthz` | Scaffolding technique, pas backend produit. |
| Replit/Vite plugin | Génération et preview de composants isolés | Outil de sandbox, pas fonctionnalité Idealy finale. |
| `.local`, store pnpm, `dist` | Caches et artefacts générés | À ne pas reprendre dans le dépôt de production. |

## Ce qui est réellement bon et doit être conservé

La maquette principale ajoute une phase `planning` entre la réflexion et la construction. Le parcours devient `thinking → planning → building → ready`. La preview ne s’ouvre qu’au démarrage de la construction, ce qui correspond à la règle produit voulue.

Le point le plus important est la fonction `getProjectTeam`. Elle ne présente plus exactement la même équipe pour chaque mission. Elle identifie actuellement quelques familles simples — réservation, tableau de bord, outil d’organisation ou application web exploratoire — puis compose une petite équipe : un Éclaireur, un Architecte, et soit un Analyste soit un Designer. Ce n’est pas encore le moteur dynamique réel, mais c’est une **preuve d’interface crédible** du concept d’équipe composée selon le projet.

Le `PlanCard` rend cette composition visible avant la construction. L’utilisateur voit l’intention comprise, le périmètre V1, les agents retenus et le bouton « Valider et construire ». Cette structure doit être reprise dans Idealy, puis alimentée par le véritable Intent Router et l’Orchestrateur backend.

La maquette séparée `ClarificationPhaseMockup` est également intéressante. Elle pose trois questions simples sur l’intention, l’audience et la sensation recherchée, garde un résumé du brief à côté et permet de modifier une réponse. Elle montre une façon utile d’éviter que l’IA code trop tôt à partir d’une idée floue.

## Ce qui n’est pas encore réel

Le ZIP ne contient pas de logique Supabase, Stripe, OAuth, crédits, pipeline IA, WebContainer réel, authentification, persistance, base de données métier ou déploiement. Le serveur Express ne contient qu’un healthcheck. Les boutons de connexion, Figma, GitHub, import, publication et connecteurs affichent des notices simulées.

Les agents sont seulement représentés par des objets locaux et une heuristique de mots-clés. Une demande inconnue retombe sur `application web exploratoire`. Cette logique est utile pour le mockup, mais elle ne doit pas être présentée comme une compréhension IA réelle.

La preview `LUMA PIZZA`, le code `PizzaHome.tsx` et les tables `reservations`, `menu_items` et `opening_hours` sont des données de démonstration. Elles ne prouvent pas que le générateur crée actuellement une application persistante ou publiable.

## Vérification technique

Après installation hors ligne dans une copie isolée, le typecheck du sandbox passe. Le build Vite passe également avec les variables attendues par sa configuration Replit : `PORT=4176` et `BASE_PATH=/`.

Le build produit notamment :

| Sortie | Taille gzip approximative |
|---|---:|
| `DesignMockupPage` | 59,15 kB |
| `ClarificationPhaseMockup` | 5,36 kB |
| bundle principal | 60,19 kB |
| CSS principal | 20,20 kB |

Le premier `pnpm install` du ZIP s’est arrêté sur la politique de scripts ignorés pour `esbuild`, mais les binaires déjà installés ont permis de vérifier directement TypeScript et Vite. Ce problème concerne l’installation de la copie d’analyse, pas une erreur de logique dans la maquette.

## Recommandation d’intégration

Il ne faut pas copier tout le ZIP dans Idealy et remplacer l’application actuelle. Il faut récupérer trois éléments conceptuels :

1. **La phase de clarification**, branchée au routeur d’intention avant l’exécution.
2. **La carte de planification**, alimentée par l’Orchestrateur réel et validée avant l’écriture dans le WebContainer.
3. **La composition dynamique de l’équipe**, avec des rôles et responsabilités retournés par le backend au lieu d’une liste fixe côté frontend.

La prochaine implémentation sûre serait de porter dans la route V2 actuelle les types `AgentRole`, `inferProject` et `getProjectTeam` sous forme d’adaptateurs temporaires, puis de remplacer l’heuristique locale par la réponse structurée de `process-ai-request` ou d’un futur endpoint d’orchestration. Le design doit rester stable pendant ce branchement.

Le ZIP est donc une bonne base de travail pour **l’expérience de clarification et de composition d’équipe**, mais pas une base de remplacement du backend.

## Portage du 19 août 2026

La maquette principale du ZIP a été copiée dans `artifacts/idealy/src/routes/DesignMockupPage.tsx`. Le typecheck frontend et le build Vite passent. La route `/design-mockup` affiche bien la page d’accueil du ZIP avec le composer, les starters et les actions de parcours. Lors du premier test navigateur, les deux tentatives de clic sur le bouton central n’ont pas déclenché de transition visible ; ce point reste à diagnostiquer avant de considérer l’interaction comme validée.

La route de production `WorkspacePage` n’a pas encore été remplacée et le backend n’a pas encore été branché à la maquette portée.


Le diagnostic montre que le bouton principal était correctement désactivé parce que le composer était vide. Le clic sur le starter pizzeria remplit le composer et déclenche le toast de dictée simulée dans la maquette. L’interaction de démarrage doit maintenant être testée après sélection d’un starter, et non depuis l’état initial vide.


Le clic programmatique sur le starter a confirmé que le handler React fonctionne : après un court délai, le textarea contient bien `Une landing page élégante pour une pizzeria artisanale`. Les premiers clics visuels n’avaient pas touché le bon élément ou avaient été inspectés avant la mise à jour d’état React. Le portage du starter est donc fonctionnel ; le bouton de lancement peut être testé ensuite dans le même état.


Le lancement du starter fonctionne. Après le clic, la maquette affiche l’onboarding du ZIP avec la progression `1 / 3`, le choix Ninja/Mage/Hunter/Pro et le bouton de continuation. Le parcours porté conserve donc bien le passage accueil → mission → sélection de voie.
