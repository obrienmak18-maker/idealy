import React, { useEffect, useId, useState } from "react";
import { fetchPower, powerLevel, type PowerResult } from "../../services/power";

const RADIUS = 15;
const CIRC = 2 * Math.PI * RADIUS;

export function usePower(refreshMs = 60_000) {
  const [result, setResult] = useState<PowerResult | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetchPower(controller.signal).then((r) => {
        if (!controller.signal.aborted) setResult(r);
      });
    };
    load();
    const timer = window.setInterval(load, refreshMs);
    window.addEventListener("focus", load);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [refreshMs]);
  return result;
}

export const CreditsPill: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const result = usePower();
  const [open, setOpen] = useState(false);
  const gid = useId().replace(/:/g, "");
  if (!result || result.state !== "ok") return null;
  const { power } = result;
  const level = powerLevel(power);
  const ratio = Math.max(0, Math.min(1, power.balance / power.walletCap));
  const tone =
    level === "critical" ? "#ef4444" : level === "low" ? "#f59e0b" : "var(--idealy-teal-petrol)";
  const text = `${Math.round(power.balance).toLocaleString("fr-FR")} / ${Math.round(power.walletCap).toLocaleString("fr-FR")}`;

  return (
    <div
      className="credits-pill relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className={`focus-ring flex items-center gap-2 rounded-full border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] ${compact ? "h-9 w-9 justify-center" : "h-9 px-2.5"} text-[12px] text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] ${level === "critical" ? "animate-pulse" : ""}`}
        aria-label={`${power.resourceLabel} : ${text}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <circle
            cx="18" cy="18" r={RADIUS} fill="none" stroke={tone} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ratio)}
            transform="rotate(-90 18 18)" style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,0,0,1)" }}
          />
        </svg>
        {!compact && <span className="tabular-nums">{Math.round(power.balance).toLocaleString("fr-FR")}</span>}
      </button>

      <div
        role="status"
        className={`pointer-events-none absolute bottom-full left-0 z-40 mb-2 w-[236px] origin-bottom-left rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-4 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.35)] transition duration-200 ${open ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <div className="flex items-center gap-3">
          <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
            <defs>
              <radialGradient id={`orb-${gid}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
                <stop offset="45%" stopColor={tone} stopOpacity="0.55" />
                <stop offset="100%" stopColor={tone} stopOpacity="0.9" />
              </radialGradient>
            </defs>
            <circle cx="27" cy="27" r="22" fill={`url(#orb-${gid})`} />
            <ellipse cx="20" cy="17" rx="8" ry="4.5" fill="#fff" opacity="0.55" transform="rotate(-25 20 17)" />
          </svg>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-[var(--dsw-alias-label-tertiary)]">{power.resourceLabel}</div>
            <div className="text-[20px] font-semibold leading-tight tabular-nums text-[var(--dsw-alias-label-primary)]">
              {Math.round(power.balance).toLocaleString("fr-FR")}
            </div>
            <div className="text-[11px] text-[var(--dsw-alias-label-tertiary)]">sur {Math.round(power.walletCap).toLocaleString("fr-FR")}</div>
          </div>
        </div>
        {level !== "ok" && (
          <p className="mt-3 text-[12px] leading-snug text-[var(--dsw-alias-label-secondary)]">
            {level === "critical" ? "Presque épuisé." : "Il en reste peu."}
          </p>
        )}
      </div>
    </div>
  );
};
