import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  auth: await readFile("app/(auth)/auth.ts", "utf8"),
  client: await readFile("lib/firebase/client.ts", "utf8"),
  login: await readFile("app/(auth)/login/page.tsx", "utf8"),
  providerActions: await readFile(
    "components/auth/firebase-provider-actions.tsx",
    "utf8"
  ),
  register: await readFile("app/(auth)/register/page.tsx", "utf8"),
  supabase: await readFile("lib/idealy/supabase-auth.ts", "utf8"),
};

assert.match(files.client, /initializeApp/);
assert.match(files.client, /GoogleAuthProvider/);
assert.match(files.client, /signInWithPopup/);
assert.match(files.client, /browserLocalPersistence/);
assert.match(files.login, /FirebaseProviderActions/);
assert.match(files.register, /FirebaseProviderActions/);
assert.match(files.providerActions, /Continuer avec Google/);
assert.match(files.providerActions, /signInWithGoogleFirebase/);
assert.match(files.auth, /id: "firebase"/);
assert.match(files.auth, /credentials: \{/);
assert.match(files.auth, /id: "guest"/);
assert.match(files.auth, /id: "firebase"/);
assert.match(files.auth, /getUserBySupabaseUserId/);
assert.match(files.auth, /An identical email is not proof of ownership/);
assert.match(files.auth, /if \(existingEmailUser\) \{/);
assert.match(files.supabase, /Authorization: `Bearer \$\{accessToken\}`/);
assert.doesNotMatch(files.client, /FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL/);
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
