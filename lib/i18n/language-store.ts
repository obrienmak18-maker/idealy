import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SupportedLanguage = "fr" | "en" | "es";

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

function syncLocaleCookie(lang: SupportedLanguage) {
  if (typeof document !== "undefined") {
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "fr",
      setLanguage: (lang) => {
        syncLocaleCookie(lang);
        set({ language: lang });
      },
    }),
    {
      name: "idealy-language-storage",
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          syncLocaleCookie(state.language);
        }
      },
    }
  )
);
