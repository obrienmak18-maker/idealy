/**
 * Server-only chat tools for the production Edge chat path.
 * Provider keys are read in the Edge runtime and never returned to the browser.
 */

export type ChatToolName = "webSearch" | "searchImages" | "generateImage";

export type ChatToolActivity = {
  toolCallId: string;
  kind: ChatToolName;
  state: "input-available" | "output-available" | "output-error";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string | null;
};

type JsonRecord = Record<string, unknown>;

export const IDEALY_CHAT_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "webSearch",
      description:
        "Search the live web for current facts, recent developments, official documentation, products, APIs, and source URLs. Use it when up-to-date or source-backed information is needed.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 2, maxLength: 500, description: "Precise natural-language search query." },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchImages",
      description:
        "Find real stock photos on Pexels for a visual reference or an app's image assets. Use only when real photos are requested or materially useful. The results include photographer attribution.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", minLength: 2, maxLength: 300, description: "Image subject and style, preferably specific keywords." },
          orientation: { type: "string", enum: ["landscape", "portrait", "square"] },
          count: { type: "integer", minimum: 1, maximum: 6 },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateImage",
      description:
        "Generate one original AI image with Fal.ai Flux. Use only when the user explicitly asks to create or generate an image, or when an original image asset is clearly required.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", minLength: 8, maxLength: 3000, description: "Detailed description of the image to generate." },
          aspectRatio: { type: "string", enum: ["square", "landscape", "portrait"] },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
] as const;

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function positiveInteger(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function configuredError(message: string) {
  return { status: "unconfigured", message, results: [], photos: [], images: [] };
}

async function searchWeb(args: JsonRecord) {
  const query = text(args.query, 500);
  const apiKey = Deno.env.get("EXA_API_KEY")?.trim()
    || Deno.env.get("EXA_AI_API_KEY")?.trim()
    || Deno.env.get("EXA_AI_API_kEY")?.trim();

  if (!apiKey) return configuredError("La recherche Web n’est pas configurée côté serveur (EXA_API_KEY).");
  if (query.length < 2) return { status: "error", message: "La requête de recherche est trop courte.", results: [] };

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      cache: "no-store",
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: 5,
        contents: { highlights: { maxCharacters: 700 } },
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) {
      return { status: "error", query, message: `La recherche Web a échoué (Exa HTTP ${response.status}).`, results: [] };
    }
    const data = await response.json() as { results?: Array<Record<string, unknown>> };
    const results = (Array.isArray(data.results) ? data.results : []).slice(0, 5).flatMap((item) => {
      const url = httpsUrl(item.url);
      if (!url) return [];
      const highlights = Array.isArray(item.highlights)
        ? item.highlights.filter((v): v is string => typeof v === "string").slice(0, 2).map(v => v.slice(0, 700))
        : [];
      return [{
        title: text(item.title, 300) || url,
        url,
        publishedDate: typeof item.publishedDate === "string" ? item.publishedDate.slice(0, 60) : null,
        author: typeof item.author === "string" ? item.author.slice(0, 160) : null,
        highlights,
      }];
    });
    return { status: "success", query, count: results.length, results };
  } catch (error) {
    return {
      status: "error",
      query,
      message: error instanceof Error && error.name === "TimeoutError"
        ? "La recherche Web a dépassé le délai autorisé."
        : "La recherche Web est momentanément indisponible.",
      results: [],
    };
  }
}

