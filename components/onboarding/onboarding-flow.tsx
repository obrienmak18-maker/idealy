"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Lightbulb,
  Mail,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  friend: { fr: "Un proche / collègue", en: "A friend / colleague", es: "Un amigo" },
  github: { fr: "GitHub", en: "GitHub", es: "GitHub" },
  google: { fr: "Google", en: "Google", es: "Google" },
  other: { fr: "Autre canal", en: "Other", es: "Otro" },
  school: { fr: "École ou formation", en: "School / Training", es: "Escuela / Formación" },
  tiktok: { fr: "TikTok", en: "TikTok", es: "TikTok" },
  youtube: { fr: "YouTube", en: "YouTube", es: "YouTube" },
};

// Keep the palette consistent between steps to reduce visual flicker.

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

  const goalOptions = useMemo(() => {
    if (langKey === "en") return [
      { value: "Launch a web app", label: "Launch a web app" },
      { value: "Build a SaaS product", label: "Build a SaaS product" },
      { value: "Create a mobile app", label: "Create a mobile app" },
      { value: "Automate a task", label: "Automate a task" },
    ];
    if (langKey === "es") return [
      { value: "Lanzar una aplicación web", label: "Lanzar una aplicación web" },
      { value: "Crear un producto SaaS", label: "Crear un producto SaaS" },
      { value: "Crear una aplicación móvil", label: "Crear una aplicación móvil" },
      { value: "Automatizar una tarea", label: "Automatizar una tarea" },
    ];
    return [
      { value: "Lancer une application web", label: "Lancer une application web" },
      { value: "Créer un produit SaaS", label: "Créer un produit SaaS" },
      { value: "Créer une application mobile", label: "Créer une application mobile" },
      { value: "Automatiser une tâche", label: "Automatiser une tâche" },
    ];
  }, [langKey]);
  const initialWay = useMemo(() => getInitialWay(searchParams.get("way")), [searchParams]);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // Animation states for the star logo transition onto ocean water
  const [customGoalSelected, setCustomGoalSelected] = useState(false);

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
  });

  // Exactly 4 structured, essential steps as requested by user
  const steps = useMemo(
    () => [
      {
        icon: UserRound,
        key: "profile",
        label: langKey === "en" ? "Your profile" : langKey === "es" ? "Tu perfil" : "Votre profil",
        badge: langKey === "en" ? "You" : langKey === "es" ? "Tú" : "Vous",
      },
      {
        icon: Lightbulb,
        key: "goal",
        label: t("onboarding.steps.goal") || "Vision & Projet",
        badge: langKey === "en" ? "Vision" : "Intention",
      },
      {
        icon: Compass,
        key: "level",
        label: langKey === "en" ? "Level & Way" : langKey === "es" ? "Nivel y vía" : "Niveau & voie",
        badge: langKey === "en" ? "Level" : langKey === "es" ? "Nivel" : "Niveau",
      },
      {
        icon: Sparkles,
        key: "discovery",
        label: t("onboarding.steps.discovery") || "Découverte & Lancement",
        badge: langKey === "en" ? "Ready" : "Prêt",
      },
    ],
    [t, langKey]
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
          // Do not kick the user in a bounce loop. Allow them to proceed with the form.
          setIsLoading(false);
          return;
        }
        if (!result.ok) throw new Error("status-unavailable");

        const status = (await result.json()) as {
          accountEmail?: unknown; accountName?: unknown; firstName?: unknown; lastName?: unknown;
          onboardingCompleted?: unknown; experienceLevel?: unknown; primaryGoal?: unknown; projectType?: unknown; way?: unknown;
        };
        if (status.onboardingCompleted === true) {
          router.replace(nextPath);
          return;
        }
        const email = typeof status.accountEmail === "string" && status.accountEmail.trim() ? status.accountEmail.trim() : null;
        setAccountEmail(email);
        setCustomGoalSelected(typeof status.primaryGoal === "string" && status.primaryGoal.trim().length > 0);
        const accountName = typeof status.accountName === "string" && status.accountName.trim()
          ? status.accountName.trim() : email?.split("@")[0] || "";
        const nameParts = accountName.split(/\s+/).filter(Boolean);
        setDraft((current) => ({
          ...current,
          firstName: typeof status.firstName === "string" && status.firstName.trim() ? status.firstName : current.firstName || nameParts[0] || "",
          lastName: typeof status.lastName === "string" && status.lastName.trim() ? status.lastName : current.lastName || nameParts.slice(1).join(" "),
          experienceLevel: typeof status.experienceLevel === "string" && idealyExperienceLevels.includes(status.experienceLevel as (typeof idealyExperienceLevels)[number]) ? status.experienceLevel : current.experienceLevel,
          primaryGoal: typeof status.primaryGoal === "string" ? status.primaryGoal : current.primaryGoal,
          projectType: typeof status.projectType === "string" && idealyProjectTypes.includes(status.projectType as (typeof idealyProjectTypes)[number]) ? status.projectType : current.projectType,
          way: isIdealyWay(status.way) ? status.way : current.way,
        }));
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
    if (step === 2) return Boolean(draft.experienceLevel) && Boolean(draft.way);
    if (step === 3) return validatedInput().success;
    return true;
  };

  const nextStep = () => {
    if (!canContinue()) {
      setError(
        langKey === "en"
          ? "Please fill in the required field before continuing."
          : langKey === "es"
          ? "Por favor completa la información antes de continuar."
          : "Complétez les champs requis avant de continuer."
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
          ? "Please review your details before launching."
          : langKey === "es"
          ? "Revisa la información antes de iniciar."
          : "Vérifiez vos informations avant de lancer le studio."
      );
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
        throw new Error(typeof body?.error === "string" ? body.error : "onboarding-failed");
      }

      window.location.assign(nextPath);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message !== "onboarding-failed"
          ? submissionError.message
          : langKey === "en"
            ? "Your onboarding could not be saved. Please try again."
            : langKey === "es"
              ? "No se pudo guardar la configuración. Inténtalo de nuevo."
              : "Votre configuration n’a pas pu être enregistrée. Réessayez."
      );
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  if (isLoading) {
    return <main className="min-h-dvh bg-background" aria-busy="true" />;
  }

  return (
    <main className="idealy-app-background relative flex min-h-dvh w-full flex-col items-center justify-between overflow-x-hidden p-4 sm:p-6 lg:p-8 text-foreground selection:bg-teal-500/20">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_58%)]"
        aria-hidden="true"
      >
        <div className="welcome-grid opacity-20" />
      </div>

      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between gap-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <IdealyLogo compact size={32} />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t("onboarding.badge") || "Studio Idealy"}
            </span>
            <p className="text-xs font-semibold text-foreground">
              {langKey === "en" ? "Workspace setup" : langKey === "es" ? "Configuración del espacio" : "Configuration de l’espace"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-2 text-xs">
          <StepIcon className="size-3.5 text-primary" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">
            {langKey === "en" ? "Step" : langKey === "es" ? "Paso" : "Étape"} {step + 1} / {steps.length} —{" "}
            <strong className="font-semibold text-foreground">{currentStep.label}</strong>
          </span>
        </div>
      </header>

      {/* Main Glassmorphic Question Frame */}
      <div className="w-full max-w-3xl my-auto py-4 z-10">
        <section className="relative rounded-3xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-card/75 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8 transition-colors">
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <span className="inline-block rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                    Question 2 / 4
                  </span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {langKey === "en" ? "What would you like to build?" : "Qu’aimeriez-vous rendre possible ?"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {langKey === "en"
                      ? "A short phrase helps your agents orient their analysis."
                      : "Une phrase suffit pour orienter l’analyse de vos 5 agents d’escouade."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium">
                      {langKey === "en" ? "What do you want to do first?" : langKey === "es" ? "¿Qué quieres hacer primero?" : "Que voulez-vous faire en premier ?"}
                      <span className="ml-1 text-destructive">*</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {goalOptions.map((goal) => (
                        <button
                          key={goal.value}
                          type="button"
                          aria-pressed={!customGoalSelected && draft.primaryGoal === goal.value}
                          onClick={() => {
                            setCustomGoalSelected(false);
                            updateDraft("primaryGoal", goal.value);
                          }}
                          className={cn(
                            "flex min-h-10 items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition-colors",
                            !customGoalSelected && draft.primaryGoal === goal.value
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          <span>{goal.label}</span>
                          {!customGoalSelected && draft.primaryGoal === goal.value ? <Check className="size-3.5 text-primary" /> : null}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-pressed={customGoalSelected}
                        onClick={() => {
                          setCustomGoalSelected(true);
                          updateDraft("primaryGoal", "");
                        }}
                        className={cn(
                          "flex min-h-10 items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition-colors",
                          customGoalSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        <span>{langKey === "en" ? "Other — I’ll describe it" : langKey === "es" ? "Otro — lo describiré" : "Autre — je le décrirai"}</span>
                        {customGoalSelected ? <Check className="size-3.5 text-primary" /> : null}
                      </button>
                    </div>
                    {customGoalSelected ? (
                      <label className="grid gap-1.5 text-xs font-medium">
                        {langKey === "en" ? "Describe it in a few words" : langKey === "es" ? "Descríbelo en pocas palabras" : "Décrivez-le en quelques mots"}
                        <textarea
                          value={draft.primaryGoal}
                          onChange={(event) => updateDraft("primaryGoal", event.target.value)}
                          maxLength={400}
                          rows={2}
                          autoFocus
                          className="resize-none rounded-xl border border-border/70 bg-background/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                          placeholder={langKey === "en" ? "A short description is enough…" : langKey === "es" ? "Una breve descripción es suficiente…" : "Une courte description suffit…"}
                        />
                      </label>
                    ) : null}
                  </div>

                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Project type" : langKey === "es" ? "Tipo de proyecto" : "Type de projet"} <span className="text-destructive">*</span>
                    <select
                      value={draft.projectType}
                      onChange={(event) => updateDraft("projectType", event.target.value)}
                      className="h-11 rounded-xl border border-border/70 bg-background/60 px-3.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                    >
                      <option value="">
                        {langKey === "en" ? "Choose a project type" : langKey === "es" ? "Elige un tipo de proyecto" : "Sélectionnez un type de création"}
                      </option>
                      {idealyProjectTypes.map((value) => (
                        <option key={value} value={value}>
                          {projectLabels[value][langKey] || projectLabels[value].fr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="space-y-5">
                <div>
                  <span className="inline-block rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">Question 3 / 4</span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{langKey === "en" ? "How do you like to work?" : langKey === "es" ? "¿Cómo te gusta trabajar?" : "Comment aimez-vous travailler ?"}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{langKey === "en" ? "This helps Idealy adapt its guidance and workflow to you." : langKey === "es" ? "Idealy adapta su guía y su flujo de trabajo a ti." : "Idealy adapte ses explications et sa manière de travailler à votre niveau."}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {idealyExperienceLevels.map((value) => (
                    <button type="button" key={value} onClick={() => updateDraft("experienceLevel", value)} className={cn("group flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all cursor-pointer", draft.experienceLevel === value ? "border-cyan-500 bg-cyan-500/10 text-foreground ring-1 ring-cyan-500/30" : "border-border/60 bg-background/40 hover:border-cyan-500/40 hover:bg-muted/30")}>
                      <span className="min-w-0">
                        <span className="block font-semibold text-xs text-foreground">{experienceLabels[value][langKey] || experienceLabels[value].fr}</span>
                        <span className="block text-[10px] text-muted-foreground">{value === "non_coder" ? (langKey === "en" ? "Visual guidance from the start" : "Guidage visuel complet") : value === "beginner" ? (langKey === "en" ? "Step-by-step explanations" : "Explications pas-à-pas") : value === "intermediate" ? (langKey === "en" ? "A balance of detail and speed" : "Équilibre et efficacité") : (langKey === "en" ? "Direct code and architecture" : "Code direct & architectures")}</span>
                      </span>
                      {draft.experienceLevel === value && <Check className="ml-2 size-3.5 shrink-0 text-cyan-500" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-border/40 pt-4">
                  <div className="mb-2 text-xs font-semibold text-foreground">{langKey === "en" ? "Choose your Way" : langKey === "es" ? "Elige tu vía" : "Choisissez votre Voie"}</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(wayPresentations).map((way) => (
                      <button type="button" key={way.id} aria-pressed={draft.way === way.id} onClick={() => updateDraft("way", way.id)} className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors", draft.way === way.id ? "border-primary/70 bg-primary/10 text-foreground" : "border-border/60 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                        <span className={cn("size-2 rounded-full bg-gradient-to-br", way.accentClassName)} aria-hidden="true" />
                        <span>{way.label}</span>
                        {draft.way === way.id && <Check className="size-3 text-primary" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{wayPresentations[draft.way].description}</p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <span className="inline-block rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                    {langKey === "en" ? "Question 4 / 4 — Ready for your workspace" : langKey === "es" ? "Pregunta 4 / 4 — Listo para tu espacio" : "Question 4 / 4 — Prêt pour le studio"}
                  </span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {langKey === "en" ? "How did you hear about Idealy?" : langKey === "es" ? "¿Cómo conociste Idealy?" : "Comment avez-vous connu Idealy ?"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {langKey === "en"
                      ? "Optional canal — helps our team understand your arrival."
                      : "Facultatif — aide notre équipe à savoir par quel canal vous êtes arrivé."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {idealyDiscoverySources.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateDraft("discoverySource", draft.discoverySource === value ? "" : value)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border h-10 px-2 text-center text-xs transition-all cursor-pointer",
                        draft.discoverySource === value
                          ? "border-violet-500 bg-violet-500/10 text-foreground ring-1 ring-violet-500/30 font-semibold"
                          : "border-border/60 bg-background/40 hover:border-violet-500/40 hover:bg-muted/30"
                      )}
                    >
                      {draft.discoverySource === value && <Check className="size-3 text-violet-400" />}
                      <span className="truncate">{discoveryLabels[value][langKey] || discoveryLabels[value].fr}</span>
                    </button>
                  ))}
                </div>

                {/* Profile Summary Card */}
                <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {langKey === "en" ? "Your workspace setup" : langKey === "es" ? "Configuración de tu espacio" : "Configuration de votre espace"}
                  </h3>
                  <dl className="grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                      <dt className="text-muted-foreground">{langKey === "en" ? "Profile" : "Profil"}</dt>
                      <dd className="mt-0.5 font-semibold text-sm text-foreground">
                        {[draft.firstName, draft.lastName].filter(Boolean).join(" ") || "Créateur Idealy"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                      <dt className="text-muted-foreground">{langKey === "en" ? "Chosen Way" : langKey === "es" ? "Vía elegida" : "Voie choisie"}</dt>
                      <dd className="mt-0.5 font-semibold text-sm text-foreground">
                        {wayPresentations[draft.way].label}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                      <dt className="text-muted-foreground">{langKey === "en" ? "Project type" : "Type de projet"}</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {draft.projectType ? projectLabels[draft.projectType as keyof typeof projectLabels]?.[langKey] || draft.projectType : "Application web"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback & Error */}
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Navigation Controls */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/40 pt-4">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || isSubmitting}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {langKey === "en" ? "Back" : "Retour"}
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-semibold text-white shadow-lg transition active:scale-[0.98] cursor-pointer",
                  step % 2 === 0
                    ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-teal-500/20"
                    : "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-purple-500/20"
                )}
              >
                {langKey === "en" ? "Continue" : "Continuer"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={completeOnboarding}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 via-purple-600 to-violet-600 px-6 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting
                  ? (langKey === "en" ? "Opening workspace…" : "Ouverture du workspace…")
                  : (langKey === "en" ? "Open my workspace" : "Ouvrir mon workspace")}
                <Rocket className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>

      <footer className="relative z-10 w-full max-w-2xl pt-5 pb-1 text-center">
        <p className="text-[10px] tracking-wide text-muted-foreground/70">
          {langKey === "en" ? "Your preferences can be changed later in Settings." : langKey === "es" ? "Podrás cambiar estas preferencias más adelante en Configuración." : "Vous pourrez modifier ces préférences plus tard dans les paramètres."}
        </p>
      </footer>ooter>
    </main>
  );
}
