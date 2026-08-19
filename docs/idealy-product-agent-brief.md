# Brief de compréhension produit — Idealy

## À lire avant toute proposition de design ou d’implémentation

Idealy est un **studio IA de création d’applications no-code/low-code**. Sa promesse n’est pas de produire uniquement une jolie maquette. Idealy doit transformer une idée en une application réellement explorable, puis progressivement réellement utilisable : interface, logique métier, données, intégrations, code, tests et déploiement.

La maquette React actuelle est uniquement une représentation frontend destinée à valider l’expérience. Elle ne doit pas être interprétée comme la totalité du backend existant et elle ne doit pas inventer des connexions qui ne sont pas branchées. Le backend réel comprend déjà une base Supabase, une logique de crédits IA, Stripe, des fonctions Edge, des connecteurs OAuth et une couche Managed/BYOK. La future interface devra s’y connecter proprement, sans casser ces fondations.

## 1. Les voix ne sont pas des plans tarifaires

L’utilisateur choisit d’abord une **voix**. Aucune voix ne doit être imposée par défaut et aucune équipe d’agents ne doit être affichée avant que la voix et le projet soient connus.

Les quatre voies narratives actuelles sont **Ninja, Mage, Hunter et Pro**. Elles ne représentent ni un prix, ni une quantité de crédits, ni un niveau technique obligatoire. Elles représentent une manière de travailler : vocabulaire, énergie, ton, rythme, degré d’exploration et style de communication.

| Voix | Intention narrative | Conséquence comportementale attendue |
|---|---|---|
| Ninja | Aller droit vers une première version claire | Réponses courtes, priorités nettes, exécution rapide, peu de cérémonie. |
| Mage | Explorer et donner une forme neuve à une idée | Plus d’exploration, propositions créatives, variantes et attention au concept. |
| Hunter | Viser un résultat concret et mesurable | Questions orientées objectif, utilisateurs, conversion, usage et validation. |
| Pro | Garder une structure précise et contrôlable | Explications techniques plus détaillées, architecture, limites et décisions explicites. |

Ces noms sont des identités narratives reconnaissables. Il faut les faire vivre dans les messages, les formulations, les animations et la façon de présenter le travail. Il ne faut pas les réduire à quatre cartes génériques avec une couleur différente.

Une voix ne doit pas décider seule de toute l’application. Elle définit la personnalité du système, puis Idealy analyse le projet et compose l’équipe nécessaire.

## 2. L’équipe d’agents est dynamique

Idealy ne fonctionne pas avec une liste fixe d’agents préassemblée. Après le choix de la voix et l’analyse de la demande, l’Orchestrateur détermine les domaines réellement nécessaires.

Pour une landing page, l’équipe pourra avoir besoin d’un agent produit/UX, d’un agent direction visuelle et d’un agent frontend. Pour une marketplace, il faudra probablement ajouter les flux acheteur/vendeur, le modèle de données, les règles métier, la recherche et la qualité. Pour un outil métier, l’équipe pourra être centrée sur les workflows, les permissions, les tableaux de bord et les données. Pour une application mobile, elle devra tenir compte des écrans mobiles, de la navigation native, des états hors ligne éventuels et des contraintes de publication mobile.

Les rôles possibles sont donc des **capacités instanciées selon le projet**, pas une équipe obligatoire : analyse produit, UX, direction visuelle, frontend, backend, base de données, intégrations, sécurité, tests, accessibilité, déploiement ou documentation. Un rôle inutile ne doit pas être créé pour faire croire que le système est plus puissant.

Chaque agent possède une responsabilité claire et un périmètre de fichiers ou de décisions. L’utilisateur doit pouvoir comprendre : qui travaille, sur quelle partie, pourquoi ce rôle existe, ce qui est terminé, ce qui bloque et quel résultat sera remis. Les agents ne doivent pas écrire une conversation confuse de type WhatsApp dans laquelle tous les messages sont mélangés.

L’interface doit présenter une **vue de mission structurée** : intention comprise, plan, équipe composée, responsabilités, progression par domaine et décisions importantes. Les détails peuvent être ouverts, mais la lecture principale doit rester calme.

L’Orchestrateur n’est pas une carte décorative affichée en permanence. C’est le coordinateur qui analyse la demande, sélectionne les capacités nécessaires, répartit le travail, récupère les résultats et décide de la prochaine étape. Les agents spécialisés interviennent uniquement quand le projet le justifie.

