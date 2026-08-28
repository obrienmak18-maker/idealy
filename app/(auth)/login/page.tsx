"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { type LoginActionState, login } from "../actions";

const loginMessages = {
  confirmation_required:
    "Confirmez d’abord votre adresse e-mail, puis reconnectez-vous.",
  invalid_credentials: "L’adresse e-mail ou le mot de passe est incorrect.",
  invalid_data:
    "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.",
  service_unavailable:
    "Le service de connexion est momentanément indisponible. Réessayez dans un instant.",
} as const;

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();
  const feedback =
    state.status in loginMessages
      ? loginMessages[state.status as keyof typeof loginMessages]
      : null;

  const getSafeCallbackUrl = () => {
    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl"
    );

    return callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";
  };

  const getOnboardingUrl = () =>
    `/onboarding?next=${encodeURIComponent(getSafeCallbackUrl())}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "invalid_credentials") {
      toast({
        description: "L’adresse e-mail ou le mot de passe est incorrect.",
        type: "error",
      });
    } else if (state.status === "confirmation_required") {
      toast({
        description:
          "Confirmez d’abord votre adresse e-mail, puis reconnectez-vous.",
        type: "error",
      });
    } else if (state.status === "service_unavailable") {
      toast({
        description:
          "Le service de connexion est momentanément indisponible. Réessayez dans un instant.",
        type: "error",
      });
    } else if (state.status === "invalid_data") {
      toast({
        description:
          "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.",
        type: "error",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      updateSession();
      router.push(getOnboardingUrl());
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
        Heureux de vous revoir
      </h1>
      <p className="text-sm text-muted-foreground">
        Connectez-vous pour reprendre votre mission.
      </p>
      {feedback ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {feedback}
        </p>
      ) : null}
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Se connecter</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {"Pas encore de compte ? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/register"
          >
            Créer un compte
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
