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

function config() {
  // The Next backend uses NEXT_PUBLIC_FIREBASE_* while Vite projects commonly
  // use VITE_FIREBASE_*. Both prefixes are public; never read server secrets here.
  const apiKey = (
    env.VITE_FIREBASE_API_KEY ?? env.NEXT_PUBLIC_FIREBASE_API_KEY
  )?.trim();
  const authDomain = (
    env.VITE_FIREBASE_AUTH_DOMAIN ?? env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  )?.trim();
  const projectId = (
    env.VITE_FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )?.trim();
  const appId = (
    env.VITE_FIREBASE_APP_ID ?? env.NEXT_PUBLIC_FIREBASE_APP_ID
  )?.trim();
  if (!(apiKey && authDomain && projectId && appId)) return null;
  return { apiKey, authDomain, projectId, appId };
}

export const isFirebaseConfigured = () => config() !== null;

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

export async function signUpEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth(), email, password);
  await sendEmailVerification(result.user).catch(() => undefined);
  return result.user;
}

export const resetPassword = (email: string) => sendPasswordResetEmail(auth(), email);

/** Message clair et court pour les erreurs Firebase courantes. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? (error as Error)?.message ?? "";
  if (code.includes("firebase_not_configured")) return "La connexion n’est pas encore configurée sur cet environnement.";
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

/** Échange le jeton Firebase contre la session NextAuth du backend (même origine). */
export async function createBackendSession(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const claims = await fetch("/api/auth/set-claims", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!claims.ok && claims.status !== 503) throw new Error("session_rejected");
  const fresh = await user.getIdToken(true);
  const csrf = (await (await fetch("/api/auth/csrf", { credentials: "include" })).json()) as { csrfToken: string };
  const body = new URLSearchParams({ csrfToken: csrf.csrfToken, idToken: fresh, json: "true" });
  const res = await fetch("/api/auth/callback/firebase", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  if (!res.ok || (data.url && data.url.includes("error="))) throw new Error("session_rejected");
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
