# Déploiement Sidealy — frontend du workspace

Sidealy est le frontend React/Vite du nouveau workspace Idealy. Le projet Vercel existant `idealy-ai` reste le backend Next.js et ne doit pas être reconfiguré.

## Projet Vercel dédié

Créer un projet Vercel séparé, par exemple `idealy-studio`, avec :

- **Root Directory** : `sidealy`
- **Framework Preset** : Vite
- **Node.js** : 26.x
- **Install Command** : `npm ci`
- **Build Command** : `npm run build`
- **Output Directory** : `dist`

Le fichier `vercel.json` de ce dossier contient déjà ces commandes, les en-têtes COOP/COEP pour WebContainers, le fallback SPA et les rewrites du backend.

## Variables Firebase client à configurer

Le frontend initialise Firebase dans le navigateur. Copier depuis les variables **client publiques** du projet Vercel backend, puis créer les variables correspondantes dans le projet Sidealy en ciblant Preview et Production :

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (recommandée)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (recommandée)
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optionnelle)

Ces variables sont nécessaires pour que les parcours Firebase de connexion, de création de compte et de connexion Google fonctionnent. Ne copier aucune clé privée Firebase Admin, clé service-role Supabase, clé Stripe ou clé fournisseur IA dans le frontend.

Dans Firebase Authentication, ajouter le domaine Vercel Preview de Sidealy aux domaines autorisés. Vérifier aussi le domaine et les URI de redirection du fournisseur Google lorsqu'il est activé.

## Routage entre frontend et backend

- `/api/*` est relayé vers `https://idealy-ai.vercel.app/api/*`.
- `/verify-email/*` et `/_next/*` sont relayés au backend Next.js pour terminer les liens de vérification hébergés.
- `/login`, `/register`, `/onboarding`, `/auth/action` et les routes de l'application restent servies par le fallback SPA Sidealy.

Le frontend et le backend doivent conserver le même parcours de session sur le domaine Preview.

Pour ouvrir directement le nouveau workspace Sidealy sans passer par la page marketing, utiliser la route `/studio`. Cette route est la route de démonstration du frontend et ne nécessite pas de session navigateur préexistante pour afficher l’interface. Le proxy ne doit pas être remplacé par des appels directs vers une API tierce côté navigateur.

## WebContainer : démonstration et licence commerciale

Idealy utilise le runtime WebContainer de StackBlitz dans le navigateur. L'API est utilisable pour un prototype ou une preuve de concept sans licence commerciale selon la page officielle StackBlitz. Pour une utilisation de production commerciale au service de clients, prospects ou employés, StackBlitz exige une licence commerciale active. Les conditions publiées indiquent une limite de 500 sessions mensuelles pour l'usage via un plan commercial, puis demandent de contacter StackBlitz pour une licence adaptée au-delà de cette limite.

- Variable facultative de configuration : `VITE_WEBCONTAINER_API_KEY`.
- Lorsque cette variable est fournie, Sidealy appelle `configureAPIKey(key)` avant le premier `WebContainer.boot()`.
- Ne pas inventer de clé ni réutiliser une clé appartenant à un autre compte. Obtenir la clé et le plan adaptés directement auprès de StackBlitz.
- Un Preview privé de démonstration/POC peut être utilisé pour valider l'expérience ; ne pas promouvoir l'intégration en production commerciale avant d'avoir confirmé la licence, les limites de sessions et les conditions applicables.

Références officielles : [Commercial Usage](https://webcontainers.io/enterprise), [API Reference — configureAPIKey](https://webcontainers.io/api), [StackBlitz Terms of Service](https://stackblitz.com/terms-of-service).

## Validation avant diffusion investisseurs

1. Déployer Sidealy en Preview uniquement.
2. Vérifier le chargement des routes SPA, les domaines Firebase autorisés et les cookies/session via le proxy.
3. Tester connexion, déconnexion, historique, envoi IA, génération de fichiers, WebContainer, export, Stripe et retour après paiement.
4. Vérifier COOP/COEP et `crossOriginIsolated === true` dans le navigateur.
5. Ne promouvoir le déploiement qu'après ces essais. Ne jamais changer le Root Directory du projet Vercel `idealy-ai` existant.

La configuration du dépôt prépare le déploiement ; la création du projet, les variables Firebase et l'allowlist Firebase restent des étapes Vercel/Firebase distinctes.
