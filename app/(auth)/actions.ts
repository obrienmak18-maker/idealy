"use server";

import { CredentialsSignin } from "next-auth";
import { z } from "zod";

import { createUser, getUser } from "@/lib/db/queries";
import {
  credentialsOutcomeFromCode,
  credentialsOutcomeFromRedirect,
  type CredentialsAuthenticationOutcome,
} from "@/lib/idealy/auth-outcome";
import { signUpWithSupabasePassword } from "@/lib/idealy/supabase-auth";

import { signIn } from "./auth";

const authFormSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "invalid_credentials"
    | "confirmation_required"
    | "service_unavailable"
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
  password: string
): Promise<LoginActionState> {
  try {
    const result = await signIn("credentials", {
      email,
      password,
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

    if (process.env.DEMO_MODE === "true") {
      return { status: "success" };
    }

    return establishCredentialsSession(
      validatedData.email,
      validatedData.password
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
    | "invalid_data";
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (process.env.DEMO_MODE !== "true") {
      const [user] = await getUser(validatedData.email);

      if (user) {
        return { status: "user_exists" };
      }

      const supabaseAuth = await signUpWithSupabasePassword(
        validatedData.email,
        validatedData.password
      );

      if (supabaseAuth.status === "already_registered") {
        return { status: "user_exists" };
      }

      if (supabaseAuth.status === "unavailable") {
        return { status: "service_unavailable" };
      }

      await createUser(validatedData.email, validatedData.password);

      if (supabaseAuth.status === "confirmation_required") {
        return { status: "pending_confirmation" };
      }
    }

    if (process.env.DEMO_MODE === "true") {
      return { status: "success" };
    }

    return establishCredentialsSession(
      validatedData.email,
      validatedData.password
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "service_unavailable" };
  }
};
