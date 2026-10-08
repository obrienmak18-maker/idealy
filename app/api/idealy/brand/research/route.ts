/** Local IP helper — replaces @vercel/functions */
function ipAddress(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? undefined;
}
import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";

const briefSchema = z.object({
  brief: z.string().trim().min(12).max(700),
});

const proposalsSchema = z.object({
  proposals: z
    .array(
      z.object({
        inspiration: z.string().trim().min(4).max(100),
        name: z.string().trim().min(2).max(36),
        story: z.string().trim().min(20).max(220),
      })
    )
    .length(5)
    .refine(
      (items) => new Set(items.map((item) => makeSlug(item.name))).size === 5,
      "Les cinq propositions doivent être distinctes."
    ),
});

type DomainState = "likely_available" | "registered" | "unknown";
type RdapBootstrap = { services?: [string[], string[]][] };

function getResearchAgent(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)idealy_user_way=([^;]*)/);
  let way = "professional";
  try {
    if (match?.[1]) {
      way = decodeURIComponent(match[1]);
    }
  } catch {
    way = "professional";
  }
  const agentByWay: Record<string, string> = {
    hunter:
      "Tu es un Hunter d’élite de la Voie du Hunter : tu traques les noms distinctifs, vérifies les pistes et présentes tes preuves avec sang-froid.",
    mage: "Tu es l’archiviste des noms de la Voie du Mage : tu cherches des mots évocateurs, une histoire cohérente et une identité visuelle singulière.",
    ninja:
      "Tu es un chercheur shinobi de la Voie du Ninja : tu traques les signes distinctifs et les homonymies avec précision et discrétion.",
    professional:
      "Tu es un stratège de marque senior : tu privilégies la clarté, la différenciation et la prononciation naturelle.",
  };
  return agentByWay[way] ?? agentByWay.professional;
}

function makeSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
}

async function checkDomain(
  domain: string,
  baseUrl: string | null
): Promise<DomainState> {
  if (!baseUrl) {
    return "unknown";
  }
  try {
    const response = await fetch(
      `${baseUrl}/domain/${encodeURIComponent(domain)}`,
      {
        headers: { Accept: "application/rdap+json, application/json" },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      }
    );
    if (response.status === 200) {
      return "registered";
    }
    if (response.status === 404) {
      return "likely_available";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.type !== "regular") {
    return Response.json(
      { error: "Connectez-vous à Idealy pour utiliser le Studio de marque." },
      { status: 401 }
    );
  }

  try {
    await checkIpRateLimit(ipAddress(request));
  } catch (error) {
    if (error instanceof ChatbotError) {
      return Response.json(
        { error: "La limite de recherches est atteinte. Réessayez plus tard." },
        { status: 429 }
      );
    }
  }

  const parsed = briefSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Décris ton produit en au moins 12 caractères (700 maximum)." },
      { status: 400 }
    );
  }

  try {
    const { output } = await generateText({
      model: getLanguageModel(DEFAULT_CHAT_MODEL),
      output: Output.object({ schema: proposalsSchema }),
      prompt: parsed.data.brief,
      system: `${getResearchAgent(request)}
Tu aides les fondateurs Idealy à nommer un vrai produit humain, mémorable et prononçable.
Évite les noms génériques ou artificiels comme Nexus, Forge, Quantum, Nova, Synth, Flow, AI, GPT et les assemblages de mots tech à la mode. Privilégie des mots qui pourraient réellement devenir une marque, issus du public, du geste, du lieu, de l'émotion ou de l'usage. Chaque proposition doit être nettement différente, facile à dire dans la langue du brief, accompagnée d'une phrase qui explique son lien au produit et d'une piste d'inspiration visuelle pour un logo.
Rends exactement 5 propositions. N'affirme jamais qu'un nom, une marque ou un domaine est juridiquement disponible. Les domaines seront interrogés séparément via RDAP. Réponds dans la langue du brief.`,
      temperature: 0.85,
    });

    if (!output) {
      return Response.json(
        {
          error:
            "L’atelier n’a pas pu structurer ses propositions. Réessaie avec un brief plus précis.",
        },
        { status: 502 }
      );
    }

    const bootstrap = await fetch("https://data.iana.org/rdap/dns.json", {
      cache: "force-cache",
      signal: AbortSignal.timeout(5000),
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as RdapBootstrap) : null
      )
      .catch(() => null);
    const tlds = ["com", "ai", "app"];
    const domainChecks = await Promise.all(
      output.proposals.map(async (proposal) => {
        const slug = makeSlug(proposal.name);
        if (slug.length < 2) {
          return {
            ...proposal,
            domains: tlds.map((tld) => ({
              domain: `${slug}.${tld}`,
              state: "unknown" as const,
            })),
          };
        }
        const domains = await Promise.all(
          tlds.map(async (tld) => {
            const rdapBase =
              bootstrap?.services
                ?.find(([registeredTlds]) =>
                  registeredTlds.some(
                    (candidate) => candidate.toLowerCase() === tld
                  )
                )?.[1]?.[0]
                ?.replace(/\/$/, "") ?? null;
            return {
              domain: `${slug}.${tld}`,
              state: await checkDomain(`${slug}.${tld}`, rdapBase),
            };
          })
        );
        return { ...proposal, domains };
      })
    );

    return Response.json(
      { proposals: domainChecks },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Brand research failed", error);
    return Response.json(
      {
        error:
          "La recherche de noms est momentanément indisponible. Réessaie dans un instant.",
      },
      { status: 502 }
    );
  }
}
