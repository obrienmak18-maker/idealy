# Audit public de main — 17 août 2026

L’URL `https://idealy-ai.netlify.app/` répond et rend correctement la landing publique. Les éléments visibles sont : navigation Idealy, liens Fonctionnalités/Les Voies/Comment ça marche, boutons Se connecter/Commencer, hero « Qu’allons-nous déployer aujourd’hui ? », textarea de mission avec import fichier/image/Figma/GitHub/dictée, boutons « Voir la démo » et « Lancer la mission », cartes des quatre voies et sections fonctionnalités.

La page actuelle est fonctionnelle visuellement mais reste une landing dense et très structurée, différente de la coque minimaliste du dépôt Vercel Chatbot. L’authentification n’a pas encore été soumise dans cette vérification ; le problème Supabase reste à reproduire sur le bouton « Se connecter ».

Le message utilisateur « Supabase n’est pas configuré » est cohérent avec le code : `supabaseClient.ts` exige `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` au build, puis ne crée aucun client si ces variables sont absentes. `netlify.toml` ne définit actuellement aucune de ces variables ; elles doivent exister dans l’environnement Build Netlify ou être renseignées via le registre de connecteurs de l’application.

## Reproduction publique de l’authentification

Le bouton « Se connecter » ouvre correctement la modale d’authentification. L’inspection des bundles JavaScript publics montre que le bundle principal contient le message de garde « Supabase frontend configuration is missing » et qu’aucune configuration Supabase compilée vérifiable n’est exposée de manière attendue. Le problème est donc réel dans la version déployée, pas seulement une impression visuelle de l’utilisateur.

Aucune donnée personnelle ni mot de passe n’a été saisi.

## Après configuration Netlify

Les variables publiques `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` ont été upsertées sur le site Netlify `idealy-ai` avec la portée build. Le commit de déclenchement `19a2e89` a été poussé sur `main`; la CI GitHub `31989375534` est verte pour build, webhook-test et deploy Supabase. Le site public répond de nouveau après ce run et rend le build actuel.

## Test après le push de configuration

La modale « Bon retour » s’ouvre correctement après le redéploiement. Cependant, l’inspection du bundle chargé par le navigateur ne retrouve pas l’hôte Supabase attendu et retrouve encore la chaîne de garde de configuration manquante. Le hash JavaScript observé reste `index-DFydEURr.js`, identique au build précédent. Le run GitHub est vert, mais le site Netlify n’a probablement pas encore consommé le nouveau build ou son cache sert encore l’ancien déploiement. Une vérification du déploiement Netlify réel est nécessaire avant de considérer Supabase réparé.

## Déploiement manuel Netlify

Le déploiement manuel `6a8279b72790695458a03750` est passé à l’état `ready` et son URL unique rend correctement la landing Idealy. Cette URL confirme que le bundle local construit avec les variables Supabase est maintenant publié sur Netlify. Le test direct de la connexion peut être réalisé sur cette URL sans modifier main.

## Portée production explicite

Après vérification, les variables ont été réenregistrées avec `newVarContext=production` et la portée `builds`, afin d’éviter toute ambiguïté entre les contextes Netlify. Un nouveau push de main est nécessaire pour forcer le build connecté à reprendre cette configuration.

## Vérification du tableau de bord Netlify

La page officielle des variables du projet `https://app.netlify.com/projects/idealy-ai/configuration/env` demande une connexion Netlify dans la session navigateur actuelle. La configuration automatisée a donc été tentée via le connecteur Netlify, mais le tableau de lecture n’a pas confirmé les variables Supabase. Les valeurs n’ont pas été affichées ni saisies dans le navigateur.
