import React, { useId, useState, useSyncExternalStore } from "react";
import { fetchPower, powerLevel, toneFor, type PowerResult } from "../../services/power";

const RADIUS = 15;
const CIRC = 2 * Math.PI * RADIUS;

// Un seul sondage partagé par la pastille, l'alerte et la bannière.
let current: PowerResult | null = null;
const listeners = new Set<() => void>();
let timer: number | undefined;
let inflight = false;

function refresh() {
  if (inflight) return;
  inflight = true;
  fetchPower().then((r) => {
    inflight = false;
    current = r;
    listeners.forEach((l) => l());
  });
}

export function refreshPower() {
  refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    }
  };
}

export function usePower(): PowerResult | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

export const CreditsPill: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const result = usePower();
  const [open, setOpen] = useState(false);
  const gid = useId().replace(/:/g, "");
  if (!result || result.state !== "ok") return null;
  const { power } = result;
  const level = powerLevel(power);
  const ratio = Math.max(0, Math.min(1, power.balance / power.walletCap));
  const rgb = toneFor(power.way).rgb;
  const tone = level === "critical" ? "#ef4444" : level === "low" ? "#f59e0b" : `rgb(${rgb})`;
  const text = `${Math.round(power.balance).toLocaleString("fr-FR")} / ${Math.round(power.walletCap).toLocaleString("fr-FR")}`;

  return (
    <div
      className="credits-pill relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        style={{
          boxShadow: open ? `0 0 16px -2px rgba(${rgb},0.4)` : undefined,
          borderColor: open ? `rgba(${rgb},0.55)` : undefined,
        }}
        className={`focus-ring flex items-center gap-2 rounded-full border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] ${
          compact ? "h-8 w-8 justify-center" : "h-8 px-2.5"
        } text-[11.5px] text-[var(--dsw-alias-label-secondary)] transition-all duration-300 hover:scale-[1.02] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] ${
          level === "critical" ? "animate-pulse" : ""
        }`}
        aria-label={`${power.resourceLabel} : ${text}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0 transition-transform duration-300">
          <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <circle
            cx="18" cy="18" r={RADIUS} fill="none" stroke={tone} strokeWidth="3.2" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ratio)}
            transform="rotate(-90 18 18)" style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,0,0,1)" }}
          />
        </svg>
        {!compact && (
          <span className="tabular-nums font-medium tracking-tight">
            {Math.round(power.balance).toLocaleString("fr-FR")}{" "}
            <span className="text-[10.5px] font-normal text-[var(--dsw-alias-label-tertiary)]">{power.resourceLabel}</span>
          </span>
        )}
      </button>

      {/* Tooltip Orbe Magique avec animation et respiration */}
      <div
        role="status"
        style={{ boxShadow: `0 18px 48px -18px rgba(${rgb},0.5)` }}
        className={`pointer-events-none absolute bottom-full left-0 z-40 mb-2 w-[236px] origin-bottom-left rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-4 transition-all duration-200 ${
          open ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-1"
        }`}
      >
        <div className="flex items-center gap-3">
          <svg width="50" height="50" viewBox="0 0 54 54" aria-hidden="true" className="shrink-0">
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
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--dsw-alias-label-tertiary)]">
              {power.resourceLabel}
            </div>
            <div className="text-[18px] font-semibold leading-tight tabular-nums text-[var(--dsw-alias-label-primary)]">
              {Math.round(power.balance).toLocaleString("fr-FR")}
            </div>
            <div className="text-[10.5px] text-[var(--dsw-alias-label-tertiary)]">
              sur {Math.round(power.walletCap).toLocaleString("fr-FR")} max
            </div>
          </div>
        </div>
        {level !== "ok" && (
          <p className="mt-2.5 text-[11px] leading-snug text-[var(--dsw-alias-label-secondary)] border-t border-[var(--dsw-alias-border-l1)]/60 pt-2">
            {level === "critical" ? "Réserve presque épuisée." : "Niveau bas."}
          </p>
        )}
      </div>
    </div>
  );
};
