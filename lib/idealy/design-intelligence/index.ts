/**
 * UI/UX Pro Max Intelligence Engine for Idealy
 * Integrated from ui-ux-pro-max-skill: 79 styles, 192 product palettes,
 * 119 UX guidelines, and accessibility rules.
 */

export interface UiUxProMaxRule {
  priority: number;
  category: string;
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  mustHave: string[];
  avoid: string[];
}

export const UI_UX_PRO_MAX_RULES: UiUxProMaxRule[] = [
  {
    priority: 1,
    category: "Accessibilité (A11y)",
    impact: "CRITICAL",
    mustHave: [
      "Contraste texte/fond d'au moins 4.5:1 (WCAG AA)",
      "Attributs aria-label ou text accessible sur tous les boutons d'icônes",
      "Anneaux de focus (focus-visible) visibles et distinguables sans casser le layout",
      "Navigation intégrale au clavier sans piège de focus",
    ],
    avoid: [
      "Suppression totale de l'outline/ring au focus",
      "Boutons d'icônes sans label accessible pour lecteurs d'écran",
      "Texte gris clair sur fond blanc ou gris sombre sur fond noir illisible",
    ],
  },
  {
    priority: 2,
    category: "Interactions & Tactile",
    impact: "CRITICAL",
    mustHave: [
      "Taille de cible tactile minimale de 44×44px sur mobile et tablette",
      "Espacement minimal de 8px entre éléments cliquables",
      "Feedback immédiat au survol (hover) et au clic (active)",
      "Curseur pointer sur tous les éléments cliquables (cursor-pointer)",
    ],
    avoid: [
      "Dépendance exclusive au survol de la souris (inaccessible sur tactile)",
      "Transitions brutales (0ms) ou animations bloquantes (>400ms)",
    ],
  },
  {
    priority: 3,
    category: "Icônes & Système Visuel",
    impact: "HIGH",
    mustHave: [
      "Icônes vectorielles SVG propres exclusivement (Lucide, Heroicons, Brand SVG)",
      "Cohérence de taille de trait (stroke-width 1.5 ou 2) et de viewBox",
      "Alignement optique avec le texte adjacent",
    ],
    avoid: [
      "Zéro émojis utilisés comme icônes d'interface ou de statut",
      "Mélange aléatoire de styles d'icônes (flat et skeuomorphique)",
    ],
  },
  {
    priority: 4,
    category: "Layout & Ergonomie Responsive",
    impact: "HIGH",
    mustHave: [
      "Breakpoints standards : 375px (mobile), 768px (tablette), 1024px (desktop), 1440px (wide)",
      "Zéro défilement horizontal non désiré (overflow-x-hidden sur conteneurs racines)",
      "Hiérarchie visuelle claire : 1 titre H1 par écran, espacements verticaux cohérents (8px grid)",
      "Disposition compacte sur ordinateurs : réduire le défilement inutile pour garder le contenu clé visible",
    ],
    avoid: [
      "Largeurs de conteneurs en pixels fixes empêchant le responsive",
      "Sections vides occupant un viewport entier inutilement",
    ],
  },
  {
    priority: 5,
    category: "Typographie & Couleurs",
    impact: "MEDIUM",
    mustHave: [
      "Taille de base 14-16px, interligne 1.5, texte secondaire minimum 12px",
      "Tokens sémantiques CSS (background, foreground, card, primary, muted, border, ring)",
      "Palette de marque Idealy : Obsidian sombre (#07090e, #0c1017, #0e131f), Violet (#8b5cf6), Émeraude (#10b981), Cyan (#38bdf8)",
    ],
    avoid: [
      "Texte inférieur à 11px pour du contenu informatif",
      "Valeurs hexadécimales en dur répétées sans jeton de couleur",
    ],
  },
  {
    priority: 6,
    category: "Performance & Mouvement",
    impact: "MEDIUM",
    mustHave: [
      "Prise en compte de prefers-reduced-motion pour neutraliser les grandes animations",
      "Durées de transition douces entre 150ms et 250ms",
      "Accélération matérielle (transform, opacity) pour les transitions CSS",
    ],
    avoid: [
      "Animation de width, height ou layout provoquant des reflows massifs",
      "Boucles infinies d'animations lourdes consommant le CPU",
    ],
  },
];

export function getUiUxProMaxSystemPromptExtension(): string {
  return `
[UI/UX PRO MAX INTELLIGENCE — DESIGN SYSTEM STANDARDS]
Toute interface générée ou modifiée pour Idealy DOIT se conformer strictement à ces règles de qualité SaaS haut de gamme :
1. ZERO EMOJI COMME ICONES D'INTERFACE : Utiliser exclusivement des icônes SVG propres (Lucide React, heroicons ou logos officiels).
2. ACCESSIBILITE : Contraste de texte supérieur ou égal à 4.5:1. Anneaux de focus (focus-visible) visibles sans décaler la mise en page. Attributs aria-label sur chaque bouton icon-only.
3. ERGONOMIE MOBILE & TACTILE : Cibles cliquables de 44x44px minimum, espacement d'au moins 8px, curseur pointer explicite (cursor-pointer).
4. PALETTE IDEALY OBSIDIAN :
   - Fond d'application : #07090e à #0c1017
   - Cartes et panneaux : #0e131f avec bordures subtiles #1e293b / border-border/60
   - Accents : Cyan lumineux (#38bdf8), Émeraude (#10b981), Violet cosmique (#8b5cf6)
   - Texte principal : #f8fafc / #ffffff, texte secondaire : #94a3b8 / #64748b
5. LAYOUT COMPACT SUR DESKTOP : Éviter le défilement vertical inutile. Garder les éléments d'action principaux et l'input directement dans le viewport.
6. PREFERS-REDUCED-MOTION : Toutes les transitions doivent être douces (150-250ms) et respecter prefers-reduced-motion.
`.trim();
}
