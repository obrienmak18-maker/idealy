# CLASSE — La gestion scolaire avec style

CLASSE est le package scolaire du monorepo. Son interface reprend la maquette Stitch fournie : sidebar lavande, topbar CLASSE, cartes glassmorphism, palette violette et typographie Inter. Les écrans sont unifiés dans une seule navigation et se réorganisent pour un usage mobile.

## Fonctionnalités opérationnelles

Le package propose une expérience interactive persistée dans le navigateur : dashboard adapté au rôle, recherche universelle, gestion des élèves et dossier unifié, ajout d’inscription avec code automatique, import avec étape d’analyse et détection des doublons, classes configurables, planning avec contrôle des conflits, appel avec présence/retard/absence/excusé, saisie des notes avec sauvegarde au blur, calcul des bulletins pondérés, classement et mentions, paiements partiels et rapprochement Mobile Money, messagerie, QR d’accès réel avec expiration de quinze minutes et révocation, paramètres de structure et rôles, licence séparée des finances de l’école, ainsi que l’indicateur de synchronisation.

Les données de démonstration sont enregistrées dans `localStorage` sous des clés préfixées `classe-`. Cette stratégie permet de tester tous les flux sans compte ni secrets et simule l’expérience offline-first de la maquette. Lorsque les variables Firebase sont renseignées, `src/lib/firebase.ts` initialise l’application Firebase afin de préparer le raccordement Firestore/Auth/Storage ; les règles multi-écoles sont fournies dans `firebase/firestore.rules`.

## Développement

Depuis la racine du monorepo :

```bash
pnpm --filter @workspace/zeno dev
```

La validation de production se fait avec :

```bash
pnpm --filter @workspace/zeno typecheck
pnpm --filter @workspace/zeno build
```

## Configuration Firebase

Créer un fichier `.env.local` dans `artifacts/zeno` avec les variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` et `VITE_FIREBASE_APP_ID`. La présence de ces variables active uniquement l’initialisation du client Firebase ; les fonctions de génération de custom token, de révocation des tokens et de calcul des bulletins restent à déployer côté Cloud Functions dans le projet Firebase de l’établissement.

## Limites explicites

Le package livré est la version web fonctionnelle de la maquette dans le dépôt existant. Il ne prétend pas avoir déployé un projet Firebase réel, un binaire Tauri ou un APK Expo sans identifiants de projet et certificats fournis. Les actions d’export et d’impression sont préparées dans l’interface pour être reliées au Storage et aux générateurs PDF du projet de déploiement.
