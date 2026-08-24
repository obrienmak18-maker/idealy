"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function TypewriterText({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let index = 0;
    setVisibleText("");
    const interval = setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 42);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span aria-label={text}>
      {visibleText}
      <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-current align-[-0.1em]" />
    </span>
  );
}

const greetings = [
  {
    subtitle: "Décrivez une idée, un besoin ou une ambition à concrétiser.",
    title: "Quelle mission lançons-nous ?",
  },
  {
    subtitle: "Partez d’une intention, Idealy vous aide à trouver la bonne suite.",
    title: "Que voulez-vous faire naître aujourd’hui ?",
  },
  {
    subtitle: "Exposez votre objectif, puis avançons avec une direction claire.",
    title: "Prêt à construire quelque chose d’utile ?",
  },
  {
    subtitle: "Explorez, planifiez et transformez une idée en progrès concret.",
    title: "Par où commençons-nous ?",
  },
];

export const Greeting = () => {
  const [index, setIndex] = useState(0);
  const greeting = greetings[index];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % greetings.length);
    }, 7200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center px-4" key={index}>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-semibold text-2xl tracking-tight text-foreground md:text-3xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <TypewriterText key={`title-${index}`} text={greeting.title} />
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center text-muted-foreground/80 text-sm"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <TypewriterText key={`subtitle-${index}`} text={greeting.subtitle} />
      </motion.div>
    </div>
  );
};
