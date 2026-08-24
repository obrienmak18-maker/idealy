"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type RegisterActionState, register } from "../actions";

const registerMessages = {
  confirmation_required:
    "Confirmez d’abord votre adresse e-mail avant de vous connecter.",
  invalid_credentials:
    "Le compte a été créé, mais la connexion n’a pas pu être confirmée. Réessayez de vous connecter.",
  invalid_data:
    "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.",
  pending_confirmation:
    "Votre compte est créé. Consultez votre e-mail pour le confirmer avant de vous connecter.",
  service_unavailable:
    "Le service d’inscription est momentanément indisponible. Réessayez dans un instant.",
  user_exists: "Un compte existe déjà avec cette adresse e-mail.",
} as const;

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();
  const feedback =
    state.status in registerMessages
      ? registerMessages[state.status as keyof typeof registerMessages]
      : null;
  const isPositiveFeedback = state.status === "pending_confirmation";

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "user_exists") {
      toast({
        description: "Un compte existe déjà avec cette adresse e-mail.",
        type: "error",
      });
    } else if (state.status === "invalid_credentials") {
      toast({
        description:
          "Le compte a été créé, mais la connexion n’a pas pu être confirmée. Réessayez de vous connecter.",
        type: "error",
      });
    } else if (state.status === "service_unavailable") {
      toast({
        description:
          "Le service d’inscription est momentanément indisponible. Réessayez dans un instant.",
        type: "error",
      });
    } else if (state.status === "pending_confirmation") {
      toast({
        description:
          "Votre compte est créé. Consultez votre e-mail pour le confirmer avant de vous connecter.",
        type: "success",
      });
    } else if (state.status === "invalid_data") {
      toast({
        description:
          "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.",
        type: "error",
      });
    } else if (state.status === "success") {
      toast({ description: "Compte Idealy créé.", type: "success" });
      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Créez votre espace Idealy
      </h1>
      <p className="text-sm text-muted-foreground">
        Donnez une forme concrète à votre prochaine idée.
      </p>
      {feedback ? (
        <p
          aria-live="polite"
          className={
            isPositiveFeedback
              ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
              : "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
          role={isPositiveFeedback ? "status" : "alert"}
        >
          {feedback}
        </p>
      ) : null}
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Créer mon compte</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {"Vous avez déjà un compte ? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/login"
          >
            Se connecter
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
