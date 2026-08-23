import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DUMMY_PASSWORD } from "@/lib/constants";
import {
  createGuestUser,
  getUser,
  linkUserToSupabaseUser,
} from "@/lib/db/queries";
import {
  refreshSupabaseSession,
  signInWithSupabasePassword,
} from "@/lib/idealy/supabase-auth";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular";

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
    type: UserType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    supabaseAccessToken?: string;
    supabaseAccessTokenExpiresAt?: number;
    supabaseRefreshToken?: string;
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
          token.supabaseAccessTokenExpiresAt = user.supabaseAccessTokenExpiresAt;
        }
        if (user.supabaseRefreshToken) {
          token.supabaseRefreshToken = user.supabaseRefreshToken;
        }
      }

      if (
        !user &&
        token.supabaseRefreshToken &&
        token.supabaseAccessTokenExpiresAt &&
        token.supabaseAccessTokenExpiresAt <= Date.now() + 60_000
      ) {
        const refreshed = await refreshSupabaseSession(
          token.supabaseRefreshToken
        );

        if (refreshed.status === "authenticated" && refreshed.accessToken) {
          token.supabaseAccessToken = refreshed.accessToken;
          token.supabaseAccessTokenExpiresAt =
            refreshed.expiresAt ?? undefined;
          token.supabaseRefreshToken =
            refreshed.refreshToken ?? token.supabaseRefreshToken;
        } else {
          token.supabaseAccessToken = undefined;
          token.supabaseAccessTokenExpiresAt = undefined;
          token.supabaseRefreshToken = undefined;
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
        const email = String(credentials.email ?? "demo@idealy.local");
        const password = String(credentials.password ?? "demo-password");

        if (process.env.DEMO_MODE === "true") {
          await compare(password, DUMMY_PASSWORD);
          return {
            email,
            id: "demo-user",
            name: "Visiteur démo",
            type: "regular",
          };
        }

        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);

        if (!passwordsMatch) {
          return null;
        }

        const supabaseAuth = await signInWithSupabasePassword(email, password);

        if (
          supabaseAuth.configured &&
          (supabaseAuth.status !== "authenticated" ||
            !supabaseAuth.accessToken ||
            !supabaseAuth.userId)
        ) {
          return null;
        }

        if (supabaseAuth.userId) {
          await linkUserToSupabaseUser({
            localUserId: user.id,
            supabaseUserId: supabaseAuth.userId,
          });
        }

        return {
          ...user,
          ...(supabaseAuth.accessToken
            ? { supabaseAccessToken: supabaseAuth.accessToken }
            : {}),
          ...(supabaseAuth.expiresAt
            ? { supabaseAccessTokenExpiresAt: supabaseAuth.expiresAt }
            : {}),
          ...(supabaseAuth.refreshToken
            ? { supabaseRefreshToken: supabaseAuth.refreshToken }
            : {}),
          type: "regular",
        };
      },
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
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
