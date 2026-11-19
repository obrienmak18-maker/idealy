import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  applyActionCode,
  type Auth,
  confirmPasswordReset,
  type ConfirmationResult,
  isSignInWithEmailLink,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  verifyPasswordResetCode,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";

const env = import.meta.env as Record<string, string | undefined>;
type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
};

let remoteConfig: FirebaseClientConfig | null = null;
let configRequest: Promise<boolean> | null = null;

function envConfig(): FirebaseClientConfig | null {
  const apiKey = (env.VITE_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY)?.trim();
  const authDomain = (env.VITE_FIREBASE_AUTH_DOMAIN || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)?.trim();
  const projectId = (env.VITE_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)?.trim();
  const appId = (env.VITE_FIREBASE_APP_ID || env.NEXT_PUBLIC_FIREBASE_APP_ID)?.trim();
  if (!(apiKey && authDomain && projectId && appId)) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

function config(): FirebaseClientConfig | null {
  return remoteConfig ?? envConfig();
}

/** Loads the public Firebase web configuration from the Idealy API project.
 * These values are client identifiers, never Firebase Admin credentials. */
export async function ensureFirebaseConfigured(): Promise<boolean> {
  if (config()) return true;
  if (!configRequest) {
    configRequest = (async () => {
      try {
        const response = await fetch("/api/public-config/firebase", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return false;
        const payload = (await response.json()) as {
          configured?: boolean;
          firebase?: FirebaseClientConfig | null;
        };
        const candidate = payload.firebase;
        if (
          payload.configured === true &&
          candidate &&
          typeof candidate.apiKey === "string" &&
          typeof candidate.authDomain === "string" &&
          typeof candidate.projectId === "string" &&
          typeof candidate.appId === "string"
        ) {
          remoteConfig = candidate;
          return true;
        }
      } catch {
        // Keep the sign-in page available with an actionable configuration state.
      }
      return false;
    })().finally(() => {
      configRequest = null;
    });
  }
  return configRequest;
}

export const isFirebaseConfigured = () => config() !== null;
export const getFirebaseAuth = () => auth();

let cached: Auth | null = null;
function auth(): Auth {
  if (cached) return cached;
  const cfg = config();
  if (!cfg) throw new Error("firebase_not_configured");
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(cfg);
  cached = getAuth(app);
  void setPersistence(cached, browserLocalPersistence).catch(() => undefined);
  return cached;
}

const GOOGLE_REDIRECT_PENDING_KEY = "idealy.google.redirect.pending";

export function isGoogleRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export async function completeGoogleRedirect(): Promise<User | null> {
  if (!isGoogleRedirectPending()) return null;
  try {
    const result = await getRedirectResult(auth());
    if (!result?.user) throw new Error("google_redirect_no_result");
    return result.user;
  } finally {
    try {
      sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }
}

export async function signInGoogle(): Promise<User | null> {
  const firebaseAuth = auth();
  await setPersistence(firebaseAuth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    const canRedirect = new Set([
      "auth/popup-blocked",
      "auth/internal-error",
      "auth/operation-not-supported-in-this-environment",
      "auth/cancelled-popup-request",
    ]).has(code);
    if (!canRedirect) throw error;

    try {
      sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, "1");
    } catch {
      throw new Error("google_redirect_unavailable");
    }
    try {
      await signInWithRedirect(firebaseAuth, provider);
      return null;
    } catch (redirectError) {
      try {
        sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
      throw redirectError;
    }
  }
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth(), email, password);
  return result.user;
}

function actionCodeSettings(_mode: "verifyEmail" | "resetPassword") {
  return {
    // The Firebase project's email template must point to /auth/action.
    // This URL is the destination after the branded action page completes.
    handleCodeInApp: false,
    url: new URL("/login", window.location.origin).toString(),
  };
}

export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user, actionCodeSettings("verifyEmail"));
}

