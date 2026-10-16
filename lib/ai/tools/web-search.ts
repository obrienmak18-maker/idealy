import { tool } from "ai";
import { z } from "zod";
import { searchExaWeb } from "@/lib/idealy/connectors/exa";

export const webSearch = () =>
  tool({
    description:
      "Search the live web using Exa semantic search. Returns fresh real-world facts, recent documentation, APIs, and verified URLs with highlighted excerpts.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Natural language search query encoding subject, context, and time window (e.g. 'latest Next.js 16 app router features', 'Tailwind CSS v4 config')"
        ),
      objective: z
        .string()
        .optional()
        .describe(
          "Goal for this search turn: which documents to prioritize and what specific facts or snippets to pull"
        ),
      numResults: z
        .number()
        .min(1)
        .max(10)
        .default(5)
        .optional()
        .describe("Maximum number of results to return (default: 5)"),
    }),
    execute: async ({ query, objective, numResults }) => {
      const result = await searchExaWeb({
        query,
        objective,
        numResults: numResults ?? 5,
      });

      if (!result.configured) {
        return {
          status: "unconfigured",
          message:
            "Le connecteur de recherche Exa n'est pas configuré (EXA_API_KEY absente).",
          results: [],
        };
      }

      if (result.error) {
        return {
          status: "error",
          message: result.error,
          results: [],
        };
      }

      return {
        status: "success",
        query: result.query,
        count: result.totalResults,
        results: result.results.map((item) => ({
          title: item.title,
          url: item.url,
          publishedDate: item.publishedDate,
          author: item.author,
          highlights: item.highlights,
        })),
      };
    },
  });
