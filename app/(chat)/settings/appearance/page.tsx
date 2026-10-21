"use client";

import { MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n/provider";

const copy = {
  fr: {
    title: "Apparence",
    description: "Choisissez le thème qui convient à votre environnement de travail.",
    theme: "Thème de l’interface",
    light: "Clair",
    dark: "Sombre",
    system: "Système",
    preview: "Le thème est appliqué immédiatement et conservé pour vos prochaines visites.",
  },
  en: {
    title: "Appearance",
    description: "Choose the theme that fits your working environment.",
    theme: "Interface theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    preview: "The theme is applied immediately and kept for your next visits.",
  },
  es: {
    title: "Apariencia",
    description: "Elige el tema que mejor se adapte a tu entorno de trabajo.",
    theme: "Tema de la interfaz",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    preview: "El tema se aplica al instante y se conserva para tus próximas visitas.",
  },
} as const;

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { language } = useTranslation();
  const locale = language === "en" || language === "es" ? language : "fr";
  const text = copy[locale];

  const themes = [
    { value: "light", label: text.light, Icon: SunIcon },
    { value: "dark", label: text.dark, Icon: MoonIcon },
    { value: "system", label: text.system, Icon: PaletteIcon },
  ] as const;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-semibold">{text.title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.description}</p>
      </header>

      <section aria-labelledby="appearance-theme-heading" className="space-y-3">
        <h3 className="text-sm font-semibold" id="appearance-theme-heading">{text.theme}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {themes.map(({ value, label, Icon }) => (
            <button
              key={value}
              aria-pressed={theme === value}
              className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                theme === value
                  ? "border-primary-container bg-primary-container text-on-primary-container shadow-sm"
                  : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
              onClick={() => setTheme(value)}
              type="button"
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
        <p className="rounded-xl border border-border/60 bg-background/45 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          {text.preview}
        </p>
      </section>
    </div>
  );
}
