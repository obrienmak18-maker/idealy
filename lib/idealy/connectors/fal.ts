import "server-only";

export type FalImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

export type FalGeneratedImage = {
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
};

export type FalGenerationResult = {
  configured: boolean;
  prompt: string;
  images: FalGeneratedImage[];
  seed?: number;
  timings?: Record<string, number>;
  error?: string;
  needsTopUp?: boolean;
};

/**
 * Generates custom AI images and UI assets using Fal.ai (Flux.1 Schnell model).
 * Uses FAL_KEY or FAL_AI_API_KEY from server environment.
 */
export async function generateFluxImage({
  prompt,
  imageSize = "landscape_4_3",
  numSteps = 4,
}: {
  prompt: string;
  imageSize?: FalImageSize;
  numSteps?: number;
}): Promise<FalGenerationResult> {
  const apiKey =
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_AI_API_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim();

  if (!apiKey) {
    return {
      configured: false,
      prompt,
      images: [],
      error:
        "Le connecteur Fal.ai requiert la clé FAL_KEY ou FAL_AI_API_KEY dans l'environnement serveur.",
    };
  }

  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    return {
      configured: true,
      prompt: "",
      images: [],
      error: "Le prompt de génération d'image ne peut pas être vide.",
    };
  }

  try {
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: cleanPrompt,
        image_size: imageSize,
        num_inference_steps: Math.min(Math.max(1, numSteps), 8),
        enable_safety_checker: true,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const isLocked =
        data &&
        typeof data === "object" &&
        "detail" in data &&
        String(data.detail).includes("TOP_UP");

      if (isLocked) {
        return {
          configured: true,
          prompt: cleanPrompt,
          images: [],
          needsTopUp: true,
          error:
            "Le compte Fal.ai est en attente de recharge de crédits sur fal.ai/dashboard. Utilisez en attendant les photos réelles Pexels ou des illustrations SVG intégrées.",
        };
      }

      return {
        configured: true,
        prompt: cleanPrompt,
        images: [],
        error:
          data && typeof data === "object" && "detail" in data
            ? String(data.detail)
            : `Fal.ai HTTP ${response.status}`,
      };
    }

    const rawImages = Array.isArray(data?.images) ? data.images : [];
    const images: FalGeneratedImage[] = rawImages.map(
      (img: { url?: string; width?: number; height?: number; content_type?: string }) => ({
        url: img.url || "",
        width: img.width,
        height: img.height,
        contentType: img.content_type,
      })
    );

    return {
      configured: true,
      prompt: cleanPrompt,
      images,
      seed: typeof data?.seed === "number" ? data.seed : undefined,
      timings: typeof data?.timings === "object" ? data.timings : undefined,
    };
  } catch (err) {
    return {
      configured: true,
      prompt: cleanPrompt,
      images: [],
      error: err instanceof Error ? err.message : "Erreur réseau avec Fal.ai",
    };
  }
}
