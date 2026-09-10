"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Flame, Shield, Brain, Terminal } from "lucide-react";
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
    tag: "Studio IA Pro & Escouade Multi-Agents",
    icon: Sparkles,
    title: "Quelle application forgeons-nous aujourd'hui ?",
    subtitle: "Décrivez votre idée de SaaS, marketplace ou dashboard. Votre escouade d'agents est prête à construire.",
  },
  {
    tag: "Architecture & Génération Instantanée",
    icon: Zap,
    title: "Transformez votre intention en réalité concrète.",
    subtitle: "Du découpage stratégique au code Next.js avec Live Preview, pilotez chaque étape sans friction.",
  },
  {
    tag: "Puissance & Haute Vitesse",
    icon: Flame,
    title: "Prêt à dépasser les limites du prototypage ?",
    subtitle: "L'Architecte cadre, le Builder code, le Designer sublime, et le QA valide la robustesse.",
  },
  {
    tag: "Workspace Collaboratif & VFS",
    icon: Brain,
    title: "Par où commençons-nous la mission ?",
    subtitle: "Exposez votre besoin, discutez avec l'IA et exportez votre projet complet en ZIP à tout moment.",
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
    <div className="relative flex flex-col items-center px-4 pt-6 pb-2 text-center" key={index}>
      {/* Subtle clean badge */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-1 text-xs font-medium text-foreground/80 shadow-xs"
        initial={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <IconComponent className="size-3.5 text-primary" />
        <span>{greeting.tag}</span>
      </motion.div>

      {/* Clean elegant title */}
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
