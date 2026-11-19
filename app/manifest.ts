import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#09090f",
    categories: ["productivity", "business", "developer"],
    description:
      "Idealy turns an idea into an AI-powered mission, plan, and running application.",
    display: "standalone",
    lang: "en",
    name: "Idealy — Turn an idea into a project",
    short_name: "Idealy",
    start_url: "/welcome",
    theme_color: "#09090f",
    icons: [
      {
        src: "/idealy-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/idealy-logo.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
