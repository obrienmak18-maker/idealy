# 🌌 IDEALY DESIGN SYSTEM V2 — ARCHITECTURAL SPECIFICATION

> **"The place where an idea becomes software."**  
> Idealy n'est pas un tableau de bord générique ni un clone d'éditeur préexistant.  
> C'est un instrument d'ingénierie et de conception d'une précision spatiale, cognitive et technique absolue.

---

## 1. Principes Fondamentaux (Philosophie)

| Principe | Définition & Règle d'application |
|---|---|
| **Intelligent & Calm** | Le bruit visuel est proscrit. Pas de bordures lumineuses décoratives permanentes, pas de gradients criards en tâche de fond. Le système s'anime uniquement lorsqu'une action réelle est en cours. |
| **Architectural over Decorative** | Chaque élément visuel possède une justification fonctionnelle. Les surfaces délimitent des contextes de calcul, les lignes guident l'attention, l'élévation indique la profondeur spatiale. |
| **Cognitive Motion** | L'animation n'est pas un ornement. Elle explique ce qui change dans le modèle mental de l'application (transfert d'état, transition d'escouade, écriture de fichier VFS). |
| **Spatial Continuity** | Le passage entre le Chat, le Plan, le Code, le Canvas et la Console préserve les repères spatiaux de l'utilisateur. |
| **Progressive Disclosure** | Ne jamais noyer l'utilisateur sous la totalité des outils. Dévoiler la complexité au moment exact où la décision technique l'exige. |
| **State Completeness** | Aucun état intermédiaire (chargement, erreur, synchronisation) n'est simulé ou laissé indéfini. Chaque état a une signature visuelle véridique. |
| **Performance Budget** | 60 fps constants. Préférence absolue pour `transform` et `opacity`. Zéro re-render parasite. `backdrop-filter` mesuré et désactivé sur machines contraintes. |
| **Accessibility Structural** | Navigation clavier intégrale, contraste WCAG AA/AAA, repères ARIA stricts, focus visible non intrusif, et respect absolu de `prefers-reduced-motion`. |

---

## 2. Surfaces & Hiérarchie Spatiale

L'interface est structurée en 6 couches d'élévation spatiale strictes :

```text
Overlay        (Z-Index 50 - Modales critiques, confirmations d'actions irréversibles)
   ↓
Floating       (Z-Index 40 - Command Palette, Popovers, Menus contextuels, Toasts réels)
   ↓
Raised         (Z-Index 30 - Composer actif, Cartes d'agents en run, Inspector actif)
   ↓
Surface        (Z-Index 20 - Panneaux de Workspace : Chat, Code Editor, Canvas, Console)
   ↓
Sub-surface    (Z-Index 10 - Barres d'outils, onglets d'en-tête, filtres secondaires)
   ↓
Canvas / Base  (Z-Index 0  - Fond applicatif, grille neutre, espace de travail)
```

### Règles de délimitation
- **Bordures** : 1px neutre (`var(--border)`). Pas de bordures néon ou colorées en dehors des états de focus utilisateur ou d'erreurs critiques.
- **Ombres** : L'ombre exprime la distance avec le canvas, pas un effet cosmétique.

---

## 3. Tokens & Palette de Couleurs

Idealy repose sur une échelle neutre sombre profonde, un accent primaire de précision et des teintes sémantiques strictes.

### Echelle Neutre (Dark Mode par défaut)
```css
--background: #090d16;         /* Fond principal abyssal */
--foreground: #f8fafc;         /* Texte haute lisibilité */
--card: #0f172a;               /* Surface de panneau standard */
--card-foreground: #f8fafc;
--muted: #131b2e;              /* Surface secondaire / fond inactif */
--muted-foreground: #94a3b8;   /* Texte secondaire et métadonnées */
--border: rgba(255, 255, 255, 0.08); /* Ligne séparatrice neutre */
--ring: #38bdf8;               /* Focus visible accessible */
```

### Voies & Accents Sémantiques (Gamification Thématique)
Les 4 Voies disposent d'un halo spectral utilisé **exclusivement** pour contextualiser la jauge de ressource et le statut de mission :

| Voie | Ressource | Couleur Primaire | Halo Spectral (Activité réelle uniquement) |
|---|---|---|---|
| **Ninja** | Chakra | `#f97316` (Orange-500) | `rgba(249, 115, 22, 0.16)` |
| **Mage** | Mana | `#8b5cf6` (Violet-500) | `rgba(139, 92, 246, 0.16)` |
| **Hunter** | Nen | `#14b8a6` (Teal-500) | `rgba(20, 184, 166, 0.14)` |
| **Professionnel** | Énergie | `#0ea5e9` (Sky-500) | `rgba(14, 165, 233, 0.14)` |

