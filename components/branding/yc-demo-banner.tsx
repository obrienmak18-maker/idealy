"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";

export function YcDemoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      aria-label="Mode Démo Y Combinator"
      className="relative z-30 flex items-center justify-between border-b border-amber-500/25 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 px-3 py-1.5 text-xs text-amber-200 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 font-medium">
        <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-semibold text-amber-300">Y Combinator Demo</span>
        <span className="hidden text-amber-400/80 md:inline">—</span>
        <span className="hidden text-amber-200/90 md:inline">
          Escouade IA Autonome active (Multi-agents, aperçu en direct & déploiement Vercel)
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 sm:inline">
          Quota étendu : 50 générations
        </span>
        <button
          aria-label="Fermer la notification"
          className="rounded p-0.5 text-amber-300/70 hover:bg-amber-500/20 hover:text-amber-200 transition"
          onClick={() => setIsVisible(false)}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
