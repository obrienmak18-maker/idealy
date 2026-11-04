import { ArrowLeft, Check, LoaderCircle, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

const plans = [
  {
    id: "free",
    name: "Découverte",
    monthly: 0,
    yearly: 0,
    rgb: "45,212,191",
    description: "Pour découvrir le workspace et lancer vos premières créations.",
    features: [
      "200 Power / mois",
      "Aperçu en direct",
      "Runs Solo & Équipe ciblés",
      "Export ZIP et code propre",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 19,
    yearly: 15.9,
    rgb: "139,92,246",
    description: "Pour construire en continu avec toute l’escouade et Alvin en régie.",
    features: [
      "2 500 Power / mois",
      "Régie multi-agents complète",
      "Choix des modèles & réflexion avancée",
      "Export GitHub & synchronisation",
      "Historique illimité des sessions",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    monthly: 49,
    yearly: 40.9,
    rgb: "217,70,239",
    description: "Pour les équipes qui collaborent sur les mêmes applications.",
    features: [
      "4 000 Power / mois",
      "Espaces partagés et rôles d'équipe",
      "Connecteurs sur-mesure & registre MCP",
      "Priorité de bande passante & support dédié",
      "Accès aux nouvelles Voies en avant-première",
    ],
  },
] as const;

const euro = (n: number) =>
  n === 0
    ? "0 €"
    : `${n.toLocaleString("fr-FR", {
        minimumFractionDigits: n % 1 ? 2 : 0,
      })} €`;

export const PricingPage: React.FC = () => {
  const { setActivePage } = useApp();
  const [pending, setPending] = useState("");
  const [yearly, setYearly] = useState(true);
  const [error, setError] = useState("");

  const choosePlan = async (planId: string) => {
    if (planId === "free") {
      setActivePage("chat");
      return;
    }
    setPending(planId);
    setError("");
    try {
      const response = await fetch("/api/idealy/billing/checkout", {
        body: JSON.stringify({
          billingCycle: yearly ? "yearly" : "monthly",
          planId,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error || "La page de paiement n’a pas pu être préparée."
        );
      }
      window.location.assign(payload.url);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La page de paiement n’a pas pu être préparée."
      );
    } finally {
      setPending("");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--dsw-alias-bg-base)] text-[var(--dsw-alias-label-primary)] flex flex-col overflow-y-auto selection:bg-[var(--idealy-indigo)]/20">
      {/* Top Navbar Autonome (Style ChatGPT / Stripe) */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--dsw-alias-border-l3)]/80 bg-[var(--dsw-alias-bg-base)]/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            aria-label="Retour au workspace"
            className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs md:text-sm font-medium text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
            onClick={() => setActivePage("chat")}
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au workspace</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-[var(--dsw-alias-label-primary)]">
              Idealy
            </span>
            <span className="text-xs text-[var(--dsw-alias-label-tertiary)]">
              / Offres & Tarifs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="focus-ring hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
            onClick={() => setActivePage("login")}
            type="button"
          >
            Se connecter
          </button>
          <button
            className="focus-ring inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-[var(--dsw-alias-label-primary)] text-[var(--dsw-alias-bg-base)] hover:opacity-90 transition-opacity"
            onClick={() => setActivePage("chat")}
            type="button"
          >
            <span>Accéder à l'app</span>
          </button>
        </div>
      </header>

      {/* Main Pricing Hero & Cards */}
      <main className="relative flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Subtle Ambient Radial Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 opacity-60"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(139,92,246,0.18), transparent 70%)",
            filter: "blur(35px)",
          }}
        />

        <header className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[var(--idealy-indigo)]/10 text-[var(--idealy-indigo)] border border-[var(--idealy-indigo)]/20">
            <Sparkles className="w-3 h-3" />
            Tarifs simples et transparents
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[var(--dsw-alias-label-primary)]">
            Choisissez l’espace dont vos projets ont besoin.
          </h1>
          <p className="text-sm md:text-base text-[var(--dsw-alias-label-secondary)] max-w-xl mx-auto">
            Commencez gratuitement. Débloquez la régie multi-agents et des quotas
            étendus dès que vous passez à l'échelle.
          </p>

          {/* Toggle Facturation Annuel / Mensuel */}
          <div className="pt-4 flex justify-center">
            <div
              aria-label="Fréquence de facturation"
              className="inline-flex rounded-full border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1 text-xs md:text-sm font-medium"
              role="group"
            >
              <button
                aria-pressed={!yearly}
                className={`focus-ring rounded-full px-4 py-1.5 transition-all duration-150 ${
                  !yearly
                    ? "bg-[var(--dsw-alias-label-primary)] text-[var(--dsw-alias-bg-base)] shadow-xs"
                    : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
                onClick={() => setYearly(false)}
                type="button"
              >
                Mensuel
              </button>
              <button
                aria-pressed={yearly}
                className={`focus-ring rounded-full px-4 py-1.5 transition-all duration-150 flex items-center gap-1.5 ${
                  yearly
                    ? "bg-[var(--dsw-alias-label-primary)] text-[var(--dsw-alias-bg-base)] shadow-xs"
                    : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
                onClick={() => setYearly(true)}
                type="button"
              >
                <span>Annuel</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10.5px] bg-[var(--idealy-teal-petrol)]/20 text-[var(--idealy-teal-petrol)] font-semibold">
                  -16 %
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* 3 Cartes d'Offres */}
        <div className="mt-12 grid gap-6 md:grid-cols-3 items-stretch">
          {plans.map((plan) => {
            const highlighted = "highlighted" in plan && plan.highlighted;
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <article
                className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 ${
                  highlighted
                    ? "border-[var(--idealy-indigo)]/50 shadow-xl"
                    : "border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/50"
                }`}
                key={plan.id}
                style={{
                  background: `radial-gradient(110% 70% at 0% 0%, rgba(${plan.rgb},${
                    highlighted ? 0.16 : 0.06
                  }), transparent 65%), var(--dsw-alias-bg-layer-2)`,
                  boxShadow: highlighted
                    ? `0 20px 50px -20px rgba(${plan.rgb},0.4)`
                    : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--dsw-alias-label-primary)]">
                    {plan.name}
                  </h2>
                  {highlighted && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{
                        background: `rgba(${plan.rgb},0.16)`,
                        color: `rgb(${plan.rgb})`,
                      }}
                    >
                      Recommandé
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-semibold tracking-tight text-[var(--dsw-alias-label-primary)]">
                    {euro(price)}
                  </span>
                  <span className="text-xs text-[var(--dsw-alias-label-tertiary)]">
                    {plan.id === "free" ? "pour toujours" : "par mois"}
                  </span>
                </div>

                <p className="mt-1 min-h-[18px] text-[11.5px] text-[var(--dsw-alias-label-tertiary)]">
                  {plan.id !== "free" && yearly ? "Facturé annuellement" : ""}
                </p>

                <p className="mt-4 min-h-[44px] text-xs md:text-[13.5px] leading-snug text-[var(--dsw-alias-label-secondary)]">
                  {plan.description}
                </p>

                <ul className="mt-6 flex-1 space-y-3 border-t border-[var(--dsw-alias-border-l3)] pt-6">
                  {plan.features.map((feature) => (
                    <li
                      className="flex items-start gap-2.5 text-xs md:text-sm text-[var(--dsw-alias-label-secondary)]"
                      key={feature}
                    >
                      <Check
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 mt-0.5"
                        style={{ color: `rgb(${plan.rgb})` }}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`focus-ring mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                    highlighted
                      ? "bg-[var(--dsw-alias-label-primary)] text-[var(--dsw-alias-bg-base)] hover:opacity-90 shadow-sm"
                      : "border border-[var(--dsw-alias-border-l2)] text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                  }`}
                  disabled={Boolean(pending)}
                  onClick={() => void choosePlan(plan.id)}
                  type="button"
                >
                  {pending === plan.id && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  )}
                  {plan.id === "free"
                    ? "Commencer gratuitement"
                    : `Passer à ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>

        {error && (
          <p
            aria-live="polite"
            className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-xs md:text-sm text-amber-500 max-w-md mx-auto"
          >
            {error}
          </p>
        )}

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-[var(--dsw-alias-label-tertiary)] space-y-1">
          <p>Paiement chiffré et sécurisé. Annulable en un clic à tout moment.</p>
          <p>Besoin d'un volume sur-mesure ou d'un déploiement dédié ? Contactez notre équipe.</p>
        </div>
      </main>
    </div>
  );
};
