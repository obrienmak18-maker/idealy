# Configuration sécurisée de l’architecture hybride Idealy

## Répartition des responsabilités

Idealy utilise PostgreSQL comme source principale pour les utilisateurs Auth.js, les conversations, les messages, les documents et les versions. Supabase reste le service spécialisé pour les fonctions Edge Idealy, le routage des fournisseurs IA, les crédits, les abonnements et les données métier déjà présentes dans les migrations Supabase.

Il ne faut pas stocker la même donnée critique dans les deux bases sans identifiant de corrélation et règle de propriété explicite. L’utilisateur de PostgreSQL et l’utilisateur Supabase devront être reliés par une table de mapping ou par un identifiant externe documenté avant d’activer la fonction IA Supabase depuis le workspace.

## Secrets côté application Next.js

Ces variables doivent être configurées dans l’espace de variables secrètes de l’hébergeur de l’application, ou dans `.env.local` uniquement sur la machine de développement :

```text
AUTH_SECRET
POSTGRES_URL
AI_GATEWAY_API_KEY
BLOB_READ_WRITE_TOKEN
DEMO_MODE=false
IDEALY_AI_PROVIDER=gateway
IDEALY_API_URL
IDEALY_AI_FUNCTION_URL
```

`AUTH_SECRET`, `POSTGRES_URL`, `AI_GATEWAY_API_KEY` et `BLOB_READ_WRITE_TOKEN` ne doivent jamais être préfixées par `NEXT_PUBLIC_`, affichées dans le client, ajoutées à Git ou copiées dans un ticket public.

## Secrets côté Supabase

Les secrets de la fonction Edge doivent être ajoutés dans **Supabase Dashboard → Edge Functions → Secrets** ou via le mécanisme secret officiel utilisé par le projet :

```text
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
AI_KEY_ENCRYPTION_SECRET
DEEPSEEK_API_KEY
GROQ_API_KEY
OPENROUTER_API_KEY
IDEALY_ALLOWED_ORIGINS
```

La clé `SUPABASE_SERVICE_ROLE_KEY` ne doit être utilisée que par la fonction Edge. Elle ne doit jamais être copiée dans Next.js côté client ou placée dans un fichier versionné.

## Procédure recommandée

1. Copier `.env.example` vers `.env.local` sur la machine de développement.
2. Remplacer les marqueurs `****` uniquement dans `.env.local`.
3. Vérifier que `.gitignore` exclut `.env`, `.env.local` et les variantes locales.
4. Lancer la migration PostgreSQL et vérifier la table utilisateur.
5. Tester `DEMO_MODE=true` avant de basculer à `DEMO_MODE=false`.
6. Ajouter les secrets Edge Supabase séparément dans Supabase.
7. Tester d’abord `IDEALY_AI_PROVIDER=gateway` avec un seul modèle.
8. N’activer `IDEALY_AI_PROVIDER=supabase-function` qu’après avoir mis en place le pont d’identité entre Auth.js et Supabase Auth.
9. Après toute fuite potentielle, révoquer et régénérer la clé concernée immédiatement.

## Ce qu’il faut fournir à l’agent

Il n’est pas nécessaire d’envoyer une clé secrète dans le chat. La méthode la plus sûre est de configurer les variables dans le tableau de bord de l’hébergeur et les secrets dans Supabase, puis de confirmer uniquement que la configuration est terminée. Si une saisie guidée dans un tableau de bord est nécessaire, l’utilisateur peut reprendre la main dans la page déjà ouverte et saisir lui-même les valeurs.

Le projet peut ensuite être vérifié avec des tests qui ne révèlent jamais la valeur des secrets : présence/absence, statut HTTP, connexion réussie ou erreur d’autorisation, sans imprimer les variables.
