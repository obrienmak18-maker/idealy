"use client";

import { IdealyPresence } from "@/components/branding/idealy-presence";

type TypewriterHeroProps = {
  lang?: "fr" | "en" | "es";
};

const copy = {
  fr: {
    label: "Votre point de départ",
    title: "Parlez de votre idée à l’IA",
    description: "Idealy la transforme en mission et en workspace visible.",
  },
  en: {
    label: "Start here",
    title: "Talk through your idea with AI",
    description: "Idealy turns it into a mission and a visible workspace.",
  },
  es: {
    label: "Empieza aquí",
    title: "Cuéntale tu idea a la IA",
    description: "Idealy la convierte en una misión y un espacio de trabajo visible.",
  },
} as const;

export function TypewriterHero({ lang = "fr" }: TypewriterHeroProps) {
  const text = copy[lang] ?? copy.fr;

  return (
    <div className="mx-auto mt-5 flex w-fit max-w-full items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-left shadow-[0_16px_48px_-32px_rgba(99,102,241,0.65)] backdrop-blur-xl sm:mt-6 sm:gap-3.5 sm:px-5">
      <IdealyPresence />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">
          {text.label}
        </p>
        <p className="mt-0.5 text-sm font-semibold tracking-tight text-white/90 sm:text-[15px]">
          {text.title}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-white/55 sm:text-[13px]">
          {text.description}
        </p>
      </div>
    </div>
  );
}