## 3. Déroulement d’une mission

Le déroulement doit respecter cette séquence :

1. L’utilisateur choisit une voix et décrit son idée.
2. Idealy comprend l’intention. Une simple conversation ou une demande vague ne doit pas ouvrir immédiatement un canvas de code.
3. Idealy détermine si le message relève de la conversation, de l’idéation ou de l’exécution.
4. Si une construction est demandée, Idealy analyse le domaine du projet et compose l’équipe minimale nécessaire.
5. L’équipe produit un plan lisible avant d’écrire le code.
6. La construction commence seulement après cette phase de réflexion et de planification.
7. La preview et les outils apparaissent lorsque la construction commence, pas avant.
8. L’application générée doit être reliée à une structure réelle : routes, composants, logique, données et états utiles. Une simple image ou une page de démonstration ne suffit pas.
9. Le résultat est vérifié par compilation, tests ou exécution locale. Les erreurs doivent revenir dans une boucle de correction contrôlée.
10. L’utilisateur peut explorer, demander des modifications, voir le code, inspecter les données et publier lorsque le projet est réellement prêt.

La conversation pure reste légère et humaine. Une mission d’exécution ouvre progressivement les outils : timeline, preview, code, données et terminal. Cette séparation évite de demander des validations ou d’afficher des panneaux techniques pendant une discussion ordinaire.

## 4. Interface et langues

Idealy doit fonctionner en français, anglais et dans les autres langues configurées. La langue de l’interface et la langue de communication des agents doivent pouvoir être choisies ou déduites proprement. Les agents doivent répondre dans la langue sélectionnée et conserver la cohérence de leurs termes techniques.

La traduction ne doit pas être un simple remplacement mécanique de quelques boutons. Il faut prévoir les textes de l’onboarding, les messages des agents, les statuts, les erreurs, les actions de code, les libellés du paywall et les contenus de la timeline.

L’expérience recherchée est minimale comme ChatGPT, Gemini, Claude ou v0 : beaucoup d’espace, une hiérarchie claire, peu de boutons visibles à la fois et des animations expressives mais utiles. Idealy peut être plus pétillante et vivante grâce aux voix, aux états de réflexion, aux battements, aux ondes de dictée et aux transitions, mais elle ne doit pas devenir un tableau de bord saturé.

La sidebar reste utile dans l’espace de travail pour les missions et la navigation. La top bar est principalement liée à une mission active. La preview reste fermée au démarrage et s’ouvre lorsque la construction commence. Le code et les données sont secondaires par rapport au résultat visible. Le terminal et les logs restent dans un tiroir indépendant.

## 5. Preview, code et données

La preview est le centre de gravité de la construction. Elle doit montrer une application qui évolue, et non une image statique. Pendant la réflexion, elle peut rester fermée ou afficher une attente discrète. Pendant la construction, elle peut afficher un état de compilation ou une première structure. Lorsqu’un résultat est prêt, elle présente une application explorable.

Le panneau Code permet de comprendre et modifier ce qui a été généré. Le panneau Data permet de voir le modèle de données, les tables ou collections et les relations utiles. La base de données est une fondation importante, mais son modèle doit être défini à partir du produit réel. Il ne faut pas créer des tables décoratives uniquement pour remplir une interface.

Les applications doivent viser l’utilité réelle : formulaires qui fonctionnent, navigation cohérente, états de chargement, erreurs compréhensibles, données persistantes lorsque le backend est branché, permissions lorsque le domaine l’exige et intégrations configurables. Le mockup peut simuler ces états, mais il doit les représenter comme des états futurs clairement identifiés, pas comme des fonctionnalités déjà opérationnelles.

## 6. Paywall et modèle économique

Le choix d’une voix ne déclenche jamais un paywall. Les voies Ninja, Mage, Hunter et Pro restent narratives et sont séparées du modèle économique.

Le paywall appartient à la facturation et à la consommation de fonctionnalités IA. L’interface peut garder un parcours gratuit ou d’essai avec des crédits limités. Les requêtes coûteuses peuvent consommer des crédits. Un utilisateur qui apporte sa propre clé selon le fonctionnement BYOK peut être traité différemment du mode Managed, mais cette différence doit être expliquée clairement et ne doit pas modifier l’identité de sa voix.

