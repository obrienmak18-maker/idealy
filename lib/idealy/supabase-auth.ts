type SupabaseAuthUser = {
  id?: string;
};

import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

type SupabaseAuthPayload = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
  msg?: string;
  user?: SupabaseAuthUser;
};

export type SupabasePasswordAuthResult = {
  accessToken: string | null;
  configured: boolean;
  expiresAt: number | null;
  refreshToken: string | null;
  status:
    | "authenticated"
    | "already_registered"
    | "confirmation_required"
    | "invalid_credentials"
    | "not_configured"
    | "unavailable";
  userId: string | null;
};

function getSupabaseAuthConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, url };
}

async function postSupabaseAuth(
  path: string,
  body: Record<string, string>
): Promise<{ payload: SupabaseAuthPayload; ok: boolean; status: number }> {
  const config = getSupabaseAuthConfig();
  if (!config) {
    return { ok: false, payload: {}, status: 0 };
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/${path}`, {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as SupabaseAuthPayload;
    return { ok: response.ok, payload, status: response.status };
  } catch {
    return { ok: false, payload: {}, status: 0 };
  }
}

function emptyResult(
  status: SupabasePasswordAuthResult["status"],
  configured: boolean
): SupabasePasswordAuthResult {
  return {
    accessToken: null,
    configured,
    expiresAt: null,
    refreshToken: null,
    status,
    userId: null,
  };
}

function authenticatedResult(
  payload: SupabaseAuthPayload
): SupabasePasswordAuthResult {
  return {
    accessToken: payload.access_token ?? null,
    configured: true,
    expiresAt: payload.expires_in
      ? Date.now() + payload.expires_in * 1000
      : null,
    refreshToken: payload.refresh_token ?? null,
    status: "authenticated",
    userId: payload.user?.id ?? null,
  };
}

export type SupabaseExternalUser = {
  email: string | null;
  id: string;
};

export async function getSupabaseUserWithAccessToken(
  accessToken: string
): Promise<SupabaseExternalUser | null> {
  const config = getSupabaseAuthConfig();
  if (!config || !accessToken.trim()) {
    return null;
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: config.anonKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response
      .json()
      .catch(() => null)) as SupabaseExternalUser | null;
    if (!payload?.id) {
      return null;
    }

    return { email: payload.email ?? null, id: payload.id };
  } catch {
    return null;
  }
}

export async function signInFirebaseUserThroughSupabase(
  email: string,
): Promise<SupabasePasswordAuthResult> {
  const config = getSupabaseAuthConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bridgeSecret = process.env.AUTH_SECRET?.trim();

  if (!config || !serviceRoleKey || !bridgeSecret) {
    return emptyResult("not_configured", false);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const bridgePassword = createHmac("sha256", bridgeSecret)
    .update(`idealy-firebase-bridge:${normalizedEmail}`)
    .digest("hex")
    .slice(0, 48);

  const firstAttempt = await signInWithSupabasePassword(
    normalizedEmail,
    bridgePassword,
  );
  if (firstAttempt.status === "authenticated") {
    return firstAttempt;
  }

  const admin = createClient(config.url, serviceRoleKey);
  let supabaseUserId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: bridgePassword,
      email_confirm: true,
    });
    if (created.error) {
      const listed = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = listed.data.users.find(
        (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
      );

      if (!existing?.id) {
        return emptyResult("unavailable", true);
      }

      const updated = await admin.auth.admin.updateUserById(existing.id, {
        password: bridgePassword,
        email_confirm: true,
      });
      if (updated.error) {
        return emptyResult("unavailable", true);
      }
      supabaseUserId = existing.id;
    } else {
      supabaseUserId = created.data.user?.id ?? null;
    }
  } catch {
    return emptyResult("unavailable", true);
  }

  if (!supabaseUserId) {
    return emptyResult("unavailable", true);
  }

  return signInWithSupabasePassword(normalizedEmail, bridgePassword);
}

export async function signInWithSupabasePassword(
  email: string,
  password: string
): Promise<SupabasePasswordAuthResult> {
  if (!getSupabaseAuthConfig()) {
    return emptyResult("not_configured", false);
  }

  const result = await postSupabaseAuth("token?grant_type=password", {
    email,
    password,
  });

  if (!result.ok) {
    return emptyResult(
      result.status === 400 ? "invalid_credentials" : "unavailable",
      true
    );
  }

  return authenticatedResult(result.payload);
}

export async function refreshSupabaseSession(
  refreshToken: string
): Promise<SupabasePasswordAuthResult> {
  if (!getSupabaseAuthConfig()) {
    return emptyResult("not_configured", false);
  }

  const result = await postSupabaseAuth("token?grant_type=refresh_token", {
    refresh_token: refreshToken,
  });

  if (!result.ok) {
    return emptyResult("unavailable", true);
  }

  return authenticatedResult(result.payload);
}

export async function signUpWithSupabasePassword(
  email: string,
  password: string
): Promise<SupabasePasswordAuthResult> {
  if (!getSupabaseAuthConfig()) {
    return emptyResult("not_configured", false);
  }

  const result = await postSupabaseAuth("signup", { email, password });
  const errorText = [
    result.payload.error,
    result.payload.error_code,
    result.payload.error_description,
    result.payload.msg,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!result.ok && (result.status === 422 || errorText.includes("already"))) {
    return emptyResult("already_registered", true);
  }

  if (!result.ok) {
    return emptyResult("unavailable", true);
  }

  if (!result.payload.access_token) {
    return {
      accessToken: null,
      configured: true,
      expiresAt: null,
      refreshToken: null,
      status: "confirmation_required",
      userId: result.payload.user?.id ?? null,
    };
  }

  return authenticatedResult(result.payload);
}
