# Idealy — Audit & Delivery Report (`feat/idealy-live-backend`)

> Audit performed against commit `2514acd`. Every state below was read in the
> source, not inferred from the UI. `tsc --noEmit` and the contract suites were
> run before and after the work.

## 1. Initial audit — real state per system

| System | State | Evidence |
|---|---|---|
| Auth | **PARTIAL** | NextAuth v5 + Supabase GoTrue + Firebase stacked. `app/(auth)/auth.ts` has a `DEMO_MODE` branch returning a synthetic user. |
| Identity | REAL | `profiles` keyed on `auth.users.id`; session carries `supabaseAccessToken`. |
| Plugins | **MISSING** | No plugin table, registry, manifest, permission or execution record existed. `/plugins` rendered a static `connectorCatalog` array. |
| OAuth | PARTIAL / hardcoded | `integration-connect` + `integration-callback` work for **GitHub only**; provider is stringly-typed in both files. |
| Permissions | **MISSING** | `ConnectorOperation.requiresConfirmation` was declared and never enforced anywhere. |
| Tools | **MISSING** | No tool registry, no execution record, no audit trail. |
| Orchestrator | **PARTIAL (sequential)** | `orchestrate-mission` runs a hardcoded `architect → builder → reviewer` loop with `await delay(150)`. No DAG, no parallelism, no resume. |
| Missions | REAL | `missions` + RLS on `auth.uid()`. |
| Timeline | PARTIAL | Events are persisted and replayable via `/events`, but no timeline UI consumes them. |
| Power | **BROKEN (split brain)** | Missions debit `power_wallets`; Stripe credited `user_credits`. A paid purchase never produced usable Power. |
| Stripe | PARTIAL | Signature verified; subscription upsert real; credit refill went to the wrong ledger. |
| Voies | PARTIAL | 4 Voies real and wired into prompts, but no plan/limit/tool differentiation. |
| Assets | MISSING | Nothing in the repo. |
| Preview | PARTIAL | WebContainer path exists. |
| Reviewer | PARTIAL | A real loop exists but validation is structural (`package.json` + `index.html` presence). |
| RLS | PARTIAL | Good on `missions`/`power_*`; no automated A≠B test. |
| Deployment | MISSING | `vercel-deploy` returns a hardcoded 503. |
| Connector latency | **DECEPTIVE** | `/api/connectors/ping` returned `Math.random()` and the UI displayed it as `Xms`. |

## 2. What was delivered

### Plugin Engine (was entirely MISSING)
- `lib/idealy/plugins/types.ts` — manifest, permissions, lifecycle, execution contract.
- `lib/idealy/plugins/manifest.ts` — validation. **A tool declaring no permission is rejected**, not defaulted, so nothing slips past the gate.
- `lib/idealy/plugins/permissions.ts` — server-side gate: permission, plan, dependency and confirmation checks.
- `lib/idealy/plugins/registry.ts` — lifecycle state machine; a plugin **cannot jump to `available`**; dependency ordering with cycle detection.
- `lib/idealy/plugins/execution.ts` — failure classification, justified retry, execution record.
- `lib/idealy/plugins/catalog.ts` — manifests **derived from the existing connector catalog**, so there is one source of truth, not two.
- `lib/idealy/plugins/service.ts` — server-only bridge; reads via the caller's JWT so RLS decides access.

### Persistence
- `supabase/migrations/20261010000000_plugin_engine.sql` — `plugin_installations`, `plugin_executions`, `plugin_events` with RLS (`auth.uid()`) and **no client write privileges**.
- `supabase/tests/plugin-engine.sql` — asserts every table exists, that `authenticated` has no direct write, and that each SELECT policy is constrained to `auth.uid()`.

