"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { PRICING_DISPLAY } from "@/config/pricing-display";
import type { IdealyWay } from "@/lib/idealy/product-contract";
import { powerPlanPolicy } from "@/lib/idealy/power-policy";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en" | "es";
type TierId = "free" | "pro" | "business" | "enterprise";
type Tier = {
  id: TierId;
  price: number | null;
  points: number | null;
  note: string;
  features: readonly string[];
};

const copy = {
  en: {
    all: "Everything in the previous levels",
    annualCharge: "charged once per year",
    checkoutError: "Unable to prepare payment. Try again or contact the team.",
    core: "All four work paths are included in every plan",
    footer:
      "Pro and Business payments are processed through Stripe. Enterprise is available by quote.",
    loading: "Opening Stripe…",
    max: "Included Power to be confirmed",
    month: "Monthly",
    pendingPrice: "To be defined",
    perMonth: "/ month",
    points: "Power Points per month",
    powerUnavailable: "Custom Power amounts are not billable yet.",
    quote: "Custom",
    levels: ["Starter", "Pro", "Business", "Enterprise"],
    save: "≈ 16% annual savings",
    saveCompact: "≈ 16% saved",
    starts: "Core tools to create and guide your projects.",
    subtitle:
      "The same creation workspace on every plan, with more capacity and collaboration as your needs grow.",
    tag: "Idealy plans",
    title: "A clear plan for every stage of your work.",
    unavailable: "Coming soon",
    year: "Yearly",
  },
  es: {
    all: "Todo lo incluido en los niveles anteriores",
    annualCharge: "cobrados en un pago anual",
    checkoutError:
      "No se pudo preparar el pago. Inténtalo de nuevo o contacta con el equipo.",
    core: "Las cuatro vías de trabajo están incluidas en todos los planes",
    footer:
      "Los pagos de Pro y Business se procesan a través de Stripe. Enterprise está disponible bajo presupuesto.",
    loading: "Abriendo Stripe…",
    max: "Power incluido por confirmar",
    month: "Mensual",
    pendingPrice: "Por definir",
    perMonth: "/ mes",
    points: "Power Points al mes",
    powerUnavailable:
      "Las cantidades personalizadas de Power aún no se pueden facturar.",
    quote: "A medida",
    levels: ["Inicial", "Pro", "Business", "Enterprise"],
    save: "≈ 16% de ahorro anual",
    saveCompact: "≈ 16% de ahorro",
    starts: "Las herramientas esenciales para crear y gestionar proyectos.",
    subtitle:
      "El mismo espacio de creación en todos los planes, con más capacidad y colaboración a medida que crecen tus necesidades.",
    tag: "Planes Idealy",
    title: "Un plan claro para cada etapa de tu trabajo.",
    unavailable: "Próximamente",
    year: "Anual",
  },
  fr: {
    all: "Tout ce qui est inclus dans les niveaux précédents",
    annualCharge: "facturés en une fois",
    checkoutError:
      "Impossible de préparer le paiement. Réessayez ou contactez l’équipe.",
    core: "Les quatre voies de travail sont incluses dans chaque offre",
    footer:
      "Les paiements Pro et Business sont traités via Stripe. L’offre Enterprise est proposée sur devis.",
    loading: "Ouverture de Stripe…",
    max: "Power inclus à confirmer",
    month: "Mensuel",
    pendingPrice: "À définir",
    perMonth: "/ mois",
    points: "Power Points par mois",
    powerUnavailable:
      "La quantité personnalisée de Power n’est pas encore facturable.",
    quote: "Sur devis",
    levels: ["Découverte", "Pro", "Business", "Enterprise"],
    save: "≈ 16 % d’économie annuelle",
    saveCompact: "≈ 16 % d’économie",
    starts: "Les outils essentiels pour créer et piloter vos projets.",
    subtitle:
      "Le même espace de création dans chaque offre, avec davantage de capacité et de collaboration selon vos besoins.",
    tag: "Offres Idealy",
    title: "Une offre claire pour chaque étape de vos projets.",
    unavailable: "Bientôt disponible",
    year: "Annuel",
  },
} as const;

