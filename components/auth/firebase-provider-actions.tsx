"use client";

import { type ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { Loader2, Phone } from "lucide-react";
import { signIn as signInWithAuthJs, useSession } from "next-auth/react";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  confirmPhoneCodeFirebase,
  getFirebaseAuth,
  sendPhoneCodeFirebase,
  signInWithGoogleFirebase,
} from "@/lib/firebase/client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M21.35 12.27c0-.68-.06-1.36-.18-2.02H12v3.83h5.23a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.92-4.2 2.92-7.2Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.75Z"
        fill="#34A853"
      />
      <path
        d="M6.53 13.83A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.31-1.83V7.64H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.36l3.24-2.53Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.22 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.39l3.24 2.53C7.3 7.86 9.46 6.14 12 6.14Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function FirebaseProviderActions({ nextPath }: { nextPath: string }) {
  const { update: updateSession } = useSession();
  const [isPending, startTransition] = useTransition();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const completeAuth = useCallback(
    async (idToken: string) => {
      const result = await signInWithAuthJs("firebase", {
        idToken,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("firebase_session_rejected");
      }

      await updateSession();
      window.location.assign(nextPath);
    },
    [nextPath, updateSession]
  );

  const handleGoogleSignIn = useCallback(() => {
    startTransition(async () => {
      try {
        const { idToken } = await signInWithGoogleFirebase();
        await completeAuth(idToken);
      } catch {
        toast.error(
          "La connexion avec Google est indisponible. Vérifiez la configuration Firebase puis réessayez."
        );
      }
    });
  }, [completeAuth]);

  const handleSendPhoneCode = useCallback(() => {
    startTransition(async () => {
      try {
        const verifier =
          recaptchaVerifierRef.current ??
          new RecaptchaVerifier(
            getFirebaseAuth(),
            "firebase-recaptcha-container",
            {
              size: "invisible",
            }
          );
        recaptchaVerifierRef.current = verifier;
        const result = await sendPhoneCodeFirebase(phoneNumber, verifier);
        setConfirmationResult(result);
        toast.success("Code envoyé. Consultez vos SMS.");
      } catch {
        recaptchaVerifierRef.current?.clear();
        recaptchaVerifierRef.current = null;
        toast.error(
          "Impossible d’envoyer le code. Utilisez le format international, par exemple +33 6 12 34 56 78."
        );
      }
    });
  }, [phoneNumber]);

  const handleConfirmPhoneCode = useCallback(() => {
    if (!confirmationResult || verificationCode.trim().length < 6) {
      return;
    }

    startTransition(async () => {
      try {
        const idToken = await confirmPhoneCodeFirebase(
          confirmationResult,
          verificationCode
        );
        await completeAuth(idToken);
      } catch {
        toast.error("Code incorrect ou expiré. Demandez un nouveau code.");
      }
    });
  }, [confirmationResult, verificationCode, completeAuth]);

  const handlePhoneNumberChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPhoneNumber(event.target.value);
    },
    []
  );

  const handleVerificationCodeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setVerificationCode(event.target.value);
    },
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <button
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {isPending && !confirmationResult ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continuer avec Google
      </button>

      <div className="rounded-xl border border-border/45 bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Phone className="size-4 text-muted-foreground" />
          Continuer avec un numéro de téléphone
        </div>
        {confirmationResult ? (
          <div className="flex gap-2">
            <input
              aria-label="Code reçu par SMS"
              autoComplete="one-time-code"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border/50 bg-background/70 px-3 text-sm tracking-[0.25em] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:ring-2 focus:ring-ring/30"
              disabled={isPending}
              inputMode="numeric"
              maxLength={6}
              onChange={handleVerificationCodeChange}
              placeholder="123456"
              type="text"
              value={verificationCode}
            />
            <button
              className="h-9 shrink-0 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending || verificationCode.trim().length < 6}
              onClick={handleConfirmPhoneCode}
              type="button"
            >
              {isPending ? "Vérification…" : "Valider"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              aria-label="Numéro de téléphone"
              autoComplete="tel"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border/50 bg-background/70 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:ring-2 focus:ring-ring/30"
              disabled={isPending}
              onChange={handlePhoneNumberChange}
              placeholder="+33 6 12 34 56 78"
              type="tel"
              value={phoneNumber}
            />
            <button
              className="h-9 shrink-0 rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending || phoneNumber.trim().length < 8}
              onClick={handleSendPhoneCode}
              type="button"
            >
              {isPending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Un code de vérification Firebase sera envoyé par SMS.
        </p>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-px w-px overflow-hidden"
        id="firebase-recaptcha-container"
      />
    </div>
  );
}
