import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  authErrorMessage,
  completeMagicLink,
  confirmPhoneCode,
  createBackendSession,
  isFirebaseConfigured,
  isMagicLinkUrl,
  rememberedMagicEmail,
  resetPassword,
  sendMagicLink,
  sendPhoneCode,
  signInEmail,
  signInGoogle,
  signUpEmail,
} from "../../services/firebase";
import { useApp } from "../../context/AppContext";
import { AuthShell, authField, authLink, authPrimary, authSecondary, Message, routeAfterAuth } from "./AuthShell";

type View = "login" | "signup" | "magic" | "phone" | "reset" | "sent";
type FirebaseUser = Awaited<ReturnType<typeof signInGoogle>>;

const GoogleMark = () => (
  <svg aria-hidden="true" height="18" viewBox="0 0 48 48" width="18">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export const AuthPage: React.FC = () => {
  const { setActivePage } = useApp();
  const [view, setView] = useState<View>(window.location.pathname.startsWith("/register") ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sentTo, setSentTo] = useState<{ kind: "verify" | "magic" | "reset"; email: string } | null>(null);
  const [busy, setBusy] = useState(false);
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
    await createBackendSession(user);
    await routeAfterAuth();
  };

  // Retour depuis un lien magique
  useEffect(() => {
    if (!isMagicLinkUrl()) return;
    const known = rememberedMagicEmail();
    if (!known) {
      setView("magic");
      setNotice("Confirmez votre adresse e-mail pour terminer la connexion.");
      return;
    }
    void run(async () => finish(await completeMagicLink(known)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (view === "login") return finish(await signInEmail(email, password));
      if (view === "signup") {
        const user = await signUpEmail(email, password);
        await createBackendSession(user);
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

  const titles: Record<View, [string, string]> = {
    login: ["Bon retour", "Connectez-vous pour retrouver vos projets et votre escouade."],
    signup: ["Créez votre compte", "Quelques secondes pour commencer à construire avec Idealy."],
    magic: ["Lien de connexion", "Recevez un lien sécurisé par e-mail, sans mot de passe."],
    phone: ["Connexion par téléphone", "Nous vous envoyons un code par SMS."],
    reset: ["Mot de passe oublié", "Saisissez votre e-mail pour recevoir un lien de réinitialisation."],
    sent: ["Vérifiez votre boîte mail", ""],
  };

  if (view === "sent" && sentTo) {
    const text =
      sentTo.kind === "verify"
        ? `Nous avons envoyé un e-mail de confirmation à ${sentTo.email}. Ouvrez-le pour activer votre compte.`
        : sentTo.kind === "magic"
          ? `Un lien de connexion a été envoyé à ${sentTo.email}. Ouvrez-le sur cet appareil.`
          : `Si un compte existe pour ${sentTo.email}, un lien de réinitialisation vient d’être envoyé.`;
    return (
      <AuthShell title={titles.sent[0]}>
        <p className="text-[15px] leading-relaxed text-[var(--dsw-alias-label-secondary)]">{text}</p>
        <div className="mt-8 space-y-3">
          {sentTo.kind === "verify" && (
            <button className={authPrimary} onClick={() => void routeAfterAuth()} type="button">
              Continuer
            </button>
          )}
          <button className={authLink} onClick={() => go("login")} type="button">
            Retour à la connexion
          </button>
        </div>
      </AuthShell>
    );
  }

  const [title, subtitle] = titles[view];
  const needsPassword = view === "login" || view === "signup";
  const submitLabel =
    view === "login"
      ? "Se connecter"
      : view === "signup"
        ? "Créer mon compte"
        : view === "phone"
          ? codeSent
            ? "Valider le code"
            : "Recevoir le code"
          : "Envoyer le lien";

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {/* Segmented Switcher for Login / Signup */}
      {(view === "login" || view === "signup") && (
        <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-6">
          <button
            type="button"
            onClick={() => go("login")}
            className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
              view === "login"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => go("signup")}
            className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${
              view === "signup"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Créer un compte
          </button>
        </div>
      )}

      {!isFirebaseConfigured() && (
        <div className="mb-5 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3.5 text-xs text-teal-300">
          <p className="font-medium">Mode Développement Local Détecté</p>
          <p className="text-zinc-400 mt-1">
            Les variables Firebase ne sont pas configurées. Vous pouvez tester l'espace de travail immédiatement.
          </p>
          <button
            type="button"
            onClick={() => setActivePage("chat")}
            className="mt-2.5 px-3 py-1.5 rounded-lg bg-teal-400 text-black font-semibold text-xs hover:bg-teal-300 transition-colors w-full"
          >
            Accéder directement au workspace
          </button>
        </div>
      )}

      {(view === "login" || view === "signup") && (
        <>
          <button
            className={authSecondary}
            disabled={busy}
            onClick={() => void run(async () => finish(await signInGoogle()))}
            type="button"
          >
            <GoogleMark />
            <span>Continuer avec Google</span>
          </button>
          <div className="my-5 flex items-center gap-3 text-[12px] text-zinc-500">
            <span className="h-px flex-1 bg-white/[0.08]" />
            ou avec e-mail
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>
        </>
      )}

      <form className="space-y-3" onSubmit={onSubmit}>
        {view !== "phone" && (
          <input
            autoComplete="email"
            className={authField}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            required
            type="email"
            value={email}
          />
        )}
        {needsPassword && (
          <input
            autoComplete={view === "login" ? "current-password" : "new-password"}
            className={authField}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe (min. 6 caractères)"
            required
            type="password"
            value={password}
          />
        )}
        {view === "phone" && (
          <>
            <input
              autoComplete="tel"
              className={authField}
              disabled={codeSent}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              required
              type="tel"
              value={phone}
            />
            {codeSent && (
              <input
                autoComplete="one-time-code"
                className={authField}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code à 6 chiffres"
                required
                value={code}
              />
            )}
            <div ref={recaptchaRef} />
          </>
        )}
        <Message error={error} notice={notice} />
        <button className={authPrimary} disabled={busy} type="submit">
          {busy ? "Un instant…" : submitLabel}
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3 text-xs">
        {view === "login" && (
          <div className="flex items-center justify-between">
            <button className={authLink} onClick={() => go("reset")} type="button">
              Mot de passe oublié ?
            </button>
            <button className={authLink} onClick={() => go("magic")} type="button">
              Lien magique par e-mail
            </button>
          </div>
        )}

        {(view === "login" || view === "signup") && (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <button
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => setActivePage("welcome")}
              type="button"
            >
              ← Retour à l'accueil
            </button>
            <button className={authLink} onClick={() => go("phone")} type="button">
              Connexion SMS
            </button>
          </div>
        )}

        {(view === "magic" || view === "phone" || view === "reset") && (
          <button className={authLink} onClick={() => go("login")} type="button">
            ← Revenir à la connexion
          </button>
        )}
      </div>
    </AuthShell>
  );
};