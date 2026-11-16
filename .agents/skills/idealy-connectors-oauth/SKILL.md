---
name: idealy-connectors-oauth
description: Production-grade OAuth lifecycle and connector integration for Idealy. Eliminates all mock/simulated delays, fake connected states, and plain-text token storage. Integrates server endpoints, token security, and honest status reporting.
license: MIT
metadata:
  author: Idealy Engineering Team
  version: "1.0.0"
---

# Idealy Connectors & OAuth Architecture

## Status Vocabulary (No Lies, No Mocking)
A connector must strictly be in one of the following states:
1. `available`: Listed in catalog, ready to connect.
2. `not_connected`: Available but not authenticated.
3. `connecting`: OAuth redirect / callback in progress.
4. `connected`: Authenticated with valid server-stored tokens.
5. `expired`: Refresh token expired or revoked.
6. `configuration_required`: Missing required app configuration.
7. `error`: Authentication or provider failure.
8. `unavailable`: Provider service down or disabled.

## Rules
- **No Mock Tokens**: Never write fake tokens to `localStorage`.
- **No Mock Latency**: Do not return hardcoded 42ms pings or simulated timeouts.
- **Backend Flow**:
  - `/api/idealy/connectors/start`
  - `/api/idealy/connectors/status`
  - `/api/idealy/connectors/github/start`
  - `/api/idealy/connectors/vercel/start`
- **Server Verification**: The backend verifies scopes, user identity, and token freshness before marking a connector as active or passing its tools to the AI model.
