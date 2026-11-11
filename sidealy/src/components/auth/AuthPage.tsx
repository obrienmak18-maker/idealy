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
  ensureFirebaseConfigured,
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
import { IdealyLogo } from "../branding/IdealyLogo";

type View = "login" | "signup" | "magic" | "phone" | "reset" | "sent";
type FirebaseUser = Awaited<ReturnType<typeof signInGoogle>>;

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
  };;

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
      <main className="relative min-h-screen w-full bg-[#08070d] text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#0e1018]/90 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 grid place-items-center mx-auto text-xl">
            ✉
          </div>
          <h1 className="text-2xl font-bold text-white">Vérifiez votre boîte mail</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
          <div className="pt-2 space-y-3">
            <button
              className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-all shadow-md active:scale-95"
              onClick={() => go("login")}
              type="button"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isSignup = view === "signup";
  const isLogin = view === "login";

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#0b0d14] px-4 py-12 font-sans text-zinc-100 antialiased selection:bg-violet-400/25 sm:px-6">
      {/* Halo d'ambiance cosmique */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[800px] h-[450px]"
          style={{
            background:
              "radial-gradient(55% 55% at 50% 35%, rgba(104, 116, 245, 0.14), rgba(139, 92, 246, 0.07) 48%, transparent 78%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Bouton retour accueil */}
      <div className="absolute top-5 left-5 z-20">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all backdrop-blur-md"
          onClick={() => setActivePage("welcome")}
          type="button"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Accueil</span>
        </button>
      </div>

      {/* Carte principale d'authentification */}
      <div className="relative w-full max-w-[560px] rounded-[30px] border border-white/[0.10] bg-[#191b22]/95 p-7 shadow-[0_28px_90px_-38px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-10 lg:p-12">
        {/* En-tête */}
        <div className="mb-9 space-y-7 text-left">
          <IdealyLogo animated={false} size={40} />
          <div className="space-y-3">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-[40px]">
            {isLogin
              ? "Bon retour sur Idealy"
              : isSignup
                ? "Créez votre compte Idealy"
                : view === "reset"
                  ? "Mot de passe oublié ?"
                  : view === "magic"
                    ? "Connexion par lien magique"
                    : "Connexion par SMS"}
          </h1>
          <p className="max-w-[440px] text-base leading-relaxed text-[#9ca6b8] sm:text-[18px]">
            {isLogin
              ? "Retrouvez vos workspaces et poursuivez vos développements."
              : isSignup
                ? "Créez votre espace et donnez vie à vos projets avec Idealy."
                : view === "reset"
                  ? "Choisissez un nouveau mot de passe pour retrouver l’accès à votre espace."
                  : "Utilisez votre adresse e-mail pour continuer en toute sécurité."}
          </p>
          </div>
        </div>

        {/* Sélecteur d'onglets (Se connecter / Créer un compte) */}
        {(isLogin || isSignup) && (
          <div className="mb-7 flex rounded-2xl border border-white/[0.08] bg-[#12141b] p-1.5">
            <button
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${
                isLogin
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => go("login")}
              type="button"
            >
              Se connecter
            </button>
            <button
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${
                isSignup
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => go("signup")}
              type="button"
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Message d'erreur avec point pulsant */}
        {error && (
          <div
            aria-live="polite"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-start gap-2.5 shadow-sm"
            role="alert"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-1 animate-pulse" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Notice informative */}
        {notice && (
          <div className="mb-5 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {/* Bouton Google OAuth officiel */}
        {(isLogin || isSignup) && (
          <>
            <button
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.11] bg-[#22252e] text-[15px] font-medium text-white transition-colors duration-200 hover:border-white/20 hover:bg-[#292d37] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !firebaseReady || !isFirebaseConfigured()}
              onClick={() => void run(async () => finish(await signInGoogle()))}
              type="button"
            >
              <GoogleIcon />
              <span>Continuer avec Google</span>
            </button>

            <div className="my-7 flex items-center gap-4 text-[12px] text-[#7f899b]">
              <span className="h-px flex-1 bg-white/[0.08]" />
              ou avec votre e-mail
              <span className="h-px flex-1 bg-white/[0.08]" />
            </div>
          </>
        )}

        {/* Formulaire Email & Mot de Passe */}
        <form className="space-y-4" onSubmit={onSubmit}>
          {view !== "phone" && (
            <div className="space-y-1.5">
              <label className="block text-[14px] font-medium text-[#c6ccd6]">
                Adresse e-mail
              </label>
              <div className="relative">
                <input
                  autoComplete="email"
                  className="h-14 w-full rounded-2xl border border-white/[0.10] bg-[#242730] px-4 pl-11 text-[16px] text-white placeholder:text-[#8d97a9] outline-none transition-all focus:border-[#858bf8] focus:ring-4 focus:ring-[#7b83f5]/10"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  type="email"
                  value={email}
                />
                <Mail className="absolute left-4 top-5 h-4 w-4 text-[#94a0b4] pointer-events-none" />
              </div>
            </div>
          )}

          {(isLogin || isSignup) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-zinc-300">
                  Mot de passe
                </label>
                {isLogin && (
                  <button
                    className="text-[13px] font-medium text-[#aeb6c7] underline-offset-4 transition-colors hover:text-white hover:underline"
                    onClick={() => go("reset")}
                    type="button"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="h-14 w-full rounded-2xl border border-white/[0.10] bg-[#242730] px-4 pl-11 pr-12 text-[16px] text-white placeholder:text-[#8d97a9] outline-none transition-all focus:border-[#858bf8] focus:ring-4 focus:ring-[#7b83f5]/10"
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5 pointer-events-none" />
                <button
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-4 top-4 text-[#9ba6ba] transition-colors hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Validation conditions générales pour l'inscription */}
          {isSignup && (
            <label className="flex items-start gap-2.5 cursor-pointer pt-1 text-xs text-zinc-400">
              <input
                checked={acceptTerms}
                className="mt-0.5 rounded border-white/[0.2] bg-[#12131c] text-teal-500 focus:ring-0"
                onChange={(e) => setAcceptTerms(e.target.checked)}
                type="checkbox"
              />
              <span>
                J'accepte les{" "}
                <button
                  className="text-white underline hover:text-teal-300"
                  onClick={() => setActivePage("terms")}
                  type="button"
                >
                  conditions d'utilisation
                </button>{" "}
                et la{" "}
                <button
                  className="text-white underline hover:text-teal-300"
                  onClick={() => setActivePage("privacy")}
                  type="button"
                >
                  politique de confidentialité
                </button>
                .
              </span>
            </label>
          )}

          {/* SMS Phone View */}
          {view === "phone" && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-300">
                Numéro de téléphone
              </label>
              <div className="relative">
                <input
                  autoComplete="tel"
                  className="w-full h-11 rounded-xl border border-white/[0.1] bg-[#12131c] px-3.5 pl-9 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-400 transition-colors"
                  disabled={codeSent}
                  inputMode="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  required
                  type="tel"
                  value={phone}
                />
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5 pointer-events-none" />
              </div>
              {codeSent && (
                <input
                  autoComplete="one-time-code"
                  className="w-full h-11 rounded-xl border border-white/[0.1] bg-[#12131c] px-3.5 text-center tracking-[0.25em] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-400 transition-colors"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                  value={code}
                />
              )}
              <div ref={recaptchaRef} />
            </div>
          )}

          {/* Bouton de soumission principal */}
          <button
            className="mt-3 h-16 w-full rounded-2xl bg-[#777ff2] text-[17px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(113,123,242,0.65)] transition-all duration-200 hover:bg-[#858cf8] hover:shadow-[0_16px_36px_-12px_rgba(113,123,242,0.55)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !firebaseReady || !isFirebaseConfigured()}
            type="submit"
          >
            {busy
              ? "Un instant…"
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
                      : "Envoyer le lien magique"}
          </button>
        </form>

        {!firebaseReady ? (
          <p className="mt-5 text-center text-xs text-zinc-500" role="status">
            Préparation de la connexion sécurisée…
          </p>
        ) : !isFirebaseConfigured() ? (
          <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-center text-xs text-amber-200/90" role="alert">
            La connexion sécurisée n’est pas configurée pour cet environnement. Aucun accès invité n’est ouvert.
          </div>
        ) : null}

        {/* Liens secondaires en bas de carte */}
        <div className="mt-7 border-t border-white/[0.08] pt-6 text-center text-[14px] text-[#9aa5b7]">
          {(isLogin || isSignup) ? (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
              <span>{isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}</span>
              <button
                className="font-semibold text-[#aab0ff] transition-colors hover:text-white"
                onClick={() => go(isLogin ? "signup" : "login")}
                type="button"
              >
                {isLogin ? "Créer mon compte" : "Se connecter"}
              </button>
              <span className="basis-full text-center text-xs text-[#7f899c]">
                <button className="hover:text-white" onClick={() => go("magic")} type="button">
                  Recevoir un lien de connexion par e-mail
                </button>
              </span>
            </div>
          ) : (
            <button
              className="mx-auto font-medium text-[#aab0ff] transition-colors hover:text-white"
              onClick={() => go("login")}
              type="button"
            >
              ← Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </main>
  );
};