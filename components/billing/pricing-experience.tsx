"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
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
  notes: Readonly<Record<IdealyWay, string>>;
  features: readonly string[];
};

const copy = {
  en: {
    all: "Everything in the previous levels",
    annualCharge: "charged once per year",
    annualSavings: "saved over the year",
    businessPrice: "Price to confirm",
    checkoutError: "Unable to prepare payment. Try again or contact the team.",
    choose: "Continue with this level",
    contact: "Talk to the team",
    core: "Idealy tools included in every Way",
    custom: "Adjust your monthly Power",
    customHelp: "Add capacity without changing your level.",
    first: "From",
    footer:
      "Pro and Business use Stripe checkout. Custom Power remains unavailable until its billing and economics are configured.",
    loading: "Opening Stripe…",
    max: "Included Power to be confirmed",
    month: "Monthly",
    pendingPrice: "To be defined",
    perMonth: "/ month",
    points: "Power Points per month",
    powerUnavailable: "Custom Power amounts are not billable yet.",
    quote: "Custom",
    routes: {
      hunter: [
        "Candidate",
        "Licensed Hunter",
        "Double Star Hunter",
        "Triple Star Hunter",
      ],
      mage: [
        "Apprentice",
        "Mage",
        "Archmage",
        "Grand Primordial",
      ],
      ninja: [
        "Genin",
        "Chunin",
        "Jonin",
        "Kage / Sannin",
      ],
      professional: [
        "Starter",
        "Pro",
        "Team",
        "Enterprise",
      ],
    } as Record<IdealyWay, string[]>,
    save: "2 months free on Pro and Business",
    starts: "The essentials to create and guide a mission.",
    subtitle:
      "Every Way keeps the same Idealy tools. Your level changes capacity, pace and support.",
    tag: "Grow at your own pace",
    title: "Choose your level of power.",
    unavailable: "Coming soon",
    year: "Yearly",
  },
  es: {
    all: "Todo lo incluido en los niveles anteriores",
    annualCharge: "cobrados en un pago anual",
    annualSavings: "ahorrados durante el año",
    businessPrice: "Precio por confirmar",
    checkoutError:
      "No se pudo preparar el pago. Inténtalo de nuevo o contacta con el equipo.",
    choose: "Continuar con este nivel",
    contact: "Hablar con el equipo",
    core: "Herramientas Idealy incluidas en todas las Vías",
    custom: "Ajusta tu reserva mensual",
    customHelp: "Añade capacidad sin cambiar de nivel.",
    first: "Desde",
    footer:
      "Pro y Business usan Stripe. El Power personalizado no está disponible hasta configurar su facturación y economía.",
    loading: "Abriendo Stripe…",
    max: "Power incluido por confirmar",
    month: "Mensual",
    pendingPrice: "Por definir",
    perMonth: "/ mes",
    points: "Power Points al mes",
    powerUnavailable:
      "Las cantidades personalizadas de Power aún no se pueden facturar.",
    quote: "A medida",
    routes: {
      hunter: [
        "Candidato",
        "Hunter Licenciado",
        "Double Star Hunter",
        "Triple Star Hunter",
      ],
      mage: [
        "Aprendiz",
        "Mago",
        "Archimago",
        "Gran Primordial",
      ],
      ninja: [
        "Genin",
        "Chunin",
        "Jonin",
        "Kage / Sannin",
      ],
      professional: [
        "Starter",
        "Pro",
        "Team",
        "Empresa",
      ],
    } as Record<IdealyWay, string[]>,
    save: "2 meses gratis en Pro y Business",
    starts: "Lo esencial para crear y guiar una misión.",
    subtitle:
      "Todas las Vías conservan las herramientas de Idealy. El nivel cambia tu capacidad, ritmo y acompañamiento.",
    tag: "Crece a tu ritmo",
    title: "Elige tu nivel de potencia.",
    unavailable: "Próximamente",
    year: "Anual",
  },
  fr: {
    all: "Tout ce qui est inclus dans les niveaux précédents",
    annualCharge: "facturés en une fois",
    annualSavings: "économisés sur l’année",
    businessPrice: "Prix à confirmer",
    checkoutError:
      "Impossible de préparer le paiement. Réessayez ou contactez l’équipe.",
    choose: "Continuer avec ce niveau",
    contact: "Parler à l’équipe",
    core: "Outils Idealy inclus dans toutes les Voies",
    custom: "Ajustez votre réserve mensuelle",
    customHelp: "Augmentez votre réserve sans changer de niveau.",
    first: "À partir de",
    footer:
      "Les offres Pro et Business passent par Stripe. Le Power personnalisé reste indisponible tant que sa facturation et son économie ne sont pas configurées.",
    loading: "Ouverture de Stripe…",
    max: "Power inclus à confirmer",
    month: "Mensuel",
    pendingPrice: "À définir",
    perMonth: "/ mois",
    points: "Power Points par mois",
    powerUnavailable:
      "La quantité personnalisée de Power n’est pas encore facturable.",
    quote: "Sur devis",
    routes: {
      hunter: [
        "Candidat",
        "Hunter Licencié",
        "Double Star Hunter",
        "Triple Star Hunter",
      ],
      mage: [
        "Apprenti",
        "Mage",
        "Archimage",
        "Grand Primordial",
      ],
      ninja: [
        "Genin",
        "Chunin",
        "Jonin",
        "Kage / Sannin",
      ],
      professional: [
        "Starter",
        "Pro",
        "Max",
        "Max+",
        "Team",
        "Enterprise",
      ],
    } as Record<IdealyWay, string[]>,
    save: "2 mois offerts sur Pro et Business",
    starts: "Inclut les outils essentiels pour créer et piloter une mission.",
    subtitle:
      "Chaque Voie garde les mêmes outils Idealy. Le niveau change votre capacité, votre cadence et votre accompagnement.",
    tag: "Une progression, à votre rythme",
    title: "Choisissez votre niveau de puissance.",
    unavailable: "Bientôt disponible",
    year: "Annuel",
  },
} as const;

