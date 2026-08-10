# Idealy — AI Development Studio

> Studio de développement IA multi-agents où chaque idée devient une mission.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Vite](https://img.shields.io/badge/Vite-5.4-purple)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-cyan)

## 🎯 Qu'est-ce qu'Idealy ?

Idealy est un studio de développement IA nouvelle génération inspiré par Cursor, Rork et Emergent.sh. Il orchestre une équipe de spécialistes IA pour transformer vos idées en applications complètes, avec une expérience gamifiée et immersive.

### Fonctionnalités principales

- 🤖 **Multi-agents IA** : Architecte, Développeur, Validateur et Optimiseur collaborent en temps réel
- 🎮 **Gamification** : Choisissez votre voie (Ninja, Mage, Hunter, Pro) et progressez avec un système d'énergie
- 🚀 **Déploiement intégré** : Prévisualisez et déployez sur Vercel en un clic
- 🔗 **Connecteurs externes** : Intégrez Supabase, GitHub, Stripe, Vercel et plus
- 📱 **Export universel** : Générez des projets React/Vite, Expo React Native, etc.
- 🎙️ **Dictée vocale** : Décrivez vos projets à voix haute
- 👥 **Collaboration temps réel** : Travaillez à plusieurs sur le même projet

## 🚀 Démarrage rapide

### Prérequis

- Node.js >= 18.0
- npm ou pnpm
- Un projet Supabase (pour l'authentification)

### Installation

```bash
# Cloner le repository
git clone <votre-repo>
cd idealy

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Configurer les variables Supabase dans .env.local
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Lancer le serveur de développement
npm run dev
```

L'application sera disponible sur `http://localhost:5173`

## 📦 Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance le serveur de développement Vite |
| `npm run build` | Build l'application pour la production |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run typecheck` | Vérifie les types TypeScript |

## 🔐 Sécurité

### Règles de sécurité critiques

1. **JAMAIS de secrets côté client** : Les clés API, tokens et secrets doivent rester côté serveur (Edge Functions)
2. **Variables d'environnement** :
   - ✅ `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont publiques (safe)
   - ❌ Les clés API (OpenRouter, Groq, Vercel, Stripe, etc.) ne doivent PAS être stockées dans le localStorage
3. **Gitignore** : Le fichier `.gitignore` protège contre le commit accidentel de secrets

### Configuration requise pour la production

- Déployer les Edge Functions Supabase pour gérer les secrets
- Configurer un système de logging (Sentry, LogRocket, etc.)
- Activer HTTPS obligatoirement
- Configurer CORS sur les Edge Functions

## 🏗️ Architecture

### Structure du projet

```
src/
├── agents/              # Système multi-agents IA
│   ├── orchestrator.ts  # Orchestration des agents
│   ├── provider.ts      # Providers IA (OpenRouter, Groq)
│   └── skillRouter.ts   # Routage des compétences
├── app/                 # Point d'entrée et App racine
├── components/          # Composants React réutilisables
│   ├── chat/           # Composants de chat
│   ├── workspace/      # Composants de l'espace de travail
│   └── ErrorBoundary.tsx
├── core/                # Logique métier core
│   └── iups/            # Idealy Universal Project Schema
├── features/            # Fonctionnalités métier
├── hooks/               # Hooks React personnalisés
│   └── useSpeechRecognition.ts
├── lore/                # Univers et Voies (Ninja, Mage, Hunter, Pro)
├── routes/              # Pages de l'application
│   ├── LandingPage.tsx
│   ├── OnboardingPage.tsx
│   └── WorkspacePage.tsx
├── services/            # Services externes
│   ├── collabService.ts # Collaboration temps réel (Yjs)
│   ├── projectDownloader.ts
│   └── vercelDeployer.ts
├── stores/              # État global (Zustand)
│   └── idealyStore.ts
├── themes/              # Styles et thèmes
├── types/               # Types TypeScript
└── utils/               # Utilitaires
    ├── logger.ts        # Logging structuré
    └── validation.ts    # Validations de formulaires
```

### Stack technique

- **Frontend** : React 18, TypeScript 5, Vite 5
- **UI** : Tailwind CSS 3, Framer Motion, Lucide Icons
- **State** : Zustand 5
- **Backend** : Supabase (Auth, Database, Edge Functions)
- **IA** : AI SDK, OpenRouter, Groq
- **Preview** : WebContainers API (StackBlitz)
- **Collaboration** : Yjs + y-webrtc
- **PWA** : Vite PWA Plugin

## 🛠️ Développement

### Bonnes pratiques

- **Types stricts** : `tsconfig.json` a `strict: true` activé
- **Linting** : ESLint configure avec les règles React recommandées
- **Pas de secrets** : Toutes les clés API doivent être gérées côté serveur
- **Tests** : Ajouter des tests pour les fonctionnalités critiques

### Ajouter une nouvelle Voie (Way)

Les Voies sont définies dans `src/lore/ways.ts`. Chaque voie comprend :
- Un univers (nom, tagline, description)
- Des agents avec leur personnalité
- Un système d'énergie et de grades

### Ajouter un connecteur

Les connecteurs sont gérés dans `src/components/workspace/ConnectorsPanel.tsx`. Pour ajouter un nouveau connecteur :
1. Ajouter le champ dans `IdealyConnectors` (store)
2. Ajouter la configuration dans `ConnectorsPanel`
3. Implémenter la logique métier dans un service dédié

## 📊 État du projet

### ✅ Fonctionnalités implémentées

- [x] Authentification (Email, Google, GitHub)
- [x] Multi-voies avec gamification
- [x] Système d'énergie quotidien
- [x] Orchestration multi-agents IA
- [x] Génération de projets IUPS
- [x] Preview live avec WebContainers
- [x] Téléchargement ZIP des projets
- [x] Collaboration temps réel (Yjs)
- [x] Déploiement Vercel
- [x] PWA installable
- [x] Reconnaissance vocale
- [x] Upload de fichiers

### ⚠️ En cours / À améliorer

- [ ] Tests unitaires et E2E
- [ ] Refactoring de WorkspacePage (trop volumineux)
- [ ] Internationalisation (i18n)
- [ ] Thème clair
- [ ] Monitoring et logging production
- [ ] Rate limiting sur les appels IA
- [ ] Backend sécurisé pour les secrets

## 🚨 Problèmes connus

Voir [ANALYSE_PROBLEMES.md](ANALYSE_PROBLEMES.md) pour la liste complète.

### Critique

- Les clés API sont stockées côté client (voir sécurité)
- WorkspacePage.tsx fait 975 lignes (nécessite un refactoring)

## 📝 Licence

[Votre licence ici]

## 👥 Contributeurs

[Votre équipe ici]

## 📚 Documentation complémentaire

- [Architecture détaillée](docs/ARCHITECTURE.md)
- [Analyse des problèmes](ANALYSE_PROBLEMES.md)

## 🙏 Remerciements

Inspiré par :
- [Cursor](https://cursor.sh)
- [Rork](https://rork.ai)
- [Emergent.sh](https://emergent.sh)
- [Bolt.new](https://bolt.new)

---

**Note** : Ce projet est en développement actif. Certaines fonctionnalités peuvent changer.

