import "server-only";

export type ExaSearchResultItem = {
  id: string;
  title: string;
  url: string;
  publishedDate?: string | null;
  author?: string | null;
  highlights?: string[];
  score?: number;
};

export type ExaSearchResponse = {
  configured: boolean;
  query: string;
  results: ExaSearchResultItem[];
  totalResults: number;
  error?: string;
};

/**
 * Searches the live web using the Exa Semantic Search API.
 * Follows the canonical Exa API specification:
 * - Endpoint: POST https://api.exa.ai/search
 * - Default mode: type: "auto", contents: { highlights: true }
 * - Uses EXA_API_KEY from environment.
 */
export async function searchExaWeb({
  query,
  numResults = 5,
  objective,
}: {
  query: string;
  numResults?: number;
  objective?: string;
}): Promise<ExaSearchResponse> {
  const apiKey =
    process.env.EXA_API_KEY?.trim() ||
    process.env.EXA_AI_API_kEY?.trim() ||
    process.env.EXA_AI_API_KEY?.trim();

  if (!apiKey) {
    return {
      configured: false,
      query,
      results: [],
      totalResults: 0,
      error:
        "Le connecteur Exa requiert la clé EXA_API_KEY dans l'environnement serveur.",
    };
  }

  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      configured: true,
      query: "",
      results: [],
      totalResults: 0,
      error: "La requête de recherche ne peut pas être vide.",
    };
  }

  try {
    const payload: Record<string, unknown> = {
      query: cleanQuery,
      type: "auto",
      contents: {
        highlights: true,
      },
      numResults: Math.min(Math.max(1, numResults), 10),
    };

    if (objective?.trim()) {
      payload.objective = objective.trim().slice(0, 4000);
    }

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        configured: true,
        query: cleanQuery,
        results: [],
        totalResults: 0,
        error: `Exa API HTTP ${response.status}: ${errorText.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      results?: Array<{
        id?: string;
        title?: string;
        url?: string;
        publishedDate?: string | null;
        author?: string | null;
        highlights?: string[];
        score?: number;
      }>;
    };

    const items: ExaSearchResultItem[] = (data.results ?? []).map((r) => ({
      id: r.id ?? r.url ?? "",
      title: r.title ?? "Sans titre",
      url: r.url ?? "",
      publishedDate: r.publishedDate ?? null,
      author: r.author ?? null,
      highlights: Array.isArray(r.highlights) ? r.highlights : [],
      score: r.score,
    }));

    return {
      configured: true,
      query: cleanQuery,
      results: items,
      totalResults: items.length,
    };
  } catch (err) {
    return {
      configured: true,
      query: cleanQuery,
      results: [],
      totalResults: 0,
      error: err instanceof Error ? err.message : "Erreur de connexion à Exa",
    };
  }
}
