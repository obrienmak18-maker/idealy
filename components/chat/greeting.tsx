"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IdealyMark } from "@/components/branding/idealy-logo";
import { useTranslation } from "@/lib/i18n/provider";

export function Greeting() {
  const prefersReducedMotion = useReducedMotion();
  const { language } = useTranslation();
  const [userName, setUserName] = useState("Mak");

  useEffect(() => {
    let cancelled = false;
    async function loadUserName() {
      try {
        const res = await fetch("/api/idealy/profile/onboarding", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.firstName?.trim()) {
            setUserName(data.firstName.trim());
          }
        }
      } catch {
        // keep fallback "Mak"
      }
    }
    void loadUserName();
    return () => {
      cancelled = true;
    };
  }, []);

  const isEn = language?.toLowerCase().startsWith("en");

  return (
    <section
      aria-labelledby="idealy-welcome-title"
      className="flex w-full flex-col items-center px-4 pb-2 pt-4 text-center sm:pt-6"
    >
      {/* Central Glowing Compass Star Logo */}
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        aria-hidden="true"
        className="group relative mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-card/40 p-2.5 backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.25)] ring-1 ring-white/10"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 opacity-50 blur-lg transition-opacity group-hover:opacity-100" />
        <IdealyMark animated size={34} />
      </motion.div>

      {/* Hero Title: "Construisons l'exceptionnel, Mak." / "Let's build the exceptional, Mak" */}
      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-balance text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-3xl md:text-4xl"
        id="idealy-welcome-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {isEn ? "Let's build the exceptional," : "Construisons l'exceptionnel,"}{" "}
        <span className="bg-gradient-to-r from-sky-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent font-bold">
          {userName}
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 max-w-md text-pretty text-xs leading-relaxed text-muted-foreground/80 sm:text-sm"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.1, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {isEn
          ? "Describe your idea or choose a starting point to turn ideas into reality."
          : "Décris ton projet ou choisis un point de départ pour l'IA."}
      </motion.p>
    </section>
  );
}
