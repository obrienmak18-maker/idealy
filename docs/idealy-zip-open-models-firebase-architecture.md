# Idealy — ZIP, modèles ouverts, Supabase et Firebase

## Décision de départ

Le ZIP `Idealy-Studio` doit devenir la **référence d’expérience frontend** pour la prochaine version d’Idealy. Il ne faut toutefois pas remplacer brutalement `WorkspacePage` ni supprimer le backend actuel. Le ZIP contient une maquette React avancée, mais son serveur ne fournit qu’un healthcheck et ses actions IA, connecteurs, preview et données restent simulées.

La bonne stratégie est donc : reprendre entièrement les écrans et les idées du ZIP, les placer derrière une nouvelle coque de studio, puis reconnecter progressivement les handlers réels d’Idealy. L’objectif est de remplacer le design sans perdre Supabase, Stripe, les crédits, les missions, les connecteurs et le pipeline d’exécution déjà présents.

## 1. Ce qui doit venir du ZIP

Le ZIP apporte quatre éléments que nous devons conserver :

| Élément du ZIP | Intégration cible dans Idealy |
|---|---|
| Parcours idée → clarification → planning | Nouveau préambule de mission avant l’Intent Router et l’écriture. |
| Équipe composée selon le projet | Réponse structurée de l’Orchestrateur, affichée dans la carte de plan. |
| Validation « Valider et construire » | Garde devant l’écriture des fichiers et le démarrage réel du WebContainer. |
| Preview/Code/Data/Terminal | Nouvelle hiérarchie visuelle du studio, tout en conservant les handlers réels existants. |

La maquette `DesignMockupPage.tsx` du ZIP utilise encore une heuristique locale et des données de démonstration. Les fonctions `inferProject` et `getProjectTeam` doivent donc être conservées comme prototype d’interface, puis remplacées par une réponse backend structurée. Il ne faut pas laisser le frontend décider seul de l’équipe réelle.

Le routeur actuel permet déjà d’isoler ce travail : `/design-mockup` et `/v2` sont des routes séparées de `WorkspacePage`. La première étape sûre consiste à créer une route de validation du nouveau studio, puis à basculer la route de production uniquement après validation humaine.

## 2. Les modèles ouverts : ce qui est possible et ce qui ne l’est pas

Un modèle « ouvert » ne signifie pas que l’inférence est gratuite. Les poids peuvent être téléchargeables, mais il faut encore fournir la mémoire, le GPU ou le temps CPU, le téléchargement du modèle et parfois un serveur local ou distant.

### DeepSeek-R1

Le dépôt officiel DeepSeek décrit DeepSeek-R1 comme un modèle de raisonnement open source sous licence MIT. La version complète annonce 671 milliards de paramètres au total et 37 milliards activés ; elle n’est pas réaliste à exécuter dans le navigateur ou dans une Supabase Edge Function [1]. Le même dépôt fournit des versions distillées de 1,5B, 7B, 8B, 14B, 32B et 70B, qui sont les variantes pertinentes pour une expérimentation locale [1].

La demande « DeepSeek R1S » doit être vérifiée avant d’être ajoutée au registre : le nom officiel confirmé dans la source consultée est **DeepSeek-R1**. Il ne faut pas inventer un identifiant de modèle à partir d’un nom entendu dans une vidéo.

### Qwen3

La famille officielle est **Qwen3**, et non « Qymica 3 ». Le dépôt Qwen documente des modèles denses et MoE allant de 0,6B à 235B, avec des modes thinking et non-thinking, ainsi que des usages locaux via llama.cpp, Ollama, LM Studio, MLX et d’autres runtimes [2]. Pour un premier prototype sans serveur dédié, une petite variante Qwen3 est plus réaliste qu’un modèle de plusieurs dizaines ou centaines de milliards de paramètres.

Qwen3 peut donc avoir deux rôles dans Idealy : un mode local expérimental pour des tâches simples, lorsque le navigateur ou l’ordinateur de l’utilisateur possède les ressources nécessaires, et un mode distant via un fournisseur compatible lorsque la mission exige une génération fiable de code. Le produit doit afficher la différence au lieu de prétendre que les deux modes ont la même qualité.

### GLM