const resource = {
  hunter: { en: "Nen", es: "Nen", fr: "Nen" },
  mage: { en: "Mana", es: "Maná", fr: "Mana" },
  ninja: { en: "Chakra", es: "Chakra", fr: "Chakra" },
  professional: { en: "Power", es: "Power", fr: "Power" },
} as const;

const plans = [
  {
    features: [
      "Missions essentielles",
      "Workspace et aperçu",
      "Export de projet",
    ],
    id: "free",
    notes: {
      hunter: "Pour découvrir Idealy",
      mage: "Pour découvrir Idealy",
      ninja: "Pour découvrir Idealy",
      professional: "Pour tester votre première idée",
    },
    points: powerPlanPolicy.free.monthlyAllocation,
    price: PRICING_DISPLAY.free.monthlyEur,
  },
  {
    features: [
      "Capacité étendue pour les missions",
      "Escouade IA complète",
      "Historique de projet",
    ],
    id: "pro",
    notes: {
      hunter: "Pour mener vos premières missions",
      mage: "Pour donner forme à vos idées",
      ninja: "Pour construire régulièrement",
      professional: "Pour un MVP en construction",
    },
    points: powerPlanPolicy.pro.monthlyAllocation,
    price: PRICING_DISPLAY.pro.monthlyEur,
  },
  {
    features: [
      "Capacité et collaboration pour les équipes",
      "Jusqu’à 20 missions actives",
      "Workspace étendu",
    ],
    id: "business",
    notes: {
      hunter: "Pour une équipe de Hunters",
      mage: "Pour diriger une guilde créative",
      ninja: "Pour piloter une guilde et ses projets",
      professional: "Pour les équipes produit",
    },
    points: powerPlanPolicy.business.monthlyAllocation,
    price: PRICING_DISPLAY.business.monthlyEur,
  },
  {
    features: [
      "Quotas et espaces sur mesure",
      "Gouvernance et sécurité",
      "Conditions et accompagnement sur mesure",
    ],
    id: "enterprise",
    notes: {
      hunter: "Pour les grandes organisations",
      mage: "Pour les organisations et leurs règles propres",
      ninja: "Pour les organisations et leurs règles propres",
      professional: "Pour les grandes organisations",
    },
    points: null,
    price: null,
  },
] as const

