---
name: Idealy auth pattern
description: How Supabase auth is wired in Idealy — client key priority, session listener location, known gaps.
---

## Rule
`getSupabaseClient()` (src/supabaseClient.ts) reads keys in this order:
1. `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (build-time env vars)
2. `useIdealyStore.getState().connectors.supabaseUrl` / `supabaseAnonKey` (user-entered via Settings → Connectors)

**Why:** Keys are entered at runtime through the UI, not available as env vars on the dev machine. The dual-source pattern lets both CI/CD and manual setup work without code changes.

**How to apply:** Any new code that calls `getSupabaseClient()` gets both sources for free — no changes needed.

## Session listener
`src/app/App.tsx` owns the Supabase auth lifecycle:
- `supabase.auth.getSession()` on mount — restores persisted sessions and handles OAuth redirects
- `supabase.auth.onAuthStateChange()` — handles SIGNED_IN (updates store profile + stage) and SIGNED_OUT (resets to guest)

## AuthModal
- Manages its own `localMode` state (signin/signup toggle works without parent re-opening)
- Email signup sends confirmation email; notices user rather than throwing error
- OAuth buttons redirect away; App.tsx onAuthStateChange handles the return

## Known gaps (as of 2026-08-05)
- Google + GitHub OAuth need to be activated in Supabase Dashboard (URL config + provider secrets)
- Password reset flow not implemented
- Stripe checkout requires a Supabase Edge Function `create-checkout-session`
- WebContainer preview needs COOP/COEP headers in Vite config
