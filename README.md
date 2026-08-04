# Idealy

Idealy is a React + Vite studio for agent-assisted application delivery. The browser hosts the experience; Supabase owns identity, operational data and secure Edge Functions; Neon is reserved for specialised telemetry; Stripe owns billing.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Copy `.env.server.example` to the secret manager used by the deployment. Do not commit `.env.local`. Browser configuration is limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never add platform secrets with a `VITE_` prefix.

## Documentation

See [architecture and operations](docs/ARCHITECTURE.md) for the service layout, migrations, Edge Functions, Skills, environment variables, deployment and remaining external setup.

