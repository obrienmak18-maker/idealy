import {
  Check,
  Compass,
  Database,
  Globe,
  Layout,
  Rocket,
  ShoppingBag,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { getBearerToken } from "../../services/firebase";
import { voiesCatalog } from "../../services/voies-catalog";
import {
  AuthShell,
  authField,
  authLink,
  authPrimary,
  Message,
} from "./AuthShell";

const WAYS = ["ninja", "mage", "hunter", "professional"] as const;

const WAY_RGB: Record<(typeof WAYS)[number], string> = {
  hunter: "20,184,166",
  mage: "139,92,246",
  ninja: "249,115,22",
  professional: "37,99,235",
};

const PROJECT_CONFIG = [
  {
    icon: Layout,
    id: "saas",
    translations: {
      en: { desc: "Dashboard, Stripe, user management", label: "SaaS & Subscriptions" },
      es: { desc: "Panel, Stripe, gestión de usuarios", label: "SaaS y Suscripciones" },
      fr: { desc: "Dashboard, Stripe, gestion utilisateurs", label: "SaaS & Abonnements" },
    },
  },
  {
    icon: Globe,
    id: "web",
    translations: {
      en: { desc: "Interactive experience, API & real-time", label: "Web Application" },
      es: { desc: "Experiencia interactiva, API y tiempo real", label: "Aplicación Web" },
      fr: { desc: "Expérience interactive, API & temps réel", label: "Application Web" },
    },
  },
  {
    icon: ShoppingBag,
    id: "site",
    translations: {
      en: { desc: "Catalog, cart, checkout & inventory", label: "E-commerce Website" },
      es: { desc: "Catálogo, carrito, checkout e inventario", label: "Sitio de Comercio Electrónico" },
      fr: { desc: "Catalogue, panier, checkout & inventaire", label: "Site e-commerce" },
    },
  },
  {
    icon: Database,
    id: "internal_tool",
    translations: {
      en: { desc: "Team backoffice, ticket management", label: "Internal Tool / CRM" },
      es: { desc: "Backoffice de equipo, gestión de tickets", label: "Herramienta Interna / CRM" },
      fr: { desc: "Backoffice d'équipe, gestion de tickets", label: "Outil Interne / CRM" },
    },
  },
  {
    icon: Rocket,
    id: "prototype",
    translations: {
      en: { desc: "Validate an idea or test a feature", label: "Rapid Prototype" },
      es: { desc: "Validar una idea o probar una función", label: "Prototipo Rápido" },
      fr: { desc: "Valider une idée ou tester une fonctionnalité", label: "Prototype Rapide" },
    },
  },
  {
    icon: Compass,
    id: "other",
    translations: {
      en: { desc: "Bespoke project or novel concept", label: "Custom Creation" },
      es: { desc: "Proyecto a medida o concepto innovador", label: "Otra Creación" },
      fr: { desc: "Projet sur-mesure ou concept novateur", label: "Autre Création" },
    },
  },
] as const;

const LEVEL_CONFIG = [
  {
    id: "non_coder",
    translations: {
      en: "I don't code (No-code / Vision)",
      es: "No programo (No-code / Visión)",
      fr: "Je ne code pas (No-code / Vision)",
    },
  },
  {
    id: "beginner",
    translations: {
      en: "Beginner (Basics)",
      es: "Principiante (Nociones básicas)",
      fr: "Débutant (Notions de base)",
    },
  },
  {
    id: "intermediate",
    translations: {
      en: "Intermediate (HTML, CSS, JS)",
      es: "Intermedio (HTML, CSS, JS)",
      fr: "Intermédiaire (HTML, CSS, JS)",
    },
  },
  {
    id: "advanced",
    translations: {
      en: "Advanced (React, TypeScript, APIs)",
      es: "Avanzado (React, TypeScript, APIs)",
      fr: "Avancé (React, TypeScript, APIs)",
    },
  },
  {
    id: "expert",
    translations: {
      en: "Expert (Architecture & DevOps)",
      es: "Experto (Arquitectura y DevOps)",
      fr: "Expert (Architecture & DevOps)",
    },
  },
] as const;

const SOURCE_CONFIG = [
  { id: "youtube", translations: { en: "YouTube", es: "YouTube", fr: "YouTube" } },
  { id: "github", translations: { en: "GitHub", es: "GitHub", fr: "GitHub" } },
  {
    id: "google",
    translations: {
      en: "Google Search",
      es: "Búsqueda en Google",
      fr: "Recherche Google",
    },
  },
  {
    id: "community",
    translations: {
      en: "Community / Social media",
      es: "Comunidad / Redes sociales",
      fr: "Communauté / Réseaux sociaux",
    },
  },
  {
    id: "friend",
    translations: {
      en: "Word of mouth",
      es: "Boca a boca",
      fr: "Bouche-à-oreille",
    },
  },
  { id: "other", translations: { en: "Other", es: "Otro", fr: "Autre" } },
] as const;

const ONBOARDING_I18N = {
  en: {
    backStep: "← Previous step",
    busySubmitting: "Preparing your universe…",
    continueButton: "Continue",
    enterApp: "Enter Idealy ✦",
    errorConfirm: "Idealy could not confirm your profile registration. Please try again.",
    errorSave: "Unable to save your profile with Idealy. Please try again.",
    experienceLabel: "Your development experience",
    goalLabel: "Describe your idea in a few words",
    goalPlaceholder: "E.g., a customer and sales management platform for small businesses.",
    nameLabel: "What should we call you?",
    namePlaceholder: "Your first name or nickname",
    sourceLabel: "How did you hear about Idealy? (optional)",
    stepAria: (s: number) => `Step ${s + 1} of 3`,
    titles: [
      [
        "What do you want to create?",
        "Select the type of project you want to prototype or build.",
      ],
      [
        "Choose your Energy Way",
        "It shapes your universe, energy vocabulary, and specialist agents.",
      ],
      [
        "Your creator profile",
        "A few details to tailor Idealy's level of technical explanation.",
      ],
    ],
  },
  es: {
    backStep: "← Paso anterior",
    busySubmitting: "Preparando su universo…",
    continueButton: "Continuar",
    enterApp: "Entrar en Idealy ✦",
    errorConfirm: "Idealy no pudo confirmar el registro de su perfil. Vuelva a intentarlo.",
    errorSave: "No se pudo guardar su perfil en Idealy. Vuelva a intentarlo.",
    experienceLabel: "Su experiencia en desarrollo",
    goalLabel: "Describa su idea en pocas palabras",
    goalPlaceholder: "Ej.: una plataforma de gestión de clientes y ventas para pequeñas empresas.",
    nameLabel: "¿Cómo deberíamos llamarle?",
    namePlaceholder: "Su nombre o apodo",
    sourceLabel: "¿Cómo conoció Idealy? (opcional)",
    stepAria: (s: number) => `Paso ${s + 1} de 3`,
    titles: [
      [
        "¿Qué desea crear?",
        "Seleccione el tipo de proyecto que desea crear o prototipar.",
      ],
      [
        "Elija su Vía de energía",
        "Modela su universo, el vocabulario de energía y sus especialistas.",
      ],
      [
        "Su perfil de creador",
        "Algunos detalles para adaptar el nivel de explicación técnica de Idealy.",
      ],
    ],
  },
  fr: {
    backStep: "← Étape précédente",
    busySubmitting: "Préparation de votre univers…",
    continueButton: "Continuer",
    enterApp: "Entrer dans Idealy ✦",
    errorConfirm: "Idealy n’a pas pu confirmer l’enregistrement de votre profil. Réessayez.",
    errorSave: "Impossible d’enregistrer votre profil auprès d’Idealy. Réessayez.",
    experienceLabel: "Votre expérience en développement",
    goalLabel: "Décrivez votre idée en quelques mots",
    goalPlaceholder: "Ex. : une plateforme de gestion des clients et des ventes pour petites entreprises.",
    nameLabel: "Comment doit-on vous appeler ?",
    namePlaceholder: "Votre prénom ou pseudo",
    sourceLabel: "Comment avez-vous connu Idealy ? (facultatif)",
    stepAria: (s: number) => `Étape ${s + 1} sur 3`,
    titles: [
      [
        "Que souhaitez-vous créer ?",
        "Sélectionnez le type de projet que vous voulez prototyper ou construire.",
      ],
      [
        "Choisissez votre Voie d'énergie",
        "Elle façonne votre univers, le vocabulaire d'énergie et vos spécialistes.",
      ],
      [
        "Votre profil de créateur",
        "Quelques précisions pour adapter le niveau d'explication d'Idealy.",
      ],
    ],
  },
};

export const OnboardingPage: React.FC = () => {
  const { setActivePage, language } = useApp();
  const currentLang: "fr" | "en" | "es" =
    language === "en" || language === "es" ? language : "fr";
  const i18n = ONBOARDING_I18N[currentLang];

  const projects = PROJECT_CONFIG.map((p) => ({
    desc: p.translations[currentLang].desc,
    icon: p.icon,
    id: p.id,
    label: p.translations[currentLang].label,
  }));

  const levels = LEVEL_CONFIG.map((l) => [
    l.id,
    l.translations[currentLang],
  ] as const);

  const sources = SOURCE_CONFIG.map((s) => [
    s.id,
    s.translations[currentLang],
  ] as const);

  const [step, setStep] = useState(0);
  const [projectType, setProjectType] = useState<string>("saas");
  const [goal, setGoal] = useState("");
  const [way, setWay] = useState<(typeof WAYS)[number]>(() => {
    try {
      const preferred = localStorage.getItem("idealy_preferred_way");
      return WAYS.includes(preferred as (typeof WAYS)[number])
        ? (preferred as (typeof WAYS)[number])
        : "mage";
    } catch {
      return "mage";
    }
  });
  const [level, setLevel] = useState<string>("intermediate");
  const [source, setSource] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = [
    !!projectType && goal.trim().length > 0,
    !!way,
    firstName.trim().length > 0 && !!level,
  ][step];

  const submit = async () => {
    setBusy(true);
    setError(null);
    const profileData = {
      discoverySource: source ?? undefined,
      experienceLevel: level,
      firstName: firstName.trim(),
      preferredLanguage: currentLang,
      primaryGoal: goal.trim(),
      projectType,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      way,
    };

    try {
      const bearer = await getBearerToken();
      if (!bearer) {
        setActivePage("login");
        return;
      }

      const res = await fetch("/api/idealy/profile/onboarding", {
        body: JSON.stringify(profileData),
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await res.json().catch(() => ({}))) as {
        error?: string;
        onboardingCompleted?: boolean;
      };

      if (!res.ok || result.onboardingCompleted !== true) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : i18n.errorConfirm
        );
      }

      // Local storage is only a fast UI cache; the saved profile is authoritative.
      localStorage.setItem("idealy_profile", JSON.stringify(profileData));
      localStorage.setItem("idealy_user_way", way);
      localStorage.removeItem("idealy_preferred_way");
      setActivePage("chat");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : i18n.errorSave
      );
    } finally {
      setBusy(false);
    }
  };

  const next = () => (step < 2 ? setStep(step + 1) : void submit());

  const currentTitles = i18n.titles[step];

  return (
    <AuthShell
      ambient={way ? WAY_RGB[way] : "45,212,191"}
      subtitle={currentTitles[1]}
      title={currentTitles[0]}
      width={step === 1 ? 620 : 520}
    >
      {/* Step Progress Bar */}
      <div aria-label={i18n.stepAria(step)} className="mb-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= step
                ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                : "bg-white/[0.12]"
            }`}
            key={i}
          />
        ))}
      </div>

      {/* Step 0: Que voulez-vous créer ? (Lovable Style Cards) */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.map((proj) => {
              const Icon = proj.icon;
              const active = projectType === proj.id;
              return (
                <button
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 flex items-start gap-3 ${
                    active
                      ? "border-teal-400 bg-teal-500/15 shadow-[0_0_20px_rgba(45,212,191,0.2)] text-white"
                      : "border-white/[0.08] bg-[#0c0d12] text-zinc-300 hover:border-white/[0.16] hover:bg-[#12141c]"
                  }`}
                  key={proj.id}
                  onClick={() => setProjectType(proj.id)}
                  type="button"
                >
                  <div
                    className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                      active
                        ? "bg-teal-400 text-black font-bold"
                        : "bg-white/[0.06] text-zinc-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">
                      {proj.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5 leading-snug">
                      {proj.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <label
              className="mb-2 block text-xs font-semibold text-zinc-300"
              htmlFor="onboarding-goal"
            >
              {i18n.goalLabel}
            </label>
            <textarea
              className={`${authField} min-h-[104px] resize-y py-4`}
              id="onboarding-goal"
              maxLength={400}
              onChange={(event) => setGoal(event.target.value)}
              placeholder={i18n.goalPlaceholder}
              required
              value={goal}
            />
            <p className="mt-1.5 text-right text-[11px] text-white/40">
              {goal.length}/400
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Choix de la Voie */}
      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {WAYS.map((key) => {
            const w = voiesCatalog[key];
            const active = way === key;
            const rgb = WAY_RGB[key];
            const avatar = w.agents[0]?.avatarUrl;
            return (
              <button
                aria-pressed={active}
                className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 sm:flex-col sm:items-start sm:gap-3 sm:p-4"
                key={key}
                onClick={() => setWay(key)}
                style={{
                  background: `radial-gradient(120% 90% at 0% 0%, rgba(${rgb},${
                    active ? 0.22 : 0.08
                  }), transparent 65%), #0c0d12`,
                  borderColor: `rgba(${rgb},${active ? 0.85 : 0.25})`,
                  boxShadow: active
                    ? `0 0 0 1px rgba(${rgb},0.5), 0 18px 48px -16px rgba(${rgb},0.55)`
                    : `0 10px 30px -22px rgba(${rgb},0.4)`,
                }}
                type="button"
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl ring-2 shadow-md"
                    style={{
                      borderColor: `rgb(${rgb})`,
                      boxShadow: `0 0 20px -4px rgba(${rgb},${active ? 0.8 : 0.3})`,
                    }}
                  >
                    {avatar && (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display =
                            "none";
                        }}
                        src={avatar}
                      />
                    )}
                  </span>

                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 place-items-center rounded-full transition-all duration-300 ${
                      active ? "scale-100 opacity-100" : "scale-75 opacity-0"
                    }`}
                    style={{
                      background: `rgb(${rgb})`,
                      boxShadow: `0 0 14px rgba(${rgb},0.8)`,
                    }}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[16px] font-bold text-white">
                      {w.label}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `rgba(${rgb},0.15)`,
                        color: `rgb(${rgb})`,
                      }}
                    >
                      {w.resourceLabel}
                    </span>
                  </div>
                  <span className="mt-1 block text-[12px] leading-snug text-zinc-400">
                    {w.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2: Votre profil & Prénom */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {i18n.nameLabel}
            </label>
            <input
              autoComplete="given-name"
              className={authField}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={i18n.namePlaceholder}
              value={firstName}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              {i18n.experienceLabel}
            </label>
            <div className="space-y-1.5">
              {levels.map(([id, label]) => (
                <button
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    level === id
                      ? "border-teal-400 bg-teal-500/15 text-white"
                      : "border-white/[0.08] bg-[#0c0d12] text-zinc-400 hover:text-zinc-200 hover:bg-[#12141c]"
                  }`}
                  key={id}
                  onClick={() => setLevel(id)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              {i18n.sourceLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {sources.map(([id, label]) => (
                <button
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    source === id
                      ? "border-white bg-white text-black font-semibold"
                      : "border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]"
                  }`}
                  key={id}
                  onClick={() => setSource(source === id ? null : id)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 space-y-3">
        <Message error={error} />
        <button
          className={authPrimary}
          disabled={!canNext || busy}
          onClick={next}
          type="button"
        >
          {busy
            ? i18n.busySubmitting
            : step < 2
              ? i18n.continueButton
              : i18n.enterApp}
        </button>
        {step > 0 && (
          <button
            className={authLink}
            onClick={() => setStep(step - 1)}
            type="button"
          >
            {i18n.backStep}
          </button>
        )}
      </div>
    </AuthShell>
  );
};
