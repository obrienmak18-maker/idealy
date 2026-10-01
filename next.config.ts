import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
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
    // Firebase Web config is public by design; apiKey_2 is injected by the project environment.
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.apiKey_2,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      "gen-lang-client-0338545186.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "gen-lang-client-0338545186",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      "gen-lang-client-0338545186.firebasestorage.app",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "796636377163",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:796636377163:web:19372def99061e37021dce",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-XCSE5WPF9M",
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
        ],
      },
    ];
  },
  reactCompiler: true,
};

export default withBotId(nextConfig);
