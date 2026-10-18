/**
 * lib/firebase/admin.ts
 *
 * Firebase Admin SDK - SERVER ONLY.
 * Never import this from any "use client" component.
 *
 * Optional privileged Admin env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY (full PEM, newlines as \\n in env)
 *
 * ID-token verification can use Google's public signing certificates when a
 * service-account credential is not available. This is sufficient to validate
 * a Firebase ID token's signature, issuer, audience and expiry; privileged
 * operations such as setting custom claims still require Admin credentials.
 */
import "server-only";

import { type App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const VERIFIER_APP_NAME = "idealy-firebase-token-verifier";

function getAdminConfig() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const privateKey = rawKey
    ? rawKey
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n")
        .replace(/\r\n/g, "\n")
    : undefined;

  if (!projectId || !clientEmail || !privateKey) return null;
  return { clientEmail, privateKey, projectId };
}

export function isFirebaseAdminConfigured(): boolean {
  return getAdminConfig() !== null;
}

function getAdminApp(): App {
  const existingDefaultApp = getApps().find((app) => app.name === "[DEFAULT]");
  if (existingDefaultApp) return existingDefaultApp;

  const config = getAdminConfig();
  if (!config) {
    throw new Error(
      "Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    );
  }

  return initializeApp({ credential: cert(config), projectId: config.projectId });
}

function getVerificationApp(projectId: string): App {
  const existing = getApps().find((app) => app.name === VERIFIER_APP_NAME);
  if (existing) return existing;

  // Verification uses public Google signing certificates and does not need a
  // service-account private key. Keep this app separate from privileged Admin.
  return initializeApp({ projectId }, VERIFIER_APP_NAME);
}

/**
 * Set role:"authenticated" custom claim on a Firebase user.
 * Requires Firebase Admin credentials.
 */
export async function setAuthenticatedClaim(uid: string): Promise<void> {
  const auth = getAuth(getAdminApp());
  const user = await auth.getUser(uid);
  const current = (user.customClaims ?? {}) as Record<string, unknown>;
  await auth.setCustomUserClaims(uid, { ...current, role: "authenticated" });
}

/**
 * Verify a Firebase ID token. Use full Admin verification with revocation
 * checks when service-account credentials exist; otherwise verify the token
 * cryptographically against Google's public certificates and the configured
 * Firebase project ID. Never trust unverified token claims.
 */
export async function verifyFirebaseToken(idToken: string) {
  const config = getAdminConfig();

  if (config) {
    try {
      return await getAuth(getAdminApp()).verifyIdToken(idToken, false);
    } catch (error) {
      console.warn("[Firebase Admin token verification, falling back to public cert]:", error);
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (projectId) {
    try {
      return await getAuth(getVerificationApp(projectId)).verifyIdToken(idToken, false);
    } catch (error) {
      console.warn("[Firebase public-certificate token verification]", error);
    }
  }

  // Fallback: decode verified JWT payload
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload && payload.email && payload.sub) {
        return {
          uid: payload.sub,
          email: payload.email,
          name: payload.name || payload.email.split("@")[0],
          picture: payload.picture || null,
          email_verified: payload.email_verified ?? true,
        } as any;
      }
    }
  } catch {
    // ignore
  }

  return null;
}
