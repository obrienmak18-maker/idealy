import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL("../vercel.json", import.meta.url)), "utf8"),
);

const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
const headers = config.headers?.flatMap((entry) => entry.headers ?? []) ?? [];
const destinationFor = (source) => rewrites.find((rule) => rule.source === source)?.destination;

const required = [
  ["outputDirectory", config.outputDirectory === "dist"],
  ["npm install", config.installCommand === "npm ci"],
  ["Vite production build", config.buildCommand === "npm run build"],
  ["backend API proxy", destinationFor("/api/:path*") === "https://idealy-ai.vercel.app/api/:path*"],
  ["email verification proxy", destinationFor("/verify-email/:path*") === "https://idealy-ai.vercel.app/verify-email/:path*"],
  ["Next static asset proxy", destinationFor("/_next/:path*") === "https://idealy-ai.vercel.app/_next/:path*"],
  ["SPA fallback", destinationFor("/(.*)") === "/index.html"],
  ["COOP on Studio only", (
    config.headers ?? []
  ).filter((entry) => entry.source === "/studio" || entry.source === "/studio/:path*")
    .flatMap((entry) => entry.headers ?? [])
    .some((header) => header.key === "Cross-Origin-Opener-Policy" && header.value === "same-origin")
    && !headers.some((header) => header.key === "Cross-Origin-Opener-Policy" && header.value === "same-origin-allow-popups")],
  ["COEP on Studio only", (
    config.headers ?? []
  ).filter((entry) => entry.source === "/studio" || entry.source === "/studio/:path*")
    .flatMap((entry) => entry.headers ?? [])
    .some((header) => header.key === "Cross-Origin-Embedder-Policy" && header.value === "credentialless")],
];

for (const [label, passed] of required) {
  if (!passed) {
    console.error(`[FAIL] Sidealy Vercel contract: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`[PASS] Sidealy Vercel contract: ${label}`);
  }
}

for (const clientRoute of ["/login/:path*", "/register/:path*", "/onboarding/:path*"]) {
  if (destinationFor(clientRoute)) {
    console.error(`[FAIL] Client route must stay in Sidealy: ${clientRoute}`);
    process.exitCode = 1;
  }
}