const plans = [
  {
    features: [
      "Workspace et aperçu des projets",
      "Export du code source",
      "Accès aux quatre voies de travail",
    ],
    id: "free",
    note: "Pour découvrir le workspace et lancer vos premières missions.",
    points: powerPlanPolicy.free.monthlyAllocation,
    price: PRICING_DISPLAY.free.monthlyEur,
  },
  {
    features: [
      "Tout le plan Découverte",
      "Jusqu’à 5 missions actives",
      "Jusqu’à 300 fichiers par mission",
      "Synchronisation GitHub",
    ],
    id: "pro",
    note: "Pour construire, tester et faire évoluer des applications.",
    points: powerPlanPolicy.pro.monthlyAllocation,
    price: PRICING_DISPLAY.pro.monthlyEur,
  },
  {
    features: [
      "Tout le plan Pro",
      "Jusqu’à 20 missions actives",
      "Jusqu’à 1 000 fichiers par mission",
      "Orchestration multi-projets",
    ],
    id: "business",
    note: "Pour les équipes qui développent plusieurs projets en parallèle.",
    points: powerPlanPolicy.business.monthlyAllocation,
    price: PRICING_DISPLAY.business.monthlyEur,
  },
  {
    features: [
      "Quotas et espaces adaptés à l’organisation",
      "Gouvernance et sécurité",
      "Accompagnement sur mesure",
    ],
    id: "enterprise",
    note: "Pour les organisations avec des exigences de gouvernance et d’accompagnement.",
    points: null,
    price: null,
  },
] as const;

