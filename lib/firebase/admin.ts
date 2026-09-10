/**
 * lib/firebase/admin.ts
 *
 * Firebase Admin SDK - SERVER ONLY.
 * Never import this from any "use client" component.
 *
 * Required env vars (never prefixed NEXT_PUBLIC_):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (full PEM, newlines as \n in env)
 */
import "server-only";

import { type App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { clientEmail, privateKey, projectId };
}

export function isFirebaseAdminConfigured(): boolean {
  return getAdminConfig() !== null;
}

function getAdminApp(): App {
  if (getApps().length > 0) return getApp();
  const config = getAdminConfig();
  if (!config) throw new Error("Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
  return initializeApp({ credential: cert(config) });
}

/**
 * Set role:"authenticated" custom claim on a Firebase user.
 * Required for Supabase Third-Party Auth to grant postgres "authenticated" role.
 */
export async function setAuthenticatedClaim(uid: string): Promise<void> {
  const auth = getAuth(getAdminApp());
  const user = await auth.getUser(uid);
  const current = (user.customClaims ?? {}) as Record<string, unknown>;
  await auth.setCustomUserClaims(uid, { ...current, role: "authenticated" });
}

/**
 * Verify a Firebase ID token. Returns decoded payload or null if invalid.
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    return await getAuth(getAdminApp()).verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}
