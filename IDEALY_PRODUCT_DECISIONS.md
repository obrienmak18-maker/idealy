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
- [x] Keep the current Way rosters exactly as they are.
- [ ] Change one or more names/roles.

Notes:
_

### 1.2 How do the 5 Way agents map to runtime execution?

Current runtime has generic roles:
- Architect
- Builder
- Reviewer

Choose one:
- [x] A) The 5 Way agents are the real execution team. Map each one to tasks.
- [ ] B) The 5 Way agents are the product/personality layer, while Architect/Builder/Reviewer are execution roles underneath.
- [ ] C) Another model.

Decision:
The five Way agents are now the real execution team. Runtime responsibilities are Chief → Builder → Designer → Specialist → Reviewer, with the exact Way-specific names from the catalog.

### 1.3 Alvin

Current repository definition:
- Alvin = universal messenger / dispatcher.

Decision:
- [x] Keep Alvin as the universal dispatcher.
- [ ] Change Alvin's role.

Decision:
Alvin remains the universal dispatcher. The runtime squad uses the five Way-specific agents; chat/status surfaces may show both the Way-specific name and its execution role depending on available space.

### 1.4 Sub-agents

Decision:
- [x] Every Way can select specialized sub-agents dynamically.
- [ ] Sub-agents are only narrative/product concepts for now.
- [ ] Other.

How should selection happen?
The Chief selects the active mission plan; Designer and Specialist are always attached to the squad for their defined quality domains. Additional sub-agents may be selected from the active Way when the mission plan identifies a concrete capability gap. Selection must be persisted and visible; no simulated agent is allowed.

---

## 2. Agent names used in the runtime UI

The repo currently contains several identity systems (Way characters, generic runtime personas, and chat labels).

Choose the canonical runtime identity:
- [x] Way-specific names
- [ ] Neutral original Idealy names
- [ ] Other

Canonical names:
The exact Way rosters already defined in lib/idealy/voies-catalog.ts. Runtime display uses those Way-specific names; no generic Sélène/Maël/Iris identities are canonical anymore.

Should chat messages display:
- [ ] Agent name + role
- [ ] Only role
- [x] Both, depending on context

Decision:
Keep the custom Power control visible but clearly unavailable/future. It must never appear billable or usable until its backend contract is implemented.

---

## 3. Pricing — SINGLE SOURCE OF TRUTH

The repository currently has conflicting prices between:
- config/pricing.ts
- config/pricing-display.ts
- components/billing/upgrade-modal.tsx

### 3.1 Current intended prices

Free:
Pricing adapts dynamically based on the path chosen by the user (profile universe):
- **Ninja Path**: `Genin` (Free) | `Chunin` (Pro) | `Jonin` (Business/Studio) | `Kage / Sannin` (Enterprise)
- **Mage Path**: `Apprenti` (Free) | `Mage` (Pro) | `Archimage` (Business) | `Grand Primordial` (Enterprise)
- **Hunter Path**: `Candidat` (Free) | `Hunter Licencié` (Pro) | `Double Star Hunter` (Business) | `Triple Star Hunter` (Enterprise)
- **Professional Path**: `Starter` | `Pro` | `Team` | `Enterprise`

Pro:
- Monthly: 19
- Yearly: 15,90

Business:
- Monthly: 49
- Yearly: 40,90

Currency:
- [ ] EUR
- [ ] USD
- [x] Both

### 3.2 Power

Free:
- Monthly allocation: 200
- Wallet cap: 250

Pro:
- Monthly allocation: 2500
- Wallet cap: 3500

Business:
- Monthly allocation: 4000
- Wallet cap: 7000

Simple mission cost:
It depends on the mission. It depends on the mission, but we need to be reasonable.

Squad mission cost:
That also depends on the mission, but still, because it has been used a lot in Sharia, it is going to be much more expensive.

### 3.3 Custom Power

Choose:
- [ ] Remove the custom Power slider for now.
- [x] Keep it visually but clearly mark it unavailable.
- [ ] Make it fully billable now.

Decision:
Firebase remains the login authority, Supabase remains the application data/control plane and persistence authority, and NextAuth remains the server session wrapper. Local/in-memory auth fallbacks are forbidden.

---

## 4. Connectors

### 4.1 Real connector state

Choose:
- [x] Only real backend state may display CONNECTED/ACTIVE.
- [ ] Demo mode may show simulated connected state.
- [ ] Other.