export function PricingExperience({
  way,
  locale,
  selectedLevel,
  selectedCycle,
  selectedPower,
  presentation = "page",
}: {
  way: IdealyWay;
  locale: Locale;
  presentation?: "page" | "dialog";
  selectedLevel?: string | null;
  selectedCycle?: string | null;
  selectedPower?: string | null;
}) {
  const text = copy[locale];
  const isDialog = presentation === "dialog";
  const { data: session, status: sessionStatus } = useSession();
  const [checkoutPending, setCheckoutPending] = useState<TierId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(selectedCycle === "yearly");
  const chosenPlans = plans;
  const names = text.levels;

  const startCheckout = useCallback(
    async (planId: "pro" | "business") => {
      setCheckoutError(null);
      setCheckoutPending(planId);
      try {
        const response = await fetch("/api/idealy/billing/checkout", {
          body: JSON.stringify({
            billingCycle: annual ? "yearly" : "monthly",
            planId,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.url !== "string") {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : text.checkoutError
          );
        }
        window.location.assign(payload.url);
      } catch (error) {
        setCheckoutError(
          error instanceof Error ? error.message : text.checkoutError
        );
        setCheckoutPending(null);
      }
    },
    [annual, text.checkoutError]
  );

  const startProCheckout = useCallback(
    () => startCheckout("pro"),
    [startCheckout]
  );
  const startBusinessCheckout = useCallback(
    () => startCheckout("business"),
    [startCheckout]
  );
  const setMonthly = useCallback(() => setAnnual(false), []);
  const setYearly = useCallback(() => setAnnual(true), []);
  useEffect(() => {
    setAnnual(selectedCycle === "yearly");
  }, [selectedCycle]);

  return (
    <section
      className={cn(
        "relative z-10 mx-auto w-full scroll-mt-24",
        isDialog
          ? "max-w-none px-3 py-5 sm:px-5 sm:py-6"
          : "max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10"
      )}
      id="plans"
    >
      <header className={cn("mx-auto max-w-3xl text-center", isDialog ? "mb-5 sm:mb-6" : "mb-9 sm:mb-12")}>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/70">
          <Sparkles aria-hidden="true" className="size-3.5 text-orange-300" />{" "}
          {text.tag}
        </div>
        <h2 className={cn("mt-3 text-balance font-semibold tracking-[-0.04em] text-white", isDialog ? "text-2xl sm:text-3xl" : "mt-4 text-3xl sm:text-4xl")}>
          {text.title}
        </h2>
        <p className={cn("mx-auto mt-2 max-w-2xl text-pretty text-white/60", isDialog ? "text-xs leading-5 sm:text-sm sm:leading-6" : "mt-3 text-sm leading-6 sm:text-base")}>
          {text.subtitle}
        </p>
        <fieldset className={cn("min-w-0 border-0 p-0", isDialog ? "mt-4" : "mt-6")}>
          <legend className="sr-only">
            {locale === "fr"
              ? "Période de facturation"
              : locale === "es"
                ? "Periodo de facturación"
                : "Billing period"}
          </legend>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              aria-pressed={!annual}
              className={cn(
                cn("rounded-full py-2 text-sm transition-colors", isDialog ? "px-3 sm:px-4" : "px-4"),
                annual
                  ? "text-white/65 hover:text-white"
                  : "bg-white text-[#11111a]"
              )}
              onClick={setMonthly}
              type="button"
            >
              {text.month}
            </button>
            <button
              aria-pressed={annual}
              className={cn(
                cn("flex items-center gap-2 rounded-full py-2 text-sm transition-colors", isDialog ? "px-3 sm:px-4" : "px-4"),
                annual
                  ? "bg-white text-[#11111a]"
                  : "text-white/65 hover:text-white"
              )}
              onClick={setYearly}
              type="button"
            >
              {text.year}
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  annual ? "text-emerald-700" : "text-emerald-300"
                )}
              >
                {isDialog ? text.saveCompact : text.save}
              </span>
            </button>
          </div>
        </fieldset>
      </header>

      <div className={cn("flex flex-wrap items-center gap-2 text-sm text-white/60", isDialog ? "mb-4" : "mb-5")}>
        <span className="font-medium">{text.core}</span>
      </div>

      <div className={cn("grid items-stretch gap-4", isDialog ? "grid-cols-1 sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4")}>
        {chosenPlans.map((tier, index) => {
          const { id, points, features } = tier;
          const basePrice = tier.price;
          const isPopular = index === 1;
          const isSelected = selectedLevel === names[index];
          const price = basePrice;
          const annualPrice =
            id === "pro"
              ? PRICING_DISPLAY.pro.annualEur
              : id === "business"
                ? PRICING_DISPLAY.business.annualEur
                : null;
          const shownPrice =
            price === null
              ? null
              : annual && annualPrice !== null
                ? annualPrice / 12
                : price;
          const label = names[index];
          const priceLabel =
            shownPrice === null
              ? id === "enterprise"
                ? text.quote
                : text.pendingPrice
              : `${shownPrice.toFixed(2)} € ${text.perMonth}`;
          const billingPlan = id === "business" ? "business" : "pro";
          const href = `/register?way=${way}&plan=${billingPlan}&level=${encodeURIComponent(label)}&cycle=${annual ? "yearly" : "monthly"}&power=${points ?? "custom"}`;
          const paymentsEnabled = process.env.NEXT_PUBLIC_IDEALY_PAYMENTS_ENABLED === "true";
          const planIsAvailable = (id === "pro" || id === "business") && paymentsEnabled;
          return (
            <article
              aria-current={isSelected ? "true" : undefined}
              aria-label={`${label} — ${priceLabel}`}
              className={cn(
                cn("relative flex min-w-0 flex-col rounded-[1.65rem] border", isDialog ? "p-4 sm:p-5" : "p-6"),
                isSelected
                  ? "border-orange-300/70 bg-orange-400/[0.08] ring-1 ring-orange-300/30"
                  : isPopular
                    ? "border-orange-300/45 bg-[linear-gradient(160deg,rgba(251,146,60,.10),rgba(255,255,255,.04)_48%,rgba(255,255,255,.02))] shadow-[0_24px_70px_-42px_rgba(251,146,60,.28)]"
                    : "border-white/[0.09] bg-white/[0.025] hover:bg-white/[0.045]"
              )}
              key={`${way}-${label}`}
            >
              {isSelected ? (
                <span className="mb-3 w-fit rounded-full bg-orange-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-orange-100">
                  {locale === "fr"
                    ? "Votre choix précédent"
                    : locale === "es"
                      ? "Tu elección anterior"
                      : "Your previous choice"}
                </span>
              ) : null}
              {isPopular ? (
                <span className="mb-3 w-fit rounded-full bg-orange-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-orange-100">
                  {locale === "fr"
                    ? "Le plus choisi"
                    : locale === "es"
                      ? "El más elegido"
                      : "Most chosen"}
                </span>
              ) : null}
              <h3 className={cn("mt-1 font-semibold tracking-tight text-white", isDialog ? "text-lg sm:text-xl" : "text-xl")}>
                {label}
              </h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-white/55">
                {tier.note}
              </p>
              <div className="mt-5 min-h-[4.2rem]">
                {shownPrice === null ? (
                  <span className="text-2xl font-semibold text-white">
                    {priceLabel}
                  </span>
                ) : (
                  <>
                    <span className={cn("font-semibold tracking-[-.04em] text-white", isDialog ? "text-2xl sm:text-3xl" : "text-3xl")}>
                      {shownPrice.toFixed(2)} €
                    </span>
                    <span className="ml-1 text-xs text-white/45">
                      {text.perMonth}
                    </span>
                    {annual && shownPrice > 0 ? (
                      <span className="mt-1 block text-[11px] leading-4 text-orange-200/80">
                        {annualPrice?.toFixed(2) ?? "—"} € /{" "}
                        {locale === "fr"
                          ? "an"
                          : locale === "es"
                            ? "año"
                            : "year"}{" "}
                        · {text.annualCharge}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              <div className="my-4 flex min-h-[3.75rem] items-center border-y border-white/10 py-3 text-xs text-white/70">
                {points !== null ? (
                  <span className="font-semibold text-white">
                    {points.toLocaleString(locale)} {text.points}
                  </span>
                ) : (
                  <span>{text.quote}</span>
                )}
              </div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[.12em] text-white/40">
                {index > 1 ? text.all : text.starts}
              </p>
              <ul className={cn("mb-6 flex-1 space-y-2.5 leading-5 text-white/75", isDialog ? "text-sm" : "text-xs")}>
                {features.map((feature) => (
                  <li className="flex gap-2" key={feature}>
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-emerald-300"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {id === "free" ? (
                <Link
                  className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-center font-medium text-white/80 transition hover:bg-white/[0.07]", isDialog ? "text-sm" : "text-xs")}
                  href={href}
                >
                  {locale === "fr"
                    ? "Commencer gratuitement"
                    : locale === "es"
                      ? "Empezar gratis"
                      : "Start for free"}
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : planIsAvailable ? (
                sessionStatus === "authenticated" &&
                session?.user?.type !== "guest" ? (
                  <button
                    className={cn(
                      cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-50", isDialog ? "text-sm" : "text-xs"),
                      isPopular
                        ? "bg-white text-[#11111a] hover:bg-white/90"
                        : "border border-white/15 text-white/80 hover:bg-white/[0.07]"
                    )}
                    disabled={checkoutPending !== null}
                    onClick={
                      id === "business"
                        ? startBusinessCheckout
                        : startProCheckout
                    }
                    type="button"
                  >
                    {checkoutPending === id
                      ? text.loading
                      : locale === "fr"
                        ? "Continuer vers Stripe"
                        : locale === "es"
                          ? "Continuar a Stripe"
                          : "Continue to Stripe"}
                    <ArrowRight className="size-3.5" />
                  </button>
                ) : (
                  <Link
                    className={cn(
                      cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-center font-semibold transition", isDialog ? "text-sm" : "text-xs"),
                      isPopular
                        ? "bg-white text-[#11111a] hover:bg-white/90"
                        : "border border-white/15 text-white/80 hover:bg-white/[0.07]"
                    )}
                    href={href}
                  >
                    {locale === "fr"
                      ? "Créer un compte et continuer"
                      : locale === "es"
                        ? "Crear cuenta y continuar"
                        : "Create account and continue"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )
              ) : (
                <button
                  className={cn("inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/10 px-3 text-center font-medium text-white/40", isDialog ? "text-sm" : "text-xs")}
                  disabled
                  title={text.unavailable}
                  type="button"
                >
                  {text.unavailable}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {checkoutError ? (
        <p
          className="mx-auto mt-4 max-w-2xl text-center text-sm text-rose-200"
          role="alert"
        >
          {checkoutError}
        </p>
      ) : null}
      <p className={cn("mx-auto max-w-3xl text-center leading-5 text-white/35", isDialog ? "mt-4 text-xs" : "mt-5 text-[11px]")}>
        {text.footer}
      </p>
    </section>
  );
}
