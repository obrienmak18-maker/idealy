import assert from "node:assert/strict";
import {
  decryptConnectorToken,
  encryptConnectorToken,
} from "../lib/security/connector-encryption";

console.log("Testing Connector AES-256-GCM Encryption & Cryptographic Vault...");

const rawTokens = [
  "mock_github_pat_1234567890abcdef",
  "mock_stripe_key_example_99887766",
  "mock_supabase_token_example_testing",
  "mock_figma_token_example_12345",
  "mock_slack_bot_token_example_123456",
  "Bearer token_with_special_chars_!@#$%^&*()_+{}:<>?",
];

for (const token of rawTokens) {
  const encrypted = encryptConnectorToken(token);
  assert.equal(encrypted.algorithm, "AES-GCM-256");
  assert.ok(encrypted.ciphertext.length > 0);
  assert.ok(encrypted.iv.length > 0);
  assert.notEqual(encrypted.ciphertext, token);

  const decrypted = decryptConnectorToken(encrypted.ciphertext, encrypted.iv);
  assert.equal(decrypted, token, `Decrypted token should match original: ${token}`);
}

// Tamper test
const testToken = "mock_sensitive_token_for_tamper_testing";
const enc = encryptConnectorToken(testToken);
const buf = Buffer.from(enc.ciphertext, "base64");
buf[0] = buf[0] ^ 0xff; // Flip bits
const tampered = buf.toString("base64");

assert.throws(
  () => {
    decryptConnectorToken(tampered, enc.iv);
  },
  /Unsupported state or unable to authenticate data|Ciphertext too short|auth/i,
  "Tampered ciphertext must be rejected"
);

console.log("Connector encryption verified: AES-256-GCM roundtrip & tamper detection passed. ✓");
