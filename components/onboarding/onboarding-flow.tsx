"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Lightbulb,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import { useTranslation } from "@/lib/i18n/provider";
import {
  idealyDiscoverySources,
  idealyExperienceLevels,
  idealyProjectTypes,
  onboardingInputSchema,
} from "@/lib/idealy/onboarding-contract";
import {
  isIdealyWay,
  wayPresentations,
  type IdealyWay,
} from "@/lib/idealy/product-contract";
import { cn } from "@/lib/utils";

type OnboardingDraft = {
  discoverySource: string;
  experienceLevel: string;
  firstName: string;
  lastName: string;
  preferredLanguage: string;
  primaryGoal: string;
  projectType: string;
  timezone: string;
  way: IdealyWay;
  tone: "concise" | "educational" | "bold";
};

const projectLabels: Record<(typeof idealyProjectTypes)[number], { fr: string; en: string; es: string }> = {
  internal_tool: { fr: "Outil interne", en: "Internal tool", es: "Herramienta interna" },
  mobile: { fr: "Application mobile", en: "Mobile app", es: "Aplicación móvil" },
  other: { fr: "Autre projet", en: "Other project", es: "Otro proyecto" },
  prototype: { fr: "Prototype", en: "Prototype", es: "Prototipo" },
  saas: { fr: "Produit SaaS", en: "SaaS Product", es: "Producto SaaS" },
  site: { fr: "Site vitrine", en: "Showcase website", es: "Sitio web" },
  startup: { fr: "Startup", en: "Startup", es: "Startup" },
  web: { fr: "Application web", en: "Web application", es: "Aplicación web" },
};

const experienceLabels: Record<(typeof idealyExperienceLevels)[number], { fr: string; en: string; es: string }> = {
  advanced: { fr: "Avancé(e)", en: "Advanced", es: "Avanzado" },
  beginner: { fr: "Débutant(e)", en: "Beginner", es: "Principiante" },
  expert: { fr: "Expert(e)", en: "Expert", es: "Experto" },
  intermediate: { fr: "Intermédiaire", en: "Intermediate", es: "Intermedio" },
  non_coder: { fr: "Je ne code pas encore", en: "No-code / Not coding yet", es: "No programo todavía" },
};

const discoveryLabels: Record<(typeof idealyDiscoverySources)[number], { fr: string; en: string; es: string }> = {
  community: { fr: "Une communauté", en: "A community", es: "Una comunidad" },
  friend: { fr: "Un proche", en: "A friend / colleague", es: "Un amigo" },
  github: { fr: "GitHub", en: "GitHub", es: "GitHub" },
  google: { fr: "Google", en: "Google", es: "Google" },
  other: { fr: "Autre", en: "Other", es: "Otro" },
  school: { fr: "École ou formation", en: "School / Training", es: "Escuela / Formación" },
  tiktok: { fr: "TikTok", en: "TikTok", es: "TikTok" },
  youtube: { fr: "YouTube", en: "YouTube", es: "YouTube" },
};

function getSafeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/onboarding")
    ? value
    : "/";
}

function getInitialWay(value: string | null): IdealyWay {
  return isIdealyWay(value) ? value : "professional";
}

