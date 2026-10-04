"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { usePowerStatus } from "@/hooks/use-power-status";
import {
  readIdealyNotificationPreferences,
  sendIdealyDesktopNotification,
} from "@/lib/client-notifications";
import {
  formatPowerBalance,
  type PowerAction,
  powerUiState,
} from "@/lib/idealy/power-status";

export function PowerStatusBadge({
  action = null,
  compact = false,
}: {
  action?: PowerAction | null;
  compact?: boolean;
}) {
  const { loading, status } = usePowerStatus(action);

  useEffect(() => {
    if (!status || !readIdealyNotificationPreferences().credit) {
      return;
    }

    const lowBalanceThreshold = Math.max(1, Math.floor(status.walletCap * 0.1));
    if (status.balance > lowBalanceThreshold) {
      return;
    }

    const day = new Date().toISOString().slice(0, 10);
    const notificationKey = `idealy-low-power-alert:${status.way}:${day}`;
    try {
      if (window.localStorage.getItem(notificationKey) === "shown") {
        return;
      }
      window.localStorage.setItem(notificationKey, "shown");
    } catch {
      // Keep the in-app status visible even when browser storage is unavailable.
    }

    const title = `Votre ${status.resourceLabel} est presque épuisé`;
    const description = `Il vous reste ${status.balance} points. Adaptez votre prochaine mission ou consultez les niveaux.`;
    toast.warning(title, { description });
    sendIdealyDesktopNotification(title, description);
  }, [status]);

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
