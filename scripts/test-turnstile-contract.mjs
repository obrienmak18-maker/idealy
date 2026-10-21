import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  actions: await readFile("app/(auth)/actions.ts", "utf8"),
  auth: await readFile("app/(auth)/auth.ts", "utf8"),
  login: await readFile("app/(auth)/login/page.tsx", "utf8"),
  register: await readFile("app/(auth)/register/page.tsx", "utf8"),
  widget: await readFile("components/auth/turnstile-field.tsx", "utf8"),
  provider: await readFile("components/auth/firebase-provider-actions.tsx", "utf8"),
  utility: await readFile("lib/security/turnstile.ts", "utf8"),
  verifyRoute: await readFile("app/api/auth/turnstile/verify/route.ts", "utf8"),
  preflight: await readFile("app/api/auth/register/preflight/route.ts", "utf8"),
};

assert.match(files.widget, /NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY/);
assert.match(files.widget, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
assert.match(files.utility, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
assert.match(files.utility, /CLOUDFLARE_TURNSTILE_SECRET_KEY/);
assert.match(files.utility, /result\.action !== expectedAction/);
assert.match(files.preflight, /"register"/);
assert.doesNotMatch(files.widget, /CLOUDFLARE_TURNSTILE_SECRET_KEY/);
assert.match(files.actions, /verifyTurnstileToken/);
assert.match(files.actions, /createTurnstileProof/);
assert.match(files.auth, /verifyTurnstileProof/);
assert.match(files.auth, /verifyTurnstileToken/);
assert.match(files.verifyRoute, /verifyTurnstileToken/);
assert.match(files.preflight, /getUser/);
assert.match(files.register, /auth\/email-already-in-use/);
assert.doesNotMatch(files.register, /signInWithEmailFirebase/);
assert.match(files.register, /sendEmailVerificationFirebase/);
assert.match(files.login, /isFirebaseCurrentUserEmailVerified/);
assert.match(files.login, /Renvoyer l’e-mail de confirmation/);
assert.match(files.provider, /turnstileToken/);

console.log("Turnstile and auth-flow contract passed.");
