import { Check, LoaderCircle } from "lucide-react";
import type React from "react";
import { PageFrame } from "../layout/PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { useState } from "react";

const plans = [
  {
    id: "free",
    name: "Découverte",
    price: "0 €",
    period: "Gratuit à vie",
    description:
      "Pour découvrir le workspace et évaluer vos premières missions.",
    features: [
      "200 Power Points",
      "Workspace avec aperçu",
      "Missions ciblées",
      "Export ZIP",
      "Historique des missions",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "19 €",
    period: "par mois",
    description:
      "Pour multiplier les missions et accélérer vos cycles d’itération.",
    features: [
      "2 500 Power Points par mois",
      "Escouade multi-agents complète",
      "Options de modèles IA",
      "Export vers GitHub",
      "Historique étendu",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "49 €",
    period: "par mois",
    description:
      "Pour les équipes qui ont besoin de collaboration et de configurations avancées.",
    features: [
      "4 000 Power Points par mois",
      "Configuration des agents",
      "Espaces partagés",
      "Connecteurs d’équipe",
      "Évolutions en avant-première",
    ],
  },
];

export const PricingPage: React.FC = () => {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const choosePlan = async (planId: string) => {
    if (planId === "free") {
      window.location.assign("/register?plan=free");
      return;
    }
    setPending(planId);
    setError("");
    try {
      const response = await fetch("/api/idealy/billing/checkout", {
        body: JSON.stringify({ billingCycle: "monthly", planId }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !payload.url)
        throw new Error(
          payload.error || "La page de paiement n’a pas pu être préparée.",
        );
      window.location.assign(payload.url);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La page de paiement n’a pas pu être préparée.",
      );
    } finally {
      setPending("");
    }
  };

  return (
    <PageFrame label="Offres">
      <div className="mx-auto max-w-5xl pb-12">
        <PageHeader
          description="Tarifs mensuels issus de l’offre Idealy. Les paiements restent soumis à l’activation du service et à la connexion du compte."
          eyebrow="Formules Idealy"
          title="Choisissez l’espace dont votre projet a besoin."
        />
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              className={`flex flex-col rounded-2xl border p-5 sm:p-6 ${plan.highlighted ? "border-brand-primary/50 bg-brand-primary/[0.06] shadow-[0_0_0_1px_rgba(99,102,241,0.08)]" : "border-border-subtle bg-bg-surface"}`}
              key={plan.id}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-text-main">
                  {plan.name}
                </h2>
                {plan.highlighted && (
                  <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                    Populaire
                  </span>
                )}
              </div>
              <p className="mt-5">
                <span className="text-3xl font-semibold tracking-tight text-text-main">
                  {plan.price}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {plan.period}
                </span>
              </p>
              <p className="mt-3 min-h-10 text-sm leading-5 text-text-muted">
                {plan.description}
              </p>
              <ul className="mt-5 flex-1 space-y-3 border-t border-border-subtle pt-5">
                {plan.features.map((feature) => (
                  <li
                    className="flex gap-2.5 text-xs leading-5 text-text-muted"
                    key={feature}
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-ring disabled:opacity-60 ${plan.highlighted ? "bg-brand-primary text-brand-onPrimary" : "border border-border-subtle bg-bg-base text-text-main"}`}
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
                  : "Choisir le plan " + plan.name}
              </button>
            </article>
          ))}
        </div>
        {error && (
          <p
            aria-live="polite"
            className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-text-muted"
          >
            {error}
          </p>
        )}
        <p className="mt-5 text-xs leading-5 text-text-muted">
          Les actions de paiement passent par l’API Idealy. Si les paiements
          sont désactivés ou si vous n’êtes pas connecté, l’application affiche
          la raison au lieu d’ouvrir un faux checkout.
        </p>
      </div>
    </PageFrame>
  );
};
