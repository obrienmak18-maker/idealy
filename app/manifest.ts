import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#09090f",
    categories: ["productivity", "business", "developer"],
    description:
      "Idealy transforme une idée en mission, plan et projet assistés par IA.",
    display: "standalone",
    lang: "fr",
    name: "Idealy — Transformez une idée en projet",
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
