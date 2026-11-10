import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const idealyRepoRoot = process.env.IDEALY_BACKEND_DIR
  ? resolve(process.env.IDEALY_BACKEND_DIR)
  : fileURLToPath(new URL("..", import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, idealyRepoRoot, "");
  const idealyBackendOrigin =
    env.IDEALY_BACKEND_ORIGIN ||
    process.env.IDEALY_BACKEND_ORIGIN ||
    "http://localhost:3000";

  return {
    envDir: idealyRepoRoot,
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [react()],
    server: {
      // WebContainer uses SharedArrayBuffer and requires a cross-origin isolated page.
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      host: true,
      port: 5173,
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
        ])
      ),
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});
