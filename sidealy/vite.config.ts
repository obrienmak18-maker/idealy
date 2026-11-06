import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const sidealyRoot = dirname(fileURLToPath(import.meta.url));
const idealyRepoRoot = resolve(sidealyRoot, "..");

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Sidealy is a Vite frontend next to the Next.js backend. Read the same
  // project environment file, but only expose explicitly public prefixes to
  // browser code. Server credentials remain available only to the proxy config.
  const env = loadEnv(mode, idealyRepoRoot, "");
  const idealyBackendOrigin =
    env.IDEALY_BACKEND_ORIGIN || "http://localhost:3000";

  return {
    envDir: idealyRepoRoot,
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // WebContainer uses SharedArrayBuffer and requires a cross-origin isolated page.
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      // Keep API and auth requests same-origin in the browser during local development.
      // Production must route these paths through the same public origin as the frontend.
      proxy: Object.fromEntries(
        [
          "/api",
          "/login",
          "/register",
          "/verify-email",
          "/onboarding",
          "/_next",
        ].map((path) => [
          path,
          {
            changeOrigin: false,
            target: idealyBackendOrigin,
          },
        ]),
      ),
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});
