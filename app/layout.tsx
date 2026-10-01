import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  applicationName: "Idealy",
  description:
    "Idealy aide à transformer une idée en mission, plan de projet et application assistée par IA.",
  icons: {
    apple: [{ type: "image/svg+xml", url: "/idealy-mark.svg" }],
    icon: [{ type: "image/svg+xml", url: "/idealy-mark.svg" }],
    shortcut: ["/idealy-mark.svg"],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealy-ai.netlify.app"
  ),
  openGraph: {
    description:
      "Clarifiez une idée, planifiez votre projet et construisez avec un workspace assisté par IA.",
    locale: "fr_FR",
    siteName: "Idealy",
    type: "website",
  },
  robots: {
    follow: true,
    googleBot: { follow: true, index: true },
    index: true,
  },
  title: {
    default: "Idealy — Transformez une idée en projet",
    template: "%s | Idealy",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport = {
  maximumScale: 1,
};

const LIGHT_THEME_COLOR = "hsl(223 35% 95%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

import { LanguageProvider } from "@/lib/i18n/provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <SessionProvider
            basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`}
          >
            <LanguageProvider>
              <TooltipProvider>
                <Suspense>{children}</Suspense>
              </TooltipProvider>
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