Le paywall doit apparaître dans un contexte compréhensible : consultation du plan, crédits insuffisants pour une action, choix d’un abonnement ou ouverture volontaire des paramètres de facturation. Il ne doit pas interrompre l’onboarding narratif et ne doit pas faire croire que Pro est une cinquième voix ou que la voix Pro est payante.

## 7. Prix Stripe : vérité et source de référence

Les prix ne doivent jamais être repris depuis une maquette, une capture d’écran ou un chiffre inventé dans un composant frontend. La source de vérité opérationnelle est Stripe, via les identifiants de prix configurés dans les secrets des Edge Functions.

Le dépôt contient le script officiel utilisé pour créer les produits et prix Idealy. Il définit les montants suivants :

| Produit de facturation | Cycle | Montant défini dans le script Stripe | Identifiant attendu |
|---|---|---:|---|
| Idealy Pro | Mensuel | 29 € / mois | `STRIPE_PRICE_ID_PRO_MONTHLY` |
| Idealy Pro | Annuel | 249 € / an | `STRIPE_PRICE_ID_PRO_YEARLY` |
| Idealy Business | Mensuel | 79 € / mois | `STRIPE_PRICE_ID_BUSINESS_MONTHLY` |
| Idealy Business | Annuel | 699 € / an | `STRIPE_PRICE_ID_BUSINESS_YEARLY` |

Ces montants sont ceux définis dans `scripts/create-stripe-products.mjs` [1]. Ils ne doivent pas être remplacés par les faux prix d’une ancienne maquette. Toutefois, pour être parfaitement honnête, cette session n’a pas pu lire le compte Stripe en direct : la connexion Stripe MCP a été indisponible et les identifiants de prix ne sont pas commités dans le dépôt. L’agent ne doit donc pas affirmer que ces quatre prix sont actuellement actifs en production sans vérifier le catalogue Stripe ou les secrets de déploiement.

La règle d’implémentation est simple : le frontend doit recevoir le plan et le statut depuis le backend, et le backend doit associer les abonnements aux vrais Price IDs Stripe. Aucun montant ne doit être dupliqué dans plusieurs composants. Si Stripe contient une valeur différente, Stripe gagne et le copywriting du paywall doit être mis à jour à partir de Stripe.

Le paywall devra distinguer au minimum le plan gratuit ou d’essai, le plan Pro et le plan Business, sans les confondre avec les quatre voix narratives. Les avantages exacts doivent être affichés seulement s’ils sont effectivement disponibles dans le backend. Il ne faut pas promettre « agents illimités », « déploiement illimité » ou un support particulier uniquement parce qu’une phrase existe dans un ancien script : ces avantages doivent être vérifiés dans le produit réel.

## 8. Ce que l’agent doit éviter

Ne pas créer une liste fixe d’agents présents dans toutes les missions. Ne pas afficher une voix par défaut sans choix de l’utilisateur. Ne pas transformer les voix en niveaux tarifaires. Ne pas mélanger les messages de tous les agents dans un fil illisible. Ne pas ouvrir le code, le terminal ou la preview avant que la construction soit pertinente. Ne pas utiliser de faux prix dans l’interface. Ne pas présenter une animation ou une donnée simulée comme une fonctionnalité backend déjà active.

Ne pas ajouter des fonctionnalités uniquement parce qu’elles sont populaires chez un concurrent. Chaque élément doit servir la promesse d’Idealy : partir d’une idée, comprendre l’intention, composer une équipe adaptée, planifier, construire une application utile et permettre à l’utilisateur de comprendre ce qui se passe.

## 9. Instruction finale à l’agent

Avant de modifier le design, reformule ce que tu as compris de ce document. Présente ensuite les écrans proposés, la composition d’équipe pour deux ou trois exemples de projets et le comportement du paywall. Ne code pas immédiatement une liste fixe d’agents, ne remplace pas les quatre voix et n’invente pas de prix. Toute ambiguïté doit être signalée comme une question produit, et non résolue par une supposition.

## Références

[1]: https://github.com/obrienmak18-maker/idealy/blob/feat/idealy-v2-shell/scripts/create-stripe-products.mjs "Idealy — script de création des produits et prix Stripe"
