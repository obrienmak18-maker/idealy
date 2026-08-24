# Constats de déploiement Netlify

## Sources observées

- Site : https://idealy-ai.netlify.app
- Projet Netlify : https://app.netlify.com/projects/idealy-ai
- Premier déploiement : https://app.netlify.com/projects/idealy-ai/deploys/6a8bf6102098cdb1a2095685
- Deuxième déploiement : https://app.netlify.com/projects/idealy-ai/deploys/6a8bf6782098cdb2870956e9
- Troisième déploiement : https://app.netlify.com/projects/idealy-ai/deploys/6a8bf792a299c2f6f9d11616

## Résultats

Le site public servait encore l’ancienne landing page lors des vérifications de `/plugins`; la page Plugins de la branche n’était donc pas encore publiée.

Le premier upload a échoué parce que `netlify.toml` exécutait `npm install --global pnpm@10.32.1` alors que le runner Netlify possédait déjà cette version. L’erreur était `EEXIST` sur le binaire pnpm.

Après suppression de l’installation globale, le deuxième build a correctement installé les dépendances mais a échoué parce que `pnpm build` exécutait `tsx lib/db/migrate`, qui tentait d’atteindre le `POSTGRES_URL` pendant la compilation. Le runner Netlify a retourné `connect ENETUNREACH` sur l’adresse IPv6 du serveur PostgreSQL.

La correction appliquée dans le dépôt est de séparer compilation et migration : le script `build` exécute maintenant uniquement `next build`. Les migrations restent une opération contrôlée séparément, déjà validée par GitHub Actions/Supabase local et par la migration Supabase canonique appliquée.

Le troisième upload a été déclenché après cette correction. Le build Next a réussi, le scan Netlify a analysé 440 fichiers sans trouver de secret, puis la phase de publication a échoué car `netlify.toml` demandait encore le dossier `dist`, qui n’existe pas après `next build`. La correction suivante configure `publish = ".next"` et le plugin officiel `@netlify/plugin-nextjs`. Aucun secret n’a été écrit dans ce document.
