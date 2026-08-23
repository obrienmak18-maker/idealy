# Audit des builders IA et feuille de route Idealy

Date : 23 août 2026.

## Fonctions essentielles observées

Les sources officielles Replit, Atoms, Lovable et Anthropic montrent qu’un builder IA crédible ne doit pas se limiter à générer du code ou à afficher un faux écran. Il doit donner à l’utilisateur un état clair de ce que l’agent fait, laisser une possibilité d’approbation aux étapes sensibles, fournir une boucle de vérification dans l’environnement d’exécution et conserver le contrôle du code et des données.

| Capacité | Ce qu’il faut retenir pour Idealy | État actuel |
|---|---|---|
| Plan visible avant exécution | Afficher un plan ordonné et permettre de l’approuver ou de le corriger avant le build long | À implémenter dans le flux réel |
| Rôles d’agents | Séparer product manager, architecte, builder, reviewer et éventuellement research/data/QA, sans afficher des cartes parasites sur la preview | Démo textuelle seulement |
| Contexte partagé | Conserver le brief, les décisions, les fichiers modifiés et les résultats de tests dans un contexte de projet | Partiellement prévu par les documents/chat |
| Exécution sandboxée | Compiler et exécuter le projet dans un environnement isolé, avec logs et limites de sécurité | WebContainer à intégrer |
| Preview live | Ouvrir la preview dès le début du build avec un écran d’attente animé, puis remplacer cet écran par l’application fonctionnelle | À implémenter dans le flux de démo |
| Validation par tests | Relancer build, lint/tests et vérifications après les modifications ; exposer les erreurs à l’agent et à l’utilisateur | Build local validé, boucle réelle à venir |
| Debug visible | Console, Network, DOM/Elements, ressources et historique des runs ; bouton Ask AI sur les erreurs | Console/Network/Build de démo présents |
| Édition de code | Arborescence, fichier actif, modifications lisibles, possibilité de revenir à une version précédente | Vue Code de démo présente |
| Backend complet | Authentification, base, stockage, intégrations et webhooks avec secrets côté serveur | Architecture préparée, non activée |
| Approbations | Demander confirmation avant déploiement, paiement, actions destructrices ou permissions externes | À ajouter au workflow réel |
| Reprise et arrêt | Pause, arrêt, reprise, limites d’itérations, reprise après erreur et checkpoints | À implémenter |
| Ownership | Export GitHub, téléchargement du code et des données, historique de versions | ZIP/GitHub à finaliser |

## Principes d’orchestration

Anthropic distingue les workflows prédéfinis des agents qui choisissent dynamiquement leurs outils. Pour Idealy, le parcours principal peut rester un workflow contrôlé : cadrage de la demande, plan, architecture, implémentation, compilation, revue et livraison. L’orchestrateur ne doit déléguer dynamiquement que lorsque le nombre de fichiers ou les sous-tâches ne peuvent pas être prévus. Chaque étape doit recevoir un résultat vérifiable de l’environnement et avoir une condition d’arrêt.

Le système doit privilégier la simplicité, la transparence et une interface agent-ordinateur bien documentée. Les outils de l’agent doivent utiliser des chemins absolus ou un workspace explicite, des paramètres typés, des limites de taille et des retours structurés. Les tests et la preview sont les sources de vérité ; une réponse textuelle de l’agent ne doit pas être présentée comme une validation d’exécution.

## Rôles recommandés pour Idealy

Le **Planner/Product** transforme la demande en exigences et critères d’acceptation. L’**Architect** choisit la structure, les routes, le modèle de données et les intégrations. Le **Builder** modifie les fichiers et exécute les commandes autorisées dans le conteneur. Le **Reviewer/QA** lit les erreurs, vérifie les tests et contrôle les critères visuels. Le **Security reviewer** examine les permissions, les secrets, les dépendances et les routes sensibles avant publication. Un **Researcher** et un **Data analyst** peuvent être appelés uniquement lorsqu’une recherche ou une donnée réelle est nécessaire, au lieu d’être systématiquement impliqués.

## Ce qui ne doit pas être ajouté maintenant

Les cartes flottantes d’agents, les barres secondaires décoratives, les faux statuts présentés comme réels, la sélection de modèle sans effet fonctionnel, les secrets côté client et une base « Demo mode » qui imite des données réelles doivent rester hors de la preview principale. Les fonctions non branchées doivent être signalées comme placeholders et ne pas créer de fausse confiance.

## Priorité immédiate

La prochaine modification visuelle est de supprimer l’en-tête interne gris et le badge `Live preview`, ajouter un bouton plein écran qui masque uniquement chat et chrome secondaire tout en laissant la topbar globale visible, remplacer le trait de séparation par un divider irrégulier léger mais accessible, et afficher une phase de compilation premium avant le rendu généré. Le backend réel ne doit être branché qu’après avoir conservé ce contrat d’interface et après choix explicite entre Auth.js/Postgres comme source d’identité et Supabase comme services complémentaires.

## Références officielles

[1]: https://docs.replit.com/features/agent/overview — Replit Agent.
[2]: https://docs.replit.com/features/editor/preview — Replit Preview and developer tools.
[3]: https://docs.replit.com/features/workspace-tools/console — Replit Console and AI debugging.
[4]: https://atoms.dev/ai-agents — Atoms AI Agents.
[5]: https://docs.lovable.dev/introduction/welcome — Lovable full-stack AI development platform.
[6]: https://www.anthropic.com/engineering/building-effective-agents — Anthropic, Building effective agents.
