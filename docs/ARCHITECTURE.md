# Architecture Technique d'Idealy

Ce document détaille le fonctionnement interne d'Idealy, son système d'orchestration IA, et la manière dont les différents modules s'imbriquent pour générer et prévisualiser une application complète dans le navigateur.

## 1. Le Modèle IUPS (Idealy Universal Project Schema)

Au cœur d'Idealy se trouve l'IUPS, un format JSON structuré généré par les LLM. Au lieu de demander à l'IA de générer des fichiers texte un par un, Idealy demande un objet JSON complet représentant le projet entier.

### Structure de l'IUPS
```json
{
  "version": "1.0",
  "project": {
    "name": "mon-app",
    "description": "Une application incroyable",
    "files": {
      "package.json": "{ \"name\": \"mon-app\", \"scripts\": { \"dev\": \"vite\" } }",
      "src/main.tsx": "import React from 'react'; ...",
      "index.html": "<!DOCTYPE html>..."
    }
  },
  "metadata": {
    "framework": "react",
    "dependencies": {
      "react": "^18.0.0"
    }
  }
}
```
L'IUPS permet une manipulation facile en mémoire, le stockage dans Supabase (colonne `schema` de type `jsonb`), et le rendu côté WebContainers ou Éditeur.

## 2. Le Pipeline des Agents (Orchestrateur)

La fonction `runMission` dans `WorkspacePage.tsx` déclenche un pipeline asynchrone impliquant trois rôles principaux :

1. **Orchestrateur (L'Architecte)** : Analyse le prompt de l'utilisateur (`analyzeIntent`), estime la complexité, planifie la structure globale de l'application et définit l'architecture logicielle.
2. **Bâtisseur (Le Développeur)** : Reçoit le plan de l'Orchestrateur et génère concrètement l'IUPS (via `buildIUPS` de Vercel AI SDK) avec le paramètre `maxTokens: 8000` pour assurer qu'aucun fichier n'est tronqué.
3. **Validateur (Le Testeur)** : Vérifie brièvement l'output (pour le chat UI), tandis que l'interface prend le relais pour injecter l'IUPS dans les systèmes visuels.

## 3. Le Moteur de Prévisualisation (WebContainers)

Le composant `WebContainerPreview.tsx` est le cœur de l'exécution live.
- Il convertit l'IUPS en un FileSystemTree compréhensible par l'API WebContainer (`@webcontainer/api`).
- Il installe silencieusement les dépendances (`npm install`).
- Il lance le serveur de développement (`npm run dev`).

**Important** : Les WebContainers utilisent `SharedArrayBuffer` en interne. Ils ne peuvent fonctionner que si la page web appelante (Idealy) est servie avec les en-têtes (headers) COOP/COEP :
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`
(Configurés dans `vite.config.ts`).

## 4. Mode Composer et Diffs (L'inspiration Atom/Cursor)

Le panneau Composer (`ComposerPanel.tsx`) est activé lors d'une modification (ou d'un `/fix`).
Au lieu de modifier aveuglément le projet, le Composer compare le `previousSchema` et le `currentSchema` :
- Les différences sont affichées via le composant `react-diff-viewer-continued`.
- L'utilisateur peut accepter ou rejeter chaque fichier individuellement.

## 5. Terminal Intégré

L'onglet **Logs / Terminal** (`Terminal.tsx`) n'utilise plus un simple log texte. Il utilise **xterm.js** pour fournir une console ANSI complète. Bien que l'I/O du WebContainer soit actuellement streamé vers des logs web, cette infrastructure XTerm est prête pour être interfacée directement avec les streams `stdout` et `stdin` du WebContainer (via un stream duplex), offrant ainsi l'expérience absolue d'un IDE local dans le navigateur.

## 6. Base de données et Authentification

Toute l'application est couplée à **Supabase** via `idealyStore.ts`.
- **Authentification** : Gérée via la PKCE Flow de Supabase.
- **Missions** : Les projets sont enregistrés dans la table `missions`, qui possède le schéma IUPS complet.
- **RLS (Row Level Security)** : Chaque mission est strictement isolée. L'utilisateur courant de Supabase (`auth.uid()`) est vérifié avant tout INSERT, SELECT, UPDATE, ou DELETE. Les utilisateurs n'ont aucun accès aux projets des autres.
