# Plan de livraison des connecteurs Idealy

## Décision

Idealy ne doit pas attendre d’avoir toutes les intégrations externes pour finaliser son cœur. En revanche, le registre et les contrats de sécurité des connecteurs doivent être posés avant le premier OAuth réel. Cette séquence évite de construire une interface qui promet des capacités non disponibles et évite de mélanger identité, crédits, tokens externes et génération de fichiers.

> **Principe :** une capacité peut être affichée dans le catalogue, mais elle ne doit être présentée comme connectée qu’après un OAuth/API vérifié et un test réel contrôlé.

## Séquence recommandée

| Étape | Ce qui est livré | Test requis | État |
|---|---|---|---|
| 1 | Authentification, chat, missions, workspace et stockage Supabase | CI, migration locale, typecheck, build | En place côté code ; déploiement distant restant |
| 2 | Registre typé des connecteurs et capacités | Test de catalogue, filtrage, permissions et absence de secrets | En place |
| 3 | Page Plugins reliée au registre | Build Next et vérification des statuts honnêtes | En place |
| 4 | Premier OAuth réel, recommandé : GitHub ou Canva | Connexion, lecture limitée, révocation et erreur d’expiration | À faire |
| 5 | Utilisation dans une mission | Une mission isolée, confirmation avant écriture, récupération après refresh | À faire |
| 6 | Autres connecteurs | Même cycle individuel, sans activation en bloc | À faire |

## Frontières de sécurité

Les client secrets, access tokens et refresh tokens ne sont jamais envoyés au navigateur. Le navigateur reçoit uniquement l’identifiant du connecteur, son état de connexion, les scopes non sensibles et la date de dernière vérification. Les opérations d’écriture, publication, déploiement ou facturation sont marquées comme nécessitant une confirmation.

Les tables Supabase existantes restent la source de vérité. La bibliothèque de connecteurs n’introduit pas de base d’identité, de portefeuille de crédits ou de stockage parallèle. Le registre est une couche de métadonnées ; la connexion réelle sera gérée côté serveur/Edge et stockée selon les contrats d’intégration existants.

## Choix du premier connecteur

**GitHub** est le meilleur premier connecteur pour valider le cycle complet, car le workspace produit du code et la règle « jamais de publication silencieuse sur `main` » est déjà claire. **Canva** vient ensuite pour les assets et designs, avec une portée limitée aux designs sélectionnés par l’utilisateur. Vercel sera branché après le flux de preview et de publication, pas avant.

Les providers `configured` du registre désignent uniquement les services internes déjà prévus par l’architecture Idealy. Les providers `planned` sont des capacités cataloguées, non des intégrations OAuth actives.

## Sources officielles

[1]: https://supabase.com/docs/guides/deployment/managing-environments
[2]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
[3]: https://www.canva.dev/docs/connect/
[4]: https://vercel.com/docs/integrations
