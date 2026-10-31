import { Check, Copy, Globe2, LoaderCircle, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";

type Domain = {
  domain: string;
  state: "likely_available" | "registered" | "unknown";
};
type Proposal = {
  inspiration: string;
  name: string;
  story: string;
  domains: Domain[];
};

export const BrandStudioPage: React.FC = () => {
  const [brief, setBrief] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const research = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setProposals([]);
    try {
      const response = await fetch("/api/idealy/brand/research", {
        body: JSON.stringify({ brief: brief.trim() }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        proposals?: Proposal[];
      };
      if (!response.ok)
        throw new Error(payload.error || "La recherche n’a pas abouti.");
      setProposals(Array.isArray(payload.proposals) ? payload.proposals : []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "La recherche n’a pas abouti.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Impossible de copier le nom depuis ce navigateur.");
    }
  };

  const domainLabel: Record<Domain["state"], string> = {
    likely_available: "Aucune inscription trouvée",
    registered: "Déjà enregistré",
    unknown: "Statut inconnu",
  };

  return (
    <main className="h-full overflow-y-auto px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Atelier de marque
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-main">
          Trouvez un nom qui porte votre idée.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
          Décrivez le produit. Le backend proposera cinq noms avec une histoire,
          une piste visuelle et une vérification RDAP pour les domaines .com,
          .ai et .app.
        </p>

        <form
          className="mt-8 rounded-2xl border border-border-subtle bg-bg-surface p-4 sm:p-5"
          onSubmit={(event) => void research(event)}
        >
          <label
            className="block text-sm font-medium text-text-main"
            htmlFor="brand-brief"
          >
            Votre produit
          </label>
          <textarea
            className="mt-3 min-h-32 w-full resize-y rounded-xl border border-border-subtle bg-bg-base p-3.5 text-sm leading-6 text-text-main outline-none placeholder:text-text-muted focus:border-brand-primary/50"
            id="brand-brief"
            maxLength={700}
            minLength={12}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="À qui s’adresse le produit ? Quel problème résout-il ? Qu’est-ce qui le rend différent ?"
            required
            value={brief}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-text-muted">
              {brief.length}/700 caractères · minimum 12
            </span>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-medium text-brand-onPrimary hover:opacity-90 focus-ring disabled:opacity-60"
              disabled={loading || brief.trim().length < 12}
              type="submit"
            >
              {loading ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Sparkles aria-hidden="true" className="h-4 w-4" />
              )}
              {loading ? "Recherche en cours…" : "Explorer des noms"}
            </button>
          </div>
        </form>

        {error && (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-text-muted"
          >
            {error}
            {error.includes("Connectez-vous") && (
              <a
                className="ml-2 text-brand-primary underline"
                href="/login?callbackUrl=%2Fbrand-studio"
              >
                Se connecter
              </a>
            )}
          </p>
        )}

        {proposals.length > 0 && (
          <section aria-label="Noms proposés" className="mt-8 space-y-3">
            {proposals.map((proposal) => (
              <article
                className="rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6"
                key={proposal.name}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-text-main">
                      {proposal.name}
                    </h2>
                    <p className="mt-1 text-xs text-text-muted">
                      {proposal.inspiration}
                    </p>
                  </div>
                  <button
                    aria-label={`Copier ${proposal.name}`}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-subtle px-3 text-xs text-text-muted hover:bg-bg-subtle hover:text-text-main focus-ring"
                    onClick={() => void copyName(proposal.name)}
                    type="button"
                  >
                    {copied === proposal.name ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {copied === proposal.name ? "Copié" : "Copier"}
                  </button>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
                  {proposal.story}
                </p>
                <div className="mt-5 border-t border-border-subtle pt-4">
                  <h3 className="flex items-center gap-2 text-xs font-semibold text-text-main">
                    <Globe2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Vérification des domaines
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {proposal.domains.map((domain) => (
                      <span
                        className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-muted"
                        key={domain.domain}
                      >
                        <strong className="font-medium text-text-main">
                          {domain.domain}
                        </strong>
                        <span className="ml-2">
                          {domainLabel[domain.state]}
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-text-muted">
                    Une réponse RDAP indique seulement si une inscription a été
                    trouvée au moment de la requête. Elle ne confirme ni la
                    disponibilité commerciale ni les droits de marque.
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};
