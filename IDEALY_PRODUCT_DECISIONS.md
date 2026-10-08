# IDEALY — PRODUCT & ARCHITECTURE DECISIONS
#
# But:
# This file is the source of truth for decisions that code cannot safely guess.
# Fill the "Decision" fields. Do not change implementation merely to match an
# assumption until the decision is explicit.
#
# Owner: O'Brien / Bill
# Branch: feat/idealy-live-backend
# Updated: 2026-10-08

---

## 1. Agent architecture

### 1.1 What are the 5 agents of each Way?

The current repository already defines 5 agents per Way in:
- lib/idealy/voies-catalog.ts

Do NOT invent new names.

Decision:
- [ ] Keep the current Way rosters exactly as they are.
- [ ] Change one or more names/roles.

Notes:
_

### 1.2 How do the 5 Way agents map to runtime execution?

Current runtime has generic roles:
- Architect
- Builder
- Reviewer

Choose one:
- [ ] A) The 5 Way agents are the real execution team. Map each one to tasks.
- [ ] B) The 5 Way agents are the product/personality layer, while Architect/Builder/Reviewer are execution roles underneath.
- [ ] C) Another model.

Decision:
_

### 1.3 Alvin

Current repository definition:
- Alvin = universal messenger / dispatcher.

Decision:
- [ ] Keep Alvin as the universal dispatcher.
- [ ] Change Alvin's role.

Decision:
_

### 1.4 Sub-agents

Decision:
- [ ] Every Way can select specialized sub-agents dynamically.
- [ ] Sub-agents are only narrative/product concepts for now.
- [ ] Other.

How should selection happen?
_

---

## 2. Agent names used in the runtime UI

The repo currently contains several identity systems (Way characters, generic runtime personas, and chat labels).

Choose the canonical runtime identity:
- [ ] Way-specific names
- [ ] Neutral original Idealy names
- [ ] Other

Canonical names:
_

Should chat messages display:
- [ ] Agent name + role
- [ ] Only role
- [ ] Both, depending on context

Decision:
_

---

## 3. Pricing — SINGLE SOURCE OF TRUTH

The repository currently has conflicting prices between:
- config/pricing.ts
- config/pricing-display.ts
- components/billing/upgrade-modal.tsx

### 3.1 Current intended prices

Free:
_

Pro:
- Monthly: _
- Yearly: _

Business:
- Monthly: _
- Yearly: _

Currency:
- [ ] EUR
- [ ] USD
- [ ] Both

### 3.2 Power

Free:
- Monthly allocation: _
- Wallet cap: _

Pro:
- Monthly allocation: _
- Wallet cap: _

Business:
- Monthly allocation: _
- Wallet cap: _

Simple mission cost:
_

Squad mission cost:
_

### 3.3 Custom Power

Choose:
- [ ] Remove the custom Power slider for now.
- [ ] Keep it visually but clearly mark it unavailable.
- [ ] Make it fully billable now.

Decision:
_

---

## 4. Connectors

### 4.1 Real connector state

Choose:
- [ ] Only real backend state may display CONNECTED/ACTIVE.
- [ ] Demo mode may show simulated connected state.
- [ ] Other.

Decision:
_

### 4.2 Initial integrations

Which connectors must be genuinely working for the next product milestone?

- [ ] GitHub
- [ ] Supabase
- [ ] Stripe
- [ ] Vercel
- [ ] Canva
- [ ] Figma
- [ ] Google Drive
- [ ] Notion
- [ ] Slack
- [ ] Other: _

### 4.3 Vercel

Choose:
- [ ] Implement real user-scoped OAuth + explicit deployment confirmation.
- [ ] Hide deployment until later.
- [ ] Other.

Decision:
_

---

## 5. Authentication architecture

Current repository mixes NextAuth, Supabase Auth, Firebase and a local Drizzle user store.

Choose the long-term authority:
- [ ] Supabase Auth
- [ ] Firebase Auth
- [ ] NextAuth only
- [ ] Hybrid (describe below)

Decision:
_

Should local development fall back to an in-memory/local identity?
- [ ] Yes, DEMO/dev only.
- [ ] No, authentication failures must fail closed.

Decision:
_

---

## 6. Persistence architecture

Current repo has:
- Drizzle/Postgres for chat-era data
- Supabase/Postgres for Idealy mission/product systems

Choose:
- [ ] Keep both with a strict boundary.
- [ ] Migrate everything to Supabase.
- [ ] Migrate everything to the Drizzle database.
- [ ] Other.

Decision:
_

---

## 7. Orchestration architecture

The repository currently contains:
- legacy/sequential Edge Function orchestration
- newer DAG scheduler/executor

Choose:
- [ ] Make the DAG the single canonical runtime.
- [ ] Keep sequential orchestration as canonical.
- [ ] Other.

Decision:
_

Should Power use:
- [ ] reserve -> execute -> settle/release
- [ ] direct upfront charge
- [ ] Other

Decision:
_

---

## 8. Collaboration / presence

The workspace currently contains a visual collaborator-presence treatment but not a real presence system.

Choose:
- [ ] Remove simulated presence.
- [ ] Implement real Supabase Realtime presence.
- [ ] Keep it only in DEMO_MODE.

Decision:
_

---

## 9. Internationalization

Current locales:
- fr
- en
- es

Target languages for the next release:
_

Choose architecture:
- [ ] Standardize existing i18n layer.
- [ ] Adopt next-intl.
- [ ] Other.

Should AI-generated mission responses follow the user's locale?
- [ ] Always.
- [ ] Only when explicitly requested.
- [ ] Other.

Decision:
_

---

## 10. IP / character strategy

The current Ways use recognizable characters from existing franchises as visual/personality references.

Choose:
- [ ] Keep for internal prototype/demo only.
- [ ] Replace with original Idealy characters before public commercial launch.
- [ ] Other.

Decision:
_

---

## 11. Deployment / production behavior

Which capabilities are allowed to appear as production-ready in the UI?

- [ ] Chat
- [ ] Mission planning
- [ ] Squad execution
- [ ] VFS
- [ ] Preview
- [ ] GitHub
- [ ] Supabase
- [ ] Stripe
- [ ] Vercel deployment
- [ ] Plugins
- [ ] Power
- [ ] Checkpoints / rollback
- [ ] Other: _

Any capability that is not selected must not be presented as fully live.

Decision:
_

---

## 12. What should remain demo-only?

List features that are intentionally simulated:
_

---

## 13. Antigravity handoff

### Work delegated to Antigravity

1.
_
2.
_
3.
_

### Work delegated to ChatGPT / direct repository changes

1.
_
2.
_
3.
_

### External services / secrets required from the team

1.
_
2.
_
3.
_

---

## 14. Product truth

Complete this sentence:

"Idealy is not primarily ________. It is ________."

Decision:
_

Complete this sentence:

"The most important experience we want a user to feel is ________."

Decision:
_

Complete this sentence:

"The one thing Idealy must never pretend to do when it has not actually done it is ________."

Decision:
_

---

## 15. Audit follow-up

When a decision above changes, update this file first, then update implementation.

Never solve an unresolved product decision by guessing.
