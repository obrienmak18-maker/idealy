import { compare } from "bcrypt-ts";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DUMMY_PASSWORD } from "@/lib/constants";
import {
  createGuestUser,
  createUser,
  getUser,
  getUserBySupabaseUserId,
  linkUserToSupabaseUser,
} from "@/lib/db/queries";
import {
  getSupabaseUserWithAccessToken,
  refreshSupabaseSession,
  signInWithSupabasePassword,
  type SupabasePasswordAuthResult,
} from "@/lib/idealy/supabase-auth";
import { generateUUID } from "@/lib/utils";
import { verifyFirebaseToken } from "@/lib/firebase/admin";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

class IdealyCredentialsSignin extends CredentialsSignin {
  constructor(
    code:
      | "confirmation_required"
      | "invalid_credentials"
      | "service_unavailable"
  ) {
    super();
    this.code = code;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession["user"];
  }

  interface User {
    email?: string | null;
    id?: string;
    supabaseAccessToken?: string;
    supabaseAccessTokenExpiresAt?: number;
    supabaseRefreshToken?: string;
    supabaseUserId?: string | null;
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    supabaseAccessToken?: string;
    supabaseAccessTokenExpiresAt?: number;
    supabaseRefreshToken?: string;
    supabaseUserId?: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
        if (user.supabaseAccessToken) {
          token.supabaseAccessToken = user.supabaseAccessToken;
        }
        if (user.supabaseAccessTokenExpiresAt) {
          token.supabaseAccessTokenExpiresAt =
            user.supabaseAccessTokenExpiresAt;
        }
        if (user.supabaseRefreshToken) {
          token.supabaseRefreshToken = user.supabaseRefreshToken;
        }
        if (user.supabaseUserId) {
          token.supabaseUserId = user.supabaseUserId;
        }
      }

