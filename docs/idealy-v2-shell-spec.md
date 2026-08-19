# Idealy V2 — Coque conversationnelle

## Décision

La prochaine version d’Idealy commence par une **coque conversationnelle minimaliste**, inspirée de la hiérarchie visuelle de ChatGPT, Claude, Gemini et du dépôt public Vercel Chatbot. L’authentification, les connecteurs et les données persistantes sont volontairement différés. Cette étape doit d’abord rendre l’expérience claire, calme et désirable avant de brancher les services qui la feront fonctionner pour tous les utilisateurs.

## Promesse visuelle

Au repos, Idealy doit montrer une seule question, une seule barre de mission et quelques suggestions utiles. L’utilisateur ne doit pas voir simultanément le terminal, Monaco, les connecteurs, le canvas, les réglages et les états techniques. Ces surfaces existent, mais elles sont révélées uniquement après le lancement d’une mission ou par une commande explicite.

L’interface doit être sombre, respirante et précise. Le langage visuel conserve les tokens Idealy : fond `#0a0a0f`, surface `#12121a`, texte clair, texte secondaire gris et gradient violet-orange réservé à la commande principale. Les quatre voies restent des identités narratives gratuites, jamais des plans tarifaires.

## Structure de la coque

| État | Surface visible | Surface cachée |
|---|---|---|
| Accueil | Historique discret, en-tête minimal, message central, suggestions, CommandBar | Code, preview, terminal, connecteurs, paywall |
| Idée saisie | Message utilisateur, état de compréhension et mini-chronologie | Monaco et terminal restent fermés |
| Mission confirmée | Fil de mission compact, agents Lia/Daniel/Léon/Bill, bouton Canvas | Options avancées dans un tiroir secondaire |
| Construction | Conversation à gauche ou au centre, Canvas Preview révélé à la demande | Terminal et diff viewer chargés uniquement si nécessaires |
| Résultat | Preview dominante, résumé court, actions Exporter/Publier/Continuer | Détails techniques dans un panneau rétractable |

## Règles de hiérarchie

La CommandBar est l’action principale. Il n’y a qu’un bouton d’envoi dominant. Les actions secondaires utilisent des icônes avec labels accessibles et ne sont pas présentées comme autant de boutons concurrents. Les raccourcis, connecteurs et réglages sont regroupés dans un menu ou une surface secondaire.

La conversation ne doit pas ressembler à une suite de blocs WhatsApp. Les messages système et les agents apparaissent comme un fil éditorial léger : avatar ou icône, nom, statut, ligne de progression et contenu. Les états de réflexion utilisent la chronologie Idealy, pas des paragraphes bruts de raisonnement.

Le canvas n’apparaît pas au chargement initial. Il se révèle uniquement lors d’une intention `EXECUTION` confirmée, ou lorsque l’utilisateur choisit explicitement « Voir la preview ». Le terminal reste un tiroir inférieur. Monaco reste un panneau secondaire rétractable.

## Animations

La coque utilise Framer Motion uniquement pour les transitions de mission et les drawers. Les animations doivent communiquer un état : focus de la CommandBar, envoi, relais entre agents, ouverture du canvas et fin de mission. Le maximum est de deux effets visuels forts simultanés. Chaque mouvement respecte `prefers-reduced-motion` et reste généralement inférieur à 300 ms.

## Ce qui est explicitement hors périmètre

Cette étape ne modifie pas Supabase, Stripe, les Edge Functions, les crédits, le BYOK, les connecteurs persistants, le routeur d’intention, le VFS, la pipeline IA ou les contrats de mission. Les composants fonctionnels existants sont réutilisés derrière la coque ; ils ne sont pas réécrits tant que l’expérience visuelle n’est pas validée.

## Critères de validation

La version V2 sera présentée sur une branche et une preview séparées. Elle doit démarrer sans authentification, afficher l’état vide minimal, accepter un prompt local de démonstration, révéler progressivement la chronologie et ouvrir une preview simulée sans bloquer l’utilisateur sur Supabase. Le typecheck, le build et le diff-check doivent passer. Aucun merge vers `main` ne sera effectué avant validation visuelle explicite.

## Première validation locale

La preview temporaire `/v2` fonctionne sur la branche `feat/idealy-v2-shell`. L’état vide affiche un historique discret, une phrase centrale, quatre suggestions et une CommandBar unique. Le scénario pizzeria passe ensuite à une mise en page à deux surfaces : fil de mission éditorial à gauche et Canvas à droite, avec les onglets Code/Preview/Terminal présentés comme des capacités secondaires. Aucun appel Supabase ni authentification n’est nécessaire pour cette exploration.
