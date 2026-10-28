import { tool } from "ai";
import { z } from "zod";

export const generateVideo = () =>
  tool({
    description:
      "Generate short AI videos (text-to-video, first-frame animations, transitions) using Gemini Omni 1.1 Flash (gemini-omni-1.1-flash). Generates cinematic clips up to 10 seconds with customizable aspect ratios and resolutions.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "Detailed cinematic description of the video to generate (scene, motion, camera angle, lighting)"
        ),
      duration: z
        .number()
        .min(3)
        .max(10)
        .default(5)
        .optional()
        .describe("Duration in seconds (between 3 and 10 seconds, default: 5)"),
      aspectRatio: z
        .enum(["16:9", "9:16", "1:1"])
        .default("16:9")
        .optional()
        .describe("Aspect ratio for the video (16:9 landscape, 9:16 vertical, 1:1 square)"),
      resolution: z
        .enum(["360p", "720p", "1080p"])
        .default("720p")
        .optional()
        .describe("Video output resolution (default: 720p)"),
    }),
    execute: async ({
      prompt,
      duration = 5,
      aspectRatio = "16:9",
      resolution = "720p",
    }) => {
      const apiKey =
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

      if (!apiKey) {
        return {
          status: "unconfigured",
          message:
            "L'API Gemini Omni Flash nécessite GEMINI_API_KEY pour générer des vidéos directes.",
          prompt,
          duration,
          aspectRatio,
          resolution,
        };
      }

      try {
        // Call Gemini Interactions API for video generation
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1alpha/interactions?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gemini-omni-1.1-flash",
              input: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                duration: `${duration}s`,
                aspectRatio,
                resolution,
              },
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.warn("[Gemini Omni Video Warning]", response.status, errText);
          return {
            status: "error",
            message: `Erreur API Gemini Omni (${response.status}) : ${errText.slice(0, 200)}`,
            prompt,
          };
        }

        const data = await response.json();
        return {
          status: "success",
          prompt,
          duration,
          aspectRatio,
          resolution,
          data,
          previewUrl: data?.output?.videoUrl || null,
        };
      } catch (error) {
        console.warn("[Gemini Omni Video Exception]", error);
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Erreur inattendue",
          prompt,
        };
      }
    },
  });
