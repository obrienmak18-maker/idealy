import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  alternates: { canonical: "/welcome" },
  description:
    "Idealy aide à clarifier une idée, planifier un projet et construire une application avec un workspace assisté par IA.",
  openGraph: {
    description:
      "Transformez une intention en mission, plan et projet visible avec Idealy.",
    title: "Idealy — Transformez une idée en projet",
    url: "/welcome",
  },
  title: "Transformez une idée en projet",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  applicationCategory: "BusinessApplication",
  description:
    "Workspace de création assistée qui transforme une intention en mission, plan de projet et application visible.",
  inLanguage: "fr",
  name: "Idealy",
  operatingSystem: "Web",
  url: "https://idealy-ai.netlify.app/welcome",
};

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
      {children}
    </>
  );
}