export async function signUpEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth(), email, password);
  await sendVerificationEmail(result.user);
  return result.user;
}

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth(), email, actionCodeSettings("resetPassword"));

/** Clear, short message for common Firebase auth errors. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? (error as Error)?.message ?? "";
  if (code.includes("firebase_not_configured")) return "Authentication is not yet configured for this environment.";
  if (code.includes("email_not_verified")) return "Please verify your email address before signing in.";
  if (code.includes("google_redirect_no_result")) return "Google did not complete the sign-in. Try again or use your email.";
  if (code.includes("google_redirect_unavailable")) return "Google redirect could not start. Check the authorized domains in Firebase.";
  if (code.includes("auth/unauthorized-domain")) return "This domain is not authorized in Firebase Authentication. Add idealy-ai.vercel.app under Authentication > Settings > Authorized domains.";
  if (code.includes("auth/operation-not-allowed")) return "The Google provider is not enabled in Firebase Authentication. Enable Google in the provider list.";
  if (code.includes("auth/invalid-api-key")) return "The Firebase Web key is invalid for this environment. Check the public Firebase configuration.";
  if (code.includes("auth/operation-not-supported-in-this-environment")) return "This browser does not allow the Google popup. Sign-in must use the secure redirect.";
  if (code.includes("auth/network-request-failed")) return "La connexion réseau a échoué pendant l’authentification Google. Vérifiez Internet et réessayez.";
  if (code.includes("firebase_backend_identity_rejected")) return "Firebase recognized your account, but the Idealy backend did not validate this identity.";
  if (code.includes("firebase_backend_unavailable")) return "The Idealy authentication service is temporarily unavailable. Please try again shortly.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Incorrect email or password.";
  if (code.includes("email-already-in-use")) return "An account already exists with this email.";
  if (code.includes("weak-password")) return "Choose a password with at least 6 characters.";
  if (code.includes("invalid-email")) return "This email address is not valid.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Sign-in cancelled.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again in a few minutes.";
  if (code.includes("invalid-phone-number")) return "This phone number is not valid. Use international format (+1…).";
  if (code.includes("invalid-verification-code") || code.includes("invalid-code")) return "This code is incorrect.";
  if (code.includes("code-expired") || code.includes("expired-action-code")) return "This link or code has expired. Request a new one.";
  if (code.includes("invalid-action-code")) return "This link is no longer valid. Request a new one.";
  if (code.includes("network")) return "Network connection unavailable.";
  return "Sign-in failed. Please try again.";
}

/** Verify the Firebase identity with Idealy's backend and resolve its Supabase account.
 * No Auth.js / NextAuth cookie is created or required by this flow. */
export async function createBackendSession(user: User): Promise<void> {
  await user.reload();
  const currentUser = auth().currentUser ?? user;
  if (!currentUser.emailVerified) {
    throw new Error("email_not_verified");
  }

  // Refresh the token after email verification so its email_verified claim is current.
  const idToken = await currentUser.getIdToken(true);
  const response = await fetch("/api/auth/firebase/session", {
    method: "GET",
    credentials: "same-origin",
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    authenticated?: boolean;
  };
  if (!response.ok || payload.authenticated !== true) {
    throw new Error(
      response.status === 401
        ? "firebase_backend_identity_rejected"
        : "firebase_backend_unavailable",
    );
  }

  try {
    localStorage.setItem("idealy_session", "active");
    localStorage.setItem("idealy_user_id", user.uid);
    if (user.email) localStorage.setItem("idealy_user_email", user.email);
  } catch {
    // Firebase remains the source of identity; local storage is only a UI hint.
  }
}

// ─── Lien magique ────────────────────────────────────────────────────────────
const MAGIC_EMAIL_KEY = "idealy.magic.email";

export async function sendMagicLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth(), email, {
    url: `${window.location.origin}/login?magic=1`,
    handleCodeInApp: true,
  });
  try {
    window.localStorage.setItem(MAGIC_EMAIL_KEY, email);
  } catch {
    /* stockage indisponible : l'e-mail sera redemandé */
  }
}

