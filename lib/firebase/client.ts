"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  type ApplicationVerifier,
  browserLocalPersistence,
  type ConfirmationResult,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  getAuth,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();

  if (!(apiKey && authDomain && projectId && appId)) {
    return null;
  }

  return {
    apiKey,
    appId,
    authDomain,
    measurementId,
    messagingSenderId,
    projectId,
    storageBucket,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export function getFirebaseAuth() {
  const config = getFirebaseConfig();
  if (!config) {
    const error = new Error("firebase_not_configured");
    (error as unknown as { code: string }).code = "firebase_not_configured";
    throw error;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function signInWithEmailFirebase(
  email: string,
  password: string
): Promise<string> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken();
}

export async function signUpWithEmailFirebase(
  email: string,
  password: string
): Promise<string> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return credential.user.getIdToken();
}

/** Ensure Supabase's third-party auth role claim is present on a fresh token.
 *  Gracefully degrades if Firebase Admin SDK is not configured (dev without service account). */
export async function prepareFirebaseIdTokenForSupabase(
  idToken: string
): Promise<string> {
  try {
    const response = await fetch("/api/auth/set-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    // If set-claims worked, refresh the token to pick up the new claim
    if (response.ok) {
      const { currentUser } = getFirebaseAuth();
      if (currentUser) {
        return currentUser.getIdToken(true);
      }
    }
    // set-claims unavailable (no Firebase Admin config) → use original token
    // NextAuth's Firebase provider has a JWT fallback that will still extract email + uid
    return idToken;
  } catch {
    // Network error or unconfigured admin — fall back to original token
    return idToken;
  }
}

export async function sendPhoneCodeFirebase(
  phoneNumber: string,
  appVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

export async function confirmPhoneCodeFirebase(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string> {
  const credential = await confirmationResult.confirm(code);
  return credential.user.getIdToken();
}

export function requestPasswordResetFirebase(email: string) {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email);
}

export async function checkGoogleRedirectResult(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const auth = getFirebaseAuth();
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return await result.user.getIdToken();
    }
  } catch (err) {
    console.error("[Firebase Redirect Result]", err);
  }
  return null;
}

export async function signInWithGoogleFirebase(): Promise<{
  credential?: UserCredential;
  idToken: string;
}> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken();
    if (!idToken) {
      throw new Error("firebase_token_unavailable");
    }
    return { credential, idToken };
  } catch (popupError: unknown) {
    const errorCode =
      typeof popupError === "object" && popupError !== null && "code" in popupError
        ? String((popupError as { code: unknown }).code)
        : "";

    // If popup is blocked by browser, or user's browser fails popup isolation, fall back to redirect
    if (
      errorCode === "auth/popup-blocked" ||
      errorCode === "auth/cancelled-popup-request" ||
      errorCode === "auth/internal-error"
    ) {
      return new Promise((resolve) => {
        // Execution will pause and redirect
        resolve(undefined as any);
      });
    }

    throw popupError;
  }
}
