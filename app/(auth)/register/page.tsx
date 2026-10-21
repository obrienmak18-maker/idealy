"use client";

import Link from "next/link";
import { startTransition, useActionState, useCallback, useEffect, useState } from "react";

import { FirebaseProviderActions } from "@/components/auth/firebase-provider-actions";
import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
import {
  isFirebaseConfigured,
  sendEmailVerificationFirebase,
  signUpWithEmailFirebase,
} from "@/lib/firebase/client";
import { isIdealyWay } from "@/lib/idealy/product-contract";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { type RegisterActionState, register } from "../actions";

const registerMessages = {
  confirmation_required:
    "Le compte a été créé, mais la connexion n’a pas pu être confirmée. Réessayez de vous connecter.",
  invalid_credentials:
    "Le compte a été créé, mais la connexion n’a pas pu être confirmée. Réessayez de vous connecter.",
  invalid_data:
    "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.",
  pending_confirmation:
    "Votre compte est créé. Consultez votre e-mail pour le confirmer avant de vous connecter.",
  service_unavailable:
    "Le service d’inscription est momentanément indisponible. Réessayez dans un instant.",
  turnstile_failed: "La vérification anti-robot a échoué ou a expiré. Recommencez la vérification.",
  user_exists: "Un compte existe déjà avec cette adresse e-mail.",
} as const;

function firebaseErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null) {
    if ("code" in error && typeof (error as { code: unknown }).code === "string") {
      return (error as { code: string }).code;
    }
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return "";
}

import { useTranslation } from "@/lib/i18n/provider";

