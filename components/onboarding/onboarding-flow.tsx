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
};

const steps = [
  { icon: UserRound, label: "Vous" },
  { icon: Lightbulb, label: "Objectif" },
  { icon: Compass, label: "Niveau" },
  { icon: Sparkles, label: "Découverte" },
  { icon: Rocket, label: "Voie" },
  { icon: Check, label: "Prêt" },
] as const;

const projectLabels: Record<(typeof idealyProjectTypes)[number], string> = {
  internal_tool: "Outil interne",
  mobile: "Application mobile",
  other: "Autre projet",
  prototype: "Prototype",
  saas: "Produit SaaS",
  site: "Site vitrine",
  startup: "Startup",
  web: "Application web",
};

const experienceLabels: Record<(typeof idealyExperienceLevels)[number], string> = {
  advanced: "Avancé(e)",
  beginner: "Débutant(e)",
  expert: "Expert(e)",
  intermediate: "Intermédiaire",
  non_coder: "Je ne code pas encore",
};

const discoveryLabels: Record<(typeof idealyDiscoverySources)[number], string> = {
  community: "Une communauté",
  friend: "Un proche",
  github: "GitHub",
  google: "Google",
  other: "Autre",
  school: "École ou formation",
  tiktok: "TikTok",
  youtube: "YouTube",
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
    preferredLanguage: "fr",
    primaryGoal: "",
    projectType: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    way: initialWay,
  });

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
    if (step === 0) return draft.firstName.trim().length > 0;
    if (step === 1) return draft.primaryGoal.trim().length > 0 && Boolean(draft.projectType);
    if (step === 2) return Boolean(draft.experienceLevel);
    if (step === 3 || step === 4) return true;
    return validatedInput().success;
  };

  const nextStep = () => {
    if (!canContinue()) {
      setError("Complétez les informations demandées avant de continuer.");
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const completeOnboarding = async () => {
    const parsed = validatedInput();
    if (!parsed.success) {
      setError("Vérifiez les informations de votre profil avant de continuer.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Write client-side cookies immediately for resilient instant access
    try {
      document.cookie = "idealy_onboarding_completed=true; path=/; max-age=31536000; SameSite=Lax";
      document.cookie = `idealy_user_way=${parsed.data.way}; path=/; max-age=31536000; SameSite=Lax`;
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

      // Smooth redirection into workspace
      window.location.assign(nextPath);
    } catch {
      // Even if network drops momentarily, user confirmed setup locally
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
      <div aria-hidden="true" className="welcome-orb welcome-orb-sky pointer-events-none opacity-40" />
      <div aria-hidden="true" className="welcome-orb welcome-orb-sunset pointer-events-none opacity-30" />
      <div aria-hidden="true" className="welcome-grid pointer-events-none opacity-50" />

      <div className="relative z-10 mx-auto w-full max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8 items-start">
          
          {/* Left Column: Brand, Intro, and Compact Step Navigator */}
          <aside className="flex flex-col justify-between space-y-5 lg:py-2">
            <div>
              <div className="flex items-center gap-2.5">
                <IdealyLogo animated size={34} className="[&_.idealy-logo__wordmark]:text-lg [&_.idealy-logo__wordmark]:font-semibold" />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Espace de création
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Une base claire avant votre première mission.
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Ces informations personnalisent votre voie et votre point de départ dans le studio.
              </p>
            </div>

            {/* Compact Stepper */}
            <nav aria-label="Progression de l'onboarding" className="mt-2">
              <ol className="grid grid-cols-6 gap-1.5 lg:grid-cols-1 lg:gap-1.5">
                {steps.map((item, index) => {
                  const Icon = item.icon;
                  const isCurrent = index === step;
                  const isComplete = index < step;
                  return (
                    <li key={item.label}>
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

            {/* Step 0: Name */}
            {step === 0 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Comment souhaitez-vous être appelé(e) ?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Ce nom sera utilisé dans vos échanges avec votre escouade.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium">
                    Prénom <span className="text-destructive">*</span>
                    <input
                      value={draft.firstName}
                      onChange={(event) => updateDraft("firstName", event.target.value)}
                      maxLength={80}
                      autoComplete="given-name"
                      className="h-10 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Votre prénom"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Nom <span className="font-normal text-muted-foreground">(optionnel)</span>
                    <input
                      value={draft.lastName}
                      onChange={(event) => updateDraft("lastName", event.target.value)}
                      maxLength={80}
                      autoComplete="family-name"
                      className="h-10 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Votre nom"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {/* Step 1: Goal & Project Type */}
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Qu’aimeriez-vous rendre possible ?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Une phrase suffit pour orienter l’analyse de vos agents.</p>
                </div>
                <div className="space-y-3">
                  <label className="grid gap-1.5 text-xs font-medium">
                    Votre intention ou projet
                    <textarea
                      value={draft.primaryGoal}
                      onChange={(event) => updateDraft("primaryGoal", event.target.value)}
                      maxLength={400}
                      rows={3}
                      className="resize-none rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Ex. Concevoir une application web pour gérer mes projets scolaires..."
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    Type de projet
                    <select
                      value={draft.projectType}
                      onChange={(event) => updateDraft("projectType", event.target.value)}
                      className="h-10 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Sélectionnez un type de création</option>
                      {idealyProjectTypes.map((value) => (
                        <option key={value} value={value}>
                          {projectLabels[value]}
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
                  <h2 className="text-xl font-semibold tracking-tight">Où en êtes-vous techniquement ?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Idealy adapte la profondeur de ses explications techniques.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {idealyExperienceLevels.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateDraft("experienceLevel", value)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-xs transition-all",
                        draft.experienceLevel === value
                          ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/25"
                          : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <span className="font-semibold">{experienceLabels[value]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 3: Discovery Source */}
            {step === 3 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Comment avez-vous connu Idealy ?</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Facultatif — aide notre équipe à savoir par où vous êtes venu.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {idealyDiscoverySources.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateDraft("discoverySource", draft.discoverySource === value ? "" : value)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left text-xs transition-all",
                        draft.discoverySource === value
                          ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/25"
                          : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <span className="font-medium">{discoveryLabels[value]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 4: Way Selection */}
            {step === 4 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Choisissez votre voie</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Chaque voie attribue une spécialité et un univers à votre escouade.</p>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {Object.values(wayPresentations).map((way) => (
                    <button
                      type="button"
                      key={way.id}
                      onClick={() => updateDraft("way", way.id)}
                      className={cn(
                        "group rounded-xl border p-3 text-left transition-all relative overflow-hidden",
                        draft.way === way.id
                          ? "border-primary/80 bg-primary/10 ring-2 ring-primary/25 shadow-sm"
                          : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <span className={cn("mb-2 block h-1 w-10 rounded-full bg-gradient-to-r", way.accentClassName)} />
                      <span className="block text-sm font-semibold text-foreground">{way.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {way.description}
                      </span>
                      <span className="mt-2.5 inline-flex items-center rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-foreground/80">
                        Ressource : {way.resourceLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Step 5: Summary & Confirmation */}
            {step === 5 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Votre espace est prêt !</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Récapitulatif de votre profil studio. Vous pourrez modifier ces préférences à tout moment.
                  </p>
                </div>
                <dl className="grid gap-2.5 rounded-xl border border-border/70 bg-background/50 p-3.5 text-xs sm:grid-cols-2">
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">Profil</dt>
                    <dd className="mt-0.5 font-semibold text-sm text-foreground">
                      {[draft.firstName, draft.lastName].filter(Boolean).join(" ") || "Créateur Idealy"}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">Voie choisie</dt>
                    <dd className="mt-0.5 font-semibold text-sm text-foreground">
                      {wayPresentations[draft.way].label}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">Objectif</dt>
                    <dd className="mt-0.5 font-medium text-foreground line-clamp-2">
                      {draft.primaryGoal || "Création numérique"}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                    <dt className="text-muted-foreground">Projet</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {draft.projectType ? projectLabels[draft.projectType as keyof typeof projectLabels] : "Application web"}
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
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Retour
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition hover:opacity-90 active:scale-[0.98]"
                >
                  Continuer
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={completeOnboarding}
                  disabled={isSubmitting}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-medium text-background transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  {isSubmitting ? "Ouverture du workspace…" : "Ouvrir mon workspace"}
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
