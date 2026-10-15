import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:3001",
    "127.0.0.1:3100",
    "127.0.0.1:3101",
    "localhost",
    "localhost:3000",
    "localhost:3001",
    "localhost:3100",
    "localhost:3101",
    "*.localhost",
  ],
  ...(basePath
    ? {
        assetPrefix: "/demo-assets",
        basePath,
        redirects: async () => [
          {
            basePath: false,
            destination: basePath,
            permanent: false,
            source: "/",
          },
        ],
      }
    : {}),
  cacheComponents: true,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_DEMO_MODE: process.env.DEMO_MODE === "true" ? "true" : "false",
    // Prefer each project's configured Firebase Web credentials. Keep the
    // original project values as fallbacks for existing local environments.
    // The API key is public Firebase Web config, not a server secret.
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || process.env.apiKey_2,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
      "gen-lang-client-0338545186.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "gen-lang-client-0338545186",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
      "gen-lang-client-0338545186.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "796636377163",
    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ||
      "1:796636377163:web:19372def99061e37021dce",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() || "G-XCSE5WPF9M",
    NEXT_PUBLIC_IDEALY_PAYMENTS_ENABLED:
      process.env.IDEALY_PAYMENTS_ENABLED === "true" ? "true" : "false",
    NEXT_PUBLIC_FREE_GENERATION_LIMIT:
      process.env.IDEALY_FREE_GENERATION_LIMIT ?? "5",
    NEXT_PUBLIC_WEBCONTAINER_CLIENT_ID:
      process.env.NEXT_PUBLIC_WEBCONTAINER_CLIENT_ID ?? "",
  },
  experimental: {
    appNewScrollHandler: true,
    cachedNavigations: true,
    inlineCss: true,
    prefetchInlining: true,
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        hostname: "*.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
  reactCompiler: true,
};

export default withBotId(nextConfig);
