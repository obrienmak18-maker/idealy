import { tool } from "ai";
import { z } from "zod";
import { generateFluxImage, type FalImageSize } from "@/lib/idealy/connectors/fal";

export const generateImage = () =>
  tool({
    description:
      "Generate custom AI illustrations, logos, icons, application mockups, and visual assets using Flux.1 via Fal.ai. Returns permanent generated image URLs.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "Detailed visual description of the image to generate in English or French (e.g. 'A sleek minimalist neon logo icon for a financial tech app, dark background, vector art, 8k')"
        ),
      aspectRatio: z
        .enum(["square", "landscape", "portrait"])
        .default("landscape")
        .optional()
        .describe("Aspect ratio for the generated image"),
    }),
    execute: async ({ prompt, aspectRatio }) => {
      const sizeMapping: Record<string, FalImageSize> = {
        square: "square_hd",
        landscape: "landscape_4_3",
        portrait: "portrait_4_3",
      };

      const result = await generateFluxImage({
        prompt,
        imageSize: sizeMapping[aspectRatio || "landscape"],
      });

      if (!result.configured) {
        return {
          status: "unconfigured",
          message:
            "Le connecteur Fal.ai n'est pas configuré (FAL_KEY absente). Pour les photos d'illustration, utilisez searchImages (Pexels) ou des SVG intégrés.",
          images: [],
        };
      }

      if (result.needsTopUp) {
        return {
          status: "needs_credits",
          message:
            "Le compte Fal.ai est en attente d'une recharge de crédits sur fal.ai/dashboard. En attendant, utilisez searchImages (Pexels) pour intégrer de vraies photos libres de droits.",
          images: [],
        };
      }

      if (result.error) {
        return {
          status: "error",
          message: result.error,
          images: [],
        };
      }

      return {
        status: "success",
        prompt: result.prompt,
        images: result.images.map((img) => ({
          url: img.url,
          dimensions: `${img.width || 1024}x${img.height || 768}`,
        })),
      };
    },
  });
