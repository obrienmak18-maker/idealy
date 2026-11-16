---
name: idealy-global-i18n
description: Standards and implementation patterns for global tri-lingual internationalization (French, English, Spanish) across Idealy. Covers pre-auth, onboarding, authenticated studio, Supabase profile persistence, locale formatting, and separation of UI language vs AI assistant language.
license: MIT
metadata:
  author: Idealy Engineering Team
  version: "1.0.0"
---

# Idealy Global Internationalization (i18n)

## Supported Languages
- French: `fr` (Default fallback)
- English: `en`
- Spanish: `es`

## Rules & Architecture
1. **Single Source of Truth**:
   - Pre-auth: Cookie `NEXT_LOCALE`, `idealy_language`, URL param `?lang=`, and `localStorage`.
   - Post-auth: User's profile in Supabase (`preferred_language`) is authoritative.
   - Never let `(navigator.language || 'fr').slice(0, 2)` overwrite an explicitly chosen language.
2. **Separation of Concerns**:
   - **Interface Language**: System menus, sidebars, buttons, dialogs, alerts, toast notifications, settings.
   - **AI Assistant Language**: Dynamically adapts to the user's conversational prompt language, keeping UI in the selected locale.
3. **Locale Formatting**:
   - Dates, numbers, currencies, billing periods (`Intl.DateTimeFormat`, `Intl.NumberFormat`).
4. **Zero Hardcoded Strings**:
   - All UI text must be referenced via translation keys (`t("section.key")`).
