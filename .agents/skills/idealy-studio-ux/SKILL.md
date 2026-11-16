---
name: idealy-studio-ux
description: Idealy Studio ergonomics, unified single-line contextual top bar, floating retractable design palette, responsive split panes, and WebContainer runtime controls.
license: MIT
metadata:
  author: Idealy Engineering Team
  version: "1.0.0"
---

# Idealy Studio UX & Layout Specifications

## Unified Contextual Top Bar (Single Horizontal Line)
The Studio top bar must consolidate all primary controls in one single horizontal row:
1. **Primary Navigation**: `Preview`, `Code`, `Database`, `More`.
   - `Code` integrates the file explorer and code editor.
2. **Context Controls**:
   - Page selector.
   - Device viewport triggers: Desktop, Tablet, Mobile.
   - Refresh / Reload preview.
   - Open in new tab.
   - Version history / Checkpoints.
   - Collaboration / Share.
   - Resource / Quota indicator.
   - Publish action.
3. **Responsive Collapsing**:
   - On narrow widths, secondary text labels collapse into icons or move under the `More` menu.
   - No second toolbars, no double headers, no bulky persistent footers.

## Floating Design Palette
- Located inside the Preview viewport (bottom-center or bottom-left).
- Retractable / minimizable.
- Contains: Select element, Edit text inline, Draw/Annotation, Comments, Undo, Redo, Options.

## Split Panes & Workspace Proportions
- Smooth horizontal resizing between Chat and Studio.
- Sidebar collapses cleanly without crushing chat or preview.
- Mobile (<768px): Chat and Studio toggle as full-screen views rather than crushed side-by-side columns.
