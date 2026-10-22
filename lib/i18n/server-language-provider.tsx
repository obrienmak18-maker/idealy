import { cookies } from "next/headers";
import { connection } from "next/server";
import { LanguageProvider } from "./provider";
import type { SupportedLanguage } from "./language-store";

function resolveLanguage(value: string | undefined): SupportedLanguage {
  return value === "en" || value === "es" ? value : "fr";
}

/**
 * Resolves the cookie-backed language within a Suspense boundary, then passes
 * that locale into the client provider so SSR and hydration render the same text.
 */
export async function ServerLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const locale = (await cookies()).get("NEXT_LOCALE")?.value;

  return (
    <LanguageProvider initialLanguage={resolveLanguage(locale)}>
      {children}
    </LanguageProvider>
  );
}
