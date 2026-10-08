"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!(url && publishableKey)) {
    throw new Error("supabase_third_party_not_configured");
  }

  return { publishableKey, url };
}

export function getFirebaseSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const { publishableKey, url } = getSupabaseConfig();
  client = createClient(url, publishableKey, {
    accessToken: async () => {
      try {
        const response = await fetch("/api/idealy/realtime-token", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) {
          return null;
        }
        const payload = (await response.json().catch(() => null)) as {
          accessToken?: unknown;
        } | null;
        return typeof payload?.accessToken === "string"
          ? payload.accessToken
          : null;
      } catch {
        return null;
      }
    },
  });

  return client;
}
