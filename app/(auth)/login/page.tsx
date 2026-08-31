"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn as signInWithAuthJs, useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { FirebaseProviderActions } from "@/components/auth/firebase-provider-actions";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import { signInWithEmailFirebase } from "@/lib/firebase/client";
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
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();
  const feedback =
    firebaseError ??
    (state.status in loginMessages
      ? loginMessages[state.status as keyof typeof loginMessages]
      : null);

  const getSafeCallbackUrl = () => {
    if (typeof window === "undefined") {
      return "/";
    }

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

  const handleSubmit = async (formData: FormData) => {
    setEmail(String(formData.get("email") ?? ""));
    setFirebaseError(null);

    try {
      const idToken = await signInWithEmailFirebase(
        String(formData.get("email") ?? "").trim(),
        String(formData.get("password") ?? "")
      );
      const result = await signInWithAuthJs("firebase", {
        idToken,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("firebase_session_rejected");
      }

      setIsSuccessful(true);
      await updateSession();
      window.location.assign(getOnboardingUrl());
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      if (code === "firebase_not_configured") {
        formAction(formData);
        return;
      }
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setFirebaseError("L’adresse e-mail ou le mot de passe est incorrect.");
        return;
      }
      if (code === "auth/invalid-email") {
        setFirebaseError("Saisissez une adresse e-mail valide.");
        return;
      }
      setFirebaseError(
        "La connexion est indisponible. Vérifiez la configuration Firebase puis réessayez."
      );
    }
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
      <FirebaseProviderActions nextPath={getOnboardingUrl()} />
    </>
  );
}