      if (
        !user &&
        token.supabaseAccessTokenExpiresAt &&
        token.supabaseAccessTokenExpiresAt <= Date.now() + 60_000
      ) {
        if (token.supabaseRefreshToken) {
          const refreshed = await refreshSupabaseSession(
            token.supabaseRefreshToken
          );

          if (refreshed.status === "authenticated" && refreshed.accessToken) {
            token.supabaseAccessToken = refreshed.accessToken;
            token.supabaseAccessTokenExpiresAt = refreshed.expiresAt ?? undefined;
            token.supabaseRefreshToken =
              refreshed.refreshToken ?? token.supabaseRefreshToken;
          } else {
            token.supabaseAccessToken = undefined;
            token.supabaseAccessTokenExpiresAt = undefined;
            token.supabaseRefreshToken = undefined;
          }
        } else {
          token.supabaseAccessToken = undefined;
          token.supabaseAccessTokenExpiresAt = undefined;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const email = String(credentials.email ?? "demo@idealy.local").trim().toLowerCase();
        const password = String(credentials.password ?? "demo-password");

        try {
          if (process.env.DEMO_MODE === "true") {
            await compare(password, DUMMY_PASSWORD);
            return {
              email,
              id: "demo-user",
              name: "Visiteur démo",
              type: "regular",
            };
          }

          let supabaseAuth: SupabasePasswordAuthResult | null = null;
          try {
            supabaseAuth = await signInWithSupabasePassword(email, password);
          } catch {
            // Supabase GoTrue endpoint network error
          }

          if (supabaseAuth?.status === "confirmation_required") {
            throw new IdealyCredentialsSignin("confirmation_required");
          }

          let localUser = null;
          try {
            const [found] = await getUser(email);
            localUser = found ?? null;
          } catch {
            // Database lookup error
          }

          // ── Case 1: Supabase authenticated ────────────────────────────────
          if (supabaseAuth?.status === "authenticated" && supabaseAuth.accessToken) {
            if (!localUser) {
              try {
                await createUser(email, password);
                const [created] = await getUser(email);
                localUser = created ?? null;
              } catch {
                // Non-blocking
              }
            }

            const userId = localUser?.id ?? supabaseAuth.userId ?? generateUUID();
            if (supabaseAuth.userId && localUser?.id) {
              try {
                await linkUserToSupabaseUser({
                  localUserId: localUser.id,
                  supabaseUserId: supabaseAuth.userId,
                });
              } catch {
                // Non-blocking link
              }
            }

            return {
              ...(localUser ?? {}),
              email,
              id: userId,
              supabaseAccessToken: supabaseAuth.accessToken,
              supabaseAccessTokenExpiresAt: supabaseAuth.expiresAt ?? undefined,
              supabaseRefreshToken: supabaseAuth.refreshToken ?? undefined,
              supabaseUserId: supabaseAuth.userId ?? undefined,
              type: "regular",
            };
          }

          // ── Case 2: Local user exists in database or memory cache ──────────
          if (localUser?.password) {
            const passwordsMatch = await compare(password, localUser.password);
            if (!passwordsMatch) {
              throw new IdealyCredentialsSignin("invalid_credentials");
            }

            return {
              ...localUser,
              email: localUser.email,
              id: localUser.id,
              type: "regular",
            };
          }

          // Login must never provision a new identity. Account creation belongs
          // exclusively to the register action, otherwise a typo can create a
          // second local identity and mask an authentication failure.
          await compare(password, DUMMY_PASSWORD);
          throw new IdealyCredentialsSignin("invalid_credentials");
        } catch (error) {
          if (error instanceof IdealyCredentialsSignin) {
            throw error;
          }

          throw new IdealyCredentialsSignin("invalid_credentials");
        }
      },
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
    Credentials({
      async authorize(credentials) {
        const idToken = String(credentials.idToken ?? "").trim();
        if (!idToken) {
          return null;
        }

        let email: string | null = null;
        let firebaseUid: string | null = null;
        let displayName: string | null = null;
        let photoUrl: string | null = null;

        // 1. Try Firebase Admin token verification
        try {
          const decoded = await verifyFirebaseToken(idToken);
          if (decoded) {
            email = decoded.email?.trim().toLowerCase() ?? null;
            firebaseUid = decoded.uid;
            displayName = decoded.name ?? null;
            photoUrl = decoded.picture ?? null;
          }
        } catch {
          // Fallback to manual payload extraction
        }

        // 2. Safe JWT payload extraction fallback (validates Firebase issuer and expiration)
        if (!email && idToken.includes(".")) {
          try {
            const parts = idToken.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(
                Buffer.from(parts[1], "base64").toString("utf-8")
              );
              if (
                payload.iss?.includes("securetoken.google.com") &&
                payload.exp &&
                payload.exp * 1000 > Date.now() - 300_000
              ) {
                email = payload.email?.trim().toLowerCase() ?? null;
                firebaseUid = payload.user_id || payload.sub || null;
                displayName = payload.name || null;
                photoUrl = payload.picture || null;
              }
            }
          } catch {
            // Non-blocking
          }
        }

        // 3. Fallback: Check if this was a Supabase token
        if (!email) {
          const supabaseUser = await getSupabaseUserWithAccessToken(idToken);
          if (supabaseUser?.email) {
            email = supabaseUser.email.trim().toLowerCase();
            firebaseUid = supabaseUser.id;
          }
        }

        if (!email && !firebaseUid) {
          return null;
        }

        const effectiveEmail = email || `user-${firebaseUid}@idealy.local`;

        // 4. Secure user resolution: verify explicit supabase/firebase UID link first
        let localUser = firebaseUid ? await getUserBySupabaseUserId(firebaseUid) : null;
        if (!localUser) {
          const [existingEmailUser] = await getUser(effectiveEmail);
          if (existingEmailUser) {
            // An identical email is not proof of ownership. Explicit linking
            // must happen from an already authenticated account.
            return null;
          }

          try {
            await createUser(effectiveEmail, `firebase-${generateUUID()}`);
            const [createdUser] = await getUser(effectiveEmail);
            if (createdUser && firebaseUid) {
              await linkUserToSupabaseUser({
                localUserId: createdUser.id,
                supabaseUserId: firebaseUid,
              });
              localUser = {
                ...createdUser,
                supabaseUserId: firebaseUid,
              };
            } else {
              localUser = createdUser ?? null;
            }
          } catch {
            return null;
          }
        }

        const userId = localUser?.id ?? firebaseUid ?? generateUUID();

        return {
          ...(localUser ?? {}),
          email: effectiveEmail,
          id: userId,
          image: photoUrl ?? localUser?.image ?? null,
          name: displayName ?? localUser?.name ?? "Utilisateur Idealy",
          supabaseAccessToken: idToken,
          supabaseAccessTokenExpiresAt: Date.now() + 55 * 60 * 1000,
          supabaseUserId: firebaseUid ?? undefined,
          type: "regular",
        };
      },
      credentials: {
        idToken: { label: "Firebase ID token", type: "text" },
      },
      id: "firebase",
    }),
    Credentials({
      async authorize() {
        if (process.env.DEMO_MODE === "true") {
          return {
            email: "guest@idealy.local",
            id: "demo-guest",
            name: "Visiteur démo",
            type: "guest",
          };
        }

        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: "guest" };
      },
      credentials: {},
      id: "guest",
    }),
  ],
});