### États Sémantiques du Système
- **Succès / Validé** : `oklch(0.68 0.16 150)` (Émeraude technique)
- **Attention / Quota** : `oklch(0.75 0.16 75)` (Ambre mesuré)
- **Erreur / Blocage** : `oklch(0.62 0.20 25)` (Carmin d'alerte)
- **Activité IA / Calcul** : `oklch(0.72 0.14 235)` (Cyan d'impulsion)

---

## 4. Échelle Typographique

Police de caractère : **Inter / System UI**, enrichie des fonctionnalités OpenType `font-feature-settings: "ss01", "ss02", "cv01", "tnum"`. Les chiffres tabulaires (`tnum`) sont obligatoires pour les métriques Power, les versions VFS et les compteurs de tokens.

| Rôle | Taille | Graisse | Hauteur de ligne | Usage |
|---|---|---|---|---|
| **Display** | 48px / 3rem | Bold (700) | 1.1 | Landing, titre de mission majeure |
| **Title** | 32px / 2rem | SemiBold (600) | 1.2 | Titre de projet, vue générale |
| **Heading** | 24px / 1.5rem | SemiBold (600) | 1.3 | Sections de workspace, en-tête d'inspecteur |
| **Subheading**| 18px / 1.125rem | Medium (500) | 1.4 | Groupes de connecteurs, étapes d'onboarding |
| **Body** | 14px / 0.875rem | Regular (400) | 1.5 | Échanges de chat, descriptions, spécifications |
| **Label** | 12px / 0.75rem | Medium (500) | 1.4 | Boutons, badges de rôle agent, onglets |
| **Meta** | 11px / 0.6875rem | Medium (500) | 1.3 | Timestamps, SHA-256 digests, versions VFS |
| **Code** | 13px / 0.8125rem | Regular (400) | 1.6 | CodeMirror, logs de console, aperçu JSON |

---

## 5. Motion & Transitions Cognitives

Toute animation doit respecter `prefers-reduced-motion: reduce`. Si réduit, le composant bascule en transition instantanée d'opacité (50ms).

```text
Micro-interaction (hover, appui bouton, switch)      : 100ms - 140ms (ease-out)
Composant (popover, expansion d'onglet, toast)       : 160ms - 220ms (cubic-bezier(0.22, 1, 0.36, 1))
Transition spatiale (panneau de code, split canvas)  : 240ms - 320ms (cubic-bezier(0.4, 0, 0.2, 1))
Changement de perspective (entrée dans le workspace) : 360ms - 480ms (cubic-bezier(0.16, 1, 0.3, 1))
```

> **Interdiction absolue** : Pas d'animations infinies de pulsation en l'absence de traitement en arrière-plan. Un composant statique ne pulse jamais.

---

## 6. Architecture des Composants

Idealy utilise une composition de briques robustes :
1. **Radix UI Primitives** : Accessibilité intrinsèque pour les Dialogs, Dropdowns, Tooltips, Accordions, Tabs.
2. **Framer Motion** : Réservé aux transitions d'états d'orchestration, à l'expansion de canvas et aux diffs séquentiels.
3. **Tailwind CSS v4** : Tokens natifs via `@theme inline` sans abstraction superflue.
4. **CodeMirror 6** : Moteur d'affichage et d'édition de code haute performance, coloration syntaxique Shiki et One Dark.

---

## 7. Responsive Transformation

Le workspace ne se contente pas de "réduire les colonnes" sur petit écran.
- **Desktop (≥ 1024px)** : Workspace bi-axial (Chat & Ordres à gauche, Canvas / Code / Console à droite avec séparateur ajustable).
- **Tablette (768px - 1023px)** : Vue partagée par onglets contextuels fluides (Conversation / Aperçu / Fichiers).
- **Mobile (< 768px)** : Mode d'action focalisé. Le chat occupe la vue principale. Les artefacts et prévisualisations s'ouvrent sous forme de feuilles modales (Sheets) plein écran dismissibles.

---

## 8. Anti-Patterns Déclarés (Ce qui est banni d'Idealy)

1. ❌ **Le "Dashboard Sapin de Noël"** : Dégradés violets/roses sur chaque bordure, 15 cartes illuminées sans données.
2. ❌ **La Sidebar Musée** : Lister 35 éléments dans la navigation latérale. Seuls 4 repères dominent : `Missions`, `Workspaces`, `Connecteurs`, `Paramètres`.
3. ❌ **Le faux statut "Connecting..."** : Afficher un indicateur vert sur un connecteur sans handshake cryptographique réel.
4. ❌ **Le "Loading..." générique** : Tout temps d'attente doit expliciter la phase exacte : `"Architecte structure le plan..."`, `"Reviewer valide le typage..."`.
5. ❌ **L'infantilisation par la gamification** : Pas de confettis, de sons de trompette ou de badges décoratifs sans valeur technique. Le rang et les Voies récompensent une maîtrise d'ingénierie logicielle.