Le nom actuellement documenté dans la source officielle consultée est **GLM-4.5**, avec GLM-4.5-Air, et non GLM-2.5. GLM-4.5 annonce 355B de paramètres au total et 32B actifs ; GLM-4.5-Air annonce 106B au total et 12B actifs. Le dépôt officiel indique des exigences importantes pour l’inférence complète, notamment plusieurs GPU H100 pour les variantes principales [3]. Ces modèles ne doivent pas être chargés dans le navigateur ni dans une Edge Function Supabase.

Une variante légère comme GLM-4.7-Flash est plus intéressante pour une éventuelle expérimentation, mais elle reste un modèle de taille serveur selon les exigences documentées. Elle ne doit pas être présentée comme « gratuite et sans serveur » simplement parce que ses poids sont publiés [3].

## 3. Les trois chemins d’exécution réalistes

| Chemin | Ce qui fonctionne | Limites | Coût infrastructure |
|---|---|---|---|
| Modèle local dans le navigateur | Tâches simples, confidentialité, mode démo ou ideation légère avec une petite variante compatible WebGPU/WebAssembly. | Téléchargement lourd, dépendance au matériel, lenteur possible, qualité insuffisante pour une construction complète. | Pas de serveur supplémentaire, mais coût matériel et bande passante chez l’utilisateur. |
| Modèle local sur l’ordinateur de l’utilisateur | Ollama, llama.cpp ou LM Studio exposent une API locale compatible pour des modèles plus grands. Qwen documente ces chemins [2]. | L’ordinateur doit être allumé, le runtime doit être installé et une application web distante ne peut pas accéder librement à localhost sans précautions. | Pas de nouveau serveur, mais configuration locale obligatoire. |
| Fournisseur distant derrière le backend actuel | Le navigateur appelle `process-ai-request`; les clés restent côté serveur et le modèle est servi par Groq, OpenRouter, DeepSeek ou un autre endpoint compatible. | Ce n’est pas une exécution sans serveur et l’inférence peut coûter selon le fournisseur. | Pas de nouveau service à déployer si l’Edge Function et le fournisseur existants sont utilisés ; coût d’usage possible. |

Pour le produit public, le troisième chemin est le seul qui donne une expérience cohérente sans demander à chaque utilisateur d’installer un runtime. Pour une expérience locale gratuite, le premier ou le deuxième chemin peut être proposé comme **mode laboratoire**, pas comme moteur principal garanti.

## 4. Ce que le backend actuel impose déjà

Le client IA actuel n’envoie aucune clé fournisseur au navigateur. Il appelle Supabase `process-ai-request`, qui gère l’authentification, le mode Managed/BYOK, les crédits et le routage. Les fournisseurs déclarés aujourd’hui sont `groq`, `openrouter` et `deepseek`. Ajouter Qwen ou GLM exige donc une extension de l’adaptateur serveur, du registre de modèles, des validations de modèle autorisé et des tests de contrat.

La modification correcte n’est pas d’ajouter des clés dans React. Il faut créer un registre serveur explicite :

```text
model_id
provider_transport
family
capabilities
context_limit
supports_tools
supports_reasoning
supports_streaming
local_only / remote_only
license_note
```

L’utilisateur pourrait ensuite voir des choix comme « Rapide », « Raisonnement », « Code » ou « Local », tandis que l’application associerait chaque choix à un identifiant réellement supporté. Les voix Ninja, Mage, Hunter et Pro restent indépendantes de ce registre : une voix décrit le comportement de l’équipe, pas le modèle utilisé et pas le prix.

## 5. Supabase et Firebase ne doivent pas devenir deux backends concurrents

Supabase est déjà la fondation réelle d’Idealy : authentification, PostgreSQL, stockage, Edge Functions, missions, crédits, Stripe et connecteurs. Le backend actuel est construit autour de cette base.

Firebase fournit aussi de l’authentification, une base, du stockage, du hosting et des Cloud Functions. Les Cloud Functions exécutent du JavaScript, TypeScript ou Python sur l’infrastructure Google en réponse à des requêtes ou événements [4]. Elles restent donc un backend hébergé ; Firebase ne permet pas d’exécuter gratuitement et magiquement un grand modèle ouvert sans infrastructure.