Decision:
The connectors need to work on all ports. When the user clicks, when they reconnect, we bring up the name to connect and show the logo of the application requesting the connection. Like ChatGPT does. When ChatGPT connects, we ask: do you want to give this application access to this one? Yes, yes, yes, yes to everything. Then it connects, and afterward it can use those connectors. So it has to work.

### 4.2 Initial integrations

Which connectors must be genuinely working for the next product milestone?

- [x] GitHub
- [x] Supabase
- [x] Stripe
- [x] Vercel
- [x] Canva
- [x] Figma
- [x] Google Drive
- [x] Notion
- [x] Slack
- [ ] Other: _

### 4.3 Vercel

Choose:
- [x] Implement real user-scoped OAuth + explicit deployment confirmation.
- [ ] Hide deployment until later.
- [ ] Other.

Decision:
Yes, we really need that. We need to set up a proper one, but we also shouldn't have to log in all the time. So we're already logged in, the application has already been closed, and it has permission to publish to the account. Maybe it will do a few small checks, but it shouldn't say we're disconnected again when publishing—just a few small checks.

---

## 5. Authentication architecture

Current repository mixes NextAuth, Supabase Auth, Firebase and a local Drizzle user store.

Choose the long-term authority:
- [ ] Supabase Auth
- [ ] Firebase Auth
- [ ] NextAuth only
- [x] Hybrid (describe below)

Decision:
Each has its role. Firebase Auth is what we use to log in. That's where everything is. Supabase is where everything is managed. So even Firebase is managed in Supabase. Next Auth, I don't know what it's for, but at least it's there, and I think it's useful. For what, I don't know, but I don't know what needs to be done. If it shouldn't combine the Supabase projects, then Next Auth, Next Auth only. I don't know what it's for.

Should local development fall back to an in-memory/local identity?
- [ ] Yes, DEMO/dev only.
- [x] No, authentication failures must fail closed.

Decision:
Keep the safe five-agent sequential squad as the canonical runtime for now. The DAG scheduler/library may remain available for later expansion, but it is not presented as live. Squad execution uses reserve → execute → settle/release; simple mission execution uses the simple-action Power contract.

---

## 6. Persistence architecture

Current repo has:
- Drizzle/Postgres for chat-era data
- Supabase/Postgres for Idealy mission/product systems

Choose:
- [ ] Keep both with a strict boundary.
- [x] Migrate everything to Supabase.
- [ ] Migrate everything to the Drizzle database.
- [ ] Other.

Decision:
It's a very technical process, so I'll leave it to you. Migration on that basis, but one thing: if Dreizel is important, then if it doesn't work, it just mustn't damage our project. What needs to be done mustn't damage our project; it should always remain understandable.

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
Yeah, I don't even know what DAGs are. DAGs, I don't know them at all. I wouldn't know how to answer that question. But what you should do is... whatever is necessary without damaging anything.

Should Power use:
- [x] reserve -> execute -> settle/release
- [x] direct upfront charge
- [ ] Other

Decision:
Presence must be real Supabase Realtime presence. The browser presence client uses an authenticated Firebase token bridge into Supabase; simulated collaborators are forbidden.

---

## 8. Collaboration / presence

The workspace currently contains a visual collaborator-presence treatment but not a real presence system.

Choose:
- [ ] Remove simulated presence.
- [x] Implement real Supabase Realtime presence.
- [ ] Keep it only in DEMO_MODE.

Decision:
Keep fr/en/es for the next release, standardize them under one i18n layer, and migrate to next-intl without dropping any existing locale. AI/mission responses must follow the active user locale, with an explicit language override allowed.

---

## 9. Internationalization

Current locales:
- fr
- en
- es

Target languages for the next release:
The three languages already there suit us very well. They are the most widely spoken languages in the world. If you think you can add more, go ahead, but in my opinion, we shouldn't overload the application for now.

Choose architecture:
- [x] Standardize existing i18n layer.
- [x] Adopt next-intl.
- [ ] Other.

Should AI-generated mission responses follow the user's locale?
- [x] Always.
- [x] Only when explicitly requested.
- [ ] Other.

Decision:
Current recognizable Way names are prototype-only. Replace them with original Idealy characters before any public commercial launch.

---

## 10. IP / character strategy

The current Ways use recognizable characters from existing franchises as visual/personality references.

Choose:
- [ ] Keep for internal prototype/demo only.
- [x] Replace with original Idealy characters before public commercial launch.
- [ ] Other.

Decision:
_

---

## 11. Deployment / production behavior

