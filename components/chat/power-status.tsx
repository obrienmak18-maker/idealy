"use client";

import { useEffect, useState } from "react";
import {
  formatPowerBalance,
  type PowerAction,
  type PowerStatus,
  parsePowerStatus,
  powerUiState,
} from "@/lib/idealy/power-status";

export function PowerStatusBadge({
  action = null,
  compact = false,
}: {
  action?: PowerAction | null;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<PowerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const query = action ? `?action=${encodeURIComponent(action)}` : "";
    fetch(`/api/idealy/power${query}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) {
          setStatus(parsePowerStatus(payload));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [action]);

  if (loading) {
    return (
      <span
        aria-label="Chargement du Power"
        className="inline-flex h-6 min-w-24 animate-pulse rounded-full bg-sidebar-border/60"
        role="status"
      />
    );
  }
  if (!status) {
    return null;
  }

  const state = powerUiState(status);
  const stateLabel =
    state === "depleted"
      ? "Power épuisé"
      : state === "insufficient"
        ? "Power insuffisant"
        : "Power disponible";
  const tone =
    state === "depleted"
      ? "text-rose-300"
      : state === "insufficient"
        ? "text-amber-300"
        : "text-sidebar-foreground/75";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-sidebar-border/70 bg-background/20 px-2.5 py-1 text-[10px] font-medium ${tone}`}
      title={
        action && status.costPoints !== null
          ? `${stateLabel}. Coût : ${status.costPoints} points de ${status.resourceLabel}.`
          : stateLabel
      }
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          state === "normal"
            ? "bg-emerald-400"
            : state === "insufficient"
              ? "bg-amber-400"
              : "bg-rose-400"
        }`}
      />
      <span>
        {compact
          ? `${status.balance}`
          : formatPowerBalance(status.balance, status.way)}
      </span>
    </span>
  );
}
