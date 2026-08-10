# Idealy

Idealy est un IDE IA de nouvelle génération, conçu pour générer, éditer, et déployer des applications complètes directement depuis le navigateur. Conçu avec une architecture "full-stack", Idealy rassemble une suite d'agents IA (Orchestrateur, Bâtisseur, Validateur) couplés à un environnement d'exécution WebContainers et à une expérience utilisateur calquée sur les meilleurs standards du marché (inspiration Cursor, Rork, Atom.dev).

## Fonctionnalités Principales

- **Agents IA Spécialisés** : Orchestration en 3 étapes (Analyse -> Génération -> Validation) pour générer l'architecture du projet (IUPS - Idealy Universal Project Schema).
- **Éditeur Interactif** : L'éditeur de code intégré offre un surlignage syntaxique et la sauvegarde en temps réel du code généré dans le cache de la mission.
- **Composer & Diff Viewer** : Une interface d'analyse de code (façon Git) pour voir les ajouts et suppressions via `react-diff-viewer-continued` avant d'accepter les changements.
- **Terminal Intégré** : Propulsé par `xterm.js`, offrant une console interactive prête à se connecter au shell de votre WebContainer.
- **WebContainers** : Lancement d'un environnement Node.js complet dans le navigateur pour prévisualiser instantanément le résultat de la génération IA.
- **Persistance Supabase** : Les historiques de vos missions et le code généré sont sauvegardés en toute sécurité dans une base de données distante, avec authentification et RLS (Row Level Security).
- **Slash Commands** : Contrôle du flux via le chat avec des commandes telles que `/deploy` (pour Vercel) et `/fix` (pour la réparation du code).

## Stack Technique

- **Frontend** : React 19, Vite, TailwindCSS (v4), Framer Motion, Radix UI.
- **IA** : Vercel AI SDK, appels LLM optimisés (jusqu'à 8000 tokens en sortie).
- **Backend / Database** : Supabase (Auth, Postgres, RLS).
- **State Management** : Zustand.
- **Environnement Virtuel** : WebContainer API.
- **Composants Avancés** : XTerm.js (Terminal), React Diff Viewer (Diffs).

## Prérequis

1. Node.js (v18+)
2. pnpm
3. Un compte Supabase (pour la base de données et l'authentification)

## Installation & Démarrage

1. Clonez le dépôt et installez les dépendances à la racine du workspace :
   ```bash
   pnpm install
   ```

2. Créez un fichier `.env.local` dans le dossier `artifacts/idealy/` avec vos clés :
   ```env
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   ```

3. Lancez le serveur de développement :
   ```bash
   pnpm --filter @workspace/idealy run dev
   ```

## Déploiement

Le projet est configuré pour être déployé sur Vercel. Veillez à bien configurer vos variables d'environnement Supabase dans les paramètres de votre projet Vercel. Les headers de sécurité (COOP/COEP) sont déjà configurés dans `vite.config.ts` pour garantir le bon fonctionnement des WebContainers en production.

## Configuration Supabase (Migrations)

Le projet nécessite une table `missions` dans Supabase pour fonctionner correctement. 
Exécutez le script SQL présent dans `supabase/migrations/20260807000000_missions.sql` directement dans l'interface SQL Editor de Supabase.

---
*Créé avec Idealy & Antigravity.*