const wayNames: Record<IdealyWay, Record<Locale, string>> = {
  hunter: { en: "Hunter Way", es: "Vía Hunter", fr: "Voie du Hunter" },
  mage: { en: "Mage Way", es: "Vía del Mago", fr: "Voie du Mage" },
  ninja: { en: "Ninja Way", es: "Vía Ninja", fr: "Voie du Ninja" },
  professional: {
    en: "Professional Way",
    es: "Vía profesional",
    fr: "Voie professionnelle",
  },
};

export function PricingExperience({
  way,
  locale,
  selectedLevel,
  selectedCycle,
  selectedPower,
}: {
  way: IdealyWay;
  locale: Locale;
  selectedLevel?: string | null;
  selectedCycle?: string | null;
  selectedPower?: string | null;
}) {
  const text = copy[locale];
  const { data: session, status: sessionStatus } = useSession();
  const [checkoutPending, setCheckoutPending] = useState<TierId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [annual, setAnnual] = useState(selectedCycle === "yearly");
  const [customPower, setCustomPower] = useState(() => {
    const value = Number(selectedPower);
    return Number.isFinite(value) &&
      value >= 1000 &&
      value <= powerPlanPolicy.pro.walletCap &&
      value % 500 === 0
      ? value
      : powerPlanPolicy.pro.monthlyAllocation;
  });
  const chosenPlans = plans;
  const names = text.routes[way];

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
  const handleCustomPowerChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCustomPower(Number(event.target.value));
    },
    []
  );

  useEffect(() => {
    setAnnual(selectedCycle === "yearly");
  }, [selectedCycle]);

  useEffect(() => {
    const value = Number(selectedPower);
    if (
      Number.isFinite(value) &&
      value >= 1000 &&
      value <= 6000 &&
      value % 1000 === 0
    ) {
      setCustomPower(value);
    }
  }, [selectedPower]);

  return (
    <section
      className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20 lg:px-10"
      id="plans"
    >
      <header className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/70">
          <Sparkles aria-hidden="true" className="size-3.5 text-violet-300" />{" "}
          {text.tag}
        </div>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          {text.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-6 text-white/60 sm:text-base">
          {text.subtitle}
        </p>
        <fieldset className="mt-6 min-w-0 border-0 p-0">
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
                "rounded-full px-4 py-2 text-sm transition-colors",
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
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
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
                {text.save}
              </span>
            </button>
          </div>
        </fieldset>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-white/55">
        <span className="font-medium text-white/80">
          {wayNames[way][locale]}
        </span>
        <span>
          {text.core} · {resource[way][locale]}
        </span>
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              : `${shownPrice.toFixed(2)} € € ${text.perMonth}`;
          const billingPlan = id === "business" ? "business" : "pro";
          const href = `/register?way=${way}&plan=${billingPlan}&level=${encodeURIComponent(label)}&cycle=${annual ? "yearly" : "monthly"}&power=${index === 1 ? customPower : (points ?? "custom")}`;
          const selectedPowerIsBillable = true;
          const planIsAvailable = id === "pro" || id === "business";
          return (
            <article
              aria-current={isSelected ? "true" : undefined}
              aria-label={`${label} — ${priceLabel}`}
              className={cn(
                "relative flex min-w-0 flex-col rounded-[1.65rem] border p-5 sm:p-5",
                isSelected
                  ? "border-cyan-200/70 bg-cyan-300/[0.08] ring-1 ring-cyan-200/30"
                  : isPopular
                    ? "border-violet-300/45 bg-[linear-gradient(160deg,rgba(139,92,246,.16),rgba(255,255,255,.045)_48%,rgba(255,255,255,.02))] shadow-[0_24px_70px_-42px_rgba(139,92,246,.75)]"
                    : "border-white/[0.09] bg-white/[0.025] hover:bg-white/[0.045]"
              )}
              key={`${way}-${label}`}
            >
              {isSelected ? (
                <span className="mb-3 w-fit rounded-full bg-cyan-200/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-cyan-100">
                  {locale === "fr"
                    ? "Votre choix précédent"
                    : locale === "es"
                      ? "Tu elección anterior"
                      : "Your previous choice"}
                </span>
              ) : null}
              {isPopular ? (
                <span className="mb-3 w-fit rounded-full bg-violet-300/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-violet-100">
                  {locale === "fr"
                    ? "Le plus choisi"
                    : locale === "es"
                      ? "El más elegido"
                      : "Most chosen"}
                </span>
              ) : null}
              <p className="text-xs font-medium text-white/45">
                {locale === "fr"
                  ? `Niveau 0${index + 1}`
                  : `Level 0${index + 1}`}
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
                {label}
              </h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-white/55">
                {tier.notes[way]}
              </p>
              <div className="mt-5 min-h-[4.2rem]">
                {shownPrice === null ? (
                  <span className="text-2xl font-semibold text-white">
                    {priceLabel}
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-semibold tracking-[-.04em] text-white">
                      ${shownPrice.toFixed(2)}
                    </span>
                    <span className="ml-1 text-xs text-white/45">
                      {text.perMonth}
                    </span>
                    {annual && shownPrice > 0 ? (
                      <span className="mt-1 block text-[11px] leading-4 text-emerald-200/80">
                        ${annualPrice?.toFixed(2) ?? "—"} € /{" "}
                        {locale === "fr"
                          ? "an"
                          : locale === "es"
                            ? "año"
                            : "year"}{" "}
                        · {text.annualCharge} · $
                        {((basePrice ?? 0) * 2).toFixed(2)} {text.annualSavings}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              {index === 1 ? (
                <div className="my-4 border-y border-white/10 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <label
                      className="text-xs font-medium text-white/80"
                      htmlFor="custom-power"
                    >
                      {text.custom}
                    </label>
                    <span className="text-xs font-semibold tabular-nums text-violet-100">
                      {customPower.toLocaleString(locale)} {resource[way][locale]}
                    </span>
                  </div>
                  <input
                    aria-label={text.custom}
                    className="mt-3 h-1.5 w-full cursor-pointer accent-violet-300"
                    id="custom-power"
                    max={powerPlanPolicy.pro.walletCap}
                    min={1000}
                    onChange={handleCustomPowerChange}
                    step={500}
                    type="range"
                    value={customPower}
                    disabled
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-white/40">
                    <span>1 000</span>
                    <span>{powerPlanPolicy.pro.walletCap.toLocaleString(locale)}</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-white/45">
                    {text.powerUnavailable}
                  </p>
                </div>
              ) : (
                <div className="my-4 flex min-h-[3.75rem] items-center border-y border-white/10 py-3 text-xs text-white/70">
                  {points ? (
                    <span className="font-semibold text-white">
                      {points.toLocaleString(locale)} {text.points}
                    </span>
                  ) : (
                    <span>{text.max}</span>
                  )}
                </div>
              )}
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[.12em] text-white/40">
                {index > 1 ? text.all : text.starts}
              </p>
              <ul className="mb-6 flex-1 space-y-2.5 text-xs leading-5 text-white/75">
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
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-3 text-center text-xs font-medium text-white/80 transition hover:bg-white/[0.07]"
                  href={href}
                >
                  {locale === "fr"
                    ? "Commencer gratuitement"
                    : locale === "es"
                      ? "Empezar gratis"
                      : "Start for free"}
                  <ArrowRight className="size-3.5" />
                </Link>
              ) : planIsAvailable && selectedPowerIsBillable ? (
                sessionStatus === "authenticated" &&
                session?.user?.type !== "guest" ? (
                  <button
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-center text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-center text-xs font-semibold transition",
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
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/10 px-3 text-center text-xs font-medium text-white/40"
                  disabled
                  title={
                    selectedPowerIsBillable
                      ? text.unavailable
                      : text.powerUnavailable
                  }
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
      <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5 text-white/35">
        {text.footer}
      </p>
    </section>
  );
}
