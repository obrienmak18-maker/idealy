"use client";

import {
  ArrowRight,
  Check,
  Download,
  Globe2,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  useCallback,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type DomainCandidate = {
  domain: string;
  state: "likely_available" | "registered" | "unknown";
};
type BrandProposal = {
  name: string;
  story: string;
  inspiration: string;
  domains: DomainCandidate[];
};

const domainLabels = {
  likely_available: "Semble libre",
  registered: "Déjà enregistré",
  unknown: "À vérifier",
} as const;

const directions = [
  { colors: ["#f08062", "#ffcd85", "#fff6ea"], label: "Soleil doux" },
  { colors: ["#286b62", "#a7c995", "#f2f3d8"], label: "Jardin calme" },
  { colors: ["#30354f", "#8585cf", "#f3c278"], label: "Encre vive" },
] as const;

function makeMark(name: string, direction: number) {
  const initial = [...name.trim()][0]?.toLocaleUpperCase("fr") ?? "I";
  if (direction === 0) {
    return (
      <>
        <circle cx="48" cy="48" fill={directions[0].colors[2]} r="35" />
        <path
          d="M20 56a28 28 0 0 1 56 0"
          fill="none"
          stroke={directions[0].colors[0]}
          strokeLinecap="round"
          strokeWidth="6"
        />
        <circle cx="48" cy="39" fill={directions[0].colors[1]} r="10" />
        <path
          d="M28 65h40"
          stroke={directions[0].colors[0]}
          strokeLinecap="round"
          strokeWidth="5"
        />
        <circle cx="76" cy="25" fill={directions[0].colors[0]} r="4" />
      </>
    );
  }
  if (direction === 1) {
    return (
      <>
        <path
          d="M48 12c19 0 34 16 34 35S67 82 48 82 14 66 14 47"
          fill="none"
          stroke={directions[1].colors[0]}
          strokeLinecap="round"
          strokeWidth="6"
        />
        <path
          d="M21 58c7 11 20 18 34 17"
          fill="none"
          stroke={directions[1].colors[1]}
          strokeLinecap="round"
          strokeWidth="8"
        />
        <circle cx="57" cy="33" fill={directions[1].colors[1]} r="9" />
        <text
          fill={directions[1].colors[0]}
          fontFamily="Georgia,serif"
          fontSize="30"
          fontWeight="600"
          textAnchor="middle"
          x="47"
          y="61"
        >
          {initial}
        </text>
      </>
    );
  }
  return (
    <>
      <path
        d="M48 10c20 0 36 16 36 36S68 82 48 82 12 66 12 46 28 10 48 10Z"
        fill={directions[2].colors[0]}
      />
      <path
        d="M25 53c8-18 15-27 23-27s15 9 23 27"
        fill="none"
        stroke={directions[2].colors[2]}
        strokeLinecap="round"
        strokeWidth="4"
      />
      <text
        fill="#fff"
        fontFamily="Georgia,serif"
        fontSize="31"
        fontWeight="600"
        textAnchor="middle"
        x="48"
        y="66"
      >
        {initial}
      </text>
      <circle cx="75" cy="22" fill={directions[2].colors[1]} r="5" />
    </>
  );
}

export function BrandStudio() {
  const [brief, setBrief] = useState("");
  const [proposals, setProposals] = useState<BrandProposal[]>([]);
  const [selected, setSelected] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeProposal = proposals[selected];

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      setProposals([]);
      try {
        const response = await fetch("/api/idealy/brand/research", {
          body: JSON.stringify({ brief }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error ?? "La recherche n’a pas abouti.");
        }
        setProposals(payload.proposals ?? []);
        setSelected(0);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "La recherche n’a pas abouti."
        );
      } finally {
        setLoading(false);
      }
    },
    [brief]
  );

  const handleBriefChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => setBrief(event.target.value),
    []
  );

  const handleProposalSelect = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      if (Number.isInteger(index) && index >= 0) {
        setSelected(index);
      }
    },
    []
  );

  const handleDirectionSelect = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const index = Number(event.currentTarget.dataset.index);
      if (Number.isInteger(index) && index >= 0 && index < directions.length) {
        setDirection(index);
      }
    },
    []
  );

  const downloadLogo = useCallback(
    (proposal: BrandProposal) => {
      const { colors } = directions[direction];
      const initial =
        [...proposal.name.trim()][0]?.toLocaleUpperCase("fr") ?? "I";
      const safeName = proposal.name.replace(/[&<>"']/g, "");
      const wordmarkSize = Math.min(
        38,
        Math.max(22, Math.floor(340 / safeName.length))
      );
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 160"><g transform="translate(22 32)">${direction === 0 ? `<circle cx="48" cy="48" r="35" fill="${colors[2]}"/><path d="M20 56a28 28 0 0 1 56 0" fill="none" stroke="${colors[0]}" stroke-linecap="round" stroke-width="6"/><circle cx="48" cy="39" r="10" fill="${colors[1]}"/><path d="M28 65h40" stroke="${colors[0]}" stroke-linecap="round" stroke-width="5"/><circle cx="76" cy="25" r="4" fill="${colors[0]}"/>` : direction === 1 ? `<path d="M48 12c19 0 34 16 34 35S67 82 48 82 14 66 14 47" fill="none" stroke="${colors[0]}" stroke-linecap="round" stroke-width="6"/><path d="M21 58c7 11 20 18 34 17" fill="none" stroke="${colors[1]}" stroke-linecap="round" stroke-width="8"/><circle cx="57" cy="33" r="9" fill="${colors[1]}"/><text fill="${colors[0]}" font-family="Georgia,serif" font-size="30" font-weight="600" text-anchor="middle" x="47" y="61">${initial}</text>` : `<path d="M48 10c20 0 36 16 36 36S68 82 48 82 12 66 12 46 28 10 48 10Z" fill="${colors[0]}"/><path d="M25 53c8-18 15-27 23-27s15 9 23 27" fill="none" stroke="${colors[2]}" stroke-linecap="round" stroke-width="4"/><text fill="#fff" font-family="Georgia,serif" font-size="31" font-weight="600" text-anchor="middle" x="48" y="66">${initial}</text><circle cx="75" cy="22" r="5" fill="${colors[1]}"/>`}</g><text x="126" y="92" fill="${colors[0]}" font-family="Georgia,serif" font-size="${wordmarkSize}" font-weight="600">${safeName}</text></svg>`;
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${
        proposal.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "idealy-brand"
      }-logo.svg`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [direction]
  );

  const handleDownloadLogo = useCallback(() => {
    if (activeProposal) {
      downloadLogo(activeProposal);
    }
  }, [activeProposal, downloadLogo]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Studio de marque
          </div>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-.04em] sm:text-5xl">
            Un nom qui sonne comme vous.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Idealy explore des pistes de marque liées à votre produit, vérifie
            leurs domaines et prépare un premier logo vectoriel à emporter.
          </p>
        </header>

        <form
          className="mt-8 rounded-[1.5rem] border border-border/70 bg-card/75 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-6"
          onSubmit={handleSubmit}
        >
          <label className="block text-sm font-semibold" htmlFor="brand-brief">
            Parlez-nous du produit
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Pour qui est-il ? Quel changement apporte-t-il ? Quelle sensation
            doit laisser son nom ?
          </p>
          <textarea
            className="mt-4 min-h-32 w-full resize-y rounded-2xl border border-border bg-background/65 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring"
            id="brand-brief"
            maxLength={700}
            minLength={12}
            onChange={handleBriefChange}
            placeholder="Ex. Une application qui aide les petits restaurants familiaux à raconter leurs plats et à fidéliser les habitants du quartier. Le nom doit être chaleureux, facile en français et en anglais."
            required
            value={brief}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {brief.length}/700 · cinq propositions, puis une vérification des
              domaines .com, .ai et .app
            </span>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
              disabled={loading || brief.trim().length < 12}
              type="submit"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Recherche en cours
                </>
              ) : (
                <>
                  Explorer les noms <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {error ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {proposals.length > 0 ? (
          <section aria-labelledby="proposals-title" className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">
                  La sélection
                </p>
                <h2
                  className="mt-1 text-2xl font-semibold tracking-tight"
                  id="proposals-title"
                >
                  Cinq pistes, une identité à choisir.
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Choisissez un nom pour voir les domaines et le logo.
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {proposals.map((proposal, index) => (
                <button
                  aria-pressed={selected === index}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected === index
                      ? "border-primary/60 bg-primary/[.06] shadow-[var(--shadow-card)]"
                      : "border-border/70 bg-card/65 hover:border-foreground/25 hover:bg-card"
                  )}
                  data-index={index}
                  key={proposal.name}
                  onClick={handleProposalSelect}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {proposal.name}
                    </h3>
                    {selected === index ? (
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" />
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        0{index + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {proposal.story}
                  </p>
                  <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      Piste visuelle ·{" "}
                    </span>
                    {proposal.inspiration}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proposal.domains.map((entry) => (
                      <span
                        className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground"
                        key={entry.domain}
                      >
                        {entry.domain} · {domainLabels[entry.state]}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {activeProposal ? (
          <section
            aria-labelledby="logo-title"
            className="mt-8 grid gap-5 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-[var(--shadow-card)] sm:p-7 lg:grid-cols-[1fr_1.05fr] lg:items-center"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">
                Première direction de logo
              </p>
              <h2
                className="mt-2 text-2xl font-semibold tracking-tight"
                id="logo-title"
              >
                {activeProposal.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeProposal.inspiration}. Ce dessin vectoriel est un point
                de départ modifiable, pas une marque déposée ni un logo final.
              </p>
              <fieldset className="mt-5 flex flex-wrap gap-2">
                <legend className="sr-only">
                  Choisir une direction visuelle
                </legend>
                {directions.map((option, index) => (
                  <button
                    aria-pressed={direction === index}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs transition",
                      direction === index
                        ? "border-foreground/30 bg-foreground/5 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                    data-index={index}
                    key={option.label}
                    onClick={handleDirectionSelect}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full"
                      style={{ background: option.colors[0] }}
                    />
                    {option.label}
                  </button>
                ))}
              </fieldset>
              <button
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-85"
                onClick={handleDownloadLogo}
                type="button"
              >
                <Download className="size-4" /> Télécharger en SVG
              </button>
              <Link
                className="ml-2 mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-muted/70"
                href={`/?draft=${encodeURIComponent(`Nous avons retenu « ${activeProposal.name} » comme nom de projet. Raison : ${activeProposal.story} Piste de logo : ${activeProposal.inspiration} Domaines vérifiés par RDAP : ${activeProposal.domains.map((item) => `${item.domain} (${domainLabels[item.state]})`).join(", ")}. Garde ce nom et ces éléments comme contexte pour les agents de conception et de développement.`)}`}
              >
                <Sparkles className="size-4" /> Continuer avec les agents Idealy
              </Link>
            </div>
            <div className="flex min-h-56 items-center justify-center rounded-[1.25rem] border border-border/60 bg-background/75 p-6 sm:min-h-64">
              <svg
                aria-label={`Aperçu du logo ${activeProposal.name}`}
                className="h-auto w-full max-w-[420px]"
                role="img"
                viewBox="0 0 480 160"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect fill="#fff" height="160" rx="28" width="480" />
                <g transform="translate(22 32)">
                  {makeMark(activeProposal.name, direction)}
                </g>
                <text
                  fill={directions[direction].colors[0]}
                  fontFamily="Georgia,serif"
                  fontSize={Math.min(
                    38,
                    Math.max(22, Math.floor(340 / activeProposal.name.length))
                  )}
                  fontWeight="600"
                  x="126"
                  y="92"
                >
                  {activeProposal.name}
                </text>
              </svg>
            </div>
          </section>
        ) : null}

        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground/75">
          <Globe2 className="mt-0.5 size-3.5 shrink-0" />
          Les statuts RDAP sont une première lecture en temps réel du registre,
          pas une réservation. Vérifiez le domaine chez un registrar et le nom
          auprès des registres de marques avant publication.
        </p>
      </div>
    </main>
  );
}
