import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const idealyBackendOrigin =
  process.env.IDEALY_BACKEND_ORIGIN || "http://localhost:3000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Keep API and auth requests same-origin in the browser during local development.
    // Production must route these paths through the same public origin as the frontend.
    proxy: Object.fromEntries(
      ["/api", "/login", "/register", "/onboarding", "/_next"].map((path) => [
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
});
