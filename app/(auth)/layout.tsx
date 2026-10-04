import { ArrowLeftIcon } from "lucide-react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import { Preview } from "@/components/chat/preview";

const authShellCopy = {
  en: {
    back: "Back to Idealy",
    notice: "AI can make mistakes. Verify important information before acting.",
    subtitle:
      "Imagine, structure and steer your project from one creation workspace.",
    title: "Turn an intention into a concrete experience.",
  },
  es: {
    back: "Volver a Idealy",
    notice:
      "La IA puede cometer errores. Verifica la información importante antes de actuar.",
    subtitle:
      "Imagina, estructura y dirige tu proyecto desde un espacio de creación unificado.",
    title: "Transforma una intención en una experiencia concreta.",
  },
  fr: {
    back: "Retour à Idealy",
    notice:
      "L’IA peut se tromper. Vérifiez les informations importantes avant d’agir.",
    subtitle:
      "Imaginez, structurez et pilotez votre projet depuis un espace de création unifié.",
    title: "Transformez une intention en expérience concrète.",
  },
} as const;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AuthShellFallback />}>
      <AuthShell>{children}</AuthShell>
    </Suspense>
  );
}

async function AuthShell({ children }: { children: React.ReactNode }) {
  // The selected locale comes from the request cookie. Mark this shell as
  // request-rendered before accessing it so Cache Components does not attempt
  // to prerender an authentication page with an unknown locale.
  await connection();
  const locale = (await cookies()).get("NEXT_LOCALE")?.value;
  const copy =
    authShellCopy[locale === "en" || locale === "es" ? locale : "fr"];

  return (
    <div className="idealy-app-background relative flex min-h-dvh w-full overflow-hidden">
      <div aria-hidden="true" className="welcome-orb welcome-orb-sky" />
      <div aria-hidden="true" className="welcome-orb welcome-orb-sunset" />
      <div aria-hidden="true" className="welcome-orb welcome-orb-gold" />
      <div aria-hidden="true" className="welcome-grid" />

      <div className="idealy-surface relative z-10 flex w-full flex-col border-border/40 bg-background/85 p-7 backdrop-blur-xl xl:w-[620px] xl:shrink-0 xl:rounded-r-3xl xl:border-r md:p-14">
        <Link
          className="flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
          href="/welcome"
        >
          <ArrowLeftIcon className="size-3.5" />
          {copy.back}
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 py-4">
          <IdealyLogo
            animated
            className="mb-1 w-fit [&_.idealy-logo__wordmark]:text-xl"
            size={44}
          />
          <div className="flex flex-col gap-2">
            <div className="relative rounded-2xl border border-border/55 bg-card/75 p-5 shadow-[var(--shadow-float)] backdrop-blur-sm md:p-6">
              <div
                aria-hidden="true"
                className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 via-teal-400/50 via-violet-400/55 to-transparent"
              />
              {children}
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground/75">
              {copy.notice}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 hidden flex-1 flex-col overflow-hidden px-10 py-10 xl:flex 2xl:px-16">
        <div className="mb-7 max-w-xl">
          <p className="mb-2 font-mono text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            IDEALY WORKSPACE
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <Preview />
        </div>
      </div>
    </div>
  );
}

function AuthShellFallback() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement de la page de connexion"
      className="idealy-app-background min-h-dvh w-full"
      role="status"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl items-center justify-center px-6">
        <div className="h-2 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
