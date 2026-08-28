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
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError("Votre profil ne peut pas être chargé pour le moment. Réessayez dans un instant.");
        }
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
    try {
      const result = await fetch("/api/idealy/profile/onboarding", {
        body: JSON.stringify(parsed.data),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!result.ok) {
        const body = (await result.json().catch(() => null)) as { error?: unknown } | null;
        throw new Error(typeof body?.error === "string" ? body.error : "Impossible de finaliser le profil.");
      }
      router.replace(nextPath);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Impossible de finaliser le profil."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  if (isLoading) {
    return <main className="min-h-dvh bg-background" aria-busy="true" />;
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-5 text-foreground sm:px-6 lg:grid lg:grid-cols-[minmax(260px,0.7fr)_minmax(560px,1fr)] lg:gap-10 lg:px-10 lg:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-8 size-64 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute -right-16 bottom-0 size-80 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-orange-400/10" />
        <div className="absolute left-1/2 top-1/4 size-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto flex w-full max-w-xl flex-col justify-between py-3 lg:mx-0 lg:max-w-sm lg:py-8">
        <div>
          <div className="mb-9 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-foreground text-background shadow-[0_10px_35px_-14px_hsl(var(--foreground)/0.55)]">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-[-0.03em]">Idealy</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Votre espace de création</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Une base claire avant votre première mission.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Ces informations personnalisent votre voie et votre point de départ. Elles ne changent ni votre offre, ni votre solde, ni vos moyens de paiement.
          </p>
        </div>

        <ol className="mt-9 grid grid-cols-6 gap-1.5 lg:mt-16 lg:grid-cols-1 lg:gap-2" aria-label="Étapes d’onboarding">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs transition ${isCurrent ? "bg-foreground/7 text-foreground dark:bg-white/10" : isComplete ? "text-foreground/75 hover:bg-foreground/5" : "cursor-default text-muted-foreground/65"}`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${isCurrent ? "bg-foreground text-background" : isComplete ? "bg-emerald-500 text-white" : "bg-foreground/8 text-muted-foreground"}`}>
                    {isComplete ? <Check className="size-3.5" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}
                  </span>
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="relative z-10 mx-auto mt-8 w-full max-w-2xl rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-[0_25px_80px_-38px_hsl(var(--foreground)/0.45)] backdrop-blur-xl sm:p-8 lg:mt-0 lg:self-center">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Étape {step + 1} sur {steps.length}</p>
            <div className="mt-2 flex items-center gap-2">
              <StepIcon className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold tracking-[-0.03em]">{currentStep.label}</h2>
            </div>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-500 to-orange-500 transition-transform duration-300" style={{ transform: `scaleX(${(step + 1) / steps.length})`, transformOrigin: "left" }} />
          </div>
        </div>

        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.04em]">Comment souhaitez-vous être appelé(e) ?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Ce nom sera uniquement utilisé dans votre espace Idealy.</p>
            </div>
            <label className="grid gap-2 text-sm font-medium">Prénom
              <input value={draft.firstName} onChange={(event) => updateDraft("firstName", event.target.value)} maxLength={80} autoComplete="given-name" className="h-11 rounded-xl border border-border bg-background/70 px-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Votre prénom" />
            </label>
            <label className="grid gap-2 text-sm font-medium">Nom <span className="font-normal text-muted-foreground">(optionnel)</span>
              <input value={draft.lastName} onChange={(event) => updateDraft("lastName", event.target.value)} maxLength={80} autoComplete="family-name" className="h-11 rounded-xl border border-border bg-background/70 px-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Votre nom" />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div><h3 className="text-2xl font-semibold tracking-[-0.04em]">Qu’aimeriez-vous rendre possible ?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Une phrase suffit. Elle devient le contexte initial de vos missions.</p></div>
            <label className="grid gap-2 text-sm font-medium">Votre objectif principal
              <textarea value={draft.primaryGoal} onChange={(event) => updateDraft("primaryGoal", event.target.value)} maxLength={400} rows={4} className="resize-none rounded-xl border border-border bg-background/70 px-3 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Ex. lancer une première version d’un outil utile à ma communauté" />
            </label>
            <label className="grid gap-2 text-sm font-medium">Type de projet
              <select value={draft.projectType} onChange={(event) => updateDraft("projectType", event.target.value)} className="h-11 rounded-xl border border-border bg-background/70 px-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"><option value="">Choisir un type</option>{idealyProjectTypes.map((value) => <option key={value} value={value}>{projectLabels[value]}</option>)}</select>
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5"><div><h3 className="text-2xl font-semibold tracking-[-0.04em]">Où en êtes-vous aujourd’hui ?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Idealy adapte la façon de présenter ses premières étapes, pas vos droits.</p></div><div className="grid gap-2 sm:grid-cols-2">{idealyExperienceLevels.map((value) => <button type="button" key={value} onClick={() => updateDraft("experienceLevel", value)} className={`rounded-xl border p-4 text-left text-sm transition ${draft.experienceLevel === value ? "border-primary bg-primary/10 text-foreground ring-4 ring-primary/10" : "border-border bg-background/40 hover:border-primary/50"}`}><span className="font-medium">{experienceLabels[value]}</span></button>)}</div></div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5"><div><h3 className="text-2xl font-semibold tracking-[-0.04em]">Comment avez-vous connu Idealy ?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Cette réponse est facultative et sert seulement à comprendre les canaux qui font connaître le produit.</p></div><div className="grid gap-2 sm:grid-cols-2">{idealyDiscoverySources.map((value) => <button type="button" key={value} onClick={() => updateDraft("discoverySource", draft.discoverySource === value ? "" : value)} className={`rounded-xl border p-4 text-left text-sm transition ${draft.discoverySource === value ? "border-primary bg-primary/10 text-foreground ring-4 ring-primary/10" : "border-border bg-background/40 hover:border-primary/50"}`}><span className="font-medium">{discoveryLabels[value]}</span></button>)}</div></div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5"><div><h3 className="text-2xl font-semibold tracking-[-0.04em]">Choisissez votre voie</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">La voie définit le vocabulaire et la tonalité de votre expérience. Elle reste distincte de votre plan.</p></div><div className="grid gap-3 sm:grid-cols-2">{Object.values(wayPresentations).map((way) => <button type="button" key={way.id} onClick={() => updateDraft("way", way.id)} className={`group rounded-2xl border p-4 text-left transition ${draft.way === way.id ? "border-transparent bg-foreground text-background shadow-lg" : "border-border bg-background/40 hover:border-primary/50"}`}><span className={`mb-3 block h-1.5 w-14 rounded-full bg-gradient-to-r ${way.accentClassName}`} /><span className="block font-semibold">{way.label}</span><span className={`mt-1 block text-sm leading-5 ${draft.way === way.id ? "text-background/70" : "text-muted-foreground"}`}>{way.description}</span><span className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-medium ${draft.way === way.id ? "bg-white/10 text-white" : "bg-muted text-muted-foreground"}`}>Ressource : {way.resourceLabel}</span></button>)}</div></div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-5"><div><h3 className="text-2xl font-semibold tracking-[-0.04em]">Votre espace est prêt.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Vous pourrez affiner ces informations dans votre profil ultérieurement, avec des règles dédiées aux données sensibles.</p></div><dl className="grid gap-3 rounded-2xl border border-border bg-background/55 p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Profil</dt><dd className="mt-1 font-medium">{[draft.firstName, draft.lastName].filter(Boolean).join(" ")}</dd></div><div><dt className="text-muted-foreground">Voie</dt><dd className="mt-1 font-medium">{wayPresentations[draft.way].label}</dd></div><div><dt className="text-muted-foreground">Objectif</dt><dd className="mt-1 font-medium">{draft.primaryGoal}</dd></div><div><dt className="text-muted-foreground">Projet</dt><dd className="mt-1 font-medium">{draft.projectType ? projectLabels[draft.projectType as keyof typeof projectLabels] : "À préciser"}</dd></div></dl></div>
        ) : null}

        {error ? <p role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"><ArrowLeft className="size-4" aria-hidden="true" />Retour</button>
          {step < steps.length - 1 ? <button type="button" onClick={nextStep} className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98]">Continuer<ArrowRight className="size-4" aria-hidden="true" /></button> : <button type="button" onClick={completeOnboarding} disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60">{isSubmitting ? "Création de votre espace…" : "Ouvrir mon workspace"}<Rocket className="size-4" aria-hidden="true" /></button>}
        </div>
      </section>
    </main>
  );
}
