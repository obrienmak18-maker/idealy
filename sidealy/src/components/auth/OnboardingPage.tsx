import { Check } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { voiesCatalog } from "../../services/voies-catalog";
import { AuthShell, authField, authLink, authPrimary, Message } from "./AuthShell";

const WAYS = ["ninja", "mage", "hunter", "professional"] as const;
// Teintes par voie ("r,g,b") : halos, bordures et sélection.
const WAY_RGB: Record<(typeof WAYS)[number], string> = {
  ninja: "249,115,22",
  mage: "139,92,246",
  hunter: "20,184,166",
  professional: "217,70,239",
};
const PROJECTS = [
  ["web", "Application web"],
  ["mobile", "Application mobile"],
  ["saas", "SaaS"],
  ["startup", "Startup"],
  ["site", "Site vitrine"],
  ["prototype", "Prototype"],
  ["internal_tool", "Outil interne"],
  ["other", "Autre chose"],
] as const;
const LEVELS = [
  ["non_coder", "Je ne code pas"],
  ["beginner", "Débutant"],
  ["intermediate", "Intermédiaire"],
  ["advanced", "Avancé"],
  ["expert", "Expert"],
] as const;
const SOURCES = [
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["google", "Google"],
  ["github", "GitHub"],
  ["friend", "Un ami"],
  ["school", "École"],
  ["community", "Communauté"],
  ["other", "Autre"],
] as const;

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    aria-pressed={active}
    className={`focus-ring rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
      active
        ? "border-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)]"
        : "border-[var(--dsw-alias-border-l2)] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
    }`}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [way, setWay] = useState<(typeof WAYS)[number] | null>(null);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext = [!!way, !!projectType && goal.trim().length > 0, !!level, firstName.trim().length > 0][step];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/idealy/profile/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          way,
          projectType,
          primaryGoal: goal.trim(),
          experienceLevel: level,
          discoverySource: source ?? undefined,
          firstName: firstName.trim(),
          preferredLanguage: (navigator.language || "fr").slice(0, 2),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      if (res.status === 401) return window.location.replace("/login");
      if (!res.ok) throw new Error("save_failed");
      window.location.replace("/");
    } catch {
      setError("Votre profil n’a pas pu être enregistré. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const next = () => (step < 3 ? setStep(step + 1) : void submit());

  const titles = [
    ["Choisissez votre voie", "Elle donne son nom à votre énergie. Vous pourrez la changer dans les réglages."],
    ["Que voulez-vous créer ?", ""],
    ["Quel est votre niveau ?", "Idealy adapte ses explications."],
    ["Dernière étape", ""],
  ][step];

  return (
    <AuthShell ambient={way ? WAY_RGB[way] : undefined} subtitle={titles[1] || undefined} title={titles[0]} width={step === 0 ? 600 : 440}>
      <div className="mb-6 flex gap-1.5" aria-label={`Étape ${step + 1} sur 4`}>
        {[0, 1, 2, 3].map((i) => (
          <span className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[var(--dsw-alias-label-primary)]" : "bg-[var(--dsw-alias-border-l2)]"}`} key={i} />
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {WAYS.map((key) => {
            const w = voiesCatalog[key];
            const active = way === key;
            const rgb = WAY_RGB[key];
            const avatar = w.agents[0]?.avatarUrl;
            return (
              <button
                aria-pressed={active}
                className="focus-ring group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 sm:flex-col sm:items-start sm:gap-3 sm:p-4"
                key={key}
                onClick={() => setWay(key)}
                style={{
                  background: `radial-gradient(120% 90% at 0% 0%, rgba(${rgb},${active ? 0.22 : 0.1}), transparent 65%), var(--dsw-alias-bg-layer-2)`,
                  borderColor: `rgba(${rgb},${active ? 0.85 : 0.28})`,
                  boxShadow: active
                    ? `0 0 0 1px rgba(${rgb},0.5), 0 18px 48px -16px rgba(${rgb},0.55)`
                    : `0 10px 30px -22px rgba(${rgb},0.6)`,
                }}
                type="button"
              >
                <span
                  className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl sm:h-14 sm:w-14"
                  style={{ boxShadow: `0 0 0 1px rgba(${rgb},0.45), 0 0 24px -4px rgba(${rgb},${active ? 0.7 : 0.35})` }}
                >
                  {avatar && <img alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }} src={avatar} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`bg-gradient-to-r ${w.accentClassName} bg-clip-text text-[16px] font-medium text-transparent`}>{w.label}</span>
                    <span className="text-[11px] uppercase tracking-wider" style={{ color: `rgba(${rgb},0.9)` }}>{w.resourceLabel}</span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-[var(--dsw-alias-label-secondary)]">{w.tagline}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full transition-all duration-300 ${active ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
                  style={{ background: `rgb(${rgb})`, boxShadow: `0 0 14px rgba(${rgb},0.8)` }}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {PROJECTS.map(([v, label]) => (
              <Chip active={projectType === v} key={v} onClick={() => setProjectType(v)}>{label}</Chip>
            ))}
          </div>
          <textarea className={`${authField} h-28 resize-none py-3`} maxLength={400} onChange={(e) => setGoal(e.target.value)} placeholder="En une phrase : votre idée ou votre objectif" value={goal} />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(([v, label]) => (
            <Chip active={level === v} key={v} onClick={() => setLevel(v)}>{label}</Chip>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <input autoComplete="given-name" className={authField} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" value={firstName} />
          <div>
            <p className="mb-3 text-[14px] text-[var(--dsw-alias-label-secondary)]">Comment avez-vous connu Idealy ? (facultatif)</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(([v, label]) => (
                <Chip active={source === v} key={v} onClick={() => setSource(source === v ? null : v)}>{label}</Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <Message error={error} />
        <button className={authPrimary} disabled={!canNext || busy} onClick={next} type="button">
          {busy ? "Un instant…" : step < 3 ? "Continuer" : "Entrer dans Idealy"}
        </button>
        {step > 0 && (
          <button className={authLink} onClick={() => setStep(step - 1)} type="button">Retour</button>
        )}
      </div>
    </AuthShell>
  );
};
