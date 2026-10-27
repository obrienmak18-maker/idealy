"use client";

import { useEffect } from "react";
import useSWR from "swr";
import type { FreeQuotaStatus } from "@/lib/idealy/free-quota";

const QUOTA_REFRESH_MS = 30_000;

async function fetchFreeQuota(url: string): Promise<FreeQuotaStatus | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export function useFreeQuota() {
  const { data, isLoading, mutate } = useSWR<FreeQuotaStatus | null>(
    "/api/idealy/quota",
    fetchFreeQuota,
    {
      refreshInterval: QUOTA_REFRESH_MS,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    }
  );

  useEffect(() => {
    const handleUpdate = () => {
      mutate();
    };
    window.addEventListener("idealy:quota-updated", handleUpdate);
    window.addEventListener("idealy:power-updated", handleUpdate);
    return () => {
      window.removeEventListener("idealy:quota-updated", handleUpdate);
      window.removeEventListener("idealy:power-updated", handleUpdate);
    };
  }, [mutate]);

  return {
    allowed: data?.allowed ?? true,
    limit: data?.limit ?? 5,
    loading: isLoading,
    message: data?.message ?? null,
    quota: data,
    refreshQuota: mutate,
    remaining: data?.remaining ?? 5,
    used: data?.used ?? 0,
  };
}
