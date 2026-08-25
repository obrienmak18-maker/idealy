import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealy-ai.netlify.app";

  return {
    host: baseUrl,
    rules: {
      allow: ["/about", "/docs", "/privacy", "/terms", "/welcome"],
      disallow: [
        "/api/",
        "/chat/",
        "/demo-flow",
        "/library/",
        "/login",
        "/plugins/",
        "/reference-layout",
        "/register",
        "/settings/",
      ],
      userAgent: "*",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