The source decision is: everything intended for the product must genuinely work, with anything not yet configured or verified clearly marked as requiring configuration / coming soon. The implementation must never use simulated success states.

Current implementation status:
- Chat: implemented in the existing application architecture.
- Mission planning: implemented.
- Five-agent squad execution: implemented and persisted.
- VFS / mission files / event timeline: implemented in Supabase.
- Preview: existing workspace implementation remains subject to the current production verification flow.
- GitHub / Supabase / Stripe / Vercel / Canva / Figma / Google Drive / Notion / Slack: backend connector paths implemented; provider credentials remain external dependencies.
- Plugins: live admission + execution engine implemented.
- Power: V2 policy, reservation, settlement and direct simple-action charging implemented.
- Checkpoints / rollback: existing Supabase contract remains in place and must stay fail-closed.

Any capability not verified in a live provider environment must not be shown as connected/active merely because code exists.

---

## 12. What should remain demo-only?

List features that are intentionally simulated:
I haven't seen them, and I don't know all the features that are simulated, but nothing should be simulated. Everything in the application must genuinely work well, whether it's in the code or anything else—everything must work. Things that won't work, things we need to... we haven't discussed them yet, but we could classify them as coming in a future version. It should be clearly visible on screen that they will work soon, 'coming soon,' or another phrase you can choose or come up with. But there you go, I don't have any features to exclude.

---

## 13. Antigravity handoff

### Work delegated to Antigravity

1.
I haven't given anything to Anti-gravité yet, not until you've written the code. Until you've finished with SFS and everything you said you could do, I won't tell it to do anything.
2.
I haven't given anything to Anti-gravité yet, not until you've written the code. Until you've finished with SFS and everything you said you could do, I won't tell it to do anything.
3.
I haven't given anything to Anti-gravité yet, not until you've written the code. Until you've finished with SFS and everything you said you could do, I won't tell it to do anything.

### Work delegated to ChatGPT / direct repository changes

1.
You have access to everything you can modify. Whatever you can do, do it without breaking my code, without damaging anything that has already been done, without damaging it or breaking everything. You have permission to do everything you can, without breaking or damaging anything.
2.
You have access to everything you can modify. Whatever you can do, do it without breaking my code, without damaging anything that has already been done, without damaging it or breaking everything. You have permission to do everything you can, without breaking or damaging anything.
3.
You have access to everything you can modify. Whatever you can do, do it without breaking my code, without damaging anything that has already been done, without damaging it or breaking everything. You have permission to do everything you can, without breaking or damaging anything.

### External services / secrets required from the team

1.
Vercel App: NEXT_PUBLIC_VERCEL_APP_CLIENT_ID + VERCEL_APP_CLIENT_SECRET and the production callback URL configured in the Vercel App dashboard.
2.
OAuth credentials for Canva, Figma, Google Drive, Notion and Slack, with redirect URIs and approved scopes configured at each provider.
3.
Integration encryption key for server-side credential storage: INTEGRATION_ENCRYPTION_KEY (32-byte base64 value).

Implementation status:
- The OAuth state, callback, encrypted credential storage, connector status, plugin execution and Vercel deployment paths are implemented.
- Provider OAuth credentials remain an external configuration dependency; the UI must show configuration required rather than pretending a connector is connected when those secrets are absent.

---

## 14. Product truth

Complete this sentence:

"Idealy is not primarily ________. It is ________."

Decision:
Ideally is not primarily an IDE. It's more like an assistant, not like a chatbot, but like ChatGPT: something with a simple interface, but ideal for anything you want to create, whether for web, mobile, or desktop. It's ideal. And you should use Ideally ideally.

Complete this sentence:

"The most important experience we want a user to feel is ________."

Decision:
So what we want for the user is for them to see that they can build something, an application that seems difficult, a professional application, while having fun, while staying in a great environment, while having fun and having the right tools and the right workforce for whatever they want.

Complete this sentence:

"The one thing Idealy must never pretend to do when it has not actually done it is ________."

Decision:
I don't know what it shouldn't... I don't know what it shouldn't claim to actually know how to do, but it shouldn't claim anything if it hasn't actually done anything. Everything it says, everything it does, it must genuinely be 99 % sure that it works. It must never lie or claim to have done something it hasn't done. If it can't do it, it should say so clearly or suggest solutions within its domain.

---

## 15. Audit follow-up

When a decision above changes, update this file first, then update implementation.

Never solve an unresolved product decision by guessing.