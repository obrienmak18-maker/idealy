import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const required = ["FIREBASE_ID_TOKEN", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.log(`NOT RUN: missing runtime configuration (${missing.join(", ")}).`);
  process.exit(0);
}

const token = process.env.FIREBASE_ID_TOKEN.trim();
const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ??
  "gen-lang-client-0338545186";

function decodeJwtPayload(value) {
  const parts = value.split(".");
  if (parts.length !== 3) {
    throw new Error("invalid_jwt_shape");
  }

  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

let claims;
try {
  claims = decodeJwtPayload(token);
} catch {
  console.log("FAIL: Firebase ID token is not a readable JWT.");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const expectedIssuer = `https://securetoken.google.com/${projectId}`;
const claimChecks = {
  issuer: claims.iss === expectedIssuer,
  audience: claims.aud === projectId,
  subject: typeof claims.sub === "string" && claims.sub.length > 0,
  expiration: typeof claims.exp === "number" && claims.exp > now,
  issuedAt: typeof claims.iat === "number" && claims.iat <= now,
  role: claims.role === "authenticated",
};

for (const [name, passed] of Object.entries(claimChecks)) {
  if (!passed) {
    console.log(`FAIL: Firebase claim ${name} is invalid or missing.`);
    if (name === "role") {
      console.log(
        "BLOCKER: configure the Firebase custom claim role=authenticated server-side and force-refresh the ID token."
      );
    }
    process.exit(1);
  }
}

const supabaseUrl = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY.trim(), {
  accessToken: async () => token,
});

const { data: profiles, error: profileError } = await supabase
  .from("profiles")
  .select("id,email")
  .limit(1);

if (profileError) {
  console.log("FAIL: Supabase Third-Party Auth/RLS rejected the Data API read.");
  process.exit(1);
}

if (!profiles?.length) {
  console.log("FAIL: RLS returned no profile for the authenticated identity.");
  process.exit(1);
}

const profile = profiles[0];
assert.equal(profile.id, claims.sub);
console.log("PASS: Firebase JWT claims and Supabase Data API/RLS identity matched.");

const { data: powerStatus, error: powerError } = await supabase.rpc(
  "get_my_power_status"
);
if (powerError || powerStatus == null) {
  console.log("FAIL: Power status read was not accepted for the authenticated owner.");
  process.exit(1);
}
console.log("PASS: Power status read completed without mutation.");

const functionName = process.env.FIREBASE_RUNTIME_FUNCTION ?? "check-subscription";
const edgeResponse = await fetch(
  `${supabaseUrl}/functions/v1/${functionName}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.SUPABASE_ANON_KEY.trim(),
    },
  }
);

if (!edgeResponse.ok) {
  console.log(`FAIL: Edge Function rejected the Firebase bearer token (${edgeResponse.status}).`);
  process.exit(1);
}
console.log("PASS: Edge Function accepted the Firebase bearer token.");
console.log("RUNTIME PASS: Firebase → Supabase Third-Party Auth → RLS → Edge → Power.");
