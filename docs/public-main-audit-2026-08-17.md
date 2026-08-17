# Audit public de main — 17 août 2026

L’URL `https://idealy-ai.netlify.app/` répond et rend correctement la landing publique. Les éléments visibles sont : navigation Idealy, liens Fonctionnalités/Les Voies/Comment ça marche, boutons Se connecter/Commencer, hero « Qu’allons-nous déployer aujourd’hui ? », textarea de mission avec import fichier/image/Figma/GitHub/dictée, boutons « Voir la démo » et « Lancer la mission », cartes des quatre voies et sections fonctionnalités.

La page actuelle est fonctionnelle visuellement mais reste une landing dense et très structurée, différente de la coque minimaliste du dépôt Vercel Chatbot. L’authentification n’a pas encore été soumise dans cette vérification ; le problème Supabase reste à reproduire sur le bouton « Se connecter ».

Le message utilisateur « Supabase n’est pas configuré » est cohérent avec le code : `supabaseClient.ts` exige `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` au build, puis ne crée aucun client si ces variables sont absentes. `netlify.toml` ne définit actuellement aucune de ces variables ; elles doivent exister dans l’environnement Build Netlify ou être renseignées via le registre de connecteurs de l’application.

## Reproduction publique de l’authentification

Le bouton « Se connecter » ouvre correctement la modale d’authentification. L’inspection des bundles JavaScript publics montre que le bundle principal contient le message de garde « Supabase frontend configuration is missing » et qu’aucune configuration Supabase compilée vérifiable n’est exposée de manière attendue. Le problème est donc réel dans la version déployée, pas seulement une impression visuelle de l’utilisateur.

Aucune donnée personnelle ni mot de passe n’a été saisi.
