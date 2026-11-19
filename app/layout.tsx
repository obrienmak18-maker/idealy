import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { CookieNotice } from "@/components/cookies/cookie-notice";
import { ServerLanguageProvider } from "@/lib/i18n/server-language-provider";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://idealy-ai.vercel.app");

const googleVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.GOOGLE_SITE_VERIFICATION;
const bingVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
  process.env.BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  applicationName: "Idealy",
  title: {
    default: "Idealy — Turn an idea into a real project",
    template: "%s | Idealy",
  },
  description:
    "Idealy helps you turn an idea into a mission, project plan, and AI-powered application.",
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
    title: "Idealy — Turn an idea into a real project",
    description:
      "Describe an idea, plan your project, and build with an AI-powered workspace.",
    url: siteUrl,
    siteName: "Idealy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Idealy — Turn an idea into a real project",
    description:
      "Describe an idea, plan your project, and build with an AI-powered workspace.",
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
  var localeCookie = document.cookie.split(';').map(function(part) { return part.trim(); }).find(function(part) { return part.indexOf('NEXT_LOCALE=') === 0; });
  var locale = localeCookie ? localeCookie.slice('NEXT_LOCALE='.length) : '';
  if (locale === 'fr' || locale === 'en' || locale === 'es') {
    html.setAttribute('lang', locale);
  }
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
        "AI-powered software engineering and orchestration platform.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Idealy",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: "en-US",
      description:
        "Turn an idea into a mission, project plan, and AI-powered software application.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
          defaultTheme="dark"
          disableTransitionOnChange
          enableSystem
        >
          <SessionProvider
            basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`}
          >
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
              <Suspense fallback={null}>
                <ServerLanguageProvider>
                  <Suspense>{children}</Suspense>
                  <CookieNotice />
                </ServerLanguageProvider>
              </Suspense>
            </TooltipProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
