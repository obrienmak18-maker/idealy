export type CredentialsAuthenticationOutcome =
  | "success"
  | "invalid_credentials"
  | "confirmation_required"
  | "service_unavailable";

export function credentialsOutcomeFromCode(
  code: string | null | undefined
): CredentialsAuthenticationOutcome {
  if (code === "confirmation_required") {
    return "confirmation_required";
  }

  if (code === "service_unavailable") {
    return "service_unavailable";
  }

  return "invalid_credentials";
}

/**
 * Auth.js server actions return the redirect URL when `redirect: false` is
 * requested. A returned URL can still represent a credentials failure, so the
 * action must inspect its query parameters before claiming a session exists.
 */
export function credentialsOutcomeFromRedirect(
  redirectUrl: string | undefined
): CredentialsAuthenticationOutcome {
  if (!redirectUrl) {
    return "service_unavailable";
  }

  try {
    const url = new URL(redirectUrl, "https://idealy.local");
    const error = url.searchParams.get("error");

    if (!error) {
      return "success";
    }

    if (error === "CredentialsSignin") {
      return credentialsOutcomeFromCode(url.searchParams.get("code"));
    }

    return "service_unavailable";
  } catch {
    return "service_unavailable";
  }
}
