"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn as signInWithAuthJs, useSession } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { FirebaseProviderActions } from "@/components/auth/firebase-provider-actions";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import {
  isFirebaseConfigured,
  prepareFirebaseIdTokenForSupabase,
  requestPasswordResetFirebase,
  signInWithEmailFirebase,
} from "@/lib/firebase/client";
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

import { useTranslation } from "@/lib/i18n/provider";

export default function Page() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
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

    if (!callbackUrl?.startsWith("/")) return "/";
    try {
      const destination = new URL(callbackUrl, window.location.origin);
      if (destination.origin !== window.location.origin) return "/";
      return `${destination.pathname}${destination.search}${destination.hash}`;
    } catch {
      return "/";
    }
  };

  const getOnboardingUrl = () => {
    const callbackUrl = getSafeCallbackUrl();
    if (callbackUrl.startsWith("/onboarding?")) return callbackUrl;
    return `/onboarding?next=${encodeURIComponent(callbackUrl)}`;
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast({ description: "Saisissez votre adresse e-mail pour recevoir le lien de réinitialisation.", type: "error" });
      return;
    }
    if (!isFirebaseConfigured()) {
      toast({ description: "La réinitialisation du mot de passe n’est pas configurée pour cette connexion.", type: "error" });
      return;
    }
    setIsResettingPassword(true);
    try {
      await requestPasswordResetFirebase(normalizedEmail);
      toast({ description: "Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.", type: "success" });
    } catch {
      toast({ description: "L’envoi du lien a échoué. Vérifiez l’adresse puis réessayez.", type: "error" });
    } finally {
      setIsResettingPassword(false);
    }
  };

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

    if (!isFirebaseConfigured()) {
      formAction(formData);
      return;
    }

    try {
      const idToken = await signInWithEmailFirebase(
        String(formData.get("email") ?? "").trim(),
        String(formData.get("password") ?? "")
      );

      const supabaseIdToken = await prepareFirebaseIdTokenForSupabase(idToken);

      const result = await signInWithAuthJs("firebase", {
        idToken: supabaseIdToken,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("firebase_session_rejected");
      }

      setIsSuccessful(true);
      await updateSession();
      window.location.assign(getOnboardingUrl());
    } catch (error) {
      let code = "";
      if (typeof error === "object" && error !== null) {
        if ("code" in error && typeof (error as { code: unknown }).code === "string") {
          code = (error as { code: string }).code;
        } else if ("message" in error && typeof (error as { message: unknown }).message === "string") {
          code = (error as { message: string }).message;
        }
      }
      if (code === "firebase_not_configured") {
        formAction(formData);
        return;
      }
      if (code === "firebase_backend_unavailable") {
        setFirebaseError(
          "La connexion sécurisée au workspace n’est pas disponible. Réessayez dans un instant."
        );
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
        {t("auth.loginTitle") || "Heureux de vous revoir"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("auth.loginSubtitle") || "Connectez-vous pour reprendre votre mission."}
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
      <AuthForm action={handleSubmit} defaultEmail={email} onEmailChange={setEmail}>
        <div className="-mt-2 flex justify-end">
          <button
            className="min-h-9 rounded-lg px-2 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={isResettingPassword}
            onClick={handlePasswordReset}
            type="button"
          >
            {isResettingPassword ? "Envoi du lien…" : "Mot de passe oublié ?"}
          </button>
        </div>
        <SubmitButton isSuccessful={isSuccessful}>
          {t("auth.submitLogin") || "Se connecter"}
        </SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {t("auth.noAccount") ? `${t("auth.noAccount")} ` : "Pas encore de compte ? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/register"
            prefetch={true}
          >
            {t("auth.submitRegister") || "Créer un compte"}
          </Link>
        </p>
      </AuthForm>
      <FirebaseProviderActions nextPath={getOnboardingUrl()} />
    </>
  );
}