export const isMagicLinkUrl = (): boolean => isFirebaseConfigured() && isSignInWithEmailLink(auth(), window.location.href);

export function rememberedMagicEmail(): string {
  try {
    return window.localStorage.getItem(MAGIC_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function completeMagicLink(email: string): Promise<User> {
  const result = await signInWithEmailLink(auth(), email, window.location.href);
  try {
    window.localStorage.removeItem(MAGIC_EMAIL_KEY);
  } catch {
    /* ignoré */
  }
  return result.user;
}

// ─── Téléphone (SMS) ─────────────────────────────────────────────────────────
let recaptcha: RecaptchaVerifier | null = null;
let pendingPhone: ConfirmationResult | null = null;

export async function sendPhoneCode(phone: string, container: HTMLElement): Promise<void> {
  recaptcha?.clear();
  recaptcha = new RecaptchaVerifier(auth(), container, { size: "invisible" });
  pendingPhone = await signInWithPhoneNumber(auth(), phone, recaptcha);
}

export async function confirmPhoneCode(code: string): Promise<User> {
  if (!pendingPhone) throw new Error("phone_no_session");
  const result = await pendingPhone.confirm(code);
  pendingPhone = null;
  return result.user;
}

// ─── Actions e-mail hébergées par l'app (/auth/action) ──────────────────────
export type AuthAction = { mode: "resetPassword" | "verifyEmail" | "recoverEmail"; code: string };

export function readAuthAction(): AuthAction | null {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const code = params.get("oobCode");
  if (!code || (mode !== "resetPassword" && mode !== "verifyEmail" && mode !== "recoverEmail")) return null;
  return { mode, code };
}

export const checkResetCode = (code: string) => verifyPasswordResetCode(auth(), code);
export const submitNewPassword = (code: string, password: string) => confirmPasswordReset(auth(), code, password);
export const confirmEmailCode = (code: string) => applyActionCode(auth(), code);

export function currentIdentity(): { email: string | null; name: string | null } {
  const user = auth().currentUser;
  return { email: user?.email ?? null, name: user?.displayName ?? null };
}

export async function getBearerToken(): Promise<string | null> {
  try {
    if (!config()) {
      const configured = await ensureFirebaseConfigured();
      if (!configured) return null;
    }
    const firebaseAuth = auth();
    // Firebase restores browserLocalPersistence asynchronously after a reload.
    await firebaseAuth.authStateReady();
    const user = firebaseAuth.currentUser;
    if (user) return await user.getIdToken();
  } catch {
    // A missing or expired Firebase session is handled by the API as unauthenticated.
  }
  return null;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getBearerToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers,
  });
}


/** End the local Firebase session and clear non-authoritative UI hints. */
export async function signOutFirebase(): Promise<void> {
  const firebaseAuth = auth();
  try {
    await firebaseAuth.signOut();
  } catch (error) {
    console.warn("[Firebase] signOut error:", error);
  }

  // Clear all client-side account state so Account B never inherits Account A's state
  try {
    const keysToRemove = [
      "idealy_session",
      "idealy_user_id",
      "idealy_user_email",
      "idealy_user_way",
      "idealy_preferred_way",
      "idealy_profile",
      "idealy_user_profile",
      "idealy_onboarding_completed",
      "idealy_active_conversation_id",
      "idealy_conversations_v1",
      "idealy_messages_v1",
      "idealy_backend_chat_ids_v1",
      MAGIC_EMAIL_KEY,
    ];
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    document.cookie = "idealy_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "idealy_user_way=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch {
    // Storage cleanup is best effort
  }

  // Clear backend session cookies if any NextAuth session exists
  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callbackUrl: "/welcome" }),
    });
  } catch {
    // Best-effort backend signout
  }
}
