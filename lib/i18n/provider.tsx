"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLanguageStore, type SupportedLanguage } from "./language-store";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

const translations: Record<SupportedLanguage, Record<string, any>> = {
  fr,
  en,
  es,
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (
    path: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallbackText?: string
  ) => string;
  dict: Record<string, any>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "fr",
  setLanguage: () => {},
  t: (path, paramsOrFallback) =>
    typeof paramsOrFallback === "string" ? paramsOrFallback : path,
  dict: fr,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const cookieLanguage = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];

    if (cookieLanguage === "fr" || cookieLanguage === "en" || cookieLanguage === "es") {
      setLanguage(cookieLanguage);
    }

    setMounted(true);
  }, [setLanguage]);

  const currentLang = mounted ? language : "fr";
  const dict = translations[currentLang] || fr;

  const t = (
    path: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallbackText?: string
  ): string => {
    const fallbackDefault =
      typeof paramsOrFallback === "string"
        ? paramsOrFallback
        : fallbackText ?? path;
    const params =
      typeof paramsOrFallback === "object" ? paramsOrFallback : undefined;

    const keys = path.split(".");
    let current: any = dict;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English, then French, then fallbackDefault
        let fb: any = translations.en;
        for (const fKey of keys) {
          if (fb && typeof fb === "object" && fKey in fb) {
            fb = fb[fKey];
          } else {
            fb = null;
            break;
          }
        }
        current = fb !== null ? fb : fallbackDefault;
        break;
      }
    }

    if (typeof current !== "string") {
      return fallbackDefault;
    }

    if (!params) {
      return current;
    }

    let result = current;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
    return result;
  };


  return (
    <LanguageContext.Provider value={{ language: currentLang, setLanguage, t, dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
