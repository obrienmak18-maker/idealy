"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

type TypewriterHeroProps = {
  lang?: "fr" | "en" | "es";
};

const PHRASES = {
  fr: [
    "votre prochaine application SaaS",
    "votre marketplace moderne",
    "votre plateforme multi-agents",
    "votre prototype interactif en direct",
    "votre projet le plus audacieux",
  ],
  en: [
    "your next full-stack SaaS app",
    "your modern online marketplace",
    "your multi-agent AI workspace",
    "your live interactive prototype",
    "your most ambitious project",
  ],
  es: [
    "tu próxima aplicación SaaS",
    "tu marketplace moderno en línea",
    "tu espacio de trabajo multiagente",
    "tu prototipo interactivo en vivo",
    "tu proyecto más ambicioso",
  ],
};

const LEAD_IN = {
  fr: "Générez",
  en: "Build",
  es: "Crea",
} as const;

export function TypewriterHero({ lang = "fr" }: TypewriterHeroProps) {
  const currentPhrases = PHRASES[lang] || PHRASES.fr;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(70);

  useEffect(() => {
    const fullText = currentPhrases[phraseIndex % currentPhrases.length];

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing forward
        setDisplayText(fullText.substring(0, displayText.length + 1));
        setTypingSpeed(60 + Math.random() * 30);

        if (displayText === fullText) {
          // Pause at end before deleting
          setIsDeleting(true);
          setTypingSpeed(2200);
        }
      } else {
        // Deleting backward
        setDisplayText(fullText.substring(0, displayText.length - 1));
        setTypingSpeed(35);

        if (displayText === "") {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % currentPhrases.length);
          setTypingSpeed(400);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, typingSpeed, currentPhrases]);

  return (
    <div className="relative mx-auto mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-2.5 backdrop-blur-2xl shadow-xl shadow-violet-500/10">
      {/* Cute Chibi Companion Mascot */}
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-violet-500 to-orange-400 p-0.5 shadow-md shadow-violet-500/30 animate-pen-bob">
        <div className="flex size-full items-center justify-center rounded-[10px] bg-[#0c0b14]">
          <span className="text-base select-none" role="img" aria-label="Compagnon Chibi IA">
            🧙‍♂️
          </span>
        </div>
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-3 bg-sky-500" />
        </span>
      </div>

      {/* Dynamic Typewriter text */}
      <div className="flex items-center gap-1.5 text-sm sm:text-base font-medium">
        <span className="text-white/60">{LEAD_IN[lang] ?? LEAD_IN.fr}</span>
        <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-violet-300 to-orange-300 underline decoration-violet-400/40 decoration-2 underline-offset-4">
          {displayText}
        </span>
        {/* Blinking Magic Cursor / Pen */}
        <span className="inline-flex items-center">
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block h-5 w-0.5 bg-violet-400 shadow-[0_0_8px_#a78bfa]"
          />
          <span className="ml-0.5 text-xs text-amber-300 animate-pulse select-none">
            ✏️
          </span>
        </span>
      </div>
    </div>
  );
}
