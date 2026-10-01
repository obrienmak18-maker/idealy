"use client";

import { useEffect, useState } from "react";
import {
  parsePowerStatus,
  type PowerStatus,
} from "@/lib/idealy/power-status";

/**
 * Lightweight hook that fetches the current Power status once on mount.
 * Consumers can use `status.plan` and `status.balance` for display.
 * Does NOT poll — callers that need live updates should use PowerStatusBadge directly.
 */
export function usePowerStatus(): {
  loading: boolean;
  status: PowerStatus | null;
} {
  const [status, setStatus] = useState<PowerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/idealy/power", { cache: "no-store" })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) {
          setStatus(parsePowerStatus(payload));
        }
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, status };
}
