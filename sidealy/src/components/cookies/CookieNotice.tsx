import { Cookie, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

const NOTICE_STORAGE_KEY = "idealy:essential-cookie-notice:dismissed:v1";

export const CookieNotice: React.FC = () => {
  const { setActivePage } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(NOTICE_STORAGE_KEY) === "yes";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(NOTICE_STORAGE_KEY, "yes");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookies essentiels"
      className="fixed inset-x-4 bottom-5 z-[100] mx-auto flex max-w-2xl items-start gap-3.5 rounded-2xl border border-white/[0.12] bg-[#0e1018]/95 p-4 text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-scale-in"
      role="region"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/20">
        <Cookie aria-hidden="true" className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Cookies essentiels</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          Idealy utilise des cookies techniques et le stockage local pour maintenir votre session, mémoriser vos préférences et synchroniser votre espace de travail.{" "}
          <button
            className="font-medium text-teal-400 underline underline-offset-2 hover:text-teal-300 transition-colors"
            onClick={() => setActivePage("privacy")}
            type="button"
          >
            Politique de confidentialité
          </button>
          .
        </p>
      </div>

      <button
        aria-label="Compris"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[0.08] hover:text-white focus-ring"
        onClick={dismiss}
        type="button"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </aside>
  );
};