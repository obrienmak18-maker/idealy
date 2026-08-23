type SupabaseAuthUser = {
  email?: string | null;
  id?: string;
};

type SupabaseAuthPayload = {
  access_token?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
  msg?: string;
  user?: SupabaseAuthUser;
};

export type SupabasePasswordAuthResult = {
  accessToken: string | null;
  configured: boolean;
  status: "authenticated" | "already_registered" | "invalid_credentials" | "not_configured" | "unavailable";
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
    const payload = (await response.json().catch(() => ({}))) as SupabaseAuthPayload;
    return { ok: response.ok, payload, status: response.status };
  } catch {
    return { ok: false, payload: {}, status: 0 };
  }
}

export async function signInWithSupabasePassword(
  email: string,
  password: string
): Promise<SupabasePasswordAuthResult> {
  if (!getSupabaseAuthConfig()) {
    return {
      accessToken: null,
      configured: false,
      status: "not_configured",
      userId: null,
    };
  }

  const result = await postSupabaseAuth("token?grant_type=password", {
    email,
    password,
  });

  if (!result.ok) {
    return {
      accessToken: null,
      configured: true,
      status: result.status === 400 ? "invalid_credentials" : "unavailable",
      userId: null,
    };
  }

  return {
    accessToken: result.payload.access_token ?? null,
    configured: true,
    status: "authenticated",
    userId: result.payload.user?.id ?? null,
  };
}

export async function signUpWithSupabasePassword(
  email: string,
  password: string
): Promise<SupabasePasswordAuthResult> {
  if (!getSupabaseAuthConfig()) {
    return {
      accessToken: null,
      configured: false,
      status: "not_configured",
      userId: null,
    };
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
    return {
      accessToken: null,
      configured: true,
      status: "already_registered",
      userId: null,
    };
  }

  if (!result.ok) {
    return {
      accessToken: null,
      configured: true,
      status: "unavailable",
      userId: null,
    };
  }

  return {
    accessToken: result.payload.access_token ?? null,
    configured: true,
    status: "authenticated",
    userId: result.payload.user?.id ?? null,
  };
}
