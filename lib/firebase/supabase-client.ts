"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuth } from "firebase/auth";

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
      const user = getAuth().currentUser;
      return (await user?.getIdToken(false)) ?? null;
    },
  });

  return client;
}
