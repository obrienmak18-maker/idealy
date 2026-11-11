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
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
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

export async function signInGoogle(): Promise<User> {
  const result = await signInWithPopup(auth(), new GoogleAuthProvider());
  return result.user;
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

/** Message clair et court pour les erreurs Firebase courantes. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? (error as Error)?.message ?? "";
  if (code.includes("firebase_not_configured")) return "La connexion n’est pas encore configurée sur cet environnement.";
  if (code.includes("email_not_verified")) return "Confirmez votre adresse e-mail avant de vous connecter.";
  if (code.includes("firebase_backend_identity_rejected")) return "Firebase a reconnu votre compte, mais le backend Idealy n’a pas validé cette identité.";
  if (code.includes("firebase_backend_unavailable")) return "Le service d’authentification Idealy est momentanément indisponible. Réessayez dans un instant.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "E-mail ou mot de passe incorrect.";
  if (code.includes("email-already-in-use")) return "Un compte existe déjà avec cet e-mail.";
  if (code.includes("weak-password")) return "Choisissez un mot de passe d’au moins 6 caractères.";
  if (code.includes("invalid-email")) return "Cette adresse e-mail n’est pas valide.";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Connexion annulée.";
  if (code.includes("too-many-requests")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (code.includes("invalid-phone-number")) return "Ce numéro n’est pas valide. Utilisez le format international (+234…).";
  if (code.includes("invalid-verification-code") || code.includes("invalid-code")) return "Ce code est incorrect.";
  if (code.includes("code-expired") || code.includes("expired-action-code")) return "Ce lien ou ce code a expiré. Demandez-en un nouveau.";
  if (code.includes("invalid-action-code")) return "Ce lien n’est plus valide. Demandez-en un nouveau.";
  if (code.includes("network")) return "Connexion réseau indisponible.";
  return "La connexion a échoué. Réessayez.";
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
    const user = auth().currentUser;
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

