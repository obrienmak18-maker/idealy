import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [actions, auth, firebaseClient, login, register, providerActions] = await Promise.all([
  readFile("app/(auth)/actions.ts", "utf8"),
  readFile("app/(auth)/auth.ts", "utf8"),
  readFile("lib/firebase/client.ts", "utf8"),
  readFile("app/(auth)/login/page.tsx", "utf8"),
  readFile("app/(auth)/register/page.tsx", "utf8"),
  readFile("components/auth/firebase-provider-actions.tsx", "utf8"),
]);

assert.match(actions, /intent: "login" \| "register"/);
assert.match(actions, /validatedData\.password,\s*"login"/);
assert.match(actions, /validatedData\.password,\s*"register"/);
assert.match(actions, /intent,\s*password,\s*redirect: false/);
assert.match(auth, /if \(credentials\.intent === "register"\)\s*\{\s*try \{\s*await createUser/);
assert.doesNotMatch(auth, /Case 3: Provision new local user during signup\/login/);

assert.match(firebaseClient, /if \(!response\.ok\)\s*\{\s*throw new Error\("firebase_backend_unavailable"\)/);
assert.match(firebaseClient, /currentUser\.getIdToken\(true\)/);
for (const [path, source] of [
  ["email login", login],
  ["email registration", register],
  ["Google and phone authentication", providerActions],
]) {
  assert.match(source, /prepareFirebaseIdTokenForSupabase\(/, `${path} must validate Supabase claims before creating a session.`);
}

console.log("Auth provisioning contract passed.");