async function searchPexels(args: JsonRecord, language: "fr" | "en" | "es") {
  const query = text(args.query, 300);
  const apiKey = Deno.env.get("PEXELS_API_KEY")?.trim();
  const count = positiveInteger(args.count, 4, 6);
  const orientation = args.orientation === "landscape" || args.orientation === "portrait" || args.orientation === "square"
    ? args.orientation
    : undefined;

  if (!apiKey) return configuredError("La recherche d’images n’est pas configurée côté serveur (PEXELS_API_KEY).");
  if (query.length < 2) return { status: "error", message: "La recherche d’images est trop courte.", photos: [] };

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      page: "1",
      locale: language === "en" ? "en-US" : language === "es" ? "es-ES" : "fr-FR",
    });
    if (orientation) params.set("orientation", orientation);
    const response = await fetch("https://api.pexels.com/v1/search?" + params.toString(), {
      headers: { Authorization: apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(18_000),
    });
    if (response.status === 429) {
      return { status: "error", query, message: "La limite de recherche Pexels est atteinte. Réessaie dans quelques instants.", photos: [] };
    }
    if (!response.ok) {
      return { status: "error", query, message: `La recherche Pexels a échoué (HTTP ${response.status}).`, photos: [] };
    }
    const data = await response.json() as { total_results?: number; photos?: Array<Record<string, unknown>> };
    const photos = (Array.isArray(data.photos) ? data.photos : []).slice(0, count).flatMap((photo) => {
      const src = record(photo.src);
      const url = httpsUrl(src.large) ?? httpsUrl(src.medium) ?? httpsUrl(src.original);
      const thumbnail = httpsUrl(src.small) ?? url;
      if (!url || !thumbnail) return [];
      const photographer = text(photo.photographer, 180);
      return [{
        alt: text(photo.alt, 300) || query,
        url,
        thumbnail,
        photographer,
        photographerUrl: httpsUrl(photo.photographer_url),
        credit: photographer ? `Photo par ${photographer} sur Pexels` : "Source : Pexels",
        sourceUrl: httpsUrl(photo.url),
        width: typeof photo.width === "number" ? photo.width : null,
        height: typeof photo.height === "number" ? photo.height : null,
      }];
    });
    return { status: "success", query, total: typeof data.total_results === "number" ? data.total_results : photos.length, photos };
  } catch (error) {
    return {
      status: "error",
      query,
      message: error instanceof Error && error.name === "TimeoutError"
        ? "La recherche Pexels a dépassé le délai autorisé."
        : "Pexels est momentanément indisponible.",
      photos: [],
    };
  }
}

async function generateFalImage(args: JsonRecord) {
  const prompt = text(args.prompt, 3000);
  const apiKey = Deno.env.get("FAL_KEY")?.trim()
    || Deno.env.get("FAL_AI_API_KEY")?.trim()
    || Deno.env.get("FAL_API_KEY")?.trim();
  if (!apiKey) return configuredError("La génération d’images n’est pas configurée côté serveur (FAL_KEY).");
  if (prompt.length < 8) return { status: "error", message: "La description de l’image est trop courte.", images: [] };

  const aspect = args.aspectRatio === "square" || args.aspectRatio === "portrait" ? args.aspectRatio : "landscape";
  const imageSize = aspect === "square" ? "square_hd" : aspect === "portrait" ? "portrait_4_3" : "landscape_4_3";

  try {
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: { Authorization: "Key " + apiKey, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        prompt,
        image_size: imageSize,
        num_inference_steps: 4,
        enable_safety_checker: true,
      }),
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      const detail = data ? text(data.detail ?? data.error, 300) : "";
      const needsCredits = /TOP_UP|insufficient.*credit|not enough credit/i.test(detail);
      return {
        status: needsCredits ? "needs_credits" : "error",
        message: needsCredits
          ? "Le fournisseur d’images demande des crédits supplémentaires. Aucune image n’a été générée."
          : `La génération d’images a échoué (Fal.ai HTTP ${response.status}).`,
        images: [],
      };
    }
    const images = (Array.isArray(data?.images) ? data.images : []).flatMap((image) => {
      const item = record(image);
      const url = httpsUrl(item.url);
      if (!url) return [];
      return [{
        url,
        dimensions: `${typeof item.width === "number" ? item.width : 1024}x${typeof item.height === "number" ? item.height : 768}`,
        width: typeof item.width === "number" ? item.width : 1024,
        height: typeof item.height === "number" ? item.height : 768,
      }];
    }).slice(0, 2);
    if (!images.length) return { status: "error", message: "Le fournisseur n’a renvoyé aucune image utilisable.", images: [] };
    return { status: "success", prompt, images };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error && error.name === "TimeoutError"
        ? "La génération d’images a dépassé le délai autorisé."
        : "La génération d’images est momentanément indisponible.",
      images: [],
    };
  }
}

