// Builds the Sidealy (Vite) frontend and copies it to public/sidealy so the
// Next.js project can serve it as the public UI (see rewrites in next.config.ts).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const app = resolve(root, "sidealy");
const out = resolve(root, "public", "sidealy");

const pick = (...values) => values.find((v) => v && String(v).trim()) ?? "";
const env = {
  ...process.env,
  NODE_ENV: "development", // keep devDependencies (vite, tsc) available
  VITE_FIREBASE_API_KEY: pick(
    process.env.VITE_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    process.env.apiKey_2,
  ),
  VITE_FIREBASE_AUTH_DOMAIN: pick(
    process.env.VITE_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "gen-lang-client-0338545186.firebaseapp.com",
  ),
  VITE_FIREBASE_PROJECT_ID: pick(
    process.env.VITE_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "gen-lang-client-0338545186",
  ),
  VITE_FIREBASE_APP_ID: pick(
    process.env.VITE_FIREBASE_APP_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "1:796636377163:web:19372def99061e37021dce",
  ),
};

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: app, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npm", ["ci", "--include=dev", "--no-audit", "--no-fund"]);
run("npm", ["run", "build"]);

if (!existsSync(resolve(app, "dist", "index.html"))) {
  console.error("sidealy/dist/index.html missing after build");
  process.exit(1);
}
rmSync(out, { force: true, recursive: true });
mkdirSync(out, { recursive: true });
cpSync(resolve(app, "dist"), out, { recursive: true });
console.log("Sidealy copied to public/sidealy");
