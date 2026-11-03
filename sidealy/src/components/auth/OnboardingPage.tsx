import { Check } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { voiesCatalog } from "../../services/voies-catalog";
import { AuthShell, authField, authLink, authPrimary, Message } from "./AuthShell";

const WAYS = ["ninja", "mage", "hunter", "professional"] as const;
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
    <AuthShell subtitle={titles[1] || undefined} title={titles[0]} width={step === 0 ? 560 : 440}>
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
            return (
              <button
                aria-pressed={active}
                className={`focus-ring relative flex flex-col gap-1 rounded-2xl border p-3.5 text-left sm:gap-2 sm:p-4 transition-colors ${
                  active ? "border-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-interactive-bg-hover)]" : "border-[var(--dsw-alias-border-l2)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                key={key}
                onClick={() => setWay(key)}
                type="button"
              >
                <span className="flex items-center justify-between">
                  <span className="flex items-baseline gap-2">
                    <span className="text-[15.5px] font-medium">{w.label}</span>
                    <span className="text-[11px] uppercase tracking-wide text-[var(--dsw-alias-label-tertiary)]">{w.resourceLabel}</span>
                  </span>
                  {active && <Check aria-hidden="true" className="h-4 w-4" />}
                </span>
                <span className="text-[13px] leading-snug text-[var(--dsw-alias-label-secondary)]">{w.tagline}</span>
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