function localizeToolMessage(
  name: ChatToolName,
  message: string,
  language: "fr" | "en" | "es",
) {
  const value = message.toLowerCase();
  const statusCode = message.match(/(?:http|fal\.ai)\s*(\d{3})/i)?.[1];
  const words = {
    webConfigured: localized(language, "La recherche Web n’est pas configurée côté serveur (EXA_API_KEY).", "Web search is not configured on the server (EXA_API_KEY).", "La búsqueda web no está configurada en el servidor (EXA_API_KEY)."),
    pexelsConfigured: localized(language, "La recherche d’images n’est pas configurée côté serveur (PEXELS_API_KEY).", "Image search is not configured on the server (PEXELS_API_KEY).", "La búsqueda de imágenes no está configurada en el servidor (PEXELS_API_KEY)."),
    falConfigured: localized(language, "La génération d’images n’est pas configurée côté serveur (FAL_KEY).", "Image generation is not configured on the server (FAL_KEY).", "La generación de imágenes no está configurada en el servidor (FAL_KEY)."),
    shortQuery: localized(language, "La requête est trop courte.", "The query is too short.", "La consulta es demasiado corta."),
    timedOut: localized(language, "L’action a dépassé le délai autorisé.", "The action timed out.", "La acción agotó el tiempo de espera."),
    unavailable: localized(language, "Le service est momentanément indisponible.", "The service is temporarily unavailable.", "El servicio no está disponible temporalmente."),
    httpError: localized(language, `La requête au fournisseur a échoué (HTTP ${statusCode ?? "inconnu"}).`, `The provider request failed (HTTP ${statusCode ?? "unknown"}).`, `La solicitud al proveedor falló (HTTP ${statusCode ?? "desconocido"}).`),
    pexelsLimit: localized(language, "La limite de recherche Pexels est atteinte. Réessaie dans quelques instants.", "The Pexels search limit has been reached. Try again shortly.", "Se alcanzó el límite de búsqueda de Pexels. Inténtalo de nuevo en unos instantes."),
    credits: localized(language, "Le fournisseur d’images demande des crédits supplémentaires. Aucune image n’a été générée.", "The image provider needs more credits. No image was generated.", "El proveedor de imágenes necesita más créditos. No se generó ninguna imagen."),
    noImages: localized(language, "Le fournisseur n’a renvoyé aucune image utilisable.", "The provider returned no usable images.", "El proveedor no devolvió imágenes utilizables."),
  };

  if (/EXA_API_KEY|recherche web n’est pas configurée/i.test(message)) return words.webConfigured;
  if (/PEXELS_API_KEY|recherche d’images n’est pas configurée/i.test(message)) return words.pexelsConfigured;
  if (/FAL_KEY|génération d’images n’est pas configurée/i.test(message)) return words.falConfigured;
  if (/trop courte|too short|demasiado corta/i.test(message)) return words.shortQuery;
  if (/crédits supplémentaires|needs more credits|necesita más créditos/i.test(message)) return words.credits;
  if (/aucune image utilisable|no usable images|imágenes utilizables/i.test(message)) return words.noImages;
  if (/limite.*pexels|pexels.*limit|límite.*pexels/i.test(message)) return words.pexelsLimit;
  if (/délai autorisé|timed out|tiempo de espera/i.test(message)) return words.timedOut;
  if (/http\s*\d{3}/i.test(message)) return words.httpError;
  if (/momentanément indisponible|temporarily unavailable|no está disponible temporalmente/i.test(message)) return words.unavailable;
  if (language === "fr") return message;
  if (name === "webSearch") return words.unavailable;
  if (name === "searchImages") return words.unavailable;
  return words.unavailable;
}

function localizeToolOutput(
  name: ChatToolName,
  output: Record<string, unknown>,
  language: "fr" | "en" | "es",
) {
  if (typeof output.message !== "string") return output;
  return { ...output, message: localizeToolMessage(name, output.message, language) };
}

export async function executeIdealyChatTool(input: {
  name: ChatToolName;
  arguments: JsonRecord;
  language: "fr" | "en" | "es";
}) {
  let output: Record<string, unknown>;
  switch (input.name) {
    case "webSearch":
      output = await searchWeb(input.arguments);
      break;
    case "searchImages":
      output = await searchPexels(input.arguments, input.language);
      break;
    case "generateImage":
      output = await generateFalImage(input.arguments);
      break;
  }
  return localizeToolOutput(input.name, output, input.language);
}

export function isChatToolName(value: unknown): value is ChatToolName {
  return value === "webSearch" || value === "searchImages" || value === "generateImage";
}