Ajouter Firebase en doublon pour l’authentification, les utilisateurs, les missions et les données créerait deux sources de vérité, deux systèmes de règles, deux identités et des synchronisations fragiles. Avec un budget de 0 $, ce n’est pas une bonne première décision.

### Rôle recommandé

| Service | Rôle recommandé maintenant | Rôle éventuellement ajouté plus tard |
|---|---|---|
| Supabase | Source de vérité : auth, utilisateurs, missions, projets, crédits, connecteurs, Stripe et proxy IA. | Continuer à porter l’orchestration et les données métier. |
| Firebase | Aucun rôle obligatoire dans le MVP actuel. | Notifications push FCM, App Check, Analytics ou besoins mobiles précis. |
| Firebase Auth | Ne pas activer en parallèle de Supabase Auth. | Possible seulement dans un chantier explicite de migration avec pont d’identité. |
| Firestore | Ne pas dupliquer les missions et projets Supabase. | Possible pour un produit séparé, pas pour les mêmes enregistrements. |
| Firebase Cloud Functions | Ne pas y déplacer l’IA maintenant. | Webhooks ou fonctions Google spécifiques si un besoin concret le justifie. |
| Firebase Hosting | Inutile pour le frontend actuellement servi par Netlify. | À évaluer uniquement en cas de migration volontaire de l’hébergement. |

La documentation Firebase indique que le déploiement des Cloud Functions passe par le plan Blaze pay-as-you-go [4]. Cela ne signifie pas qu’une facture apparaîtra automatiquement pour chaque petite fonction, mais cela signifie que Firebase ne respecte pas à lui seul la promesse « aucun service payant » pour un backend déployé.

## 6. Architecture recommandée à 0 $ supplémentaire

La décision la plus sûre est la suivante :

1. Remplacer progressivement la coque visuelle par le code React du ZIP, d’abord dans une route de validation.
2. Brancher la clarification et la carte de plan sur le contrat de mission existant.
3. Faire retourner par l’Orchestrateur une équipe JSON dynamique avec rôles, responsabilités, fichiers ciblés et ordre de travail.
4. Conserver Supabase comme backend unique et `process-ai-request` comme point d’entrée sécurisé.
5. Ajouter les nouvelles familles de modèles côté serveur, d’abord via un transport déjà disponible comme OpenRouter lorsque le modèle est réellement proposé, puis ajouter un transport dédié seulement si nécessaire.
6. Ajouter un mode local expérimental pour une petite variante Qwen ou autre modèle compatible, sans le présenter comme équivalent au moteur distant.
7. Ne pas ajouter Firebase tant qu’un besoin précis — push, App Check, analytics ou mobile — n’est pas prioritaire.

Cette architecture ne promet pas l’impossible. Elle permet d’utiliser des modèles ouverts sans acheter immédiatement un serveur dédié, mais elle distingue clairement les modèles ouverts des modèles réellement exécutés localement et des modèles appelés par API.

## 7. Questions à décider avant le code

Il faut confirmer deux choix produit avant d’implémenter :

| Décision | Option prudente | Option ambitieuse |
|---|---|---|
| Moteur IA initial | Backend Supabase + fournisseurs compatibles, avec expérimentation locale séparée. | Runtime local complet dans l’application desktop ou sur l’ordinateur de l’utilisateur. |
| Rôle Firebase | Aucun pour le moment, afin d’éviter le doublon. | FCM/App Check/Analytics ou migration explicite, avec configuration Google et plan de facturation approprié. |

La prochaine étape technique ne devrait donc pas être « ajouter tous les modèles et Firebase ». Elle devrait être un petit vertical slice : **un écran du ZIP, une clarification réelle, une équipe dynamique retournée par le backend, un modèle distant déjà accessible et une timeline traçable**. Si ce parcours fonctionne, les autres modèles et intégrations pourront être ajoutés sans casser le produit.

## Références

[1]: https://github.com/deepseek-ai/DeepSeek-R1 "DeepSeek-R1 — dépôt officiel, modèles, tailles et licence"
[2]: https://github.com/QwenLM/Qwen3 "Qwen3 — dépôt officiel, variantes et exécution locale"
[3]: https://github.com/zai-org/GLM-4.5 "GLM-4.5 — dépôt officiel, tailles et exigences d’inférence"
[4]: https://firebase.google.com/docs/functions "Firebase Cloud Functions — documentation officielle"
