# Déploiement Sidealy (frontend workspace)

Sidealy est le nouveau frontend Vite/React. Le projet Vercel `idealy-ai` relié au dépôt à la racine reste l'application Next.js et le backend existants.

## Projet Vercel à créer pour Sidealy

Créer un **projet Vercel distinct** relié au même dépôt GitHub, avec :

- **Root Directory** : `sidealy`
- **Framework Preset** : Vite
- **Install Command** : `npm ci`
- **Build Command** : `npm run build`
- **Output Directory** : `dist`

Le fichier `vercel.json` de ce dossier applique déjà les paramètres de build, le fallback SPA et les en-têtes requis par WebContainers. Il relaie aussi les routes API et d'authentification vers `https://idealy-ai.vercel.app`.

## Important avant de promouvoir en production

1. Ne pas modifier le Root Directory du projet Vercel `idealy-ai` existant : il continue d'héberger le backend Next.js.
2. Publier d'abord Sidealy dans un projet Vercel séparé en Preview.
3. Effectuer un test réel du parcours connexion/déconnexion, des cookies de session, du chat IA, des appels API, du paiement redirigé et du runtime WebContainer sur le domaine Preview.
4. Vérifier que le domaine backend `idealy-ai.vercel.app` reste bien celui du backend. Si le domaine backend change, mettre à jour les destinations des rewrites dans ce fichier.
5. Ne basculer le trafic investisseur ou le domaine public qu'après validation de ces tests.

Cette configuration prépare le projet ; elle ne crée pas de projet Vercel et ne publie pas de déploiement à elle seule.
