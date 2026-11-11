import "server-only";

import type { NextRequest } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";
import { verifyFirebaseToken } from "@/lib/firebase/admin";
import {
  createUser,
  getUser,
  getUserBySupabaseUserId,
  linkUserToSupabaseUser,
} from "@/lib/db/queries";
import { signInFirebaseUserThroughSupabase } from "@/lib/idealy/supabase-auth";
import { generateUUID } from "@/lib/utils";

type SafeSessionUser = {
  email?: string | null;
  id: string;
  name?: string | null;
  supabaseAccessToken?: string;
  supabaseAccessTokenExpiresAt?: number;
  supabaseRefreshToken?: string;
  supabaseUserId?: string | null;
  type: "regular" | "guest";
};

type CachedFirebaseIdentity = {
  expiresAt: number;
  token: JWT;
};

// Firebase signatures are verified on every request. The short cache only
// avoids repeating the Supabase identity bridge for each API call.
const firebaseIdentityCache = new Map<string, CachedFirebaseIdentity>();
const FIREBASE_BRIDGE_CACHE_MS = 60_000;

/**
 * Resolve a Firebase bearer token to the same trusted Idealy identity shape
 * used by existing API handlers. This path does not create or require an
 * Auth.js / NextAuth session.
 */
async function getFirebaseBearerToken(request: Request): Promise<JWT | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken || idToken.length > 12_000) return null;

  const decoded = await verifyFirebaseToken(idToken);
  if (!decoded?.uid || !decoded.email || decoded.email_verified !== true) {
    return null;
  }

  const email = decoded.email.trim().toLowerCase();
  if (!email || email.length > 254) return null;

  const cached = firebaseIdentityCache.get(decoded.uid);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.token,
      email,
      name: decoded.name ?? cached.token.name,
    };
  }

  const supabaseAuth = await signInFirebaseUserThroughSupabase(email);
  if (
    supabaseAuth.status !== "authenticated" ||
    !supabaseAuth.accessToken ||
    !supabaseAuth.userId
  ) {
    console.error("[Firebase bearer auth] Supabase identity bridge unavailable.", {
      configured: supabaseAuth.configured,
      status: supabaseAuth.status,
      hasAccessToken: Boolean(supabaseAuth.accessToken),
      hasUserId: Boolean(supabaseAuth.userId),
    });
    return null;
  }

  let localUser = await getUserBySupabaseUserId(supabaseAuth.userId);
  if (!localUser) {
    const [existingEmailUser] = await getUser(email);
    if (existingEmailUser) {
      if (
        existingEmailUser.supabaseUserId &&
        existingEmailUser.supabaseUserId !== supabaseAuth.userId
      ) {
        console.error("[Firebase bearer auth] Existing user is linked to another Supabase identity.", {
          userId: existingEmailUser.id,
        });
        return null;
      }

      if (!existingEmailUser.supabaseUserId) {
        await linkUserToSupabaseUser({
          localUserId: existingEmailUser.id,
          supabaseUserId: supabaseAuth.userId,
        });
      }
      localUser = { ...existingEmailUser, supabaseUserId: supabaseAuth.userId };
    } else {
      const [createdUser] = await createUser(email, `firebase-${generateUUID()}`);
      if (!createdUser?.id) return null;

      await linkUserToSupabaseUser({
        localUserId: createdUser.id,
        supabaseUserId: supabaseAuth.userId,
      });
      localUser = { ...createdUser, supabaseUserId: supabaseAuth.userId };
    }
  }

  const token = {
    email,
    id: localUser.id,
    name: decoded.name ?? localUser.name ?? "Utilisateur Idealy",
    picture: decoded.picture ?? localUser.image ?? undefined,
    sub: decoded.uid,
    supabaseAccessToken: supabaseAuth.accessToken,
    supabaseAccessTokenExpiresAt: supabaseAuth.expiresAt ?? undefined,
    supabaseRefreshToken: supabaseAuth.refreshToken ?? undefined,
    supabaseUserId: supabaseAuth.userId,
    type: "regular",
  } as unknown as JWT;

  firebaseIdentityCache.set(decoded.uid, {
    expiresAt: Date.now() + FIREBASE_BRIDGE_CACHE_MS,
    token,
  });

  return token;
}

/**
 * Extract a trusted application token from either:
 * - a Firebase ID token sent as Authorization: Bearer (Sidealy/Vite),
 * - an existing Auth.js session cookie (legacy Next.js UI).
 *
 * The Firebase path never creates an Auth.js session.
 */
export async function getSafeToken(
  request: NextRequest | Request
): Promise<JWT | null> {
  const firebaseToken = await getFirebaseBearerToken(request);
  if (firebaseToken) return firebaseToken;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  let isHttps = false;
  if ("nextUrl" in request) {
    isHttps = request.nextUrl.protocol === "https:";
  } else if ("url" in request && typeof request.url === "string") {
    isHttps = request.url.startsWith("https://");
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto === "https") isHttps = true;

  try {
    const token = await getToken({
      req: request,
      secret,
      secureCookie: isHttps,
    });
    if (token) return token;
  } catch {
    // Try the opposite cookie mode for legacy sessions.
  }

  try {
    return await getToken({
      req: request,
      secret,
      secureCookie: !isHttps,
    });
  } catch {
    return null;
  }
}

/** Session-shaped view for route handlers that previously called auth(). */
export async function getSafeSession(request: NextRequest | Request) {
  const token = await getSafeToken(request);
  if (!token || typeof token.id !== "string" || !token.id) return null;

  const user: SafeSessionUser = {
    email: typeof token.email === "string" ? token.email : null,
    id: token.id,
    name: typeof token.name === "string" ? token.name : null,
    supabaseAccessToken:
      typeof token.supabaseAccessToken === "string"
        ? token.supabaseAccessToken
        : undefined,
    supabaseAccessTokenExpiresAt:
      typeof token.supabaseAccessTokenExpiresAt === "number"
        ? token.supabaseAccessTokenExpiresAt
        : undefined,
    supabaseRefreshToken:
      typeof token.supabaseRefreshToken === "string"
        ? token.supabaseRefreshToken
        : undefined,
    supabaseUserId:
      typeof token.supabaseUserId === "string" ? token.supabaseUserId : null,
    type: token.type === "guest" ? "guest" : "regular",
  };

  return { expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), user };
}
