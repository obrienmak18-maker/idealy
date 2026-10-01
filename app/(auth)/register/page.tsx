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
  signUpWithEmailFirebase,
} from "@/lib/firebase/client";
import { isIdealyWay } from "@/lib/idealy/product-contract";
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
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();
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

    const selectedWay = new URLSearchParams(window.location.search).get("way");
    return isIdealyWay(selectedWay)
      ? `/onboarding?way=${encodeURIComponent(selectedWay)}`
      : "/onboarding";
  };

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
      router.push(getOnboardingUrl());
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = async (formData: FormData) => {
    setEmail(String(formData.get("email") ?? ""));
    setFirebaseError(null);

    if (formData.get("terms") !== "on") {
      setFirebaseError(
        "Acceptez les conditions d’utilisation et la politique de confidentialité pour continuer."
      );
      return;
    }

    if (!isFirebaseConfigured()) {
      formAction(formData);
      return;
    }

    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = String(formData.get("password") ?? "");

    try {
      const idToken = await signUpWithEmailFirebase(
        emailValue,
        passwordValue
      );

      // ── Set role:"authenticated" custom claim server-side ────────────────
      // Required for Supabase Third-Party Auth to grant the Postgres
      // "authenticated" role. Non-blocking: if Admin SDK is not yet configured
      // the endpoint returns 503 and we continue anyway.
      try {
        await fetch("/api/auth/set-claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      } catch {
        // Admin SDK not configured yet — will still work with Supabase anon role
      }

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
      const code = firebaseErrorCode(error);
      if (code === "firebase_not_configured") {
        formAction(formData);
        return;
      }
      if (code === "auth/email-already-in-use") {
        setFirebaseError("Un compte existe déjà avec cette adresse e-mail.");
        return;
      }
      if (code === "auth/invalid-email" || code === "auth/weak-password") {
        setFirebaseError(
          "Saisissez une adresse e-mail valide et un mot de passe de 6 caractères minimum."
        );
        return;
      }
      setFirebaseError(
        "La création du compte est indisponible. Vérifiez la configuration Firebase puis réessayez."
      );
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
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground cursor-pointer select-none">
          <input
            checked={termsAccepted}
            className="mt-0.5 size-4 shrink-0 accent-foreground cursor-pointer"
            name="terms"
            onChange={(e) => setTermsAccepted(e.target.checked)}
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
      <FirebaseProviderActions
        nextPath={getOnboardingUrl()}
        requireTerms={true}
        termsAccepted={termsAccepted}
      />
    </>
  );
}
