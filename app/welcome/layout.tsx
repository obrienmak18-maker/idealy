import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  alternates: { canonical: "/welcome" },
  description:
    "Idealy helps you clarify an idea, plan a project, and build an application with an AI-powered workspace.",
  openGraph: {
    description:
      "Turn an intention into a mission, plan, and visible application with Idealy.",
    title: "Idealy — Turn an idea into a project",
    url: "/welcome",
  },
  title: "Turn an idea into a project",
};

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://idealy-ai.vercel.app");

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  applicationCategory: "BusinessApplication",
  description:
    "AI-assisted creation workspace that transforms an intention into a mission, project plan, and running application.",
  inLanguage: "en",
  name: "Idealy",
  operatingSystem: "Web",
  url: `${baseUrl}/welcome`,
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
