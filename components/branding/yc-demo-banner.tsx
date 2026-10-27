"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "idealy:continuous-update-note-dismissed";

export function ContinuousUpdateNotice() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const hasSeen = localStorage.getItem(STORAGE_KEY) === "1";
      setDismissed(hasSeen);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  if (!mounted || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Note d'information sur les mises à jour continues"
      className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-primary/25 bg-background/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-foreground">
              Mises à jour continues
            </h4>
            <button
              aria-label="Fermer la notification"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              onClick={handleDismiss}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Vous remarquerez peut-être que certaines interfaces et
            fonctionnalités sont plus récentes et enrichies par rapport à la
            vidéo de démonstration initiale : nous améliorons et mettons à jour
            Idealy en continu à chaque fois que nous le pouvons.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              onClick={handleDismiss}
              type="button"
            >
              <Check className="size-3" />
              <span>J'ai compris</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export const YcDemoBanner = ContinuousUpdateNotice;
