import { ArrowLeftIcon, PlugZapIcon } from "lucide-react";
import Link from "next/link";
import { ConnectorCatalog } from "@/components/connectors/connector-catalog";
import { listConnectorDefinitions } from "@/lib/idealy/connectors";
import { getPluginStatusLabel, listIdealyPlugins } from "@/lib/idealy/plugin-engine";

export default function PluginsPage() {
  const connectors = listConnectorDefinitions();
  const plugins = listIdealyPlugins();

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
        <section className="mb-8 rounded-2xl border border-border/70 bg-card/60 p-5" aria-labelledby="plugin-registry-title">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="plugin-registry-title" className="text-lg font-semibold">Plugin registry</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Un plugin n’est disponible que lorsque sa configuration et son autorisation sont terminées.
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {plugins.length} plugins internes
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plugins.map((plugin) => (
              <article key={plugin.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{plugin.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plugin.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px]">
                    {getPluginStatusLabel(plugin)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plugin.capabilities.map((capability) => (
                    <span key={capability} className="rounded-md bg-muted/70 px-2 py-1 text-[11px] text-muted-foreground">
                      {capability}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Permissions : {plugin.permissions.join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>
        <ConnectorCatalog connectors={connectors} />
      </div>
    </main>
  );
}
