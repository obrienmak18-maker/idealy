import { compare } from "bcrypt-ts";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DUMMY_PASSWORD, isDevelopmentEnvironment } from "@/lib/constants";
import {
  createUser,
  getUser,
  getUserById,
  getUserBySupabaseUserId,
  linkUserToSupabaseUser,
  updateUserPassword,
} from "@/lib/db/queries";
import {
  getSupabaseUserWithAccessToken,
  refreshSupabaseSession,
  signInFirebaseUserThroughSupabase,
  signInWithSupabasePassword,
  type SupabasePasswordAuthResult,
} from "@/lib/idealy/supabase-auth";
import { generateUUID } from "@/lib/utils";
import { verifyFirebaseToken } from "@/lib/firebase/admin";
import {
  isTurnstileRequired,
  verifyTurnstileProof,
  verifyTurnstileToken,
} from "@/lib/security/turnstile";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

class IdealyCredentialsSignin extends CredentialsSignin {
  constructor(
    code:
      | "confirmation_required"
      | "invalid_credentials"
      | "service_unavailable"
      | "turnstile_failed"
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
        if (user.email) {
          token.email = user.email;
        }
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

      if (!token.supabaseAccessToken) {
        let email =
          typeof token.email === "string" && token.email.trim()
            ? token.email.trim().toLowerCase()
            : null;
        if (!email && token.id) {
          const localUser = await getUserById(token.id).catch(() => null);
          if (localUser?.email) {
            email = localUser.email.trim().toLowerCase();
          }
        }
        if (
          email &&
          !email.endsWith("@idealy.local") &&
          !email.startsWith("guest-")
        ) {
          try {
            const bridge = await signInFirebaseUserThroughSupabase(email);
            if (bridge.status === "authenticated" && bridge.accessToken) {
              token.supabaseAccessToken = bridge.accessToken;
              token.supabaseAccessTokenExpiresAt =
                bridge.expiresAt ?? undefined;
              token.supabaseRefreshToken =
                bridge.refreshToken ?? token.supabaseRefreshToken;
              token.supabaseUserId = bridge.userId ?? token.supabaseUserId;
            }
          } catch (err) {
            console.error("Auto-bridge failed in JWT callback:", err);
          }
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
          const intent = credentials.intent === "register" ? "register" : "login";
          if (isTurnstileRequired()) {
            const proof = String(credentials.turnstileProof ?? "").trim();
            const token = String(credentials.turnstileToken ?? "").trim();
            const verified = proof
              ? verifyTurnstileProof(proof, `credentials-${intent}`)
              : (await verifyTurnstileToken(token)).ok;
            if (!verified) {
              throw new IdealyCredentialsSignin("turnstile_failed");
            }
          }

          if (process.env.DEMO_MODE === "true" && isDevelopmentEnvironment) {
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
            throw new IdealyCredentialsSignin("service_unavailable");
          }

          if (supabaseAuth.status === "confirmation_required") {
            throw new IdealyCredentialsSignin("confirmation_required");
          }

          if (supabaseAuth.status === "invalid_credentials") {
            let foundUser = null;
            try {
              const [found] = await getUser(email);
              foundUser = found ?? null;
            } catch {
              throw new IdealyCredentialsSignin("invalid_credentials");
            }

            if (foundUser?.password && foundUser.password !== "auto-provisioned") {
              const matches = await compare(password, foundUser.password);
              if (matches) {
                const bridge = await signInFirebaseUserThroughSupabase(email).catch(() => null);
                return {
                  ...foundUser,
                  email,
                  id: foundUser.id,
                  supabaseAccessToken: bridge?.accessToken ?? undefined,
                  supabaseAccessTokenExpiresAt: bridge?.expiresAt ?? undefined,
                  supabaseRefreshToken: bridge?.refreshToken ?? undefined,
                  supabaseUserId: bridge?.userId ?? foundUser.supabaseUserId,
                  type: "regular",
                };
              }
            }

            if (foundUser?.password === "auto-provisioned" && foundUser.id) {
              try {
                const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
                const supabaseUrl = process.env.SUPABASE_URL?.trim();
                if (supabaseAdminKey && supabaseUrl && foundUser.supabaseUserId) {
                  const { createClient } = await import("@supabase/supabase-js");
                  const admin = createClient(supabaseUrl, supabaseAdminKey);
                  await admin.auth.admin.updateUserById(foundUser.supabaseUserId, {
                    password,
                    email_confirm: true,
                  });
                }
                await updateUserPassword({ userId: foundUser.id, password });
                const bridge = await signInFirebaseUserThroughSupabase(email).catch(() => null);
                return {
                  ...foundUser,
                  email,
                  id: foundUser.id,
                  supabaseAccessToken: bridge?.accessToken ?? undefined,
                  supabaseAccessTokenExpiresAt: bridge?.expiresAt ?? undefined,
                  supabaseRefreshToken: bridge?.refreshToken ?? undefined,
                  supabaseUserId: bridge?.userId ?? foundUser.supabaseUserId,
                  type: "regular",
                };
              } catch (updateError) {
                console.warn("[Auth] Updating auto-provisioned user password failed:", updateError);
              }
            }

            throw new IdealyCredentialsSignin("invalid_credentials");
          }

          if (
            supabaseAuth.status !== "authenticated" ||
            !supabaseAuth.accessToken ||
            !supabaseAuth.userId
          ) {
            throw new IdealyCredentialsSignin("service_unavailable");
          }

          let localUser = null;
          try {
            const [found] = await getUser(email);
            localUser = found ?? null;
          } catch {
            throw new IdealyCredentialsSignin("service_unavailable");
          }

          if (!localUser) {
            if (credentials.intent === "register") {
              try {
                await createUser(email, password);
                const [created] = await getUser(email);
                localUser = created ?? null;
              } catch {
                throw new IdealyCredentialsSignin("service_unavailable");
              }
            } else {
              try {
                const [created] = await createUser(email, password);
                localUser = created ?? null;
              } catch {
                throw new IdealyCredentialsSignin("service_unavailable");
              }
            }
          }

          if (!localUser?.id) {
            throw new IdealyCredentialsSignin("service_unavailable");
          }

          try {
            await linkUserToSupabaseUser({
              localUserId: localUser.id,
              supabaseUserId: supabaseAuth.userId,
            });
          } catch {
            throw new IdealyCredentialsSignin("service_unavailable");
          }

          return {
            ...localUser,
            email,
            id: localUser.id,
            supabaseAccessToken: supabaseAuth.accessToken,
            supabaseAccessTokenExpiresAt: supabaseAuth.expiresAt ?? undefined,
            supabaseRefreshToken: supabaseAuth.refreshToken ?? undefined,
            supabaseUserId: supabaseAuth.userId,
            type: "regular",
          };
        } catch (error) {
          if (error instanceof IdealyCredentialsSignin) {
            throw error;
          }

          throw new IdealyCredentialsSignin("invalid_credentials");
        }
      },
      credentials: {
        email: { label: "Email", type: "email" },
        intent: { label: "Intent", type: "text" },
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
        let supabaseAuth: SupabasePasswordAuthResult | null = null;

        if (isTurnstileRequired()) {
          const challenge = await verifyTurnstileToken(
            String(credentials.turnstileToken ?? "")
          );
          if (!challenge.ok) {
            throw new IdealyCredentialsSignin("turnstile_failed");
          }
        }

        // 1. Try Firebase Admin token verification
        try {
          const decoded = await verifyFirebaseToken(idToken);
          if (decoded) {
            email = decoded.email?.trim().toLowerCase() ?? null;
            firebaseUid = decoded.uid;
            displayName = decoded.name ?? null;
            photoUrl = decoded.picture ?? null;

            if (!email) {
              throw new IdealyCredentialsSignin("service_unavailable");
            }

            if (decoded.email_verified !== true) {
              throw new IdealyCredentialsSignin("confirmation_required");
            }

            supabaseAuth = await signInFirebaseUserThroughSupabase(email);
            if (supabaseAuth.status !== "authenticated" || !supabaseAuth.accessToken) {
              console.error("[Firebase sign-in] Supabase bridge did not establish a session.", {
                status: supabaseAuth.status,
                configured: supabaseAuth.configured,
                hasAccessToken: Boolean(supabaseAuth.accessToken),
                hasUserId: Boolean(supabaseAuth.userId),
                hasSupabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
                hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
                hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
              });
              throw new IdealyCredentialsSignin("service_unavailable");
            }
          }
        } catch (error) {
          if (error instanceof IdealyCredentialsSignin) throw error;
          // Firebase Admin verification is authoritative. Never trust an unverified JWT payload.
        }

        // 2. Fallback: Check if this was a Supabase token
        if (!supabaseAuth?.accessToken) {
          const supabaseUser = await getSupabaseUserWithAccessToken(idToken);
          if (supabaseUser?.email) {
            email = supabaseUser.email.trim().toLowerCase();
            supabaseAuth = {
              accessToken: idToken,
              configured: true,
              expiresAt: Date.now() + 55 * 60 * 1000,
              refreshToken: null,
              status: "authenticated",
              userId: supabaseUser.id,
            };
            firebaseUid = null;
          }
        }

        if (!email || !supabaseAuth?.accessToken || !supabaseAuth.userId) {
          return null;
        }

        const effectiveEmail = email;
        const supabaseUserId = supabaseAuth.userId;
        let localUser = await getUserBySupabaseUserId(supabaseUserId);

        if (!localUser) {
          const [existingEmailUser] = await getUser(effectiveEmail);

          if (existingEmailUser) {
            try {
              await linkUserToSupabaseUser({
                localUserId: existingEmailUser.id,
                supabaseUserId,
              });
            } catch (linkError) {
              console.warn("[Auth] Linking verified Google user to Supabase:", linkError);
            }
            localUser = {
              ...existingEmailUser,
              supabaseUserId,
            };
          } else {
            try {
              const [createdUser] = await createUser(
                effectiveEmail,
                `firebase-${generateUUID()}`,
              );

              if (!createdUser) {
                throw new IdealyCredentialsSignin("service_unavailable");
              }

              await linkUserToSupabaseUser({
                localUserId: createdUser.id,
                supabaseUserId,
              });

              localUser = {
                ...createdUser,
                supabaseUserId,
              };
            } catch (error) {
              if (error instanceof IdealyCredentialsSignin) throw error;
              throw new IdealyCredentialsSignin("service_unavailable");
            }
          }
        }

        const userId = localUser.id;

        return {
          ...(localUser ?? {}),
          email: effectiveEmail,
          id: userId,
          image: photoUrl ?? localUser?.image ?? null,
          name: displayName ?? localUser?.name ?? "Utilisateur Idealy",
          supabaseAccessToken: supabaseAuth.accessToken,
          supabaseAccessTokenExpiresAt: supabaseAuth.expiresAt ?? undefined,
          supabaseRefreshToken: supabaseAuth.refreshToken ?? undefined,
          supabaseUserId: supabaseAuth.userId,
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
        if (process.env.DEMO_MODE === "true" && isDevelopmentEnvironment) {
          return {
            email: "guest@idealy.local",
            id: "demo-guest",
            name: "Visiteur démo",
            type: "guest",
          };
        }

        throw new IdealyCredentialsSignin("invalid_credentials");
      },
      credentials: {},
      id: "guest",
    }),
  ],
});
