"use client";

import { IdealyPresence } from "@/components/branding/idealy-presence";

type TypewriterHeroProps = {
  lang?: "fr" | "en" | "es";
};

const copy = {
  fr: {
    label: "Commencez ici",
    title: "Décrivez ce que vous voulez construire",
    description: "Idealy structure votre demande et vous guide jusqu’à un résultat consultable.",
  },
  en: {
    label: "Start here",
    title: "Describe what you want to build",
    description: "Idealy structures your request and guides you toward a reviewable result.",
  },
  es: {
    label: "Empieza aquí",
    title: "Describe lo que quieres construir",
    description: "Idealy organiza tu solicitud y te guía hasta un resultado que puedes revisar.",
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
