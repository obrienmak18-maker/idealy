import { ArrowLeftIcon, PlugZapIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

const plugins = [
  {
    description: "Importer un dépôt, lire le code et suivre les changements.",
    name: "GitHub",
    status: "Disponible",
  },
  {
    description:
      "Connecter les données, l’authentification et les fonctions serveur.",
    name: "Supabase",
    status: "Disponible",
  },
  {
    description: "Ajouter paiements, produits et abonnements à une mission.",
    name: "Stripe",
    status: "Bientôt",
  },
];

export default function PluginsPage() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-4" /> Retour au workspace
        </Link>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <PlugZapIcon className="size-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Plugins & connecteurs
            </h1>
            <p className="mt-2 text-muted-foreground">
              Choisissez les outils qui donnent plus de puissance à vos
              missions.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:opacity-85"
            type="button"
          >
            <PlusIcon className="size-4" /> Ajouter
          </button>
        </div>
        <div className="grid gap-3">
          {plugins.map((plugin) => (
            <div
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 p-5"
              key={plugin.name}
            >
              <div>
                <h2 className="font-medium">{plugin.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plugin.description}
                </p>
              </div>
              <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
                {plugin.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
