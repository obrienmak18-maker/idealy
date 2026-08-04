# Idealy architecture and operations

## Runtime architecture

- **Frontend:** React 18, TypeScript, Vite, Zustand, React Router, Tailwind and Framer Motion.
- **Auth/data:** Supabase project `vhucjkyktdflwocrmzhe`.
- **Specialised PostgreSQL:** Neon project `cold-tooth-31580842`, production branch `br-red-firefly-ayvq4bom`. The private `idealy` schema provides `mission_telemetry` and `idempotency_keys`.
- **Billing:** Stripe products Idealy Pro and Idealy Business, monthly recurring prices and a 14-day Checkout trial.

The IUPS representation is the application model. The frontend must not make authorization or billing decisions from local state; those decisions belong to Supabase RLS and server functions.

## Supabase data model

All public application tables have RLS enabled:

- `profiles`, `plan_entitlements`, `subscriptions`, `projects`, `chat_messages`, `missions`, `usage_events`
- `user_integrations`, `skills`, `agent_runs`
- `integration_oauth_states` and `integration_credentials` are service-role-only. OAuth tokens are AES-GCM encrypted before persistence.

Storage bucket `project-assets` is private. Clients may only access objects using the path `<auth.uid()>/<filename>`.

## Remote migration history

1. `create_inia_schema`
2. `idealy_identity_billing`
3. `harden_legacy_functions`
4. `add_agent_platform_foundation`
5. `secure_oauth_integration_credentials`
6. `document_service_only_credentials_access`
7. `configure_private_project_assets_bucket`
8. `add_covering_foreign_key_indexes`

Remote migrations are currently managed via the Supabase MCP service. Before enabling a conventional CI workflow, pull the remote schema into versioned local SQL migrations with the Supabase CLI; do not rewrite the existing remote history.

## Edge Functions

| Function | Access | Purpose |
| --- | --- | --- |
| `create-checkout-session` | user JWT | Creates a Stripe subscription Checkout session. |
| `create-portal-session` | user JWT | Opens the Stripe customer portal. |
| `stripe-webhook` | Stripe signature | Synchronises Stripe subscription status and plan entitlement. |
| `integration-connect` | user JWT | Starts a GitHub OAuth connection with short-lived state. |
| `integration-callback` | OAuth state | Exchanges GitHub code, encrypts the token and stores connection metadata. |

Webhook endpoint: `https://vhucjkyktdflwocrmzhe.supabase.co/functions/v1/stripe-webhook`.

## Skills and agents

The `skills` registry ships with versioned manifests for:

- `application-builder`
- `database-design`
- `security-audit`
- `quality-assurance`

An `agent_runs` row records the user, project, selected skill, status, inputs and output. Connector selection must favour a stored `user_integrations` record and never request platform credentials in the browser.

## Environment variables

Server-only variables are defined in `.env.server.example`:

- `APP_ORIGIN`
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`
- `INTEGRATION_ENCRYPTION_KEY` (Base64 32-byte AES key)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

For local development, `APP_ORIGIN=http://localhost:5173`. In production, set it to the canonical HTTPS application URL in **Supabase Edge Function Secrets**. The client may use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Production deployment checklist

1. Set all server-only variables in Supabase Edge Function Secrets.
2. Register GitHub OAuth callback at `https://vhucjkyktdflwocrmzhe.supabase.co/functions/v1/integration-callback`.
3. Set the public application URL in Supabase Auth redirect URLs and `APP_ORIGIN`.
4. Configure Stripe Customer Portal, then send a signed test subscription event to the webhook.
5. Build and deploy the Vite `dist/` output.
6. Run `npm.cmd run typecheck`, `npm.cmd run lint` and `npm.cmd run build`.
7. Re-run Supabase security and performance advisors after meaningful schema changes.

## Security decisions

- Platform and Stripe secrets never use `VITE_`.
- Edge Functions own secret-dependent work.
- OAuth state is single-use and expires after ten minutes.
- Integration tokens are encrypted at rest and unavailable to client roles.
- Stripe webhook JWT verification is disabled only because Stripe requests are authenticated with their verified signature.

