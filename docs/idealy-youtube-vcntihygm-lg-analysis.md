# Analyse de la vidéo YouTube `VCntIHygMlg`

## Conclusion

La vidéo est une chronique technologique présentée par Eliott Meunier. L’élément réellement pertinent pour Idealy est la présentation de **DeepSeek Harness (DSH)**, un environnement d’agents construit autour de l’idée : « Everything is a plugin. Every run is traceable. » La page officielle de DeepSeek confirme cette philosophie : les modèles, outils, compétences, sessions, sandboxes, stockage, boucles, planification et interface sont traités comme des plugins interchangeables ou recomposables [2].

## Ce que la vidéo montre

La démonstration présente plusieurs modes de runtime : Standard, Code, Minimal et Creator. Le mode Creator permet d’inspecter le runtime actif, d’expérimenter des plugins en mémoire et de composer de nouveaux modes. Dans l’exemple montré, l’utilisateur demande un plugin visuel de panda animé. Le système passe par une phase de réflexion, une planification, la génération de code CSS/JavaScript, une attente d’approbation, puis l’exécution immédiate du plugin approuvé.

La vidéo insiste également sur la **Trajectory** : une vue retraçant les actions d’un run, les appels d’outils, les résultats, les injections de contexte, la planification de sous-agents et les permissions demandées. La documentation officielle confirme que les runs sont reconstruits depuis un journal de session append-only et peuvent être repris, forkés, recherchés ou rejoués [2].

## Ce que cela signifie pour Idealy

La leçon la plus importante n’est pas de copier l’interface de DSH. C’est de séparer clairement trois choses :

| Concept de la vidéo | Traduction possible dans Idealy |
|---|---|
| Tout est plugin | Les capacités d’Idealy peuvent être ajoutées comme connecteurs, skills, outils, agents spécialisés et modes de travail. |
| Creator Mode | Idealy pourrait permettre à un utilisateur avancé de créer une capacité ou un agent spécialisé pour son projet. |
| Thinking → Plan → Approval → Run | Le parcours de clarification et de planification déjà présent dans Idealy doit précéder l’écriture réelle. |
| Trajectory | Une timeline lisible doit montrer ce que l’équipe a compris, quel agent a agi, quel outil a été utilisé et quel résultat a été produit. |
| Effets réversibles | Chaque modification doit être associée à un diff, une mission ou un plugin désactivable, avec possibilité de revenir en arrière. |

Cela renforce la direction déjà choisie pour Idealy : l’équipe d’agents doit être composée dynamiquement selon le projet, et chaque agent doit avoir une responsabilité identifiable. La vidéo apporte une idée supplémentaire : il ne suffit pas de montrer « qui travaille » ; il faut aussi montrer **ce qui s’est réellement passé** et rendre cette trace consultable.

## Ce qu’il ne faut pas copier sans vérification

La vidéo contient aussi une longue partie d’actualité sur des modèles, des entreprises et des performances annoncées. Ces affirmations ne doivent pas être utilisées comme faits produits sans vérification indépendante. Le rapport d’analyse multimodale signale notamment des éléments prospectifs ou difficiles à confirmer. La partie la plus fiable pour notre réflexion est le fonctionnement de DeepSeek Harness confirmé par sa documentation officielle, pas toutes les annonces secondaires entendues dans la chronique.

## Sources

[1]: https://youtu.be/VCntIHygMlg?si=P0sFbYFlyWcbeqkm "Vidéo YouTube analysée"
[2]: https://deepseek.com/harness/en/ "DeepSeek Harness — documentation officielle"
[3]: https://thenewstack.io/deepseek-harness-open-source-plugins/ "The New Stack — DeepSeek open sources an agent harness where everything is a plugin"
