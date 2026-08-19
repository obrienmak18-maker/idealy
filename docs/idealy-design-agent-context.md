# Contexte produit Idealy pour l’agent design

## Pourquoi ce fichier existe

Ce document sert uniquement à expliquer Idealy avant une future passe de design. Il ne demande pas de modifier le produit immédiatement. L’agent doit d’abord comprendre la vision, les contraintes et le rôle de chaque écran.

## Ce qu’est Idealy

Idealy est un studio IA no-code/low-code qui transforme une idée en application explorables, codée et publiable. L’utilisateur décrit ce qu’il veut construire. Idealy comprend l’intention, structure la mission, prépare les fichiers, construit une première version, affiche une preview et permet ensuite d’explorer le code, les données et les étapes de travail.

Idealy ne doit pas être présenté comme un simple chatbot. La conversation est le point de départ, mais le résultat principal est une vraie application visible dans une preview. L’interface doit donc donner la priorité à la clarté, à la respiration et au sentiment de construction en cours.

## Les quatre voies

Les voies **Ninja**, **Mage**, **Hunter** et **Pro** sont des identités narratives. Elles changent le ton, le vocabulaire et l’ambiance de l’expérience, mais elles ne sont pas des niveaux de prix, des plans d’abonnement ou des niveaux de compétence obligatoires. Une personne débutante peut choisir Pro et une personne expérimentée peut choisir Ninja.

## Écrans à comprendre

1. **Page de bienvenue.** Elle présente Idealy simplement, avec une grande zone de description d’idée, une entrée vocale, des exemples et une invitation à commencer. Elle doit ressembler à un produit calme et premium, pas à une page de prix agressive.
2. **Inscription et onboarding.** Le parcours comprend trois moments : choisir une voie, donner un nom ou une identité, puis répondre à trois questions de contexte — taille de l’équipe, rôle et découverte d’Idealy. La progression doit être légère et vivante, avec un petit battement de cœur lorsque l’utilisateur fait un choix.
3. **Espace de création avant mission.** La sidebar reste visible dès l’arrivée. Elle contient le logo, une nouvelle mission, l’historique et le profil. Le centre reste volontairement vide et accueillant. La top bar complète n’apparaît qu’après le lancement d’une mission.
4. **Espace de création pendant mission.** La conversation reste lisible comme une surface éditoriale : éviter les bulles WhatsApp empilées. Les états de réflexion, planification et construction apparaissent dans une timeline discrète avec les agents et leurs sous-étapes. Le panneau principal montre la preview de l’application générée. Le code et les données sont secondaires et peuvent s’ouvrir sans transformer l’écran en tableau de bord surchargé.
5. **Preview, code et terminal.** La preview est le centre de gravité. Le code peut être un panneau latéral ou une vue secondaire. Le terminal doit être un tiroir inférieur, pas un onglet supplémentaire permanent. Les actions doivent rester compréhensibles même pour une personne qui ne code pas.

## Direction visuelle

Le point de départ est une interface très sombre, graphite, inspirée des environnements de création modernes et de la sobriété de ChatGPT, Claude et Gemini. Utiliser peu de couleurs, avec des accents rose doux, cyan discret et jaune chaud. Le noir doit être profond mais pas vide. Les animations doivent donner une impression de vie et de précision, sans transformer l’écran en jeu vidéo.

L’interface doit être minimaliste, avec peu de boutons visibles et une hiérarchie forte. Les détails extraordinaires doivent venir des transitions, de la timeline, des ondes de dictée, des états d’attente et des petits retours de sélection — pas de dizaines de panneaux ou de cartes décoratives.

## Contraintes à respecter

Le mockup actuel est **sans backend** : les boutons peuvent simuler des états locaux, mais ne doivent pas prétendre connecter Supabase, Stripe, GitHub ou un fournisseur IA réel. Il ne faut pas inventer de fonctionnalité visible qui ne correspond pas à cette architecture. Ne pas transformer les voies en tarification. Ne pas revenir à une interface composée de bulles de chat. Ne pas afficher le nom « Atelier » dans l’espace de preview : la preview doit rester un espace neutre dédié au produit construit.

Avant toute modification esthétique, l’agent doit conserver cette logique et proposer ses changements en distinguant clairement : ce qui améliore la compréhension, ce qui améliore l’émotion et ce qui ajoute seulement de la décoration.
