import "server-only";

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  avgColor: string;
  src: {
    original: string;
    large: string;
    medium: string;
    small: string;
    tiny: string;
  };
  alt: string;
};

export type PexelsSearchResult = {
  configured: boolean;
  totalResults: number;
  page: number;
  perPage: number;
  photos: PexelsPhoto[];
  error?: string;
};

/**
 * Searches royalty-free stock photos from Pexels via server-side API.
 * Uses PEXELS_API_KEY from server environment. Never exposed to client.
 */
export async function searchPexelsImages({
  query,
  perPage = 6,
  page = 1,
  orientation,
}: {
  query: string;
  perPage?: number;
  page?: number;
  orientation?: "landscape" | "portrait" | "square";
}): Promise<PexelsSearchResult> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      configured: false,
      totalResults: 0,
      page: 1,
      perPage,
      photos: [],
      error: "Le connecteur Pexels requiert la clé PEXELS_API_KEY dans l'environnement serveur.",
    };
  }

  try {
    const searchParams = new URLSearchParams({
      query: query.trim(),
      per_page: String(Math.min(20, Math.max(1, perPage))),
      page: String(Math.max(1, page)),
      locale: "fr-FR",
    });

    if (orientation) {
      searchParams.set("orientation", orientation);
    }

    const response = await fetch(`https://api.pexels.com/v1/search?${searchParams.toString()}`, {
      headers: {
        Authorization: apiKey,
      },
      next: { revalidate: 3600 },
    });

    if (response.status === 429) {
      return {
        configured: true,
        totalResults: 0,
        page,
        perPage,
        photos: [],
        error: "Limite de requêtes Pexels atteinte (Rate limit). Réessayez dans quelques instants.",
      };
    }

    if (!response.ok) {
      return {
        configured: true,
        totalResults: 0,
        page,
        perPage,
        photos: [],
        error: `Erreur API Pexels (${response.status}) : ${response.statusText}`,
      };
    }

    const data = await response.json();

    const photos: PexelsPhoto[] = (data.photos || []).map((p: any) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      url: p.url,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      avgColor: p.avg_color,
      src: {
        original: p.src.original,
        large: p.src.large,
        medium: p.src.medium,
        small: p.src.small,
        tiny: p.src.tiny,
      },
      alt: p.alt || query,
    }));

    return {
      configured: true,
      totalResults: data.total_results || photos.length,
      page: data.page || page,
      perPage: data.per_page || perPage,
      photos,
    };
  } catch (error) {
    return {
      configured: true,
      totalResults: 0,
      page,
      perPage,
      photos: [],
      error: error instanceof Error ? error.message : "Erreur de connexion à Pexels.",
    };
  }
}