export function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useTranslation();
  const langKey = (language === "en" ? "en" : language === "es" ? "es" : "fr") as "fr" | "en" | "es";

  const nextPath = useMemo(() => getSafeNext(searchParams.get("next")), [searchParams]);
  const initialWay = useMemo(() => getInitialWay(searchParams.get("way")), [searchParams]);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<OnboardingDraft>({
    discoverySource: "",
    experienceLevel: "",
    firstName: "",
    lastName: "",
    preferredLanguage: language || "fr",
    primaryGoal: "",
    projectType: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    way: initialWay,
    tone: "concise",
  });

  const steps = useMemo(
    () => [
      {
        icon: UserRound,
        key: "profile",
        label: t("onboarding.steps.profile") || "Profil & Voie",
      },
      {
        icon: Lightbulb,
        key: "goal",
        label: t("onboarding.steps.goal") || "Objectif",
      },
      {
        icon: Compass,
        key: "level",
        label: t("onboarding.steps.level") || "Expérience",
      },
      {
        icon: Sparkles,
        key: "discovery",
        label: t("onboarding.steps.discovery") || "Découverte",
      },
      {
        icon: Check,
        key: "ready",
        label: t("onboarding.steps.ready") || "Prêt",
      },
    ],
    [t]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const result = await fetch("/api/idealy/profile/onboarding", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (result.status === 401) {
          router.replace(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
          return;
        }
        if (!result.ok) throw new Error("status-unavailable");

        const status = (await result.json()) as { onboardingCompleted?: unknown };
        if (status.onboardingCompleted === true) {
          router.replace(nextPath);
          return;
        }
      } catch {
        // Non-blocking: continue with initial setup
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadStatus();
    return () => controller.abort();
  }, [nextPath, router]);

  const updateDraft = <K extends keyof OnboardingDraft>(
    field: K,
    value: OnboardingDraft[K]
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const validatedInput = () =>
    onboardingInputSchema.safeParse({
      ...draft,
      discoverySource: draft.discoverySource || undefined,
    });

  const canContinue = () => {
    if (step === 0) return draft.firstName.trim().length > 0 && Boolean(draft.way);
    if (step === 1) return draft.primaryGoal.trim().length > 0 && Boolean(draft.projectType);
    if (step === 2) return Boolean(draft.experienceLevel);
    if (step === 3) return true;
    return validatedInput().success;
  };

  const nextStep = () => {
    if (!canContinue()) {
      setError(
        langKey === "en"
          ? "Please complete the required information before continuing."
          : langKey === "es"
          ? "Por favor, complete la información requerida antes de continuar."
          : "Complétez les informations demandées avant de continuer."
      );
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const completeOnboarding = async () => {
    const parsed = validatedInput();
    if (!parsed.success) {
      setError(
        langKey === "en"
          ? "Please review your profile details before continuing."
          : langKey === "es"
          ? "Revise los detalles de su perfil antes de continuar."
          : "Vérifiez les informations de votre profil avant de continuer."
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Persist user way, tone, name, and language in client cookies immediately
    try {
      document.cookie = "idealy_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax";
      document.cookie = `idealy_user_way=${parsed.data.way}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `idealy_user_tone=${draft.tone || "concise"}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `idealy_user_name=${encodeURIComponent(parsed.data.firstName)}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `idealy_lang=${parsed.data.preferredLanguage}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `NEXT_LOCALE=${parsed.data.preferredLanguage}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Non-blocking
    }

    try {
      const result = await fetch("/api/idealy/profile/onboarding", {
        body: JSON.stringify(parsed.data),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!result.ok) {
        const body = (await result.json().catch(() => null)) as { error?: unknown } | null;
        console.warn("Onboarding API returned non-200, proceeding with client confirmation:", body?.error);
      }

      window.location.assign(nextPath);
    } catch {
      window.location.assign(nextPath);
    }
  };

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  if (isLoading) {
    return <main className="min-h-dvh bg-background" aria-busy="true" />;
  }

  return (
    <main className="idealy-app-background relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden p-4 sm:p-6 lg:p-10 text-foreground">
      {/* Ambient background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 size-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-4xl space-y-6">
        {/* Main Brand Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IdealyLogo animated compact size={32} />
            <div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {t("onboarding.badge") || "Espace de création"}
              </span>
              <p className="text-sm font-semibold text-foreground">Studio Idealy</p>
            </div>
          </div>
        </header>

        {/* Card Frame */}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Left Column: Context & Steps Overview */}
          <aside className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl">
            <div className="space-y-3">
              <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                {langKey === "en" ? "Initial Setup" : langKey === "es" ? "Configuración Inicial" : "Configuration Initiale"}
              </span>
              <h1 className="text-base font-semibold leading-snug tracking-tight text-foreground">
                {t("onboarding.title") || "Une base claire avant votre première mission."}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("onboarding.subtitle") || "Ces informations personnalisent votre voie et votre point de départ dans le studio."}
              </p>
            </div>

            {/* Compact Stepper */}
            <nav aria-label="Progression de l'onboarding" className="mt-4">
              <ol className="grid grid-cols-5 gap-1.5 lg:grid-cols-1 lg:gap-1.5">
                {steps.map((item, index) => {
                  const Icon = item.icon;
                  const isCurrent = index === step;
                  const isComplete = index < step;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => index < step && setStep(index)}
                        disabled={index > step}
                        aria-current={isCurrent ? "step" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all",
                          isCurrent
                            ? "bg-primary/10 font-medium text-foreground ring-1 ring-primary/20"
                            : isComplete
                              ? "text-foreground/80 hover:bg-muted/50 cursor-pointer"
                              : "cursor-default text-muted-foreground/50 opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-all",
                            isCurrent
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isComplete
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isComplete ? (
                            <Check className="size-3" aria-hidden="true" />
                          ) : (
                            <Icon className="size-3" aria-hidden="true" />
                          )}
                        </span>
                        <span className="hidden lg:inline">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          {/* Right Column: Step Form Card */}
          <section className="relative rounded-2xl border border-border/60 bg-card/85 p-5 shadow-[var(--shadow-float)] backdrop-blur-xl sm:p-7">
            {/* Top Step Counter & Progress Bar */}
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-border/40 pb-4">
              <div className="flex items-center gap-2">
                <StepIcon className="size-4 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium text-muted-foreground">
                  Étape {step + 1} sur {steps.length} —{" "}
                  <strong className="text-foreground font-semibold">{currentStep.label}</strong>
                </span>
              </div>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-amber-500 transition-all duration-300"
                  style={{
                    width: `${((step + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Step 0: Name, Voie & Communication Tone */}
            {step === 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {t("onboarding.step0.title") || "Personnalisez votre identité et votre Voie"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("onboarding.step0.subtitle") || "Choisissez votre nom affiché et la Voie qui accompagnera vos créations."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium">
                    {t("onboarding.step0.displayName") || "Prénom ou pseudo"} <span className="text-destructive">*</span>
                    <input
                      value={draft.firstName}
                      onChange={(event) => updateDraft("firstName", event.target.value)}
                      maxLength={80}
                      autoComplete="given-name"
                      className="h-10 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={t("onboarding.step0.displayNamePlaceholder") || "Ex: Alex, Neo, KageDev"}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Last name" : langKey === "es" ? "Apellido" : "Nom"} <span className="font-normal text-muted-foreground">({langKey === "en" ? "optional" : langKey === "es" ? "opcional" : "optionnel"})</span>
                    <input
                      value={draft.lastName}
                      onChange={(event) => updateDraft("lastName", event.target.value)}
                      maxLength={80}
                      autoComplete="family-name"
                      className="h-10 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={langKey === "en" ? "Your last name" : langKey === "es" ? "Tu apellido" : "Votre nom"}
                    />
                  </label>
                </div>

                {/* Voie Selection */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">
                    {t("onboarding.step0.chooseVoie") || "Sélectionnez votre Voie maîtresse :"}
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {Object.values(wayPresentations).map((way) => (
                      <button
                        type="button"
                        key={way.id}
                        onClick={() => updateDraft("way", way.id)}
                        className={cn(
                          "group rounded-xl border p-3 text-left transition-all relative overflow-hidden cursor-pointer",
                          draft.way === way.id
                            ? "border-primary/80 bg-primary/10 ring-2 ring-primary/25 shadow-sm"
                            : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <span className={cn("mb-1.5 block h-1 w-8 rounded-full bg-gradient-to-r", way.accentClassName)} />
                        <span className="block text-xs font-bold text-foreground">{way.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                          {way.description}
                        </span>
                        <span className="mt-2 inline-flex items-center rounded-full bg-muted/70 px-2 py-0.5 text-[9px] font-medium text-foreground/80">
                          {langKey === "en" ? "Resource: " : langKey === "es" ? "Recurso: " : "Ressource : "}
                          {way.resourceLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">
                    {t("onboarding.step0.chooseTone") || "Style de communication souhaité :"}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: "concise" as const, label: t("onboarding.step0.tones.concise") || "Concise & directe" },
                      { id: "educational" as const, label: t("onboarding.step0.tones.educational") || "Pédagogue & analytique" },
                      { id: "bold" as const, label: t("onboarding.step0.tones.bold") || "Audacieuse & rapide" },
                    ].map((toneItem) => (
                      <button
                        type="button"
                        key={toneItem.id}
                        onClick={() => updateDraft("tone", toneItem.id)}
                        className={cn(
                          "rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer",
                          draft.tone === toneItem.id
                            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/25 font-semibold"
                            : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <span>{toneItem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 1: Goal & Project Type */}
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {langKey === "en" ? "What would you like to build?" : langKey === "es" ? "¿Qué te gustaría hacer realidad?" : "Qu’aimeriez-vous rendre possible ?"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {langKey === "en" ? "A short phrase helps your agents orient their analysis." : langKey === "es" ? "Una frase orienta el análisis de tus agentes." : "Une phrase suffit pour orienter l’analyse de vos agents."}
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Your goal or project vision" : langKey === "es" ? "Tu intención o proyecto" : "Votre intention ou projet"}
                    <textarea
                      value={draft.primaryGoal}
                      onChange={(event) => updateDraft("primaryGoal", event.target.value)}
                      maxLength={400}
                      rows={3}
                      className="resize-none rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={langKey === "en" ? "E.g. Build a modern web application for school projects..." : langKey === "es" ? "Ej. Crear una aplicación web para gestionar proyectos escolares..." : "Ex. Concevoir une application web pour gérer mes projets scolaires..."}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Project type" : langKey === "es" ? "Tipo de proyecto" : "Type de projet"}
                    <select
                      value={draft.projectType}
                      onChange={(event) => updateDraft("projectType", event.target.value)}
                      className="h-10 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="">{langKey === "en" ? "Select a creation type" : langKey === "es" ? "Seleccione un tipo de creación" : "Sélectionnez un type de création"}</option>
                      {idealyProjectTypes.map((value) => (
                        <option key={value} value={value}>
                          {projectLabels[value][langKey] || projectLabels[value].fr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {/* Step 2: Experience Level */}
            {step === 2 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {langKey === "en" ? "What is your technical background?" : langKey === "es" ? "¿Cuál es tu nivel técnico?" : "Où en êtes-vous techniquement ?"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {langKey === "en" ? "Idealy adapts the depth of its technical explanations." : langKey === "es" ? "Idealy adapta la profundidad de sus explicaciones." : "Idealy adapte la profondeur de ses explications techniques."}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {idealyExperienceLevels.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateDraft("experienceLevel", value)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-xs transition-all cursor-pointer",
                        draft.experienceLevel === value
                          ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/25"
                          : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <span className="font-semibold">{experienceLabels[value][langKey] || experienceLabels[value].fr}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 3: Discovery Source */}
            {step === 3 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {langKey === "en" ? "How did you hear about Idealy?" : langKey === "es" ? "¿Cómo conociste Idealy?" : "Comment avez-vous connu Idealy ?"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {langKey === "en" ? "Optional — helps our squad know how you arrived." : langKey === "es" ? "Opcional — ayuda a nuestro equipo a saber de dónde vienes." : "Facultatif — aide notre équipe à savoir par où vous êtes venu."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {idealyDiscoverySources.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateDraft("discoverySource", draft.discoverySource === value ? "" : value)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer",
                        draft.discoverySource === value
                          ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/25"
                          : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <span className="font-medium">{discoveryLabels[value][langKey] || discoveryLabels[value].fr}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 4: Summary & Ready */}
            {step === 4 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {langKey === "en" ? "Your workspace is ready!" : langKey === "es" ? "¡Tu espacio está listo!" : "Votre espace est prêt !"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {langKey === "en" ? "Summary of your studio profile. You can tweak preferences anytime." : langKey === "es" ? "Resumen de tu perfil de estudio. Puedes modificar estas preferencias en cualquier momento." : "Récapitulatif de votre profil studio. Vous pourrez modifier ces préférences à tout moment."}
                  </p>
                </div>
                <dl className="grid gap-2.5 rounded-xl border border-border/70 bg-background/50 p-3.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">{langKey === "en" ? "Profile" : langKey === "es" ? "Perfil" : "Profil"}</dt>
                    <dd className="mt-0.5 font-semibold text-sm text-foreground">
                      {[draft.firstName, draft.lastName].filter(Boolean).join(" ") || "Créateur Idealy"}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">{langKey === "en" ? "Master Way" : langKey === "es" ? "Vía Maestra" : "Voie choisie"}</dt>
                    <dd className="mt-0.5 font-semibold text-sm text-foreground">
                      {wayPresentations[draft.way].label} ({wayPresentations[draft.way].resourceLabel})
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">{langKey === "en" ? "Tone" : langKey === "es" ? "Tono" : "Tonalité"}</dt>
                    <dd className="mt-0.5 font-medium text-foreground capitalize">
                      {draft.tone === "concise" ? (langKey === "en" ? "Concise & direct" : langKey === "es" ? "Concisa y directa" : "Concise & directe") : draft.tone === "educational" ? (langKey === "en" ? "Educational & analytical" : langKey === "es" ? "Pedagógica y analítica" : "Pédagogue & analytique") : (langKey === "en" ? "Bold & fast" : langKey === "es" ? "Audaz y rápida" : "Audacieuse & rapide")}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">{langKey === "en" ? "Project type" : langKey === "es" ? "Tipo de proyecto" : "Projet"}</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {draft.projectType ? (projectLabels[draft.projectType as keyof typeof projectLabels]?.[langKey] || draft.projectType) : "Application web"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {/* Error Message */}
            {error ? (
              <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {/* Footer Navigation Buttons */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0 || isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {langKey === "en" ? "Back" : langKey === "es" ? "Volver" : "Retour"}
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition hover:opacity-90 active:scale-[0.98] cursor-pointer"
                >
                  {langKey === "en" ? "Continue" : langKey === "es" ? "Continuar" : "Continuer"}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={completeOnboarding}
                  disabled={isSubmitting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting
                    ? (langKey === "en" ? "Opening workspace…" : langKey === "es" ? "Abriendo workspace…" : "Ouverture du workspace…")
                    : (langKey === "en" ? "Open my workspace" : langKey === "es" ? "Abrir mi workspace" : "Ouvrir mon workspace")}
                  <Rocket className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
