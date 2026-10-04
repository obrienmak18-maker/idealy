import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [route, implementation, renderer, limiter] = await Promise.all([
  readFile("app/api/link-preview/route.ts", "utf8"),
  readFile("lib/link-preview.ts", "utf8"),
  readFile("components/ai-elements/message.tsx", "utf8"),
  readFile("lib/ratelimit.ts", "utf8"),
]);

assert.match(route, /const session = await auth\(\)/);
assert.match(route, /keyPrefix: "ip-rate-limit:link-preview"/);
assert.match(route, /getLinkPreview\(value\)/);
assert.match(
  implementation,
  /lookup\(hostname, \{ all: true, verbatim: true \}\)/
);
assert.match(
  implementation,
  /lookup: \(_hostname, _options, callback\) => callback\(null, address, 4\)/
);
assert.match(implementation, /const MAX_HTML_BYTES = 512 \* 1024/);
assert.match(implementation, /MAX_REDIRECTS = 3/);
assert.match(
  implementation,
  /normalizePreviewUrl\(new URL\(response\.location, url\)\.toString\(\)\)/
);
assert.match(
  implementation,
  /contentType\.toLowerCase\(\)\.includes\("text\/html"\)/
);
assert.match(renderer, /components=\{streamdownComponents\}/);
assert.match(limiter, /maxRequests\?: number; windowSeconds\?: number/);

console.log("Link preview API and renderer contract passed.");
