"use client";
import { MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n/provider";
import type { SupportedLanguage } from "@/lib/i18n/language-store";

const languageCopy = {
  fr: {
    description: "Personnalisez les tons et la luminosité d’Idealy Studio.",
    language: "Langue de l’espace",
    languageDescription: "Cette préférence s’applique à votre parcours Idealy et est conservée pour vos prochaines visites.",
    theme: "Thème de l’interface",
    light: "Clair",
    dark: "Sombre",
    system: "Système",
  },
  en: {
    description: "Personalize the tones and brightness of Idealy Studio.",
    language: "Workspace language",
    languageDescription: "This preference applies across your Idealy journey and is kept for future visits.",
    theme: "Interface theme",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  es: {
    description: "Personaliza los tonos y la luminosidad de Idealy Studio.",
    language: "Idioma del espacio",
    languageDescription: "Esta preferencia se aplica a tu experiencia Idealy y se conserva para tus próximas visitas.",
    theme: "Tema de la interfaz",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
  },
} as const;

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { language, setLanguage } = useTranslation();
  const copy = languageCopy[language] || languageCopy.fr;

  const changeLanguage = (nextLanguage: SupportedLanguage) => {
    setLanguage(nextLanguage);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{copy.theme}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.description}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: "light", label: copy.light, Icon: SunIcon },
          { value: "dark", label: copy.dark, Icon: MoonIcon },
          { value: "system", label: copy.system, Icon: PaletteIcon },
        ].map(({ value, label, Icon }) => (
          <button
            key={value}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-colors ${
              theme === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:bg-muted/50"
            }`}
            onClick={() => setTheme(value)}
            type="button"
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>

      <section className="border-t border-border/60 pt-6">
        <h3 className="text-base font-semibold">{copy.language}</h3>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
          {copy.languageDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={copy.language}>
          {([
            ["fr", "Français"],
            ["en", "English"],
            ["es", "Español"],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={language === value}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                language === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 hover:bg-muted/50"
              }`}
              key={value}
              onClick={() => changeLanguage(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