export default function Page() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const turnstileClientEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim()
  );

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTermsAccepted(e.target.checked);
    },
    []
  );

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const legacyFeedback =
    state.status in registerMessages
      ? registerMessages[state.status as keyof typeof registerMessages]
      : null;
  const feedback = firebaseError ?? legacyFeedback;
  const isPositiveFeedback =
    !firebaseError && state.status === "pending_confirmation";

  const getOnboardingUrl = () => {
    if (typeof window === "undefined") {
      return "/onboarding";
    }

    const params = new URLSearchParams(window.location.search);
    const selectedWay = params.get("way");
    const onboarding = new URLSearchParams();
    if (isIdealyWay(selectedWay)) onboarding.set("way", selectedWay);
    for (const key of ["plan", "level", "cycle", "power"]) {
      const value = params.get(key);
      if (value && value.length <= 32) onboarding.set(key, value);
    }
    const query = onboarding.toString();
    return query ? `/onboarding?${query}` : "/onboarding";
  };

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
      window.location.replace(getOnboardingUrl());
    }
  }, [state.status]);

  const handleSubmit = async (formData: FormData) => {
    const emailValue = String(formData.get("email") ?? "").trim().toLowerCase();
    const passwordValue = String(formData.get("password") ?? "");
    setEmail(emailValue);
    setFirebaseError(null);
    setPendingConfirmation(false);

    if (formData.get("terms") !== "on") {
      setFirebaseError(
        "Acceptez les conditions d’utilisation et la politique de confidentialité pour continuer."
      );
      return;
    }

    if (turnstileClientEnabled && !String(formData.get("turnstileToken") ?? "").trim()) {
      setFirebaseError("Complétez la vérification anti-robot avant de créer votre compte.");
      return;
    }

    if (!isFirebaseConfigured()) {
      startTransition(() => {
        formAction(formData);
      });
      setTurnstileToken("");
      return;
    }

    try {
      const preflight = await fetch("/api/auth/register/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValue,
          turnstileToken: String(formData.get("turnstileToken") ?? ""),
        }),
      });
      const result = (await preflight.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
      };
      setTurnstileToken("");

      if (preflight.status === 409 || result.status === "user_exists") {
        setFirebaseError("Un compte existe déjà avec cette adresse e-mail. Connectez-vous plutôt que de créer un nouveau compte.");
        return;
      }
      if (!preflight.ok) {
        setFirebaseError(
          result.error === "turnstile_failed"
            ? "La vérification anti-robot a échoué ou a expiré. Recommencez la vérification."
            : "Le service d’inscription est momentanément indisponible. Réessayez dans un instant."
        );
        return;
      }
    } catch {
      setTurnstileToken("");
      setFirebaseError("Le service d’inscription est momentanément indisponible. Réessayez dans un instant.");
      return;
    }

    try {
      await signUpWithEmailFirebase(emailValue, passwordValue);
      try {
        await sendEmailVerificationFirebase();
      } catch {
        setPendingConfirmation(true);
        setFirebaseError("Votre compte a été créé, mais l’e-mail de confirmation n’a pas pu être envoyé. Réessayez depuis la page de connexion.");
        return;
      }

      setPendingConfirmation(true);
      setIsSuccessful(true);
      toast({ description: "Compte créé. Consultez votre e-mail pour confirmer votre adresse avant de vous connecter.", type: "success" });
    } catch (error) {
      const code = firebaseErrorCode(error);
      if (code === "auth/email-already-in-use") {
        setFirebaseError("Un compte existe déjà avec cette adresse e-mail. Connectez-vous plutôt que de créer un nouveau compte.");
        return;
      }
      if (code === "auth/invalid-email" || code === "auth/weak-password") {
        setFirebaseError("Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum.");
        return;
      }
      setFirebaseError("La création du compte est indisponible. Vérifiez votre connexion puis réessayez.");
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("auth.registerTitle") || "Créez votre espace Idealy"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("auth.registerSubtitle") || "Donnez une forme concrète à votre prochaine idée."}
      </p>
      {feedback ? (
        <div
          aria-live="polite"
          className={
            isPositiveFeedback
              ? "rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300 flex flex-col gap-1 shadow-sm"
              : "rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive flex flex-col gap-1.5 shadow-sm"
          }
          role={isPositiveFeedback ? "status" : "alert"}
        >
          <div className="flex items-center gap-2 font-medium">
            <span
              className={
                isPositiveFeedback
                  ? "size-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
                  : "size-2 rounded-full bg-destructive animate-pulse shrink-0"
              }
            />
            <span>{feedback}</span>
          </div>
          {feedback.includes("existe déjà") ? (
            <div className="flex items-center gap-2 text-xs pt-1 pl-4">
              <Link
                className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
                href="/login"
                prefetch={true}
              >
                Aller sur la page de connexion &rarr;
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      <TurnstileField action="register" value={turnstileToken} onChange={setTurnstileToken} />
      {pendingConfirmation ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-foreground" role="status">
          <p className="font-semibold">Vérifiez votre adresse e-mail</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Nous avons envoyé un lien de confirmation à {email}. Ouvrez ce lien avant de vous connecter.
          </p>
          <Link className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4" href="/login">
            J’ai confirmé mon adresse — me connecter
          </Link>
        </div>
      ) : (
      <AuthForm action={handleSubmit} defaultEmail={email} passwordAutoComplete="new-password">
        <input name="turnstileToken" type="hidden" value={turnstileToken} />
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground cursor-pointer select-none">
          <input
            checked={termsAccepted}
            className="mt-0.5 size-4 shrink-0 accent-foreground cursor-pointer"
            name="terms"
            onChange={handleTermsChange}
            required
            type="checkbox"
          />
          <span>
            {t("auth.termsPrefix", "J’accepte les")} {" "}
            <Link className="text-foreground underline" href="/terms" prefetch={true}>
              {t("auth.termsLink", "conditions d’utilisation")}
            </Link>{" "}
            {t("auth.termsConnector", "et la")} {" "}
            <Link className="text-foreground underline" href="/privacy" prefetch={true}>
              {t("auth.privacyLink", "politique de confidentialité")}
            </Link>
            .
          </span>
        </label>
        <SubmitButton isSuccessful={isSuccessful}>
          {t("auth.submitRegister") || "Créer mon compte"}
        </SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          {t("auth.haveAccount") ? `${t("auth.haveAccount")} ` : "Vous avez déjà un compte ? "}
          <Link
            className="text-foreground underline-offset-4 hover:underline"
            href="/login"
            prefetch={true}
          >
            {t("auth.submitLogin") || "Se connecter"}
          </Link>
        </p>
      </AuthForm>
      )}
      {!pendingConfirmation ? (
        <FirebaseProviderActions
          nextPath={getOnboardingUrl()}
          requireTerms={true}
          termsAccepted={termsAccepted}
          turnstileToken={turnstileToken}
          onTurnstileTokenChange={setTurnstileToken}
        />
      ) : null}
    </>
  );
}
