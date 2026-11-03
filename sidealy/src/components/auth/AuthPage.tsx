import type React from "react";
import { useState } from "react";
import {
  authErrorMessage,
  createBackendSession,
  isFirebaseConfigured,
  resetPassword,
  signInEmail,
  signInGoogle,
  signUpEmail,
} from "../../services/firebase";

type Mode = "login" | "signup";

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>(window.location.pathname.startsWith("/register") ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const finish = async (run: () => Promise<Parameters<typeof createBackendSession>[0]>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const user = await run();
      await createBackendSession(user);
      if (mode === "signup") setNotice("Compte créé. Un e-mail de vérification vous a été envoyé.");
      window.location.replace("/");
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void finish(() => (mode === "login" ? signInEmail(email, password) : signUpEmail(email, password)));
  };

  const onReset = async () => {
    if (!email) return setError("Saisissez d’abord votre e-mail.");
    try {
      await resetPassword(email);
      setNotice("Si un compte existe, un e-mail de réinitialisation vient d’être envoyé.");
      setError(null);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  const field =
    "h-12 w-full rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] px-4 text-[15px] text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-tertiary)] focus-ring";

  return (
    <main className="flex min-h-screen w-screen items-center justify-center bg-bg-base px-5 py-10 text-text-main">
      <div className="w-full max-w-[380px]">
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
          {mode === "login" ? "Bon retour" : "Créez votre compte"}
        </h1>
        <p className="mt-2 text-[15px] text-[var(--dsw-alias-label-secondary)]">
          {mode === "login" ? "Connectez-vous pour retrouver vos projets." : "Quelques secondes suffisent."}
        </p>

        {!isFirebaseConfigured() && (
          <p className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[13px]" role="status">
            La connexion n’est pas configurée ici (variables VITE_FIREBASE_* manquantes).
          </p>
        )}

        <button
          className="focus-ring mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--dsw-alias-border-l2)] text-[15px] font-medium transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] disabled:opacity-60"
          disabled={busy}
          onClick={() => void finish(signInGoogle)}
          type="button"
        >
          <svg aria-hidden="true" height="18" viewBox="0 0 48 48" width="18">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
            <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
          </svg>
          Continuer avec Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[12px] text-[var(--dsw-alias-label-tertiary)]">
          <span className="h-px flex-1 bg-[var(--dsw-alias-border-l1)]" />
          ou
          <span className="h-px flex-1 bg-[var(--dsw-alias-border-l1)]" />
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input autoComplete="email" className={field} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" required type="email" value={email} />
          <input autoComplete={mode === "login" ? "current-password" : "new-password"} className={field} minLength={6} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" required type="password" value={password} />
          {error && <p className="text-[13px] text-red-400" role="alert">{error}</p>}
          {notice && <p className="text-[13px] text-[var(--idealy-teal-petrol)]" role="status">{notice}</p>}
          <button
            className="focus-ring h-12 w-full rounded-xl bg-[var(--dsw-alias-label-primary)] text-[15px] font-semibold text-[var(--dsw-alias-bg-layer-1)] transition-opacity disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-[13px] text-[var(--dsw-alias-label-secondary)]">
          <button className="focus-ring rounded underline-offset-4 hover:underline" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }} type="button">
            {mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
          </button>
          {mode === "login" && (
            <button className="focus-ring rounded underline-offset-4 hover:underline" onClick={() => void onReset()} type="button">
              Mot de passe oublié
            </button>
          )}
        </div>
      </div>
    </main>
  );
};
