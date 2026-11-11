import {
  Check,
  Layout,
  Globe,
  ShoppingBag,
  Database,
  Rocket,
  Compass,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { getBearerToken } from "../../services/firebase";
import { voiesCatalog } from "../../services/voies-catalog";
import { AuthShell, authField, authLink, authPrimary, Message } from "./AuthShell";

const WAYS = ["ninja", "mage", "hunter", "professional"] as const;

const WAY_RGB: Record<(typeof WAYS)[number], string> = {
  ninja: "249,115,22",
  mage: "139,92,246",
  hunter: "20,184,166",
  professional: "37,99,235",
};

const PROJECTS = [
  { id: "saas", label: "SaaS & Abonnements", desc: "Dashboard, Stripe, gestion utilisateurs", icon: Layout },
  { id: "web", label: "Application Web", desc: "Expérience interactive, API & temps réel", icon: Globe },
  { id: "site", label: "Site e-commerce", desc: "Catalogue, panier, checkout & inventaire", icon: ShoppingBag },
  { id: "internal_tool", label: "Outil Interne / CRM", desc: "Backoffice d'équipe, gestion de tickets", icon: Database },
  { id: "prototype", label: "Prototype Rapide", desc: "Valider une idée ou tester une fonctionnalité", icon: Rocket },
  { id: "other", label: "Autre Création", desc: "Projet sur-mesure ou concept novateur", icon: Compass },
] as const;

const LEVELS = [
  ["non_coder", "Je ne code pas (No-code / Vision)"],
  ["beginner", "Débutant (Notions de base)"],
  ["intermediate", "Intermédiaire (HTML, CSS, JS)"],
  ["advanced", "Avancé (React, TypeScript, APIs)"],
  ["expert", "Expert (Architecture & DevOps)"],
] as const;

const SOURCES = [
  ["youtube", "YouTube"],
  ["github", "GitHub"],
  ["google", "Recherche Google"],
  ["community", "Communauté / Réseaux sociaux"],
  ["friend", "Bouche-à-oreille"],
  ["other", "Autre"],
] as const;

export const OnboardingPage: React.FC = () => {
  const { setActivePage } = useApp();
  const [step, setStep] = useState(0);
  const [projectType, setProjectType] = useState<string>("saas");
  const [goal, setGoal] = useState("");
  const [way, setWay] = useState<(typeof WAYS)[number]>("mage");
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
      way,
      projectType,
      primaryGoal: goal.trim(),
      experienceLevel: level,
      discoverySource: source ?? undefined,
      firstName: firstName.trim(),
      preferredLanguage: (navigator.language || "fr").slice(0, 2),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    };

    try {
      const bearer = await getBearerToken();
      if (!bearer) {
        setActivePage("login");
        return;
      }

      const res = await fetch("/api/idealy/profile/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });
      const result = (await res.json().catch(() => ({}))) as {
        error?: string;
        onboardingCompleted?: boolean;
      };

      if (!res.ok || result.onboardingCompleted !== true) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Idealy n’a pas pu confirmer l’enregistrement de votre profil. Réessayez.",
        );
      }

      // Local storage is only a fast UI cache; the saved profile is authoritative.
      localStorage.setItem("idealy_profile", JSON.stringify(profileData));
      localStorage.setItem("idealy_user_way", way);
      setActivePage("chat");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’enregistrer votre profil auprès d’Idealy. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  };

  const next = () => (step < 2 ? setStep(step + 1) : void submit());

  const titles = [
    ["Que souhaitez-vous créer ?", "Sélectionnez le type de projet que vous voulez prototyper ou construire."],
    ["Choisissez votre Voie d'énergie", "Elle façonne votre univers, le vocabulaire d'énergie et vos spécialistes."],
    ["Votre profil de créateur", "Quelques précisions pour adapter le niveau d'explication d'Idealy."],
  ][step];

  return (
    <AuthShell
      ambient={way ? WAY_RGB[way] : "45,212,191"}
      subtitle={titles[1]}
      title={titles[0]}
      width={step === 1 ? 620 : 520}
    >
      {/* Step Progress Bar */}
      <div className="mb-6 flex gap-2" aria-label={`Étape ${step + 1} sur 3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" : "bg-white/[0.12]"
            }`}
          />
        ))}
      </div>

      {/* Step 0: Que voulez-vous créer ? (Lovable Style Cards) */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROJECTS.map((proj) => {
              const Icon = proj.icon;
              const active = projectType === proj.id;
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => setProjectType(proj.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 flex items-start gap-3 ${
                    active
                      ? "border-teal-400 bg-teal-500/15 shadow-[0_0_20px_rgba(45,212,191,0.2)] text-white"
                      : "border-white/[0.08] bg-[#0c0d12] text-zinc-300 hover:border-white/[0.16] hover:bg-[#12141c]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                      active ? "bg-teal-400 text-black font-bold" : "bg-white/[0.06] text-zinc-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">{proj.label}</span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5 leading-snug">
                      {proj.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <label className="mb-2 block text-xs font-semibold text-zinc-300" htmlFor="onboarding-goal">
              Décrivez votre idée en quelques mots
            </label>
            <textarea
              id="onboarding-goal"
              className={`${authField} min-h-[104px] resize-y py-4`}
              maxLength={400}
              placeholder="Ex. : une plateforme de gestion des clients et des ventes pour petites entreprises."
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              required
            />
            <p className="mt-1.5 text-right text-[11px] text-white/40">{goal.length}/400</p>
          </div>
        </div>
      )}

      {/* Step 1: Choix de la Voie (Minato, Erza, Netero, Daniel) */}
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
                          (e.currentTarget as HTMLElement).style.display = "none";
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
              Comment doit-on vous appeler ?
            </label>
            <input
              autoComplete="given-name"
              className={authField}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Votre prénom ou pseudo"
              value={firstName}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Votre expérience en développement
            </label>
            <div className="space-y-1.5">
              {LEVELS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLevel(id)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    level === id
                      ? "border-teal-400 bg-teal-500/15 text-white"
                      : "border-white/[0.08] bg-[#0c0d12] text-zinc-400 hover:text-zinc-200 hover:bg-[#12141c]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Comment avez-vous connu Idealy ? (facultatif)
            </label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSource(source === id ? null : id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                    source === id
                      ? "border-white bg-white text-black font-semibold"
                      : "border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]"
                  }`}
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
          {busy ? "Préparation de votre univers…" : step < 2 ? "Continuer" : "Entrer dans Idealy ✦"}
        </button>
        {step > 0 && (
          <button
            className={authLink}
            onClick={() => setStep(step - 1)}
            type="button"
          >
            ← Étape précédente
          </button>
        )}
      </div>
    </AuthShell>
  );
};