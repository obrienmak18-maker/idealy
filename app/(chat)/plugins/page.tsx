import { ArrowLeftIcon, PlugZapIcon } from "lucide-react";
import Link from "next/link";
import { ConnectorCatalog } from "@/components/connectors/connector-catalog";
import { listConnectorDefinitions } from "@/lib/idealy/connectors";

export default function PluginsPage() {
  const connectors = listConnectorDefinitions();

  return (
    <main className="idealy-public-shell min-h-dvh px-6 py-10 text-foreground sm:px-10">
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
        <ConnectorCatalog connectors={connectors} />
      </div>
    </main>
  );
}
