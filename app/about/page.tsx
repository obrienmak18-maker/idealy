import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { IdealyLogo } from "@/components/branding/idealy-logo";

export default function AboutPage() {
  return (
    <main className="idealy-app-background relative flex min-h-dvh items-center overflow-hidden px-5 py-12 text-foreground sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="welcome-orb welcome-orb-sky" />
        <div className="welcome-orb welcome-orb-sunset" />
        <div className="welcome-orb welcome-orb-gold" />
      </div>
      <div className="relative mx-auto w-full max-w-4xl">
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          href="/welcome"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Retour à Idealy
        </Link>
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 shadow-[var(--shadow-float)] backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-border/50 px-6 py-10 sm:px-10 sm:py-14">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,.12),transparent_52%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,.12),transparent_50%)]"
            />
            <div className="relative">
              <IdealyLogo animated compact size={32} />
              <p className="mt-9 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                <Sparkles
                  aria-hidden="true"
                  className="size-3.5 text-primary"
                />{" "}
                À propos
              </p>
              <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-.045em] sm:text-6xl">
                Une idée devient un produit, étape après étape.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                Idealy est un studio de création assisté par l’intelligence
                artificielle. Il aide à clarifier une intention, à la
                transformer en mission, puis à suivre le projet dans un espace
                de travail avec code et aperçu.
              </p>
            </div>
          </div>
          <div className="grid gap-8 px-6 py-8 sm:grid-cols-[1fr_auto] sm:items-end sm:px-10 sm:py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
                Création
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Créé par O’Brien Makutano
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Cette page présente l’origine du projet sans attribuer à
                d’autres personnes des rôles ou une histoire qui restent à
                préciser.
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-85"
              href="/welcome#product"
            >
              Découvrir Idealy{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <section
            aria-labelledby="logo-story-title"
            className="border-t border-border/50 px-6 py-9 sm:px-10 sm:py-11"
          >
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
              Le symbole
            </p>
            <h2
              className="mt-2 text-2xl font-semibold tracking-tight"
              id="logo-story-title"
            >
              Pourquoi cette étoile ?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Le logo raconte le mouvement d’une idée qui prend forme. Son
              étoile à quatre pointes représente l’étincelle initiale. Les
              orbites évoquent les chemins, les outils et les agents qui
              convergent autour d’elle ; le trait discontinu rappelle qu’un
              projet se construit par étapes. Au centre, le cercle blanc et le
              signe plus figurent une idée mise au point, prête à grandir. Le
              dégradé relie ces étapes dans une même énergie créative.
            </p>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground/75">
              C’est la lecture de marque d’Idealy : transformer une intention en
              logiciel, sans perdre l’élan de départ.
            </p>
          </section>
        </section>
        <p className="mt-5 text-center text-xs text-muted-foreground/65">
          © {new Date().getFullYear()} Idealy
        </p>
      </div>
    </main>
  );
}
