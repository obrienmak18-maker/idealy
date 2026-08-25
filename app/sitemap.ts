import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealy-ai.netlify.app";

  return [
    { changeFrequency: "weekly", priority: 1, url: `${baseUrl}/welcome` },
    { changeFrequency: "monthly", priority: 0.8, url: `${baseUrl}/about` },
    { changeFrequency: "monthly", priority: 0.7, url: `${baseUrl}/docs` },
    { changeFrequency: "yearly", priority: 0.3, url: `${baseUrl}/privacy` },
    { changeFrequency: "yearly", priority: 0.3, url: `${baseUrl}/terms` },
  ];
}
