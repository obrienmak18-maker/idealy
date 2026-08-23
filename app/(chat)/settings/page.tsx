import {
  ArrowLeftIcon,
  BellIcon,
  CreditCardIcon,
  DatabaseIcon,
  KeyboardIcon,
  PaletteIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";

const sections = [
  {
    description: "Thème, densité et préférences d’affichage.",
    icon: PaletteIcon,
    id: "appearance",
    title: "Apparence",
  },
  {
    description: "Choisissez quand Idealy vous informe.",
    icon: BellIcon,
    id: "notifications",
    title: "Notifications",
  },
  {
    description: "Gérez vos données, sessions et permissions.",
    icon: ShieldCheckIcon,
    id: "privacy",
    title: "Confidentialité",
  },
  {
    description:
      "Contrôlez les sources, l’historique et la mémoire de vos espaces.",
    icon: DatabaseIcon,
    id: "data",
    title: "Données et mémoire",
  },
  {
    description: "Accédez rapidement aux actions importantes du workspace.",
    icon: KeyboardIcon,
    id: "shortcuts",
    title: "Raccourcis",
  },
];

export default function SettingsPage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-4" /> Retour au workspace
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
          <p className="mt-2 text-muted-foreground">
            Configurez votre espace Idealy, vos données et votre plan.
          </p>
        </div>
        <section
          className="mb-8 scroll-mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card/40 to-orange-400/10 p-6"
          id="billing"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-violet-400">
                <CreditCardIcon className="size-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">
                  Votre plan
                </span>
              </div>
              <h2 className="text-xl font-semibold">Plan découverte</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                82 énergie disponible. Passez à un plan supérieur pour prolonger
                vos missions et connecter davantage d’outils.
              </p>
            </div>
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              Démo
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-85"
              type="button"
            >
              Voir les offres
            </button>
            <button
              className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              type="button"
            >
              Gérer la facturation
            </button>
          </div>
        </section>
        <div className="grid gap-3">
          {sections.map(({ id, title, description, icon: Icon }) => (
            <Link
              className="flex scroll-mt-8 items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-colors hover:bg-card/70"
              href={`#${id}`}
              id={id}
              key={id}
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
