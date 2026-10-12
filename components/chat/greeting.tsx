"use client";

import { motion, useReducedMotion } from "framer-motion";
import { IdealyMark } from "@/components/branding/idealy-logo";

export function Greeting() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="idealy-welcome-title"
      className="flex w-full flex-col items-center px-4 pb-0 pt-2 text-center sm:pt-4"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/75 px-3 py-1 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)]"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <IdealyMark animated={false} size={16} />
        <span>L’IA Idealy · votre partenaire de création</span>
      </motion.div>

      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-balance text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl md:text-[2.25rem] leading-tight"
        id="idealy-welcome-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        Une idée en tête ?<br className="hidden sm:block" /> On lui donne forme.
      </motion.h1>

      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 max-w-lg text-pretty text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.1, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        Décrivez ce que vous voulez créer. L’IA vous aide à clarifier l’idée,
        puis Idealy la transforme en mission, en code et en aperçu.
      </motion.p>
    </section>
  );
}
