import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  auth: await readFile("app/(auth)/auth.ts", "utf8"),
  turnstile: await readFile("lib/security/turnstile.ts", "utf8"),
  client: await readFile("lib/firebase/client.ts", "utf8"),
  login: await readFile("app/(auth)/login/page.tsx", "utf8"),
  providerActions: await readFile(
    "components/auth/firebase-provider-actions.tsx",
    "utf8"
  ),
  register: await readFile("app/(auth)/register/page.tsx", "utf8"),
  supabase: await readFile("lib/idealy/supabase-auth.ts", "utf8"),
  workspace: await readFile("pnpm-workspace.yaml", "utf8"),
  lockfile: await readFile("pnpm-lock.yaml", "utf8"),
  runtime: await readFile("scripts/test-firebase-runtime.mjs", "utf8"),
};

assert.match(files.client, /initializeApp/);
assert.match(files.client, /GoogleAuthProvider/);
assert.match(files.client, /signInWithPopup/);
assert.match(files.client, /browserLocalPersistence/);
assert.match(files.client, /await signInWithRedirect\(auth, provider\)/);
assert.doesNotMatch(files.client, /resolve\(undefined as any\)/);
assert.match(files.login, /FirebaseProviderActions/);
assert.match(files.register, /FirebaseProviderActions/);
assert.match(files.providerActions, /Continuer avec Google/);
assert.match(files.providerActions, /signInWithGoogleFirebase/);
assert.match(files.providerActions, /await completeAuth\(authResult\.idToken, turnstileToken\)/);
assert.match(files.auth, /verifyTurnstileToken/);
assert.match(files.auth, /verifyTurnstileProof/);
assert.match(files.turnstile, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
assert.doesNotMatch(files.providerActions, /\.catch\(\(\) => \{\}\)/);
assert.ok(files.workspace.includes("'jwks-rsa>jose': '4.15.9'"));
assert.ok(files.lockfile.includes("jwks-rsa>jose") && files.lockfile.includes("4.15.9"));
assert.ok(files.lockfile.includes("4.15.9"));
assert.match(files.auth, /id: "firebase"/);
assert.match(files.auth, /credentials: \{/);
assert.match(files.auth, /id: "guest"/);
assert.match(files.auth, /id: "firebase"/);
assert.match(files.auth, /getUserBySupabaseUserId/);
assert.match(files.auth, /existingEmailUser/);
assert.match(
  files.auth,
  /linkUserToSupabaseUser\(\{[\s\S]*localUserId: existingEmailUser\.id/
);
assert.match(files.supabase, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(files.supabase, /signInFirebaseUserThroughSupabase/);
assert.ok(files.supabase.includes("NEXT_PUBLIC_SUPABASE_URL"), "Auth bridge must support the public Supabase URL alias.");
assert.ok(files.supabase.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"), "Auth bridge must support the public anonymous-key alias.");
assert.ok(files.supabase.includes("SUPABASE_PUBLISHABLE_KEY"), "Auth bridge must support the publishable-key environment variable.");
assert.ok(files.runtime.includes("NEXT_PUBLIC_SUPABASE_URL"), "Runtime diagnostic must support the public Supabase URL alias.");
assert.ok(files.runtime.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), "Runtime diagnostic must support public publishable keys.");
assert.ok(files.runtime.includes("NEXT_PUBLIC_FIREBASE_PROJECT_ID"), "Runtime diagnostic must use the configured Firebase project alias.");
assert.ok(!files.runtime.includes("gen-lang-client-0338545186"), "Runtime diagnostic must not silently substitute a hard-coded Firebase project.");
assert.match(files.auth, /signInFirebaseUserThroughSupabase\(email\)/);
assert.match(files.auth, /supabaseAccessToken: supabaseAuth\.accessToken/);
assert.doesNotMatch(files.client, /FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL/);
const firebaseAdmin = await readFile("lib/firebase/admin.ts", "utf8");
assert.match(firebaseAdmin, /verifyIdToken\(idToken, true\)/);
const verifyFunctionStart = firebaseAdmin.indexOf(
  "export async function verifyFirebaseToken"
);
const publicCertificateFallbackStart = firebaseAdmin.indexOf(
  "  const projectId =",
  verifyFunctionStart
);
const adminVerificationBlock = firebaseAdmin.slice(
  verifyFunctionStart,
  publicCertificateFallbackStart
);
assert.ok(adminVerificationBlock.includes("verifyIdToken(idToken, true)"));
assert.match(adminVerificationBlock, /return null;/);
assert.doesNotMatch(
  adminVerificationBlock,
  /Admin token verification, falling back to public cert/
);
assert.doesNotMatch(firebaseAdmin, /Buffer\.from\(parts\[1\], "base64url"\)/);
assert.doesNotMatch(
  files.client,
  /SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY/
);
assert.doesNotMatch(files.login, /FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL/);
assert.doesNotMatch(files.login, /SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY/);
assert.doesNotMatch(
  files.providerActions,
  /FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY/
);

console.log("Firebase authentication contract passed.");
