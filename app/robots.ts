import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://idealy-ai.vercel.app");

  return {
    host: baseUrl,
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/welcome",
          "/pricing",
          "/about",
          "/docs",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/api/",
          "/chat/",
          "/settings/",
          "/onboarding",
          "/demo-flow",
          "/library/",
          "/login",
          "/register",
          "/plugins/",
          "/reference-layout",
        ],
      },
      {
        userAgent: ["Googlebot", "Bingbot", "msnbot"],
        allow: [
          "/",
          "/welcome",
          "/pricing",
          "/about",
          "/docs",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/api/",
          "/chat/",
          "/settings/",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
