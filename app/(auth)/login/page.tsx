"use client";

import Link from "next/link";
import { signIn as signInWithAuthJs } from "next-auth/react";
import { startTransition, useActionState, useEffect, useState } from "react";

import { FirebaseProviderActions } from "@/components/auth/firebase-provider-actions";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import {
  isFirebaseConfigured,
  prepareFirebaseIdTokenForSupabase,
  requestPasswordResetFirebase,
  signInWithEmailFirebase,
  isFirebaseCurrentUserEmailVerified,
  sendEmailVerificationFirebase,
} from "@/lib/firebase/client";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { type LoginActionState, login } from "../actions";

const loginMessages = {
  confirmation_required:
    "Confirmez d’abord votre adresse e-mail, puis reconnectez-vous.",
  invalid_credentials: "L’adresse e-mail ou le mot de passe est incorrect.",
  invalid_data:
    "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.",
  service_unavailable:
    "Le service de connexion est momentanément indisponible. Réessayez dans un instant.",
  turnstile_failed: "La vérification anti-robot a échoué ou a expiré. Recommencez la vérification.",
} as const;

function extractErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("code" in error && typeof (error as { code: unknown }).code === "string") {
      const { code } = error as { code: string };
      return code;
    }
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      const { message } = error as { message: string };
      return message;
    }
  }
  return "";
}

import { useTranslation } from "@/lib/i18n/provider";

export default function Page() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const turnstileClientEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim()
  );

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

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

  const getDestinationUrl = () => {
    const callbackUrl = getSafeCallbackUrl();
    return callbackUrl || "/";
  };
  const getOnboardingUrl = () => getDestinationUrl();

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
      window.location.replace(getDestinationUrl());
    }
  }, [state.status]);

  const handleSubmit = async (formData: FormData) => {
    setEmail(String(formData.get("email") ?? ""));
    setFirebaseError(null);
    setEmailVerificationRequired(false);

    if (turnstileClientEnabled && !String(formData.get("turnstileToken") ?? "").trim()) {
      setFirebaseError("Complétez la vérification anti-robot avant de vous connecter.");
      return;
    }

    if (!isFirebaseConfigured()) {
      startTransition(() => {
        formAction(formData);
      });
      setTurnstileToken("");
      return;
    }

    let idToken: string;
    try {
      idToken = await signInWithEmailFirebase(
        String(formData.get("email") ?? "").trim(),
        String(formData.get("password") ?? "")
      );
    } catch (error) {
      const code = extractErrorCode(error);
      if (code === "auth/too-many-requests") {
        setFirebaseError("Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.");
        setTurnstileToken("");
        return;
      }
      if (code === "auth/invalid-email") {
        setFirebaseError("Saisissez une adresse e-mail valide.");
        setTurnstileToken("");
        return;
      }

      // Firebase rejected the credentials before the Turnstile token reached
      // Auth.js. The server action can safely validate it for the fallback path.
      startTransition(() => {
        formAction(formData);
      });
      setTurnstileToken("");
      return;
    }

    if (!isFirebaseCurrentUserEmailVerified()) {
      setEmailVerificationRequired(true);
      setFirebaseError("Votre adresse e-mail n’est pas encore confirmée. Ouvrez le lien reçu par e-mail, puis reconnectez-vous.");
      return;
    }

    try {
      const supabaseIdToken = await prepareFirebaseIdTokenForSupabase(idToken);
      const result = await signInWithAuthJs("firebase", {
        idToken: supabaseIdToken,
        turnstileToken: String(formData.get("turnstileToken") ?? ""),
        redirect: false,
      });

      setTurnstileToken("");
      if (!result || result.error || result.ok === false) {
        // The challenge may already have been consumed by Auth.js: never
        // submit the same single-use token again through the fallback action.
        setFirebaseError("L’identité a été reconnue, mais la session Idealy n’a pas pu être créée. Réessayez avec une nouvelle vérification.");
        return;
      }

      setIsSuccessful(true);
      window.location.replace(getOnboardingUrl());
    } catch {
      setTurnstileToken("");
      setFirebaseError("La connexion sécurisée n’a pas pu être finalisée. Vérifiez votre connexion puis recommencez.");
    }
  };

  const handleResendVerification = async () => {
    if (turnstileClientEnabled && !turnstileToken) {
      setFirebaseError("Complétez la vérification anti-robot pour renvoyer l’e-mail.");
      return;
    }

    setIsResendingVerification(true);
    try {
      const response = await fetch("/api/auth/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });
      if (!response.ok) {
        setFirebaseError("La vérification anti-robot a expiré. Recommencez-la puis réessayez.");
        setTurnstileToken("");
        return;
      }

      await sendEmailVerificationFirebase();
      setFirebaseError(null);
      toast({ description: "E-mail de confirmation renvoyé. Consultez votre boîte de réception.", type: "success" });
      setTurnstileToken("");
    } catch {
      setFirebaseError("Impossible de renvoyer l’e-mail de confirmation pour le moment.");
      setTurnstileToken("");
    } finally {
      setIsResendingVerification(false);
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
        <div
          aria-live="polite"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive flex flex-col gap-1.5 shadow-sm"
          role="alert"
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="size-2 rounded-full bg-destructive animate-pulse shrink-0" />
            <span>{feedback}</span>
          </div>
          {feedback.includes("incorrect") ? (
            <p className="text-xs text-muted-foreground/90 pl-4">
              Si votre compte a été créé avec Google, vous pouvez cliquer directement sur &laquo;&nbsp;Continuer avec Google&nbsp;&raquo; ci-dessous.
            </p>
          ) : null}
        </div>
      ) : null}
      <TurnstileField action="login" value={turnstileToken} onChange={setTurnstileToken} />
      <AuthForm action={handleSubmit} defaultEmail={email} onEmailChange={setEmail}>
        <input name="turnstileToken" type="hidden" value={turnstileToken} />
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
      {emailVerificationRequired ? (
        <button
          className="min-h-10 rounded-xl border border-border/60 px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
          disabled={isResendingVerification}
          onClick={handleResendVerification}
          type="button"
        >
          {isResendingVerification ? "Envoi en cours…" : "Renvoyer l’e-mail de confirmation"}
        </button>
      ) : null}
      <FirebaseProviderActions
        nextPath={getDestinationUrl()}
        turnstileToken={turnstileToken}
        onTurnstileTokenChange={setTurnstileToken}
      />
    </>
  );
}
