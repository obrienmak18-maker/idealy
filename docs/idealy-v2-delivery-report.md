# Rapport final de livraison — Idealy V2 shell + backend IA + Firebase Auth conditionnel

Date : 2026-08-19
Branche : `feat/idealy-v2-shell`
Dernier commit : `c75751f` — `test(studio): document ZIP flow smoke test`

## Résultat honnête

Le chantier est intégré et versionné sur la branche de travail. L’interface principale du ZIP Idealy-Studio est portée dans Idealy, le plan de mission IA dynamique est branché, et un adaptateur Firebase Auth conditionnel est prêt. Le code compile et la CI est verte.

**Firebase Auth n’est pas encore actif en production**, car aucun projet Firebase réel ni aucune variable `VITE_FIREBASE_*` n’ont été configurés. Tant que ces variables manquent, Supabase Auth reste le chemin utilisé ; l’application ne crée pas une deuxième identité métier.

La branche `main` n’a pas été modifiée et aucune fusion n’a été effectuée.

## Ce qui a été livré

| Domaine | Livraison | État |
|---|---|---|
| Interface ZIP | Accueil, onboarding en trois étapes, workspace, mission, planification, construction et preview contrôlée dans `DesignMockupPage.tsx` | Intégré |
| Plan IA | `requestMissionPlan()` appelle `process-ai-request` avec `planOnly: true` | Intégré |
| Équipe dynamique | `parseMissionPlan()` valide une équipe composée selon le projet ; les rôles ne sont plus une liste fixe | Intégré avec fallback local |
| Fallback sans session | La maquette peut parcourir le flux sans authentification et affiche clairement le mode local | Testé |
| Firebase Auth | Email/password, Google, GitHub, déconnexion, observateur de session et token Firebase différé | Code prêt, non activé |
| Pont Supabase | Le client Supabase peut utiliser `getFirebaseIdToken` via `accessToken` lorsque Firebase est configuré | Code prêt |
| Documentation | Variables d’environnement, limites d’architecture et compte rendu de smoke test | Versionné |
| Stripe et crédits | Aucun faux prix ni Price ID n’a été introduit ou remplacé dans ce chantier | Non modifié |

## Vérifications effectuées

Les vérifications locales suivantes ont réussi :

```text
pnpm run typecheck
pnpm run build  # depuis artifacts/idealy
```

Le smoke test navigateur a parcouru la route `/design-mockup` avec une mission de pizzeria : sélection de la voie Ninja, saisie du nom, réponses d’onboarding, ouverture du workspace, génération du plan local, validation et passage en construction. La preview reste fermée jusqu’à la construction et affiche le skeleton prévu ; le fallback local n’allume pas WebContainer.

La CI GitHub du commit `c75751f` est terminée avec succès. Les jobs `build` et `webhook-test` sont verts. Le job `deploy` est ignoré sur cette branche de fonctionnalité ; cela ne constitue donc pas une preuve d’un déploiement Netlify de cette version.

## Ce qui n’est pas encore vrai

Le test d’un appel IA authentifié réel n’a pas été exécuté, car aucune session utilisateur ni configuration Firebase active n’était disponible. Le plan observé dans le navigateur est donc le fallback local, pas une preuve de connexion réelle à `process-ai-request` avec un token Firebase.

Firebase ne peut pas être activé uniquement depuis le frontend. Il faut encore créer le projet Firebase, activer les fournisseurs d’authentification, enregistrer la configuration Third-Party Auth côté Supabase, définir le claim `role: authenticated`, puis renseigner les variables publiques de configuration dans l’environnement de build. Aucune clé secrète n’a été ajoutée au dépôt.

Le paywall et les prix Stripe réels n’ont pas été modifiés ici. Il ne faut pas considérer les prix affichés par une éventuelle maquette comme la source de vérité : les montants et Price IDs doivent rester lus depuis la configuration Stripe/Supabase existante. Ce chantier n’a pas vérifié ni remplacé ces valeurs.

## Prochaine séquence recommandée

1. Créer ou sélectionner le projet Firebase et relever `apiKey`, `authDomain`, `projectId` et `appId`.
2. Activer Email/Password, Google et GitHub dans Firebase, puis configurer les domaines et les URLs de redirection.
3. Remplacer le placeholder de `supabase/config.toml` par le vrai `project_id` Firebase et activer l’intégration Third-Party Auth correspondante dans Supabase.
4. Ajouter le claim Firebase `role: authenticated` selon la méthode officielle retenue.
5. Renseigner les variables `VITE_FIREBASE_*` uniquement dans `.env.local` et Netlify, jamais dans Git.
6. Tester une connexion réelle, l’obtention du token, l’appel `process-ai-request` en `planOnly`, puis l’accès aux missions et crédits Supabase.
7. Tester séparément les webhooks Stripe et le paywall en vérifiant les vrais Price IDs ; ne pas utiliser les montants d’une maquette comme référence.
8. Après validation visuelle et backend, ouvrir une pull request vers `main`. Aucun merge ne doit être fait avant instruction explicite.
