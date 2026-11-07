import { tool } from "ai";
import { z } from "zod";
import { generateFluxImage, type FalImageSize } from "@/lib/idealy/connectors/fal";

type GenerateImageOptions = {
  modelId?: string;
  userWay?: string | null;
};

export const generateImage = (options: GenerateImageOptions = {}) =>
  tool({
    description:
      "Generate custom AI illustrations, logos, icons, application mockups, and visual assets using the best available image provider (BFL Flux.1 via Fal.ai, Google Imagen 3, or OpenAI DALL-E 3). Costs 3 resource points (Chakra / Mana / Nen / Énergie).",
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
      const activeModel = (options.modelId || "").toLowerCase();
      const cleanPrompt = prompt.trim();
      const ratio = aspectRatio || "landscape";

      // 1. If active model is Gemini and GEMINI_API_KEY is configured
      if (activeModel.includes("gemini") || activeModel.includes("google")) {
        const geminiKey =
          process.env.GEMINI_API_KEY?.trim() ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
        if (geminiKey) {
          try {
            const imagenRatio =
              ratio === "square" ? "1:1" : ratio === "portrait" ? "3:4" : "4:3";
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  instances: [{ prompt: cleanPrompt }],
                  parameters: {
                    sampleCount: 1,
                    aspectRatio: imagenRatio,
                    outputMimeType: "image/jpeg",
                  },
                }),
                cache: "no-store",
              }
            );
            if (res.ok) {
              const data = await res.json();
              const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
              if (b64) {
                return {
                  status: "success",
                  provider: "Gemini / Imagen 3",
                  prompt: cleanPrompt,
                  powerCost: 3,
                  images: [
                    {
                      url: `data:image/jpeg;base64,${b64}`,
                      dimensions: ratio === "square" ? "1024x1024" : "1280x960",
                    },
                  ],
                };
              }
            }
          } catch {
            // Fallback to Fal.ai Flux
          }
        }
      }

      // 2. If active model is OpenAI (ChatGPT) and OPENAI_API_KEY is configured
      if (
        activeModel.includes("gpt") ||
        activeModel.includes("openai") ||
        activeModel.includes("o1") ||
        activeModel.includes("o3")
      ) {
        const openaiKey = process.env.OPENAI_API_KEY?.trim();
        if (openaiKey) {
          try {
            const size =
              ratio === "square"
                ? "1024x1024"
                : ratio === "portrait"
                  ? "1024x1792"
                  : "1792x1024";
            const res = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openaiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "dall-e-3",
                prompt: cleanPrompt,
                n: 1,
                size,
                quality: "standard",
              }),
              cache: "no-store",
            });
            if (res.ok) {
              const data = await res.json();
              const url = data?.data?.[0]?.url;
              if (url) {
                return {
                  status: "success",
                  provider: "ChatGPT / DALL-E 3",
                  prompt: cleanPrompt,
                  powerCost: 3,
                  images: [{ url, dimensions: size }],
                };
              }
            }
          } catch {
            // Fallback to Fal.ai Flux
          }
        }
      }

      // 3. For Claude (Anthropic has no native image generation) OR dedicated Fal.ai / BFL Flux.1
      const sizeMapping: Record<string, FalImageSize> = {
        square: "square_hd",
        landscape: "landscape_4_3",
        portrait: "portrait_4_3",
      };

      const result = await generateFluxImage({
        prompt: cleanPrompt,
        imageSize: sizeMapping[ratio],
      });

      if (!result.configured) {
        return {
          status: "unconfigured",
          provider: "Fal.ai / Flux.1",
          message:
            "Le connecteur Fal.ai n'est pas configuré (FAL_KEY absente). Pour les photos d'illustration, utilisez searchImages (Pexels) ou des SVG intégrés.",
          images: [],
        };
      }

      if (result.needsTopUp) {
        return {
          status: "needs_credits",
          provider: "Fal.ai / Flux.1",
          message:
            "Le compte Fal.ai est en attente d'une recharge de crédits sur fal.ai/dashboard. En attendant, utilisez searchImages (Pexels) pour intégrer de vraies photos libres de droits.",
          images: [],
        };
      }

      if (result.error) {
        return {
          status: "error",
          provider: "Fal.ai / Flux.1",
          message: result.error,
          images: [],
        };
      }

      return {
        status: "success",
        provider: "Fal.ai / BFL Flux.1 Schnell",
        prompt: result.prompt,
        powerCost: 3,
        images: result.images.map((img) => ({
          url: img.url,
          dimensions: `${img.width || 1024}x${img.height || 768}`,
        })),
      };
    },
  });
