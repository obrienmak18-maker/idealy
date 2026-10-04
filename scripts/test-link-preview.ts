import assert from "node:assert/strict";
import {
  isPublicIpv4,
  normalizePreviewUrl,
  parseLinkPreviewHtml,
} from "../lib/link-preview";

assert.equal(isPublicIpv4("8.8.8.8"), true);
assert.equal(isPublicIpv4("203.0.113.10"), false);
assert.equal(isPublicIpv4("127.0.0.1"), false);
assert.equal(isPublicIpv4("169.254.169.254"), false);
assert.equal(isPublicIpv4("10.0.0.1"), false);
assert.equal(isPublicIpv4("172.20.1.1"), false);
assert.equal(isPublicIpv4("192.168.1.1"), false);

assert.equal(normalizePreviewUrl("https://example.com/docs#part")?.hash, "");
assert.equal(
  normalizePreviewUrl("http://example.com")?.hostname,
  "example.com"
);
assert.equal(normalizePreviewUrl("file:///etc/passwd"), null);
assert.equal(normalizePreviewUrl("https://user:secret@example.com"), null);
assert.equal(normalizePreviewUrl("http://localhost/admin"), null);
assert.equal(normalizePreviewUrl("http://service.internal"), null);
assert.equal(normalizePreviewUrl("http://127.0.0.1"), null);
assert.equal(normalizePreviewUrl("http://[::1]"), null);
assert.equal(normalizePreviewUrl("https://example.com:8443"), null);

const preview = parseLinkPreviewHtml(
  '<html><head><meta property="og:title" content="A &amp; B"><meta name="description" content="A useful summary."><meta property="og:site_name" content="Example"></head></html>',
  new URL("https://example.com/article")
);
assert.equal(preview.title, "A & B");
assert.equal(preview.description, "A useful summary.");
assert.equal(preview.siteName, "Example");

console.log("Link preview URL and SSRF guard tests passed.");
