"use client";

import { motion, useReducedMotion } from "framer-motion";
import { IdealyMark } from "@/components/branding/idealy-logo";

export function Greeting() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="idealy-welcome-title"
      className="flex w-full flex-col items-center px-4 pb-1 pt-5 text-center sm:pt-8"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/75 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)]"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <IdealyMark animated={false} size={18} />
        <span>L’IA Idealy · votre partenaire de création</span>
      </motion.div>

      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl md:text-[2.75rem]"
        id="idealy-welcome-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        Une idée en tête ?<br className="hidden sm:block" /> On lui donne forme.
      </motion.h1>

      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-[15px]"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.1, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        Décrivez ce que vous voulez créer. L’IA vous aide à clarifier l’idée,
        puis Idealy la transforme en mission, en code et en aperçu.
      </motion.p>
    </section>
  );
}
