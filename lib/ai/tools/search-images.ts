import { tool } from "ai";
import { z } from "zod";
import { searchPexelsImages } from "@/lib/idealy/connectors/pexels";

export const searchImages = () =>
  tool({
    description:
      "Search for real royalty-free stock photos from Pexels to use in landing pages, dashboards, and applications. Returns verified photo URLs with photographer credits.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Keywords for the image search in French or English (e.g. 'office technology', 'modern abstract architecture')"),
      orientation: z
        .enum(["landscape", "portrait", "square"])
        .optional()
        .describe("Preferred image orientation"),
      count: z
        .number()
        .min(1)
        .max(10)
        .default(4)
        .describe("Number of photos to retrieve"),
    }),
    execute: async ({ query, orientation, count }) => {
      const result = await searchPexelsImages({
        query,
        orientation,
        perPage: count,
      });

      if (!result.configured) {
        return {
          status: "unconfigured",
          message:
            "Le connecteur Pexels n'est pas encore configuré (PEXELS_API_KEY absente). Utilisez des illustrations SVG épurées ou des placeholders neutres.",
          photos: [],
        };
      }

      if (result.error) {
        return {
          status: "error",
          message: result.error,
          photos: [],
        };
      }

      return {
        status: "success",
        total: result.totalResults,
        photos: result.photos.map((p) => ({
          alt: p.alt,
          credit: `Photo par ${p.photographer} sur Pexels`,
          photographer: p.photographer,
          url: p.src.large,
          thumbnail: p.src.small,
          sourceUrl: p.url,
          photographerUrl: p.photographerUrl,
          dimensions: `${p.width}x${p.height}`,
        })),
      };
    },
  });
