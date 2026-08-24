import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import { Preview } from "@/components/chat/preview";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="idealy-app-background relative flex min-h-dvh w-full overflow-hidden">
      <div aria-hidden="true" className="welcome-orb welcome-orb-sky" />
      <div aria-hidden="true" className="welcome-orb welcome-orb-sunset" />
      <div aria-hidden="true" className="welcome-orb welcome-orb-gold" />
      <div aria-hidden="true" className="welcome-grid" />

      <div className="idealy-surface relative z-10 flex w-full flex-col border-border/40 bg-background/85 p-7 backdrop-blur-xl xl:w-[620px] xl:shrink-0 xl:rounded-r-3xl xl:border-r md:p-14">
        <Link
          className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" />
          Retour à Idealy
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-9">
          <IdealyLogo
            animated
            className="mb-1 w-fit [&_.idealy-logo__wordmark]:text-xl"
            size={44}
          />
          <div className="flex flex-col gap-2">
            <div className="relative rounded-2xl border border-border/55 bg-card/75 p-6 shadow-[var(--shadow-float)] backdrop-blur-sm md:p-7">
              <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 via-teal-400/50 via-violet-400/55 to-transparent" />
              {children}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 hidden flex-1 flex-col overflow-hidden px-10 py-10 xl:flex 2xl:px-16">
        <div className="mb-7 max-w-xl">
          <p className="mb-2 font-mono text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            IDEALY WORKSPACE
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            Transformez une intention en expérience concrète.
          </h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Imaginez, structurez et pilotez votre projet depuis un espace de création unifié.
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <Preview />
        </div>
      </div>
    </div>
  );
}
