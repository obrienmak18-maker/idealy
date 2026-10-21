"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Lightbulb,
  Mail,
  Pause,
  Rocket,
  Sparkles,
  UserRound,
  Volume2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IdealyLogo, IdealyMark } from "@/components/branding/idealy-logo";
import { useTranslation } from "@/lib/i18n/provider";
import {
  idealyDiscoverySources,
  idealyExperienceLevels,
  idealyProjectTypes,
  onboardingInputSchema,
  idealyPreferredVoices,
  isIdealyPreferredVoice,
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
  preferredVoice: (typeof idealyPreferredVoices)[number];
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

// Ocean light modes per step: Alternating between Emerald/Teal and Violet/Purple

type VoicePreset = {
  id: (typeof idealyPreferredVoices)[number];
  label: { fr: string; en: string; es: string };
  description: { fr: string; en: string; es: string };
  pitch: number;
  rate: number;
};

const voicePresets: VoicePreset[] = [
  { id: "aurora", label: { fr: "Aurore", en: "Aurora", es: "Aurora" }, description: { fr: "Douce & chaleureuse", en: "Soft & warm", es: "Suave y cálida" }, pitch: 1.12, rate: 0.92 },
  { id: "nova", label: { fr: "Nova", en: "Nova", es: "Nova" }, description: { fr: "Naturelle & équilibrée", en: "Natural & balanced", es: "Natural y equilibrada" }, pitch: 1, rate: 1 },
  { id: "atlas", label: { fr: "Atlas", en: "Atlas", es: "Atlas" }, description: { fr: "Posée & profonde", en: "Calm & grounded", es: "Serena y profunda" }, pitch: 0.78, rate: 0.88 },
  { id: "pulse", label: { fr: "Pulse", en: "Pulse", es: "Pulse" }, description: { fr: "Vive & dynamique", en: "Bright & energetic", es: "Viva y dinámica" }, pitch: 1.18, rate: 1.08 },
];

const stepAuras = [
  {
    glow: "rgba(20, 184, 166, 0.35)",
    beam: "from-teal-500/25 via-emerald-500/15 to-transparent",
    waterColor: "#14b8a6",
    label: "Teal Emerald Glow",
  },
  {
    glow: "rgba(168, 85, 247, 0.38)",
    beam: "from-purple-500/25 via-violet-500/15 to-transparent",
    waterColor: "#a855f7",
    label: "Cosmic Violet Glow",
  },
  {
    glow: "rgba(56, 189, 248, 0.35)",
    beam: "from-cyan-500/25 via-teal-500/15 to-transparent",
    waterColor: "#38bdf8",
    label: "Cyan Ocean Glow",
  },
  {
    glow: "rgba(168, 85, 247, 0.4)",
    beam: "from-violet-500/30 via-teal-400/20 to-transparent",
    waterColor: "#c084fc",
    label: "Aurora Luminous Blend",
  },
];

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
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Animation states for the star logo transition onto ocean water
  const [starSettled, setStarSettled] = useState(false);

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
    preferredVoice: "nova",
  });

  // Exactly 4 structured, essential steps as requested by user
  const steps = useMemo(
    () => [
      {
        icon: UserRound,
        key: "profile",
        label: langKey === "en" ? "Profile & voice" : langKey === "es" ? "Perfil y voz" : "Profil & voix",
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
    const timer = setTimeout(() => {
      setStarSettled(true);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

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
          accountEmail?: unknown; accountName?: unknown; onboardingCompleted?: unknown;
          firstName?: unknown; lastName?: unknown; preferredVoice?: unknown;
          experienceLevel?: unknown; primaryGoal?: unknown; projectType?: unknown; way?: unknown;
        };
        if (status.onboardingCompleted === true) {
          router.replace(nextPath);
          return;
        }
        const email = typeof status.accountEmail === "string" && status.accountEmail.trim() ? status.accountEmail.trim() : null;
        setAccountEmail(email);
        const accountName = typeof status.accountName === "string" && status.accountName.trim()
          ? status.accountName.trim() : email?.split("@")[0] || "";
        const nameParts = accountName.split(/\s+/).filter(Boolean);
        setDraft((current) => ({
          ...current,
          firstName: typeof status.firstName === "string" && status.firstName.trim() ? status.firstName : current.firstName || nameParts[0] || "",
          lastName: typeof status.lastName === "string" && status.lastName.trim() ? status.lastName : current.lastName || nameParts.slice(1).join(" "),
          preferredVoice: isIdealyPreferredVoice(status.preferredVoice) ? status.preferredVoice : current.preferredVoice,
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

  const previewVoice = (voiceId: OnboardingDraft["preferredVoice"]) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError(langKey === "en"
        ? "Voice previews are not supported by this browser."
        : langKey === "es" ? "Este navegador no admite la vista previa de voz."
        : "L’aperçu vocal n’est pas pris en charge par ce navigateur.");
      return;
    }
    if (previewingVoice === voiceId) {
      window.speechSynthesis.cancel();
      setPreviewingVoice(null);
      return;
    }
    window.speechSynthesis.cancel();
    const preset = voicePresets.find((item) => item.id === voiceId) ?? voicePresets[1];
    const sample = langKey === "en"
      ? "Hello! I’m Idealy. Let’s build something great, one idea at a time."
      : langKey === "es" ? "¡Hola! Soy Idealy. Construyamos algo genial, una idea a la vez."
      : "Bonjour ! Je suis Idealy. Avançons ensemble, une idée à la fois.";
    const utterance = new SpeechSynthesisUtterance(sample);
    const speechLanguage = langKey === "en" ? "en-US" : langKey === "es" ? "es-ES" : "fr-FR";
    utterance.lang = speechLanguage;
    utterance.pitch = preset.pitch;
    utterance.rate = preset.rate;
    const installedVoice = window.speechSynthesis.getVoices().find((candidate) =>
      candidate.lang.toLowerCase().startsWith(speechLanguage.slice(0, 2))
    );
    if (installedVoice) utterance.voice = installedVoice;
    utterance.onend = () => setPreviewingVoice(null);
    utterance.onerror = () => setPreviewingVoice(null);
    setError(null);
    setPreviewingVoice(voiceId);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

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
    if (step === 0) return draft.firstName.trim().length > 0 && Boolean(draft.preferredVoice);
    if (step === 1) return draft.primaryGoal.trim().length > 0 && Boolean(draft.projectType);
    if (step === 2) return Boolean(draft.experienceLevel) && Boolean(draft.way);
    if (step === 3) return validatedInput().success;
    return true;
  };

  const nextStep = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPreviewingVoice(null);
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

      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
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
  const currentAura = stepAuras[step % stepAuras.length];

  if (isLoading) {
    return <main className="min-h-dvh bg-background" aria-busy="true" />;
  }

  return (
    <main className="idealy-app-background relative flex min-h-dvh w-full flex-col items-center justify-between overflow-x-hidden p-4 sm:p-6 lg:p-8 text-foreground selection:bg-teal-500/20">
      {/* Dynamic Ambient Background Lights */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <motion.div
          animate={{
            background:
              step % 2 === 0
                ? "radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.15), transparent 60%)"
                : "radial-gradient(circle at 50% 20%, rgba(168, 85, 247, 0.16), transparent 60%)",
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        />
        <div className="welcome-grid opacity-30" />
        <motion.div
          initial={{ opacity: 0, scale: 0.24, x: "22vw", y: -360, rotate: -40 }}
          animate={{
            opacity: starSettled ? 0.12 : 0.8,
            scale: starSettled ? 3.1 : 0.72,
            x: starSettled ? 0 : "22vw",
            y: starSettled ? 72 : -28,
            rotate: starSettled ? 160 + step * 180 : 0,
          }}
          transition={{ duration: starSettled ? 1.8 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-1/2 top-[38%] grid -translate-x-1/2 -translate-y-1/2 place-items-center"
        >
          <motion.div
            animate={{ background: step % 2 === 0
              ? "radial-gradient(circle, rgba(20,184,166,0.48) 0%, rgba(20,184,166,0.16) 35%, transparent 72%)"
              : "radial-gradient(circle, rgba(168,85,247,0.48) 0%, rgba(20,184,166,0.13) 38%, transparent 72%)" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute size-[25rem] rounded-full blur-2xl sm:size-[34rem]"
          />
          <IdealyMark size={188} animated={true} className="relative drop-shadow-[0_0_30px_rgba(20,184,166,0.45)]" />
        </motion.div>
      </div>

      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 z-10">
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {!starSettled ? (
              <motion.div
                initial={{ opacity: 1, scale: 1, y: 0 }}
                animate={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <IdealyLogo compact size={32} />
              </motion.div>
            ) : (
              <div className="size-8 rounded-full border border-teal-500/30 bg-teal-500/10 flex items-center justify-center">
                <span className="size-2 rounded-full bg-teal-400 animate-pulse" />
              </div>
            )}
          </AnimatePresence>
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t("onboarding.badge") || "Studio Idealy"}
            </span>
            <p className="text-xs font-semibold text-foreground">
              {langKey === "en" ? "Initial Workspace Onboarding" : "Configuration de mission"}
            </p>
          </div>
        </div>

        {/* Contract token: Step progress counter */}
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs backdrop-blur-md">
          <StepIcon className="size-3.5 text-primary" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">
            Étape {step + 1} sur {steps.length} —{" "}
            <strong className="text-foreground font-semibold">{currentStep.label}</strong>
          </span>
        </div>
      </header>

      {/* Main Glassmorphic Question Frame */}
      <div className="w-full max-w-3xl my-auto py-4 z-10">
        <section className="relative rounded-3xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-card/75 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8 transition-colors">
          {/* Subtle top iridescent beam */}
          <motion.div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r",
              step % 2 === 0
                ? "from-transparent via-teal-400/80 via-emerald-400/60 to-transparent"
                : "from-transparent via-purple-400/80 via-violet-400/60 to-transparent"
            )}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Stepper Progress bar */}
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-border/40 pb-4">
            <ol className="flex items-center gap-2">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const isCurrent = index === step;
                const isComplete = index < step;
                return (
                  <li key={item.key} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => index < step && setStep(index)}
                      disabled={index > step}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all",
                        isCurrent
                          ? "bg-primary/15 text-primary font-semibold ring-1 ring-primary/30"
                          : isComplete
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                          : "text-muted-foreground/50 opacity-60 cursor-default"
                      )}
                    >
                      <span className="size-4 grid place-items-center">
                        {isComplete ? <Check className="size-3" /> : <Icon className="size-3" />}
                      </span>
                      <span className="hidden sm:inline text-[11px]">{item.badge}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <span className="mx-1 h-px w-3 bg-border/60" aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  step % 2 === 0
                    ? "bg-gradient-to-r from-teal-400 to-emerald-400"
                    : "bg-gradient-to-r from-violet-400 to-purple-400"
                )}
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Animated Question Content Cards */}
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step-0" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="space-y-5">
                <div>
                  <span className="inline-block rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-teal-600 dark:text-teal-400">Question 1 / 4</span>
                  <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{langKey === "en" ? "Your space, your voice" : langKey === "es" ? "Tu espacio, tu voz" : "Ton espace, ta voix"}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">{langKey === "en" ? "Make Idealy feel like yours. You can change these choices later." : langKey === "es" ? "Haz que Idealy se sienta tuyo. Puedes cambiar estas opciones después." : "Personnalisez votre espace. Vous pourrez modifier ces choix plus tard."}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-foreground break-all">{accountEmail || (langKey === "en" ? "Email linked to your account" : langKey === "es" ? "Correo vinculado a tu cuenta" : "E-mail associé à votre compte")}</span>
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px]">{langKey === "en" ? "Account email · read-only" : langKey === "es" ? "Correo de cuenta · solo lectura" : "E-mail du compte · non modifiable"}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Display name" : langKey === "es" ? "Nombre visible" : "Nom affiché"} <span className="text-destructive">*</span>
                    <input value={draft.firstName} onChange={(event) => updateDraft("firstName", event.target.value)} maxLength={80} autoFocus autoComplete="given-name" className="h-10 rounded-xl border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder={langKey === "en" ? "Your first name or nickname" : langKey === "es" ? "Tu nombre o apodo" : "Votre prénom ou pseudo"} />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Last name" : langKey === "es" ? "Apellido" : "Nom"} <span className="font-normal text-muted-foreground">({langKey === "en" ? "optional" : langKey === "es" ? "opcional" : "facultatif"})</span>
                    <input value={draft.lastName} onChange={(event) => updateDraft("lastName", event.target.value)} maxLength={80} autoComplete="family-name" className="h-10 rounded-xl border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder={langKey === "en" ? "Your last name" : langKey === "es" ? "Tu apellido" : "Votre nom"} />
                  </label>
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{langKey === "en" ? "Choose Idealy’s voice" : langKey === "es" ? "Elige la voz de Idealy" : "Choisissez la voix d’Idealy"}</span>
                    <span className="text-[10px] text-muted-foreground">{langKey === "en" ? "Tap a voice to select it" : langKey === "es" ? "Toca una voz para elegirla" : "Touchez une voix pour la choisir"}</span>
                  </div>
                  <div role="radiogroup" aria-label={langKey === "en" ? "Idealy voice" : langKey === "es" ? "Voz de Idealy" : "Voix d’Idealy"} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {voicePresets.map((voice) => {
                      const selected = draft.preferredVoice === voice.id;
                      return (
                        <button type="button" role="radio" aria-checked={selected} key={voice.id} onClick={() => {
                          updateDraft("preferredVoice", voice.id);
                          if (previewingVoice && previewingVoice !== voice.id) {
                            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                            setPreviewingVoice(null);
                          }
                        }} className={cn("group inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors", selected ? "border-teal-500/70 bg-teal-500/10 text-foreground" : "border-border/50 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                          <motion.span animate={{ scale: selected ? [1, 1.18, 1] : 1, opacity: selected ? 1 : 0.45 }} transition={{ duration: 1.8, repeat: selected ? Infinity : 0, ease: "easeInOut" }} className={cn("size-2.5 shrink-0 rounded-full", voice.id === "aurora" ? "bg-rose-300" : voice.id === "nova" ? "bg-gradient-to-br from-teal-300 to-sky-400" : voice.id === "atlas" ? "bg-violet-400" : "bg-amber-300")} />
                          <span className="text-xs font-semibold">{voice.label[langKey]}</span>
                          <span className="hidden text-[10px] sm:inline">{voice.description[langKey]}</span>
                          {selected && <Check className="size-3 shrink-0 text-teal-500" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button type="button" onClick={() => previewVoice(draft.preferredVoice)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={previewingVoice === draft.preferredVoice ? (langKey === "en" ? "Stop voice preview" : langKey === "es" ? "Detener vista previa" : "Arrêter l’aperçu vocal") : (langKey === "en" ? "Play voice preview" : langKey === "es" ? "Escuchar voz" : "Écouter un aperçu")}>
                      {previewingVoice === draft.preferredVoice ? <Pause className="size-3.5" /> : <Volume2 className="size-3.5" />}
                      {previewingVoice === draft.preferredVoice ? (langKey === "en" ? "Stop preview" : langKey === "es" ? "Detener" : "Arrêter l’aperçu") : (langKey === "en" ? "Listen to this voice" : langKey === "es" ? "Escuchar esta voz" : "Écouter cette voix")}
                    </button>
                    <span className="text-[10px] text-muted-foreground">{langKey === "en" ? "Preview uses a voice available on your device." : langKey === "es" ? "La vista previa usa una voz disponible en tu dispositivo." : "L’aperçu utilise une voix disponible sur votre appareil."}</span>
                  </div>
                </div>
              </motion.div>
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
                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Your goal or project vision" : "Votre intention ou projet"} <span className="text-destructive">*</span>
                    <textarea
                      value={draft.primaryGoal}
                      onChange={(event) => updateDraft("primaryGoal", event.target.value)}
                      maxLength={400}
                      rows={3}
                      autoFocus
                      className="resize-none rounded-xl border border-border/70 bg-background/60 px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      placeholder={
                        langKey === "en"
                          ? "E.g. Build a modern web application for project management with real-time updates..."
                          : "Ex. Concevoir une application web moderne pour gérer mes projets scolaires..."
                      }
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-medium">
                    {langKey === "en" ? "Project type" : "Type de projet"} <span className="text-destructive">*</span>
                    <select
                      value={draft.projectType}
                      onChange={(event) => updateDraft("projectType", event.target.value)}
                      className="h-11 rounded-xl border border-border/70 bg-background/60 px-3.5 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                    >
                      <option value="">
                        {langKey === "en" ? "Select a creation type" : "Sélectionnez un type de création"}
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
                    Question 4 / 4 — Prêt pour le studio
                  </span>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {langKey === "en" ? "How did you hear about Idealy?" : "Comment avez-vous connu Idealy ?"}
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
                    {langKey === "en" ? "Your Studio Configuration" : "Configuration de votre studio"}
                  </h3>
                  <dl className="grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                      <dt className="text-muted-foreground">{langKey === "en" ? "Profile" : "Profil"}</dt>
                      <dd className="mt-0.5 font-semibold text-sm text-foreground">
                        {[draft.firstName, draft.lastName].filter(Boolean).join(" ") || "Créateur Idealy"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                      <dt className="text-muted-foreground">{langKey === "en" ? "Master Way" : "Voie choisie"}</dt>
                      <dd className="mt-0.5 font-semibold text-sm text-foreground">
                        {wayPresentations[draft.way].label}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-card/60 p-2.5 border border-border/40">
                      <dt className="text-muted-foreground">{langKey === "en" ? "Voice" : langKey === "es" ? "Voz" : "Voix"}</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{voicePresets.find((voice) => voice.id === draft.preferredVoice)?.label[langKey] || "Nova"}</dd>
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

      {/* Spectacular Aquatic Reflection & Floating Bioluminescent Star Deck */}
      <footer className="w-full max-w-2xl flex flex-col items-center justify-center relative mt-auto pt-6 pb-2 z-10">
        {/* Ocean Light Cone projecting upward */}
        <motion.div
          animate={{
            background:
              step % 2 === 0
                ? "radial-gradient(ellipse at 50% 100%, rgba(20, 184, 166, 0.3) 0%, transparent 70%)"
                : "radial-gradient(ellipse at 50% 100%, rgba(168, 85, 247, 0.35) 0%, transparent 70%)",
          }}
          transition={{ duration: 0.8 }}
          className="absolute bottom-0 inset-x-0 h-40 pointer-events-none -z-10 blur-xl"
        />

        {/* Ocean Surface Waves */}
        <div className="relative w-full flex flex-col items-center">
          {/* Subtle animated water ripple ring */}
          <motion.div
            key={`ripple-${step}`}
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: [1, 1.35, 1.6], opacity: [0.7, 0.3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
            className={cn(
              "absolute -bottom-2 size-28 rounded-full border pointer-events-none",
              step % 2 === 0 ? "border-teal-400/50" : "border-purple-400/50"
            )}
          />

          {/* The Spinning Idealy Star sitting on the ocean reflection */}
          <motion.div
            animate={{
              rotate: step * 360,
              scale: [1, 1.08, 1],
              filter: step % 2 === 0 ? "hue-rotate(0deg)" : "hue-rotate(62deg)",
            }}
            transition={{
              rotate: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative cursor-pointer select-none"
            title="Idealy Mark on Ocean Reflection"
          >
            <IdealyMark animated={true} size={48} />
          </motion.div>

          {/* Symmetrical Inverted Water Reflection */}
          <div
            className="pointer-events-none -mt-3 opacity-30 blur-[2px] transform scale-y-[-0.6]"
            aria-hidden="true"
          >
            <IdealyMark animated={false} size={48} />
          </div>

          {/* Ambient wave horizon bar */}
          <div
            className={cn(
              "mt-1 h-[1.5px] w-48 rounded-full bg-gradient-to-r transition-all duration-700",
              step % 2 === 0
                ? "from-transparent via-teal-400/80 to-transparent shadow-[0_0_12px_rgba(20,184,166,0.8)]"
                : "from-transparent via-purple-400/80 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.8)]"
            )}
          />
          <p className="mt-2 text-[10px] tracking-widest uppercase text-muted-foreground/75 font-mono">
            {step % 2 === 0 ? "Aura Émeraude & Sarcelle" : "Aura Violette & Stellaire"}
          </p>
        </div>
      </footer>
    </main>
  );
}