### API
- `GET /api/idealy/plugins`
- `GET|POST /api/idealy/plugins/[pluginId]/execute` — POST is the **gate**, returning 403/409 with an explicit code. It never fabricates success.
### Power (fixed the most serious bug)
- Stripe credited `user_credits`; missions spend `power_wallets`. A payment produced nothing usable.
- `grant_power_pack` now credits the wallet missions actually spend from, capped at the wallet ceiling and journalled even when refused.
- New `power_reservations` table plus `reserve_power_points` / `settle_power_reservation` / `release_power_reservation` for the reserve → measure → settle → release cycle.

### Honesty fixes
- Removed the fabricated `Xms` latency badge and deleted `/api/connectors/ping`.
- `mcp-config-modal` no longer toasts "Connexion établie" from a fake endpoint; it validates the config the user actually wrote and says plainly that a live MCP server was not verified.

## 3. Tests

| Suite | Result |
|---|---|
| `typecheck` | exit 0 from a clean `.next` |
| `test:plugins` | **33 assertions** |
| `test:power-pack` | **9 assertions** |
| 12 pre-existing contract suites | all still passing |

The plugin suite asserts behaviour, not source text. Notable cases: *provider is never called when permission is denied*; *an uninstalled or disabled plugin cannot execute*; *a write tool without confirmation is denied*; *a permission failure is not retried while a network failure is*; *a pack not in the server catalogue grants nothing*.

## 4. What is still NOT done

Stated plainly, because a partial delivery presented as a finished one is the failure mode this work exists to remove:

- **The orchestrator is still sequential.** No DAG, no real parallelism, no resume. `orchestrate-mission` remains the hardcoded 3-agent loop.
- **Plugin install/configure writes are not wired.** The tables and the gate exist; no Edge Function performs the `installed → configured → authorized` mutations yet.
- **Providers are not yet reachable through the gate.** The gate decides admissibility; a real provider call behind it is still to be connected.
- **OAuth is still GitHub-only.** The callback is not provider-generic.
- **Assets, Timeline UI, and Deployment remain unimplemented.**
- `supabase/tests/*.sql` were not executed — they need a live Supabase instance.
- `test:webhook` requires real Stripe/Supabase secrets and cannot run here.

## 5. Real blockers

1. **Supabase instance** — migrations and RLS tests cannot be validated without it. SQL is authored but unproven against a live database.
2. **Stripe secrets / price IDs** — Power Pack end-to-end cannot be proven; only the decision logic is unit-tested.
3. **Environment memory (PROVEN, not assumed)** — `next build` fails with exit 143 (SIGTERM) during the compile phase. This was verified against a pristine git worktree at commit `2514acd` containing **none** of these changes: it fails identically. The failure is therefore an environment memory limit, not a code regression. It needs a rerun on a larger runner before any deployment claim can be made.
4. **OAuth provider credentials** — each additional provider needs client id/secret before it can move past `CONFIGURATION_REQUIRED`.

## Current convergence addendum — 2026-10-08

The historical findings above describe earlier repository states and must not be read as the current runtime contract. Since that audit:

- the canonical mission squad is now five Way-specific agents: Chief, Builder, Designer, Specialist, Reviewer;
- mission execution uses persisted `mission_agent_runs`, bounded correction iterations and the reserve → execute → settle/release Power flow;
- Firebase login is bridged server-side to a real Supabase Auth session before the Supabase token enters NextAuth;
- in-memory persistence fallbacks have been removed;
- the live `missions` table has been aligned additively with the current mission contract;
- connector OAuth now covers the catalog providers, with encrypted credentials and real status checks;
- Vercel deployment is user-scoped and confirmation-protected;
- GitHub export never targets the repository default branch, and existing-repository sync uses an explicit one-shot confirmation;
- the plugin engine executes real provider operations after connector, scope, plan, permission and confirmation checks;
- browser presence uses a private Supabase Realtime channel backed by the authenticated Supabase session and mission-owner RLS.

Still not claimed as complete: end-to-end provider tests with real user accounts, final provider credentials/configuration, authenticated mission/VFS/replay smoke tests, Stripe live-payment verification, and any capability whose product economics remain intentionally undefined.

