"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { IdealyMark } from "@/components/branding/idealy-logo";
import { useTranslation } from "@/lib/i18n/provider";

type GreetingPhrase = {
  prefix: string;
  subtitle: string;
};

const GREETINGS_FR: GreetingPhrase[] = [
  {
    prefix: "Construisons l'exceptionnel,",
    subtitle: "Décris ton projet ou choisis un point de départ pour l'IA.",
  },
  {
    prefix: "Quelle idée donnons-nous vie aujourd'hui,",
    subtitle: "Partage ton intention et regarde Idealy structurer ton application en direct.",
  },
  {
    prefix: "Façonnons votre prochaine réussite,",
    subtitle: "De la conception à l'exécution, créons un produit remarquable.",
  },
  {
    prefix: "Prêt à transformer une vision en produit,",
    subtitle: "Pose ton idée, nous nous chargeons du code, du design et de l'architecture.",
  },
  {
    prefix: "Donnons de l'élan à vos ambitions,",
    subtitle: "Chaque grand projet commence par une première ligne d'intention claire.",
  },
];

const GREETINGS_EN: GreetingPhrase[] = [
  {
    prefix: "Let's build the exceptional,",
    subtitle: "Describe your project or select a starting point to turn ideas into reality.",
  },
  {
    prefix: "What shall we bring to life today,",
    subtitle: "Share your vision and watch Idealy turn it into a working application.",
  },
  {
    prefix: "Ready to shape something remarkable,",
    subtitle: "From initial concept to production-grade code, design, and architecture.",
  },
  {
    prefix: "Turn your ambition into software,",
    subtitle: "Give your ideas the speed and polish of an elite autonomous studio.",
  },
  {
    prefix: "Let's craft the extraordinary,",
    subtitle: "Describe what you want to build and let your squad handle the rest.",
  },
];

const GREETINGS_ES: GreetingPhrase[] = [
  {
    prefix: "Construyamos lo excepcional,",
    subtitle: "Describe tu proyecto o elige un punto de partida para la IA.",
  },
  {
    prefix: "¿Qué idea hacemos realidad hoy,",
    subtitle: "Comparte tu intención y mira cómo Idealy estructura tu aplicación.",
  },
  {
    prefix: "Listos para transformar tu visión,",
    subtitle: "De la idea al despliegue, creemos algo extraordinario juntos.",
  },
  {
    prefix: "Demos vida a tu próximo gran proyecto,",
    subtitle: "Diseño, código y estrategia reunidos en un solo lugar.",
  },
];

export function Greeting() {
  const prefersReducedMotion = useReducedMotion();
  const { language } = useTranslation();
  const [userName, setUserName] = useState("Mak");
  const [dayIndex, setDayIndex] = useState(0);

  useEffect(() => {
    // Pick daily rotating variation without jarring intra-session shifts
    const today = new Date();
    const daySeed = (today.getFullYear() * 372 + (today.getMonth() + 1) * 31 + today.getDate());
    setDayIndex(daySeed);

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
        // Fallback gracefully to "Mak"
      }
    }
    void loadUserName();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeGreetings = useMemo(() => {
    const lang = (language ?? "fr").toLowerCase();
    if (lang.startsWith("en")) return GREETINGS_EN;
    if (lang.startsWith("es")) return GREETINGS_ES;
    return GREETINGS_FR;
  }, [language]);

  const phrase = activeGreetings[dayIndex % activeGreetings.length];

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

      {/* Hero Title: Dynamic rotating phrase + user name */}
      <motion.h1
        key={`${language}-${phrase.prefix}`}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-balance text-2xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-3xl md:text-4xl"
        id="idealy-welcome-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {phrase.prefix}{" "}
        <span className="bg-gradient-to-r from-sky-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent font-bold">
          {userName}
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        key={`${language}-${phrase.subtitle}`}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 max-w-md text-pretty text-xs leading-relaxed text-muted-foreground/80 sm:text-sm"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.1, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {phrase.subtitle}
      </motion.p>
    </section>
  );
}
