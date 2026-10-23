import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PricingExperience } from "@/components/billing/pricing-experience";
import { CosmicHorizon } from "@/components/branding/cosmic-horizon";
import { IdealyMark } from "@/components/branding/idealy-logo";

export const metadata: Metadata = {
  title: "Tarifs & Formules",
  description: "Des offres transparentes adaptées à chaque étape de vos projets logiciels.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Tarifs & Formules · Idealy",
    description: "Des offres transparentes adaptées à chaque étape de vos projets logiciels.",
    url: "/pricing",
  },
};

export default async function PricingPage() {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = savedLocale === "en" || savedLocale === "es" ? savedLocale : "fr";
  const savedWay = cookieStore.get("idealy_user_way")?.value;
  const way = savedWay === "mage" || savedWay === "hunter" || savedWay === "professional" || savedWay === "ninja" ? savedWay : "professional";
  const backLabel = locale === "en" ? "Back to workspace" : locale === "es" ? "Volver al workspace" : "Retour à l’espace de travail";
  return (
    <main className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <CosmicHorizon />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-md transition-all hover:bg-card hover:border-border"
        >
          <ArrowLeft className="size-3.5" />
          <span>{backLabel}</span>
        </Link>
        <div className="flex items-center gap-2">
          <IdealyMark className="size-6 text-primary" size={24} />
          <span className="text-sm font-bold tracking-tight text-foreground">Idealy</span>
        </div>
      </header>

      <div className="relative z-10 w-full pb-20">
        <PricingExperience way={way} locale={locale} />
      </div>
    </main>
  );
}
