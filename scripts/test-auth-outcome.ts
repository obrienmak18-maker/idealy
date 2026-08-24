import assert from "node:assert/strict";
import {
  credentialsOutcomeFromCode,
  credentialsOutcomeFromRedirect,
} from "../lib/idealy/auth-outcome";

assert.equal(credentialsOutcomeFromRedirect("/"), "success");
assert.equal(
  credentialsOutcomeFromRedirect(
    "/api/auth/signin?error=CredentialsSignin&code=credentials"
  ),
  "invalid_credentials"
);
assert.equal(
  credentialsOutcomeFromRedirect(
    "/api/auth/signin?error=CredentialsSignin&code=confirmation_required"
  ),
  "confirmation_required"
);
assert.equal(
  credentialsOutcomeFromRedirect(
    "/api/auth/signin?error=CredentialsSignin&code=service_unavailable"
  ),
  "service_unavailable"
);
assert.equal(credentialsOutcomeFromRedirect(undefined), "service_unavailable");
assert.equal(credentialsOutcomeFromCode("other"), "invalid_credentials");

console.log("Auth outcome contract passed.");
