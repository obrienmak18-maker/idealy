"use server";

import { CredentialsSignin } from "next-auth";
import { z } from "zod";
import { isDevelopmentEnvironment } from "@/lib/constants";

import { createUser, getUser } from "@/lib/db/queries";
import {
  type CredentialsAuthenticationOutcome,
  credentialsOutcomeFromCode,
  credentialsOutcomeFromRedirect,
} from "@/lib/idealy/auth-outcome";
import { signUpWithSupabasePassword } from "@/lib/idealy/supabase-auth";
import {
  createTurnstileProof,
  isTurnstileRequired,
  verifyTurnstileToken,
} from "@/lib/security/turnstile";

import { signIn } from "./auth";

const authFormSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const registerFormSchema = authFormSchema.extend({
  terms: z.literal("on"),
});

export type LoginActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "invalid_credentials"
    | "confirmation_required"
    | "service_unavailable"
    | "turnstile_failed"
    | "invalid_data";
};

function toLoginActionState(
  status: CredentialsAuthenticationOutcome
): LoginActionState {
  return { status };
}

function signInErrorState(error: unknown): LoginActionState {
  if (error instanceof CredentialsSignin) {
    return toLoginActionState(credentialsOutcomeFromCode(error.code));
  }

  return { status: "service_unavailable" };
}

async function establishCredentialsSession(
  email: string,
  password: string,
  intent: "login" | "register",
  turnstileProof?: string
): Promise<LoginActionState> {
  try {
    const result = await signIn("credentials", {
      email,
      intent,
      password,
      ...(turnstileProof ? { turnstileProof } : {}),
      redirect: false,
    });

    return toLoginActionState(
      credentialsOutcomeFromRedirect(
        typeof result === "string" ? result : undefined
      )
    );
  } catch (error) {
    return signInErrorState(error);
  }
}

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (process.env.DEMO_MODE === "true" && isDevelopmentEnvironment) {
      return { status: "success" };
    }

    let turnstileProof: string | undefined;
    if (isTurnstileRequired()) {
      const challenge = await verifyTurnstileToken(
        String(formData.get("turnstileToken") ?? ""),
        undefined,
        "login"
      );
      if (!challenge.ok) {
        return { status: "turnstile_failed" };
      }
      const proof = createTurnstileProof("credentials-login");
      if (!proof) {
        return { status: "service_unavailable" };
      }
      turnstileProof = proof;
    }

    return await establishCredentialsSession(
      validatedData.email,
      validatedData.password,
      "login",
      turnstileProof
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "service_unavailable" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "invalid_credentials"
    | "confirmation_required"
    | "service_unavailable"
    | "pending_confirmation"
    | "user_exists"
    | "turnstile_failed"
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = registerFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      terms: formData.get("terms"),
    });

    let turnstileProof: string | undefined;
    if (isTurnstileRequired()) {
      const challenge = await verifyTurnstileToken(
        String(formData.get("turnstileToken") ?? ""),
        undefined,
        "register"
      );
      if (!challenge.ok) {
        return { status: "turnstile_failed" };
      }
      const proof = createTurnstileProof("credentials-register");
      if (!proof) {
        return { status: "service_unavailable" };
      }
      turnstileProof = proof;
    }

    const demoMode =
      process.env.DEMO_MODE === "true" && isDevelopmentEnvironment;

    if (!demoMode) {
      let existingUser = null;
      try {
        const users = await getUser(validatedData.email);
        existingUser = users[0];
      } catch {
        return { status: "service_unavailable" };
      }

      if (existingUser) {
        return { status: "user_exists" };
      }

      let supabaseAuth = null;
      try {
        supabaseAuth = await signUpWithSupabasePassword(
          validatedData.email,
          validatedData.password
        );
      } catch {
        return { status: "service_unavailable" };
      }

      if (supabaseAuth?.status === "already_registered") {
        return { status: "user_exists" };
      }

      if (supabaseAuth?.status === "confirmation_required") {
        return { status: "pending_confirmation" };
      }

      if (supabaseAuth?.status !== "authenticated" || !supabaseAuth.userId) {
        return { status: "service_unavailable" };
      }

      try {
        const [createdUser] = await createUser(
          validatedData.email,
          validatedData.password
        );
        if (!createdUser?.id) {
          return { status: "service_unavailable" };
        }
      } catch {
        return { status: "service_unavailable" };
      }
    }

    if (demoMode) {
      return { status: "success" };
    }

    return await establishCredentialsSession(
      validatedData.email,
      validatedData.password,
      "register",
      turnstileProof
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "service_unavailable" };
  }
};
