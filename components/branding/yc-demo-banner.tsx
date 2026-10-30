"use client";

import { Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/provider";

const STORAGE_KEY = "idealy:workspace-update-notice-dismissed-v2";

const noticeCopy = {
  fr: {
    label: "Nouveauté Idealy",
    title: "L’espace de travail évolue",
    body: "Nous améliorons Idealy régulièrement. Tes projets et fichiers restent accessibles.",
    dismiss: "Compris",
    close: "Fermer la note",
  },
  en: {
    label: "Idealy product update",
    title: "Idealy keeps improving",
    body: "We update the workspace regularly. Your projects and files remain available.",
    dismiss: "Got it",
    close: "Dismiss notice",
  },
  es: {
    label: "Novedades de Idealy",
    title: "El espacio de trabajo evoluciona",
    body: "Mejoramos Idealy con frecuencia. Tus proyectos y archivos siguen disponibles.",
    dismiss: "Entendido",
    close: "Cerrar aviso",
  },
} as const;

export function ContinuousUpdateNotice() {
  const { language } = useTranslation();
  const text = noticeCopy[language] ?? noticeCopy.fr;
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Keep dismissal functional when storage is unavailable.
    }
  }, []);

  if (!mounted || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label={text.label}
      aria-live="polite"
      className="pointer-events-none fixed bottom-44 left-4 right-4 z-40 mx-auto w-auto max-w-sm animate-in fade-in slide-in-from-bottom-2 sm:left-auto sm:right-6 sm:mx-0"
      role="status"
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border/70 bg-background/95 p-3.5 shadow-lg backdrop-blur-md">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                {text.label}
              </p>
              <h4 className="mt-0.5 text-xs font-semibold text-foreground">
                {text.title}
              </h4>
            </div>
            <button
              aria-label={text.close}
              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleDismiss}
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
            {text.body}
          </p>
          <button
            className="mt-2.5 rounded-md px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleDismiss}
            type="button"
          >
            {text.dismiss}
          </button>
        </div>
      </div>
    </aside>
  );
}

export const YcDemoBanner = ContinuousUpdateNotice;
