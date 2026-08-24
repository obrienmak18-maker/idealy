import {
  ArrowLeftIcon,
  Code2Icon,
  CreditCardIcon,
  DatabaseIcon,
  Globe2Icon,
  MessageSquareIcon,
  PaletteIcon,
  PlugZapIcon,
} from "lucide-react";
import Link from "next/link";
import { GitHubConnectButton } from "@/components/connectors/github-connect-button";
import {
  listConnectorDefinitions,
  type ConnectorCategory,
} from "@/lib/idealy/connectors";

const categoryLabels: Record<ConnectorCategory, string> = {
  billing: "Facturation",
  code: "Code",
  communication: "Communication",
  data: "Données",
  deploy: "Déploiement",
  design: "Design",
};

function CategoryIcon({ category }: { category: ConnectorCategory }) {
  const iconClassName = "size-4";
  if (category === "billing") return <CreditCardIcon className={iconClassName} />;
  if (category === "code") return <Code2Icon className={iconClassName} />;
  if (category === "communication") {
    return <MessageSquareIcon className={iconClassName} />;
  }
  if (category === "data") return <DatabaseIcon className={iconClassName} />;
  if (category === "deploy") return <Globe2Icon className={iconClassName} />;
  return <PaletteIcon className={iconClassName} />;
}

function availabilityLabel(availability: string) {
  if (availability === "configured") return "Noyau Idealy";
  if (availability === "planned") return "À connecter";
  if (availability === "deprecated") return "Retiré";
  return "Catalogue";
}

export default function PluginsPage() {
  const connectors = listConnectorDefinitions();

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
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Le catalogue décrit les capacités qu’une mission pourra utiliser.
              « À connecter » signifie qu’un OAuth ou une clé serveur reste à
              configurer ; ce statut ne prétend pas qu’un compte externe est
              déjà lié.
            </p>
          </div>
          <Link
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm text-background hover:opacity-85"
            href="#catalogue"
          >
            <PlugZapIcon className="size-4" /> Parcourir
          </Link>
        </div>
        <div className="grid gap-3" id="catalogue">
          {connectors.map((connector) => (
            <article
              className="flex items-start justify-between gap-5 rounded-2xl border border-border/60 bg-card/40 p-5"
              key={connector.id}
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <CategoryIcon category={connector.category} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{connector.label}</h2>
                    <span className="text-[11px] text-muted-foreground">
                      {categoryLabels[connector.category]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {connector.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground/75">
                    {connector.operations.length} capacités · exécution : {connector.runtime}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {connector.id === "github" ? <GitHubConnectButton /> : null}
                <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
                  {availabilityLabel(connector.availability)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
