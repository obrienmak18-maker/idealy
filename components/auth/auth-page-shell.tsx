import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { IdealyLogo } from "@/components/branding/idealy-logo";

export function AuthPageShell({
  backHref,
  backLabel,
  children,
  notice,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  notice?: string;
}) {
  return (
    <main className="idealy-auth-page" id="main-content">
      <div className="idealy-auth-page__inner">
        <Link className="idealy-auth-back" href={backHref}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel}
        </Link>
        <section className="idealy-auth-card">
          <Link
            aria-label="Accueil Idealy"
            className="idealy-auth-brand"
            href="/welcome"
          >
            <IdealyLogo animated={false} compact label="Idealy" size={34} />
            <span>Idealy</span>
          </Link>
          <div className="idealy-auth-form">{children}</div>
          {notice && <p className="idealy-auth-notice">{notice}</p>}
        </section>
      </div>
    </main>
  );
}
