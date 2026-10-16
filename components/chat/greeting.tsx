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
        aria-hidden="true"
        className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-card/70 shadow-[0_0_36px_rgba(99,102,241,0.12)]"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <IdealyMark animated={false} size={25} />
      </motion.div>

      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl text-balance text-2xl font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-3xl md:text-[2.5rem]"
        id="idealy-welcome-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        Construisons quelque chose
        <br className="hidden sm:block" />{" "}
        <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          d’exceptionnel.
        </span>
      </motion.h1>

      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 max-w-lg text-pretty text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        transition={{ delay: 0.1, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        Décrivez votre idée. Idealy vous aide à clarifier le plan, construire
        votre application et explorer le résultat au même endroit.
      </motion.p>
    </section>
  );
}
