"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { IdealyMark } from "@/components/branding/idealy-logo";

function TypewriterText({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let index = 0;
    setVisibleText("");
    const interval = setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) clearInterval(interval);
    }, 38);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span aria-label={text} className="text-foreground">
      {visibleText}
      <span className="ml-1 inline-block h-[1em] w-[2px] animate-pulse bg-primary align-[-0.1em]" />
    </span>
  );
}

const greetings = [
  {
    tag: "Atelier de création logicielle",
    icon: Sparkles,
    title: "Une idée en tête ?",
    subtitle: "Décrivez ce que vous imaginez. Idealy clarifie, structure et construit votre logiciel.",
  },
  {
    tag: "De l'intention au logiciel",
    icon: Brain,
    title: "On lui donne forme.",
    subtitle: "Une intention claire, une architecture solide, un résultat que vous pouvez explorer.",
  },
];

export const Greeting = () => {
  const [index, setIndex] = useState(0);
  const greeting = greetings[index];
  const IconComponent = greeting.icon;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % greetings.length);
    }, 7800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative flex flex-col items-center px-4 pt-10 pb-4 text-center" key={index}>
      <div className="idealy-hero-orbit mb-8" aria-hidden="true">
        <IdealyMark size={82} />
      </div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500"
        initial={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <IconComponent className="size-3.5 text-sky-300" />
        <span>{greeting.tag}</span>
      </motion.div>

      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl font-semibold text-2xl tracking-tight text-foreground md:text-3xl"
        initial={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <TypewriterText key={`title-${index}`} text={greeting.title} />
      </motion.h1>

      {/* Balanced subtitle */}
      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="mt-2.5 max-w-lg text-xs leading-relaxed text-muted-foreground md:text-sm"
        initial={{ opacity: 0, y: 6 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {greeting.subtitle}
      </motion.p>
    </div>
  );
};
