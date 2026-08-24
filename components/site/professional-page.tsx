import { ArrowLeftIcon, BadgeCheckIcon, BookOpenIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

type ProfessionalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
};

export function ProfessionalPage({ eyebrow, title, intro, sections }: ProfessionalPageProps) {
  return (
    <main className="idealy-public-shell min-h-dvh px-5 py-8 text-foreground sm:px-10 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground" href="/welcome">
          <ArrowLeftIcon className="size-4" /> Retour à Idealy
        </Link>
        <header className="mt-12 rounded-3xl border border-border/65 bg-card/80 p-7 shadow-[var(--shadow-float)] backdrop-blur-xl sm:p-10">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <BadgeCheckIcon className="size-4 text-[#4285f4]" /> {eyebrow}
          </div>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">{intro}</p>
        </header>
        <section className="mt-8 grid gap-4">
          {sections.map((section, index) => (
            <article className="rounded-2xl border border-border/60 bg-card/65 p-6 shadow-[var(--shadow-card)]" key={section.title}>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                {index % 2 === 0 ? <ShieldCheckIcon className="size-4 text-[#34a853]" /> : <BookOpenIcon className="size-4 text-[#fbbc05]" />}
                {section.title}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
            </article>
          ))}
        </section>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <span>Idealy · Construire avec clarté, validation et contrôle.</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Liens professionnels">
            <Link className="hover:text-foreground" href="/about">À propos</Link>
            <Link className="hover:text-foreground" href="/docs">Documentation</Link>
            <Link className="hover:text-foreground" href="/privacy">Confidentialité</Link>
            <Link className="hover:text-foreground" href="/terms">Conditions</Link>
            <a className="inline-flex items-center gap-2 hover:text-foreground" href="mailto:contact@idealy.app"><MailIcon className="size-4" /> Contact</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
