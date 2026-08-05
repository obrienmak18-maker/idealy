---
name: Tailwind v4 @apply restriction
description: In Tailwind v4, @apply cannot reference custom component classes defined in @layer components — only real Tailwind utility classes work.
---

## The rule
In Tailwind v4 (`@tailwindcss/vite` plugin), `@apply` only works with genuine Tailwind utility classes. Using `@apply glass` or `@apply btn` inside another `@layer components` rule throws `Cannot apply unknown utility class`.

**Why:** v4 processes CSS without a traditional config file; it has no concept of user-defined component classes as utilities.

## How to apply
- When converting a Tailwind v3 CSS file that uses `@apply` with custom component names, replace each cross-reference by inlining the full utility list.
- For classes that share a base (like `.btn`, `.btn-primary`, `.btn-ghost`), use a grouped selector `.btn, .btn-primary, .btn-ghost { @apply <shared utilities>; }` and add individual `@apply` rules for each variant's unique utilities.
- `.card { @apply rounded-2xl glass overflow-hidden; }` → `.card { @apply rounded-2xl bg-ink-800/60 backdrop-blur-xl border border-white/10 overflow-hidden; }`
