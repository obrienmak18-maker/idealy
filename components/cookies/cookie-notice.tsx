"use client";

import { Cookie, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/lib/i18n/provider";

const noticeCopy = {
  fr: {
    label: "Cookies essentiels",
    body: "Idealy utilise des cookies techniques pour maintenir votre session et mémoriser la langue choisie. Votre préférence de thème est conservée dans ce navigateur.",
    privacy: "Politique de confidentialité",
    dismiss: "Compris",
  },
  en: {
    label: "Essential cookies",
    body: "Idealy uses technical cookies to maintain your session and remember your language. Your theme preference is saved in this browser.",
    privacy: "Privacy policy",
    dismiss: "Got it",
  },
  es: {
    label: "Cookies esenciales",
    body: "Idealy utiliza cookies técnicas para mantener tu sesión y recordar el idioma elegido. La preferencia de tema se guarda en este navegador.",
    privacy: "Política de privacidad",
    dismiss: "Entendido",
  },
} as const;

const NOTICE_STORAGE_KEY = "idealy:essential-cookie-notice:dismissed:v1";

export function CookieNotice() {
  const { language } = useTranslation();
  const pathname = usePathname();
  const isChatWorkspace = pathname === "/" || pathname.startsWith("/chat/");
  const [visible, setVisible] = useState(false);
  const copy = noticeCopy[language] ?? noticeCopy.fr;

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(NOTICE_STORAGE_KEY) !== "yes");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(NOTICE_STORAGE_KEY, "yes");
    } catch {
      // The notice can still be dismissed for this render when storage is blocked.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label={copy.label}
      className={`fixed inset-x-4 ${isChatWorkspace ? "bottom-44" : "bottom-4"} z-[100] mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-border/80 bg-card/95 p-4 text-card-foreground shadow-[var(--shadow-float)] backdrop-blur-xl`}
      role="region"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Cookie aria-hidden="true" className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{copy.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {copy.body}{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-2"
            href="/privacy"
          >
            {copy.privacy}
          </Link>
          .
        </p>
      </div>

      <button
        aria-label={copy.dismiss}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={dismiss}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </aside>
  );
}
