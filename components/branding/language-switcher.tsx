"use client";

import { useTranslation } from "@/lib/i18n/provider";
import type { SupportedLanguage } from "@/lib/i18n/language-store";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useTranslation();

  const handleSelect = (lang: SupportedLanguage) => {
    setLanguage(lang);
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const languages: Array<{ code: SupportedLanguage; label: string }> = [
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];

  return (
    <div
      role="group"
      aria-label="Sélection de la langue"
      className={`inline-flex items-center rounded-lg border border-sidebar-border/70 bg-background/40 p-0.5 text-[10px] font-mono shadow-xs ${className}`}
    >
      {languages.map(({ code, label }) => {
        const isActive = language === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleSelect(code)}
            className={`rounded-md px-1.5 py-0.5 font-semibold transition-all cursor-pointer ${
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground shadow-xs"
                : "text-muted-foreground hover:text-sidebar-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
