import type React from "react";
import { useEffect, useState } from "react";
import { authErrorMessage, checkResetCode, confirmEmailCode, readAuthAction, submitNewPassword } from "../../services/firebase";
import { AuthShell, authField, authLink, authPrimary, Message } from "./AuthShell";

/** Pages d'action e-mail hébergées par Idealy (réinitialisation, vérification). */
export const AuthActionPage: React.FC = () => {
  const action = readAuthAction();
  const [state, setState] = useState<"checking" | "ready" | "done" | "error">("checking");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!action) {
      setState("error");
      setError("Ce lien n’est plus valide. Demandez-en un nouveau.");
      return;
    }
    if (action.mode === "resetPassword") {
      checkResetCode(action.code)
        .then((email) => {
          setAccount(email);
          setState("ready");
        })
        .catch((e) => {
          setError(authErrorMessage(e));
          setState("error");
        });
    } else {
      confirmEmailCode(action.code)
        .then(() => setState("done"))
        .catch((e) => {
          setError(authErrorMessage(e));
          setState("error");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      await submitNewPassword(action.code, password);
      setState("done");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toLogin = () => window.location.assign("/login");

  if (state === "checking") return <AuthShell title="Un instant…" />;
  if (state === "error")
    return (
      <AuthShell title="Lien invalide">
        <Message error={error} />
        <button className={`${authLink} mt-6`} onClick={toLogin} type="button">Retour à la connexion</button>
      </AuthShell>
    );
  if (state === "done")
    return (
      <AuthShell title={action?.mode === "resetPassword" ? "Mot de passe mis à jour" : "Adresse e-mail confirmée"} subtitle="Vous pouvez maintenant vous connecter.">
        <button className={authPrimary} onClick={toLogin} type="button">Se connecter</button>
      </AuthShell>
    );
  return (
    <AuthShell title="Nouveau mot de passe" subtitle={account}>
      <form className="space-y-3" onSubmit={submit}>
        <input autoComplete="new-password" className={authField} minLength={6} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" required type="password" value={password} />
        <Message error={error} />
        <button className={authPrimary} disabled={busy} type="submit">{busy ? "Un instant…" : "Enregistrer"}</button>
      </form>
    </AuthShell>
  );
};
