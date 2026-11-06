import { ArrowLeft, Check, LoaderCircle, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

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

  // Récupération de la Voie active pour adapter le vocabulaire énergétique
  const savedProfile = (() => {
    try {
      const raw =
        localStorage.getItem("idealy_profile") ||
        localStorage.getItem("idealy_user_profile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const userWay = savedProfile?.way || "mage";

  const wayDetails = {
    hunter: {
      pro: "Hunter Licencié",
      resource: "Nen",
      rgb: "20,184,166",
      starter: "Candidat",
      team: "Double Star",
    },
    mage: {
      pro: "Mage",
      resource: "Mana",
      rgb: "139,92,246",
      starter: "Apprenti",
      team: "Archimage",
    },
    ninja: {
      pro: "Jonin",
      resource: "Chakra",
      rgb: "249,115,22",
      starter: "Genin",
      team: "Kage",
    },
    professional: {
      pro: "Pro",
      resource: "Énergie",
      rgb: "37,99,235",
      starter: "Découverte",
      team: "Business",
    },
  }[userWay as "ninja" | "mage" | "hunter" | "professional"] || {
    pro: "Pro",
    resource: "Mana",
    rgb: "139,92,246",
    starter: "Découverte",
    team: "Business",
  };

  const plans = [
    {
      description:
        "Pour explorer le workspace et prototyper vos premières idées.",
      features: [
        `200 ${wayDetails.resource} / mois`,
        "Aperçu interactif dans le Sidecar",
        "Génération React & Tailwind complète",
        "Export ZIP et code source propre",
      ],
      id: "free",
      monthly: 0,
      name: wayDetails.starter,
      rgb: "45,212,191",
      yearly: 0,
    },
    {
      description:
        "Pour construire en continu avec la régie complète et des modèles avancés.",
      features: [
        `2 500 ${wayDetails.resource} / mois`,
        "Régie multi-agents complète (Alvin + Spécialistes)",
        "Choix des modèles LLM de pointe",
        "Export GitHub & synchronisation instantanée",
        "Historique illimité des sessions",
      ],
      highlighted: true,
      id: "pro",
      monthly: 19,
      name: wayDetails.pro,
      rgb: wayDetails.rgb,
      yearly: 15.9,
    },
    {
      description:
        "Pour les équipes qui collaborent sur les mêmes applications critiques.",
      features: [
        `4 000 ${wayDetails.resource} / mois`,
        "Espaces partagés et rôles d'équipe",
        "Connecteurs sur-mesure & registre MCP",
        "Priorité de bande passante & support dédié",
        "Accès aux nouvelles fonctionnalités en avant-première",
      ],
      id: "business",
      monthly: 49,
      name: wayDetails.team,
      rgb: "217,70,239",
      yearly: 40.9,
    },
  ] as const;

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
    <div className="idealy-pricing relative min-h-screen w-full bg-[#08070d] text-zinc-100 flex flex-col overflow-y-auto selection:bg-teal-500/20 antialiased font-sans">
      {/* Bouton retour discret (Style ChatGPT / Idealy Backend) */}
      <div className="idealy-pricing__back-wrap sticky top-4 left-4 z-50 flex items-center justify-between px-5 py-2 pointer-events-none">
        <button
          aria-label="Retour au workspace"
          className="idealy-pricing__back pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/[0.12] bg-[#12131a]/80 backdrop-blur-md p-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-all shadow-md active:scale-95"
          onClick={() => setActivePage("chat")}
          type="button"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="sr-only">Retour au workspace</span>
        </button>
      </div>

      {/* Halo cosmique en arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 opacity-60"
        style={{
          background: `radial-gradient(50% 50% at 50% 50%, rgba(${wayDetails.rgb},0.15), transparent 70%)`,
          filter: "blur(50px)",
        }}
      />

      {/* Contenu principal défilable */}
      <main className="idealy-pricing__main relative flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pt-4 pb-20">
        <header className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-zinc-300">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Offres & Forfaits énergétiques</span>
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Choisissez votre niveau de puissance.
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-xl mx-auto">
            Chaque formule inclut l'intégralité du moteur Idealy. Votre palier
            définit votre capacité mensuelle de {wayDetails.resource} et la
            vitesse d'exécution.
          </p>

          {/* Toggle Facturation Annuel / Mensuel */}
          <div className="pt-4 flex justify-center">
            <div
              aria-label="Fréquence de facturation"
              className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] p-1 text-xs font-medium backdrop-blur-md"
              role="group"
            >
              <button
                aria-pressed={!yearly}
                className={`rounded-full px-4 py-1.5 transition-all duration-150 ${
                  yearly
                    ? "text-zinc-400 hover:text-white"
                    : "bg-white text-black font-semibold shadow-sm"
                }`}
                onClick={() => setYearly(false)}
                type="button"
              >
                Mensuel
              </button>
              <button
                aria-pressed={yearly}
                className={`rounded-full px-4 py-1.5 transition-all duration-150 flex items-center gap-1.5 ${
                  yearly
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
                onClick={() => setYearly(true)}
                type="button"
              >
                <span>Annuel</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold">
                  2 mois offerts
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* 3 Cartes d'Offres */}
        <div className="idealy-pricing__plans mt-12 grid gap-5 md:grid-cols-3 items-stretch">
          {plans.map((plan) => {
            const highlighted = "highlighted" in plan && plan.highlighted;
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <article
                className={`idealy-pricing__plan relative flex flex-col rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 ${
                  highlighted
                    ? "border-white/[0.2] bg-[#12131d] shadow-2xl ring-1 ring-white/[0.15]"
                    : "border-white/[0.08] bg-[#0c0d13]/80"
                }`}
                key={plan.id}
                style={{
                  background: `radial-gradient(110% 70% at 0% 0%, rgba(${plan.rgb},${
                    highlighted ? 0.16 : 0.05
                  }), transparent 65%), #0d0e14`,
                  boxShadow: highlighted
                    ? `0 20px 50px -20px rgba(${plan.rgb},0.35)`
                    : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                  {highlighted && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        background: `rgba(${plan.rgb},0.2)`,
                        color: `rgb(${plan.rgb})`,
                      }}
                    >
                      Recommandé
                    </span>
                  )}
                </div>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                    {euro(price)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {plan.id === "free" ? "gratuit" : "/ mois"}
                  </span>
                </div>

                <p className="mt-1 min-h-[18px] text-[11.5px] text-zinc-500">
                  {plan.id !== "free" && yearly ? "Facturé annuellement" : ""}
                </p>

                <p className="mt-4 min-h-[44px] text-xs md:text-[13px] leading-snug text-zinc-300">
                  {plan.description}
                </p>

                <ul className="mt-6 flex-1 space-y-3 border-t border-white/[0.08] pt-6">
                  {plan.features.map((feature) => (
                    <li
                      className="flex items-start gap-2.5 text-xs md:text-sm text-zinc-300"
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
                  className={`mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
                    highlighted
                      ? "bg-white text-black hover:bg-zinc-200 shadow-md"
                      : "border border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08]"
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
                    ? "Continuer gratuitement"
                    : `Passer à ${plan.name}`}
                </button>
              </article>
            );
          })}
        </div>

        {error && (
          <p
            aria-live="polite"
            className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-xs md:text-sm text-amber-400 max-w-md mx-auto"
          >
            {error}
          </p>
        )}

        {/* Footer info */}
        <div className="mt-14 text-center text-xs text-zinc-500 space-y-1">
          <p>
            Paiement sécurisé via Stripe. Annulable en un clic à tout moment.
          </p>
          <p>Les quotas se renouvellent chaque mois automatiquement.</p>
        </div>
      </main>
    </div>
  );
};
