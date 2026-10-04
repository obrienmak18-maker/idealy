"use client";

import { useEffect } from "react";
import useSWR from "swr";
import {
  type PowerAction,
  type PowerStatus,
  parsePowerStatus,
} from "@/lib/idealy/power-status";

const POWER_STATUS_REFRESH_MS = 60_000;

async function fetchPowerStatus(key: string): Promise<PowerStatus | null> {
  const response = await fetch(key, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return parsePowerStatus(await response.json().catch(() => null));
}

/**
 * Shared Power status with focus, periodic and mission-completion refreshes.
 */
export function usePowerStatus(action: PowerAction | null = null): {
  loading: boolean;
  status: PowerStatus | null;
} {
  const key = action
    ? `/api/idealy/power?action=${encodeURIComponent(action)}`
    : "/api/idealy/power";
  const { data, isLoading, mutate } = useSWR(key, fetchPowerStatus, {
    refreshInterval: POWER_STATUS_REFRESH_MS,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    const refresh = () => {
      mutate();
    };
    window.addEventListener("idealy:power-updated", refresh);
    return () => window.removeEventListener("idealy:power-updated", refresh);
  }, [mutate]);

  return { loading: isLoading, status: data ?? null };
}
