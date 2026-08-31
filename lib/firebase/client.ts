"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  type ApplicationVerifier,
  browserLocalPersistence,
  type ConfirmationResult,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();

  if (!(apiKey && authDomain && projectId && appId)) {
    return null;
  }

  return { apiKey, appId, authDomain, projectId };
}

export function getFirebaseAuth() {
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error("firebase_not_configured");
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
): Promise<{ idToken: string; isNewUser: boolean }> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return { idToken: await credential.user.getIdToken(), isNewUser: true };
}

export async function sendPhoneCodeFirebase(
  phoneNumber: string,
  verifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
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

export async function signInWithGoogleFirebase(): Promise<{
  credential: UserCredential;
  idToken: string;
}> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  const idToken = await credential.user.getIdToken();
  if (!idToken) {
    throw new Error("firebase_token_unavailable");
  }

  return { credential, idToken };
}
