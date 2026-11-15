# Idealy — Direction Artistique & Système Visuel

> **Source :** Dérivé de `design-system/idealy/MASTER.md` et enrichi selon les règles de `ui-ux-pro-max`.

---

## 1. Principes Fondateurs

1. **Clarté & Sérénité :** Réduire la charge mentale. L'interface s'efface pour laisser place à la réflexion et au travail. Les bordures sont subtiles, les surfaces étagées avec parcimonie.
2. **Précision & Métier :** Typographie technique soignée, alignements millimétrés sur grille de 4px, hiérarchie claire basée sur les graisses et l'échelle de taille plutôt que sur la multiplication de badges ou de couleurs criardes.
3. **Zéro Émoji en guise d'icône :** Utilisation stricte d'icônes vectorielles SVG (Lucide) avec épaisseur de trait constante (1.75px) et labels ARIA descriptifs.
4. **Motion au service du sens :** Transitions fluides de 150ms à 200ms sur `opacity` et `transform` uniquement. Suppression totale de toute animation superflue lorsque `prefers-reduced-motion` est actif.

---

## 2. Palette de Couleurs (Mode Clair & Mode Sombre)

La palette repose sur des tokens CSS sémantiques universels assurant un ratio de contraste supérieur à **4.5:1** (conforme WCAG 2.1 niveau AA).

| Rôle Sémantique | Token CSS | Thème Clair (Hex) | Thème Sombre (Hex) |
|---|---|---|---|
| **Arrière-plan principal** | `--color-bg-base` | `#F8FAFC` (Slate 50) | `#0B0F17` (Deep Obsidian) |
| **Surface surélevée (Cartes)** | `--color-bg-surface` | `#FFFFFF` | `#111827` (Gray 900) |
| **Surface secondaire (Barres, Tiroirs)** | `--color-bg-subtle` | `#F1F5F9` (Slate 100) | `#1A2234` |
| **Texte principal (Contraste maximal)** | `--color-text-main` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) |
| **Texte secondaire / Muted** | `--color-text-muted` | `#475569` (Slate 600) | `#94A3B8` (Slate 400) |
| **Bordures & Séparateurs** | `--color-border` | `#E2E8F0` (Slate 200) | `#1F2937` (Gray 800) |
| **Bordures d'accent / Focus** | `--color-ring` | `#6366F1` (Indigo 500) | `#818CF8` (Indigo 400) |
| **Accent principal (Idealy Indigo)** | `--color-primary` | `#4F46E5` (Indigo 600) | `#6366F1` (Indigo 500) |
| **Texte sur Accent** | `--color-on-primary` | `#FFFFFF` | `#FFFFFF` |
| **Accent interactif (Cyan/Teal)** | `--color-accent` | `#0891B2` (Cyan 600) | `#06B6D4` (Cyan 500) |
| **Destructif / Erreur** | `--color-destructive` | `#DC2626` (Red 600) | `#EF4444` (Red 500) |
| **Succès** | `--color-success` | `#16A34A` (Green 600) | `#22C55E` (Green 500) |

---

## 3. Typographie

- **Famille Principale (UI & Corps) :** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Famille Monospace (Code & Raccourcis) :** `JetBrains Mono`, `ui-monospace`, `SFMono-Regular`, `Consolas`, `monospace`.

### Échelle typographique :
- **Titre d'Espace / Conversation :** 18px (`1.125rem`), font-weight 600, leading 1.4
- **Texte de message :** 15px (`0.9375rem`), font-weight 400, leading 1.6
- **Texte secondaire / Métadonnées :** 13px (`0.8125rem`), font-weight 400, leading 1.4
- **Légendes / Badges / Touches :** 11px (`0.6875rem`), font-weight 500, uppercase tracking-wide
- **Code en bloc :** 13.5px, font-weight 400, leading 1.5, tab-size 2

---

## 4. Grille d'Espacement & Densité

Base d'incrémentation : **4px**
- `space-1` : 4px (micro-ajustements, séparations d'icônes en ligne)
- `space-2` : 8px (espacement interne de boutons compacts, badges)
- `space-3` : 12px (padding standard de champs de texte et items de liste)
- `space-4` : 16px (marges de conteneur, cartes de messages)
- `space-6` : 24px (espacement entre blocs de discussion majeurs)
- `space-8` : 32px (séparations de sections et en-têtes)

---

## 5. Composants Clés & Contrats d'État

1. **Boutons :**
   - États : `Default`, `Hover` (légère élévation + teinte + 150ms transition), `Active` (scale 0.98), `Focus-visible` (ring 2px indigo avec offset), `Disabled` (opacité 0.5, curseur not-allowed).
2. **Blocs de Code :**
   - En-tête avec nom de langage et bouton « Copier ».
   - Défilement horizontal contenu dans le bloc sans déborder sur la page.
   - Message temporaire « Copié ! » pendant 2 secondes ou alerte discrète en cas de refus presse-papiers.
3. **Dialogue de confirmation de suppression :**
   - Fond assombri avec `backdrop-filter: blur(4px)`.
   - Focus initial positionné par défaut sur le bouton « Annuler » pour éviter toute destruction accidentelle.
   - Touche `Échap` annulant l'action et rendant le focus au bouton appelant.
