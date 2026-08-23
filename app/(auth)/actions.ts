"use server";

import { z } from "zod";

import { createUser, getUser } from "@/lib/db/queries";
import { signUpWithSupabasePassword } from "@/lib/idealy/supabase-auth";

import { signIn } from "./auth";

const authFormSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

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

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
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
        return { status: "user_exists" } as RegisterActionState;
      }

      const supabaseAuth = await signUpWithSupabasePassword(
        validatedData.email,
        validatedData.password
      );

      if (supabaseAuth.status === "already_registered") {
        return { status: "user_exists" } as RegisterActionState;
      }

      if (supabaseAuth.status === "unavailable") {
        return { status: "failed" } as RegisterActionState;
      }

      await createUser(validatedData.email, validatedData.password);

      if (supabaseAuth.status === "confirmation_required") {
        return { status: "pending_confirmation" } as RegisterActionState;
      }
    }

    if (process.env.DEMO_MODE === "true") {
      return { status: "success" };
    }

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }

    return { status: "failed" };
  }
};
