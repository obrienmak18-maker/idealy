import assert from "node:assert/strict";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  normalizeAttachmentMediaType,
  safeAttachmentExtension,
} from "../lib/chat-attachments";
import {
  containsLikelySecret,
  maskLikelySecrets,
  redactLikelySecrets,
} from "../lib/sensitive-text";

assert.equal(CHAT_ATTACHMENT_MAX_BYTES, 20 * 1024 * 1024);
assert.equal(
  normalizeAttachmentMediaType("application/pdf"),
  "application/pdf"
);
assert.equal(normalizeAttachmentMediaType("audio/mpeg"), "audio/mpeg");
assert.equal(
  normalizeAttachmentMediaType("application/zip"),
  "application/zip"
);
assert.equal(
  normalizeAttachmentMediaType("text/html"),
  "application/octet-stream"
);
assert.equal(
  normalizeAttachmentMediaType("not a mime"),
  "application/octet-stream"
);
assert.equal(safeAttachmentExtension("archive.tar.gz"), "gz");
assert.equal(safeAttachmentExtension("secret-file.<>"), "bin");
assert.equal(safeAttachmentExtension("no-extension"), "bin");

const mockKey = ["sk", "test", "123456789012345678901234"].join("_");
const draft =
  `Configure this service with ${mockKey} and continue.`;
assert.equal(containsLikelySecret(draft), true);
assert.equal(
  containsLikelySecret(
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345"
  ),
  true
);
assert.equal(
  redactLikelySecrets(draft),
  "Configure this service with [clé secrète masquée] and continue."
);
assert.equal(
  maskLikelySecrets(draft),
  "Configure this service with •••••••••••• and continue."
);
assert.equal(
  containsLikelySecret("A normal design prompt with no credentials."),
  false
);

console.log(
  "Chat attachment and secret-redaction checks passed (14 assertions)."
);
