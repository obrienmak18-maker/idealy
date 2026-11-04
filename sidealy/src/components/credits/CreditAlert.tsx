import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { powerLevelEx, toneFor, type PowerLevelEx } from "../../services/power";
import { usePower } from "./CreditsPill";

const R = 20;
const C = 2 * Math.PI * R;
const AUTO_DISMISS_MS = 14_000;

function seenKey(plan: string, period: string, level: PowerLevelEx) {
  return `idealy.credit-alert.${plan}.${period}.${level}`;
}
function wasSeen(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function markSeen(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* ignoré */
  }
}

/** Alerte de crédits : carte flottante (20 %, 5 %) et bannière (5 %, épuisé). Chaque seuil n'apparaît qu'une fois par période. */
export const CreditAlert: React.FC = () => {
  const result = usePower();
  const { setActivePage } = useApp();
  const [shown, setShown] = useState<PowerLevelEx | null>(null);
  const [bannerClosed, setBannerClosed] = useState(false);

  const power = result?.state === "ok" ? result.power : null;
  const level = power ? powerLevelEx(power) : "ok";

  useEffect(() => {
    if (!power || level === "ok") {
      setShown(null);
      return;
    }
    const key = seenKey(power.plan, power.periodKey, level);
    if (wasSeen(key)) return;
    markSeen(key);
    setShown(level);
    setBannerClosed(false);
    if (level === "depleted") return;
    const t = window.setTimeout(() => setShown((s) => (s === level ? null : s)), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [power?.plan, power?.periodKey, level, power]);

  if (!power || level === "ok") return null;
  const tone = toneFor(power.way);
  const ratio = Math.max(0, Math.min(1, power.balance / power.walletCap));
  const message = level === "depleted" ? tone.depleted : level === "critical" ? tone.critical : tone.low;
  const accent = level === "critical" || level === "depleted" ? "239,68,68" : tone.rgb;
  const goPricing = () => {
    setShown(null);
    setActivePage("pricing");
  };

  return (
    <>
      {(level === "critical" || level === "depleted") && !bannerClosed && (
        <div
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b px-4 py-2 text-[13px] backdrop-blur-md"
          role="status"
          style={{ background: `rgba(${accent},0.10)`, borderColor: `rgba(${accent},0.28)` }}
        >
          <span className="text-[var(--dsw-alias-label-primary)]">{message}</span>
          <button className="focus-ring rounded-full px-3 py-1 font-medium text-[var(--dsw-alias-label-primary)] underline underline-offset-4" onClick={goPricing} type="button">
            Voir les offres
          </button>
          {level !== "depleted" && (
            <button aria-label="Fermer" className="focus-ring grid h-6 w-6 place-items-center rounded-full text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]" onClick={() => setBannerClosed(true)} type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+172px)] z-40 flex justify-center transition-all duration-500 ease-out sm:inset-x-auto sm:bottom-28 sm:right-6 sm:justify-end ${shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
      >
        {shown && (
          <section
            className="pointer-events-auto relative w-full max-w-[360px] overflow-hidden rounded-2xl border bg-[var(--dsw-alias-bg-layer-1)] p-4"
            style={{
              borderColor: `rgba(${accent},0.35)`,
              boxShadow: `0 24px 60px -20px rgba(${accent},0.5), 0 2px 6px rgba(0,0,0,0.25)`,
              background: `radial-gradient(90% 120% at 0% 0%, rgba(${accent},0.16), transparent 60%), var(--dsw-alias-bg-layer-1)`,
            }}
          >
            <button aria-label="Fermer" className="focus-ring absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]" onClick={() => setShown(null)} type="button">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative grid h-[58px] w-[58px] shrink-0 place-items-center">
                <svg height="58" viewBox="0 0 48 48" width="58" aria-hidden="true">
                  <defs>
                    <radialGradient id="credit-orb" cx="35%" cy="30%" r="75%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                      <stop offset="50%" stopColor={`rgb(${accent})`} stopOpacity="0.55" />
                      <stop offset="100%" stopColor={`rgb(${accent})`} stopOpacity="0.9" />
                    </radialGradient>
                  </defs>
                  <circle cx="24" cy="24" r={R} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2.5" />
                  <circle cx="24" cy="24" r={R} fill="none" stroke={`rgb(${accent})`} strokeLinecap="round" strokeWidth="2.5" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} transform="rotate(-90 24 24)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,0,0,1)" }} />
                  <circle cx="24" cy="24" r="13" fill="url(#credit-orb)" />
                  <ellipse cx="20" cy="19" rx="5" ry="3" fill="#fff" opacity="0.5" transform="rotate(-25 20 19)" />
                </svg>
              </div>
              <div className="min-w-0 pr-6">
                <p className="text-[15px] font-medium leading-snug text-[var(--dsw-alias-label-primary)]">{message}</p>
                <p className="mt-0.5 text-[13px] text-[var(--dsw-alias-label-secondary)]">
                  Il reste {Math.round(power.balance).toLocaleString("fr-FR")} sur {Math.round(power.walletCap).toLocaleString("fr-FR")}.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button className="focus-ring h-9 flex-1 rounded-xl bg-[var(--dsw-alias-label-primary)] text-[13.5px] font-medium text-[var(--dsw-alias-bg-layer-1)] transition-opacity hover:opacity-90" onClick={goPricing} type="button">
                Voir les offres
              </button>
              <button className="focus-ring h-9 rounded-xl px-4 text-[13.5px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]" onClick={() => setShown(null)} type="button">
                Plus tard
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  );
};
