import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n/provider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealy.app";
const googleVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.GOOGLE_SITE_VERIFICATION;
const bingVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
  process.env.BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  applicationName: "Idealy",
  title: {
    default: "Idealy — Transformez une idée en projet",
    template: "%s | Idealy",
  },
  description:
    "Idealy aide à transformer une idée en mission, plan de projet et application assistée par IA.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "./",
  },
  icons: {
    apple: [{ type: "image/svg+xml", url: "/idealy-mark.svg" }],
    icon: [{ type: "image/svg+xml", url: "/idealy-mark.svg" }],
    shortcut: ["/idealy-mark.svg"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Idealy — Transformez une idée en projet",
    description:
      "Clarifiez une idée, planifiez votre projet et construisez avec un workspace assisté par IA.",
    url: siteUrl,
    siteName: "Idealy",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Idealy — Transformez une idée en projet",
    description:
      "Clarifiez une idée, planifiez votre projet et construisez avec un workspace assisté par IA.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    other: {
      ...(bingVerification ? { "msvalidate.01": bingVerification } : {}),
    },
  },
};

export const viewport = {
  interactiveWidget: "resizes-content",
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

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Idealy",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/idealy-mark.svg`,
      },
      description:
        "Plateforme d'ingénierie et d'orchestration logicielle assistée par IA.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Idealy",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: "fr-FR",
      description:
        "Transformez une idée en mission, plan de projet et application logicielle assistée par IA.",
    },
  ],
};

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
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Static structured data"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdSchema),
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
                <Toaster
                  closeButton
                  position="top-center"
                  richColors
                  toastOptions={{
                    className:
                      "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
                  }}
                />
                <Suspense>{children}</Suspense>
              </TooltipProvider>
            </LanguageProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
