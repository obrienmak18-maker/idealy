import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  authErrorMessage,
  completeMagicLink,
  confirmPhoneCode,
  createBackendSession,
  completeGoogleRedirect,
  ensureFirebaseConfigured,
  isGoogleRedirectPending,
  getBearerToken,
  isFirebaseConfigured,
  isMagicLinkUrl,
  rememberedMagicEmail,
  resetPassword,
  sendMagicLink,
  sendPhoneCode,
  signInEmail,
  signInGoogle,
  signUpEmail,
  sendVerificationEmail,
} from "../../services/firebase";
import { useApp } from "../../context/AppContext";
import { AuthShell, authPrimary } from "./AuthShell";
import { IdealyLogo } from "../branding/IdealyLogo";

type View = "login" | "signup" | "magic" | "phone" | "reset" | "sent";
type FirebaseUser = NonNullable<Awaited<ReturnType<typeof signInGoogle>>>;

const GoogleIcon = () => (
  <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

export const AuthPage: React.FC = () => {
  const { setActivePage } = useApp();
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/register")) {
      return "signup";
    }
    return "login";
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sentTo, setSentTo] = useState<{ kind: "verify" | "magic" | "reset"; email: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const go = (next: View) => {
    setView(next);
    setError(null);
    setNotice(null);
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await task();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (user: FirebaseUser) => {
    await user.reload();
    if (!user.emailVerified) {
      await sendVerificationEmail(user);
      setSentTo({ kind: "verify", email: user.email ?? email });
      setView("sent");
      return;
    }

    await createBackendSession(user);
    const bearer = await getBearerToken();
    if (!bearer) throw new Error("firebase_backend_identity_rejected");

    const profileResponse = await fetch("/api/idealy/profile/onboarding", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!profileResponse.ok) {
      throw new Error(
        profileResponse.status === 401
          ? "firebase_backend_identity_rejected"
          : "firebase_backend_unavailable",
      );
    }
    const profile = (await profileResponse.json()) as {
      onboardingCompleted?: boolean;
      way?: string;
    };
    try {
      localStorage.setItem("idealy_session", "active");
      if (profile.way) localStorage.setItem("idealy_user_way", profile.way);
    } catch {
      // UI cache only; Firebase remains the identity source.
    }
    setActivePage(profile.onboardingCompleted === true ? "chat" : "onboarding");
  };

  // Firebase public configuration is loaded from the existing Idealy API
  // project. Magic links are handled only after the client SDK is initialized.
  useEffect(() => {
    let active = true;
    void (async () => {
      const configured = await ensureFirebaseConfigured();
      if (!active) return;
      setFirebaseReady(true);
      if (!configured) {
        setError("La configuration Firebase publique n’est pas disponible. Le backend doit exposer ses paramètres Firebase.");
        return;
      }
      if (isGoogleRedirectPending()) {
        await run(async () => {
          const redirectedUser = await completeGoogleRedirect();
          if (!redirectedUser) throw new Error("google_redirect_no_result");
          await finish(redirectedUser);
        });
        return;
      }
      if (!isMagicLinkUrl()) return;
      const known = rememberedMagicEmail();
      if (!known) {
        setView("magic");
        setNotice("Confirmez votre adresse e-mail pour terminer la connexion.");
        return;
      }
      await run(async () => finish(await completeMagicLink(known)));
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "signup" && !acceptTerms) {
      setError("Veuillez accepter les conditions d'utilisation pour créer un compte.");
      return;
    }

    void run(async () => {
      if (view === "login") return finish(await signInEmail(email, password));
      if (view === "signup") {
        await signUpEmail(email, password);
        // No backend session is issued before the email is verified.
        setSentTo({ kind: "verify", email });
        setView("sent");
        return;
      }
      if (view === "reset") {
        await resetPassword(email);
        setSentTo({ kind: "reset", email });
        setView("sent");
        return;
      }
      if (view === "magic") {
        if (isMagicLinkUrl()) return finish(await completeMagicLink(email));
        await sendMagicLink(email);
        setSentTo({ kind: "magic", email });
        setView("sent");
        return;
      }
      if (view === "phone") {
        if (!codeSent) {
          if (!recaptchaRef.current) return;
          await sendPhoneCode(phone.replace(/\s+/g, ""), recaptchaRef.current);
          setCodeSent(true);
          setNotice("Code envoyé par SMS.");
          return;
        }
        return finish(await confirmPhoneCode(code));
      }
    });
  };

  if (view === "sent" && sentTo) {
    const text =
      sentTo.kind === "verify"
        ? `Un e-mail de confirmation a été envoyé à ${sentTo.email}. Ouvrez-le pour activer votre compte.`
        : sentTo.kind === "magic"
          ? `Un lien de connexion a été envoyé à ${sentTo.email}. Ouvrez-le sur cet appareil.`
          : `Si un compte correspond à ${sentTo.email}, un lien de réinitialisation vient d’être envoyé.`;

    return (
      <AuthShell
        title="Vérifiez votre boîte mail"
        subtitle={text}
        width={560}
      >
        <div className="mb-6 grid size-12 place-items-center rounded-2xl border border-violet-300/20 bg-violet-300/[0.08] text-violet-200">
          <Mail className="size-5" />
        </div>
        <p className="mb-7 text-sm leading-relaxed text-[#9ca6b8]">
          Pensez également à vérifier vos courriers indésirables. Vous pourrez revenir ici après avoir ouvert le lien.
        </p>
        <button
          className={authPrimary}
          onClick={() => go("login")}
          type="button"
        >
          Retour à la connexion
        </button>
      </AuthShell>
    );
  }


  const isSignup = view === "signup";
  const isLogin = view === "login";
  const isPrimaryAuthView = isLogin || isSignup;

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0b0d14] px-4 py-10 font-sans text-zinc-100 antialiased selection:bg-violet-400/25 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-52 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-violet-500/[0.13] blur-[150px]" />
        <div className="absolute -bottom-56 -right-40 h-[520px] w-[520px] rounded-full bg-orange-400/[0.08] blur-[145px]" />
        <div className="absolute -bottom-60 -left-44 h-[480px] w-[480px] rounded-full bg-sky-400/[0.06] blur-[145px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[440px] flex-col">
        <button
          className="mb-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-2 text-[13px] font-medium text-white/55 transition hover:bg-white/[0.045] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          onClick={() => setActivePage("welcome")}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Retour à Idealy
        </button>

        <section className="rounded-[26px] border border-white/[0.10] bg-[#191b22]/95 p-6 shadow-[0_28px_90px_-38px_rgba(0,0,0,0.92)] backdrop-blur-2xl sm:p-8">
          <a
            aria-label="Accueil Idealy"
            className="mb-7 inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            href="/welcome"
          >
            <IdealyLogo animated={false} size={36} />
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-white">Idealy</span>
          </a>

          <div className="space-y-2.5">
            <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.045em] text-white sm:text-[30px]">
              {isLogin
                ? "Heureux de vous revoir"
                : isSignup
                  ? "Créez votre compte Idealy"
                  : view === "reset"
                    ? "Mot de passe oublié ?"
                    : view === "magic"
                      ? "Recevoir un lien de connexion"
                      : "Connexion par SMS"}
            </h1>
            <p className="text-[14px] leading-[1.7] text-[#9ca6b8]">
              {isLogin
                ? "Connectez-vous pour retrouver vos projets et reprendre là où vous en étiez."
                : isSignup
                  ? "Créez votre espace et commencez à transformer vos idées en applications."
                  : view === "reset"
                    ? "Nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe."
                    : view === "magic"
                      ? "Recevez un lien sécurisé directement dans votre boîte mail."
                      : "Utilisez votre numéro pour recevoir un code de vérification."}
            </p>
          </div>

          {isPrimaryAuthView && (
            <div className="mt-6 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-[#11141b] p-1" role="tablist" aria-label="Type de compte">
              <button
                aria-selected={isLogin}
                className={"min-h-10 rounded-lg px-3 text-[12px] font-semibold transition " + (isLogin ? "bg-white text-[#171923] shadow-sm" : "text-white/50 hover:text-white")}
                onClick={() => go("login")}
                role="tab"
                type="button"
              >
                Se connecter
              </button>
              <button
                aria-selected={isSignup}
                className={"min-h-10 rounded-lg px-3 text-[12px] font-semibold transition " + (isSignup ? "bg-white text-[#171923] shadow-sm" : "text-white/50 hover:text-white")}
                onClick={() => go("signup")}
                role="tab"
                type="button"
              >
                Créer un compte
              </button>
            </div>
          )}

          {error && (
            <div
              aria-live="polite"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3.5 text-[12px] leading-relaxed text-red-200"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div
              aria-live="polite"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-teal-300/20 bg-teal-300/[0.07] p-3.5 text-[12px] leading-relaxed text-teal-100"
              role="status"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-teal-200" />
              <span>{notice}</span>
            </div>
          )}

          {isPrimaryAuthView && (
            <>
              <button
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.11] bg-[#22252e] px-4 text-[13px] font-semibold text-white transition hover:border-white/20 hover:bg-[#292d37] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy || !firebaseReady || !isFirebaseConfigured()}
                onClick={() => {
                  if (isSignup && !acceptTerms) {
                    setError("Veuillez accepter les conditions d’utilisation et la politique de confidentialité avant de continuer.");
                    return;
                  }
                  void run(async () => {
                    const user = await signInGoogle();
                    if (user) await finish(user);
                  });
                }}
                type="button"
              >
                <GoogleIcon />
                Continuer avec Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] text-[#737d90]">
                <span className="h-px flex-1 bg-white/[0.08]" />
                ou continuer avec votre e-mail
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>
            </>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            {view !== "phone" && (
              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-[#c6ccd6]" htmlFor="idealy-email">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8590a3]" />
                  <input
                    autoComplete="email"
                    autoFocus
                    className="h-12 w-full rounded-xl border border-white/[0.10] bg-[#242730] pl-10 pr-4 text-[14px] text-white outline-none transition placeholder:text-[#7f899b] hover:border-white/20 focus:border-[#8c94f8] focus:ring-4 focus:ring-violet-400/[0.10]"
                    id="idealy-email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vous@exemple.com"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </div>
            )}

            {(isLogin || isSignup) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-[12px] font-medium text-[#c6ccd6]" htmlFor="idealy-password">
                    Mot de passe
                  </label>
                  {isLogin && (
                    <button
                      className="rounded text-[11px] font-medium text-[#aeb6c7] underline-offset-4 transition hover:text-white hover:underline"
                      onClick={() => go("reset")}
                      type="button"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8590a3]" />
                  <input
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="h-12 w-full rounded-xl border border-white/[0.10] bg-[#242730] pl-10 pr-12 text-[14px] text-white outline-none transition placeholder:text-[#7f899b] hover:border-white/20 focus:border-[#8c94f8] focus:ring-4 focus:ring-violet-400/[0.10]"
                    id="idealy-password"
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Au moins 6 caractères"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#9ba6ba] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
                    onClick={() => setShowPassword((visible) => !visible)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {isSignup && (
              <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-[11px] leading-relaxed text-[#9ca6b8]">
                <input
                  checked={acceptTerms}
                  className="mt-0.5 size-4 shrink-0 rounded border-white/20 bg-[#12131c] accent-[#ee8752] focus:ring-0"
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  J’accepte les{" "}
                  <button className="text-white underline underline-offset-2 hover:text-orange-200" onClick={() => setActivePage("terms")} type="button">
                    conditions d’utilisation
                  </button>
                  {" "}et la{" "}
                  <button className="text-white underline underline-offset-2 hover:text-orange-200" onClick={() => setActivePage("privacy")} type="button">
                    politique de confidentialité
                  </button>
                  .
                </span>
              </label>
            )}

            {view === "phone" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-[12px] font-medium text-[#c6ccd6]" htmlFor="idealy-phone">
                    Numéro de téléphone
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8590a3]" />
                    <input
                      autoComplete="tel"
                      className="h-12 w-full rounded-xl border border-white/[0.10] bg-[#242730] pl-10 pr-4 text-[14px] text-white outline-none transition placeholder:text-[#7f899b] focus:border-[#8c94f8] focus:ring-4 focus:ring-violet-400/[0.10]"
                      disabled={codeSent}
                      id="idealy-phone"
                      inputMode="tel"
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+243…"
                      required
                      type="tel"
                      value={phone}
                    />
                  </div>
                </div>
                {codeSent && (
                  <input
                    autoComplete="one-time-code"
                    className="h-12 w-full rounded-xl border border-white/[0.10] bg-[#242730] px-4 text-center text-[14px] tracking-[0.25em] text-white outline-none placeholder:text-[#7f899b] focus:border-[#8c94f8]"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Code de vérification"
                    required
                    value={code}
                  />
                )}
                <div ref={recaptchaRef} />
              </div>
            )}

            <button
              className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ee8752] px-5 text-[13px] font-semibold text-white shadow-[0_8px_24px_-12px_rgba(238,135,82,0.75)] transition hover:bg-[#fa9661] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !firebaseReady || !isFirebaseConfigured()}
              type="submit"
            >
              {busy
                ? "Connexion en cours…"
                : isLogin
                  ? "Se connecter"
                  : isSignup
                    ? "Créer mon compte"
                    : view === "reset"
                      ? "Envoyer le lien de réinitialisation"
                      : view === "phone"
                        ? codeSent
                          ? "Valider le code"
                          : "Recevoir le code SMS"
                        : "Envoyer le lien de connexion"}
            </button>
          </form>

          {!firebaseReady ? (
            <p className="mt-4 text-center text-[11px] text-[#7f899b]" role="status">
              Préparation de la connexion sécurisée…
            </p>
          ) : !isFirebaseConfigured() ? (
            <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-center text-[11px] leading-relaxed text-amber-100/90" role="alert">
              La connexion sécurisée n’est pas configurée pour cet environnement. Aucun accès invité n’est ouvert.
            </p>
          ) : null}

          <div className="mt-6 border-t border-white/[0.08] pt-5 text-center">
            {isPrimaryAuthView ? (
              <>
                <p className="text-[12px] text-[#9ca6b8]">
                  {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
                  {" "}
                  <button
                    className="font-semibold text-[#b5b9ff] transition hover:text-white"
                    onClick={() => go(isLogin ? "signup" : "login")}
                    type="button"
                  >
                    {isLogin ? "Créer un compte" : "Se connecter"}
                  </button>
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-[#7f899b]">
                  <button className="transition hover:text-white" onClick={() => go("magic")} type="button">
                    Lien de connexion par e-mail
                  </button>
                  <button className="transition hover:text-white" onClick={() => { setCodeSent(false); setCode(""); go("phone"); }} type="button">
                    Connexion par SMS
                  </button>
                </div>
              </>
            ) : (
              <button
                className="text-[12px] font-medium text-[#b5b9ff] transition hover:text-white"
                onClick={() => go("login")}
                type="button"
              >
                ← Retour à la connexion
              </button>
            )}
          </div>
        </section>

        <p className="mx-auto mt-5 max-w-[390px] px-3 text-center text-[10px] leading-relaxed text-white/35">
          L’IA peut se tromper. Vérifiez les informations importantes avant d’agir.
        </p>
      </div>
    </main>
  );

};
