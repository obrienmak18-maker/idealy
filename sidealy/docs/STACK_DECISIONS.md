# Idealy — Décisions Technologiques & Justifications de Stack

> **Projet :** Idealy (Nouvelle application indépendante — d:\Sidealy)  
> **Date :** 31 octobre 2026  
> **Statut :** Décision d'architecture formelle

---

## 1. Contexte & Contraintes du Brief

Le brief de passation laissait le choix technique ouvert (React, Angular, Material Design 3, Tailwind, etc.) sous réserve de :
1. **Éviter tout empilement décoratif :** Ne pas agréger des dépendances non motivées par un besoin produit réel.
2. **Ne rien reprendre de l'ancien prototype :** Nouveau dossier (`d:\Sidealy`), nouveau code, architecture indépendante.
3. **Assurer l'honnêteté technique :** Aucune simulation de backend IA fictif, aucun streaming prétendu actif sans service réel, aucune clé privée dans le navigateur.
4. **Accessibilité & Qualité :** WCAG AA, gestion stricte du clavier (focus visible, focus trap, Échap), `prefers-reduced-motion`, responsive (360px à 1440px+).

---

## 2. Stack Retenue

| Domaine | Technologie retenue | Version | Justification principale |
|---|---|---|---|
| **Core UI** | **React** | 19.0.0 | Modèle de composants fonctionnels, gestion fine des états d'interaction (brouillons, interruptions de cycle, sidecar), support premier plan pour l'accessibilité. |
| **Typage** | **TypeScript** | 5.8.2 | Typage strict de l'ensemble du domaine (Discriminated Unions sur `IntentionMode`, `GenerationStatus`, structures de messages et d'artefacts), vérification statique sans compromis (`tsc --noEmit` zéro erreur). |
| **Build & Tooling** | **Vite** | 6.2.0 | Temps de démarrage instantané (< 600ms), bundles de production ultra-légers (309 kB JS / 22 kB CSS), support natif ESM et intégration fluide des tests. |
| **Styling & Design System** | **Tailwind CSS** | 3.4.19 | Utility-first prévisible, absence de surcharge runtime (CSS pur précompilé), configuration pilotée par tokens CSS natifs (`var(--color-*)`) pour commutation instantanée Light/Dark sans recalcul React, support natif de `prefers-reduced-motion`. |
| **Icônes** | **Lucide React** | 0.553.0 | Bibliothèque vectorielle SVG homogène, scalable, trait 1.75px cohérent, sans aucun emoji en guise d'icône d'interface. |
| **Tests & Qualité** | **Vitest** + **Testing Library** | 3.0.7 / 16.2.0 | Tests unitaires et d'intégration rapides, simulation DOM via jsdom, vérification automatisée des contrats clés (persistance des brouillons, génération d'artefacts, interactions modales). |
| **Stockage & Adaptateur** | **localStorage natif** + fallback mémoire | Web API | Zéro dépendance externe pour la persistance locale ; adaptateur `AssistantService` documenté de manière transparente comme démonstrateur local déterministe. |

---

## 3. Évaluation & Comparaison des Alternatives

### A. Pourquoi pas Angular 19 + Angular Material (Material 3) ?
- **Atouts d'Angular :** Excellente cohérence out-of-the-box, formulaires réactifs puissants, typage fort intégré.
- **Raisons de l'écartement :**
  1. Material Design 3 (M3) impose une identité visuelle très typée (formes pilules accentuées, tokens MD3 lourds, surfaces « tonal palettes ») qui entre en conflit avec l'ambition d'une interface épurée, sobre et contemporaine inspirée des meilleurs outils de travail (ChatGPT/Claude/DeepSeek).
  2. Le surcoût en configuration et taille de bundle pour un prototype local de tranche verticale est nettement supérieur sans bénéfice fonctionnel direct pour cette phase.
  3. L'exigence du brief d'avoir une identité *originale* et non un template Google Material prête à l'emploi.

### B. Pourquoi Tailwind CSS v3 plutôt que v4 ?
- Tailwind v4 (actuellement en phase de transition avec `@tailwindcss/postcss`) introduit des changements de configuration CSS-first pouvant créer des frictions avec certains outils d'analyse et de bundling.
- Tailwind v3.4.19 offre une stabilité éprouvée, s'intègre parfaitement avec le PostCSS standard et permet un contrôle direct via `tailwind.config.js` et les variables CSS dynamiques.

### C. Pourquoi pas de bibliothèques d'animation lourdes (Framer Motion, GSAP, Rive, Three.js) ?
- Le brief stipule explicitement : *« Les bibliothèques d'animation, canvas, 3D, shaders, Rive, Spline ou vidéo ne sont retenus que si un besoin produit concret les justifie et si les performances, l'accessibilité et les solutions de repli sont traitées. Pas d'effets ajoutés seulement pour impressionner. »*
- Les transitions CSS standard (150ms–200ms sur `opacity` et `transform`) combinées à la media query `@media (prefers-reduced-motion: reduce)` répondent rigoureusement et sobrement à 100% des besoins d'orientation visuelle.

---

## 4. Stratégie Réseau & Backend : Honnêteté Technique

1. **Pas de faux backend ni de fausse WebSocket :**
   - L'application fonctionne en autonomie locale complète via `src/services/storage.ts` et `src/services/assistant.ts`.
   - L'adaptateur `AssistantService` est explicitement documenté comme adaptateur local de démonstration. Il implémente les 3 modes (`chat`, `explore`, `produce`) de façon déterministe.
2. **Prêt pour le streaming réel futur :**
   - La structure de gestion de cycle dans `AppContext` est architecturée autour d'un contrat `onChunk`, `onComplete`, `onError` et `abort()`.
   - Lors de la future connexion à une passerelle serveur sécurisée (SSE / HTTP streaming avec `ReadableStream`), aucun remaniement de l'interface ou des composants de message ne sera requis.
3. **Sécurité :**
   - Aucune clé d'API n'est requise ni autorisée dans le code client.
