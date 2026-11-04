import { Check, LoaderCircle } from "lucide-react";
import type React from "react";
import { PageFrame } from "../layout/PageFrame";
import { useState } from "react";

const plans = [
  {
    id: "free",
    name: "Découverte",
    monthly: 0,
    yearly: 0,
    rgb: "45,212,191",
    description: "Pour découvrir le workspace et lancer vos premières missions.",
    features: ["200 de puissance par mois", "Aperçu en direct", "Missions ciblées", "Export ZIP"],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 19,
    yearly: 15.9,
    rgb: "139,92,246",
    description: "Pour construire plus souvent, avec toute l’escouade.",
    features: ["2 500 de puissance par mois", "Escouade complète", "Choix des modèles", "Export GitHub", "Historique étendu"],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    monthly: 49,
    yearly: 40.9,
    rgb: "217,70,239",
    description: "Pour les équipes qui travaillent ensemble sur les mêmes projets.",
    features: ["4 000 de puissance par mois", "Configuration des agents", "Espaces partagés", "Connecteurs d’équipe", "Nouveautés en avant-première"],
  },
] as const;

const euro = (n: number) => (n === 0 ? "0 €" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0 })} €`);

export const PricingPage: React.FC = () => {
  const [pending, setPending] = useState("");
  const [yearly, setYearly] = useState(true);
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
        body: JSON.stringify({ billingCycle: yearly ? "yearly" : "monthly", planId }),
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
      <div className="relative mx-auto max-w-5xl pb-16">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[360px] w-[720px] -translate-x-1/2 opacity-70" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(139,92,246,0.16), transparent 70%)", filter: "blur(30px)" }} />
        <header className="mx-auto max-w-2xl pt-6 text-center">
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.02em] text-text-main sm:text-[40px]">Choisissez l’espace dont votre projet a besoin.</h1>
          <p className="mt-3 text-[15px] text-text-muted">Commencez gratuitement. Passez à l’offre supérieure quand vos projets grandissent.</p>
          <div className="mt-7 inline-flex rounded-full border border-border-subtle bg-bg-surface p-1 text-[13px]" role="group" aria-label="Fréquence de facturation">
            <button aria-pressed={!yearly} className={`focus-ring rounded-full px-4 py-1.5 transition-colors ${!yearly ? "bg-text-main text-bg-base" : "text-text-muted"}`} onClick={() => setYearly(false)} type="button">Mensuel</button>
            <button aria-pressed={yearly} className={`focus-ring rounded-full px-4 py-1.5 transition-colors ${yearly ? "bg-text-main text-bg-base" : "text-text-muted"}`} onClick={() => setYearly(true)} type="button">Annuel <span className="opacity-70">· -16 %</span></button>
          </div>
        </header>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const highlighted = "highlighted" in plan && plan.highlighted;
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <article
                className="relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-transform duration-300 hover:-translate-y-0.5"
                key={plan.id}
                style={{
                  background: `radial-gradient(110% 70% at 0% 0%, rgba(${plan.rgb},${highlighted ? 0.18 : 0.09}), transparent 65%), var(--dsw-alias-bg-layer-2)`,
                  borderColor: `rgba(${plan.rgb},${highlighted ? 0.55 : 0.22})`,
                  boxShadow: highlighted ? `0 24px 60px -28px rgba(${plan.rgb},0.6)` : "none",
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-medium text-text-main">{plan.name}</h2>
                  {highlighted && <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: `rgba(${plan.rgb},0.16)`, color: `rgb(${plan.rgb})` }}>Le plus choisi</span>}
                </div>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="text-[40px] font-medium leading-none tracking-tight text-text-main">{euro(price)}</span>
                  <span className="text-[13px] text-text-muted">{plan.id === "free" ? "pour toujours" : "par mois"}</span>
                </p>
                <p className="mt-1 h-4 text-[12px] text-text-muted">{plan.id !== "free" && yearly ? "Facturé à l’année" : ""}</p>
                <p className="mt-4 min-h-[44px] text-[14px] leading-snug text-text-muted">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2.5 border-t border-border-subtle pt-5">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2.5 text-[13.5px] leading-snug text-text-main/90" key={feature}>
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: `rgb(${plan.rgb})` }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`focus-ring mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-medium transition-opacity hover:opacity-90 disabled:opacity-60 ${highlighted ? "bg-text-main text-bg-base" : "border border-border-subtle text-text-main"}`}
                  disabled={Boolean(pending)}
                  onClick={() => void choosePlan(plan.id)}
                  type="button"
                >
                  {pending === plan.id && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {plan.id === "free" ? "Commencer gratuitement" : `Passer à ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>
        {error && (
          <p aria-live="polite" className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-text-muted">{error}</p>
        )}
        <p className="mt-6 text-center text-[12.5px] text-text-muted">Paiement sécurisé. Annulable à tout moment depuis les réglages.</p>
      </div>
    </PageFrame>
  );
};
