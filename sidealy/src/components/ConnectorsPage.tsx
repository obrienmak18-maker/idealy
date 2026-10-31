import {
  AlertCircle,
  ArrowLeft,
  Check,
  LoaderCircle,
  Menu,
  Plug,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

type BackendPlugin = {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  state: string;
  installed: boolean;
  available: boolean;
  configurationRequired: boolean;
  missingRequirements: string[];
  tools: Array<{
    id: string;
    label: string;
    risk: string;
    requiresConfirmation: boolean;
  }>;
};

type PluginResponse = { plugins?: BackendPlugin[]; error?: string };

function pluginStateLabel(plugin: BackendPlugin): string {
  if (plugin.available) {
    return "Prêt";
  }
  if (plugin.installed && plugin.configurationRequired) {
    return "Configuration requise";
  }
  if (plugin.installed) {
    return "Indisponible";
  }
  return "Non configuré";
}

export const ConnectorsPage: React.FC = () => {
  const { setActivePage, setIsMobileDrawerOpen } = useApp();
  const [plugins, setPlugins] = useState<BackendPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [_reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setAuthRequired(false);

    fetch("/api/idealy/plugins", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => ({}))) as PluginResponse;
        if (response.status === 401 || response.status === 403) {
          setAuthRequired(true);
          throw new Error(
            payload.error ||
              "Connectez-vous à Idealy pour consulter vos connecteurs.",
          );
        }
        if (!response.ok) {
          throw new Error(
            payload.error ||
              "Le registre des connecteurs est momentanément indisponible.",
          );
        }
        setPlugins(
          Array.isArray(payload.plugins)
            ? payload.plugins.filter(
                (plugin) =>
                  plugin &&
                  typeof plugin.id === "string" &&
                  typeof plugin.name === "string",
              )
            : [],
        );
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "Impossible de charger les connecteurs.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const readyCount = plugins.filter((plugin) => plugin.available).length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-base text-text-main">
      <header className="flex h-12 shrink-0 items-center justify-between px-4 md:px-8">
        <button
          aria-label="Ouvrir le menu de navigation"
          className="grid h-9 w-9 place-items-center rounded-xl text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring md:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="h-[18px] w-[18px]" />
        </button>
        <span className="hidden text-xs text-text-muted md:block">
          Espace de travail <span className="mx-1.5 opacity-50">/</span>{" "}
          Connecteurs
        </span>
        <button
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-medium text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
          onClick={() => setActivePage("chat")}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span>Retour au chat</span>
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-10 md:pt-9">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-border-subtle bg-bg-surface text-text-main shadow-subtle">
                <Plug
                  aria-hidden="true"
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.8}
                />
              </div>
              <h1 className="text-[26px] font-semibold tracking-[-0.035em] md:text-[30px]">
                Connecteurs
              </h1>
              <p className="mt-1.5 max-w-xl text-[14px] leading-6 text-text-muted">
                État des intégrations déclarées par le backend et disponibles
                pour votre compte.
              </p>
            </div>
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 text-xs text-text-muted">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${readyCount > 0 ? "bg-success" : "bg-text-muted/50"}`}
              />
              {loading
                ? "Actualisation…"
                : `${readyCount} prêt${readyCount === 1 ? "" : "s"}`}
            </span>
          </div>

          {loading && (
            <section
              aria-live="polite"
              className="flex items-center justify-center gap-2 rounded-[22px] border border-border-subtle bg-bg-surface px-5 py-12 text-[13px] text-text-muted"
            >
              <LoaderCircle
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
              Lecture du registre Idealy…
            </section>
          )}

          {!loading && error && (
            <section
              className="rounded-[22px] border border-border-subtle bg-bg-surface p-5 md:p-7"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-text-muted"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">
                    {authRequired
                      ? "Connectez votre compte"
                      : "Connecteurs indisponibles"}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-5 text-text-muted">
                    {error}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {authRequired ? (
                      <a
                        className="inline-flex h-9 items-center rounded-full bg-text-main px-4 text-[12px] font-medium text-bg-base transition-opacity hover:opacity-85 focus-ring"
                        href="/login?callbackUrl=%2F"
                      >
                        Se connecter
                      </a>
                    ) : (
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-border-subtle px-3.5 text-[12px] font-medium text-text-main hover:bg-bg-subtle focus-ring"
                        onClick={() => setReloadKey((key) => key + 1)}
                        type="button"
                      >
                        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                        Réessayer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!loading && !error && plugins.length === 0 && (
            <section className="rounded-[22px] border border-border-subtle bg-bg-surface px-6 py-12 text-center">
              <Plug
                aria-hidden="true"
                className="mx-auto h-6 w-6 text-text-muted"
                strokeWidth={1.6}
              />
              <h2 className="mt-4 text-base font-semibold">
                Aucun plugin dans le registre
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-text-muted">
                Le backend n’a renvoyé aucune intégration pour ce compte.
              </p>
            </section>
          )}

          {!loading && !error && plugins.length > 0 && (
            <section
              aria-label="Plugins du backend"
              className="overflow-hidden rounded-[22px] border border-border-subtle bg-bg-surface shadow-subtle"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5 md:px-6">
                <div>
                  <h2 className="text-[13px] font-semibold">
                    Registre des intégrations
                  </h2>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Les statuts proviennent du backend pour votre session.
                  </p>
                </div>
                <button
                  aria-label="Actualiser le registre"
                  className="grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-main focus-ring"
                  onClick={() => setReloadKey((key) => key + 1)}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-border-subtle/70">
                {plugins.map((plugin) => (
                  <article
                    className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between md:px-6"
                    key={plugin.id}
                  >
                    <div className="flex min-w-0 gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border-subtle bg-bg-base text-text-muted">
                        {plugin.available ? (
                          <Check
                            aria-hidden="true"
                            className="h-4 w-4 text-success"
                          />
                        ) : (
                          <Plug aria-hidden="true" className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13px] font-semibold">
                            {plugin.name}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${plugin.available ? "bg-success/10 text-success" : "bg-bg-base text-text-muted"}`}
                          >
                            {pluginStateLabel(plugin)}
                          </span>
                        </div>
                        <p className="mt-1 max-w-2xl text-[12px] leading-5 text-text-muted">
                          {plugin.description}
                        </p>
                        {plugin.tools?.length > 0 && (
                          <p className="mt-2 text-[11px] leading-5 text-text-muted">
                            Capacités :{" "}
                            {plugin.tools
                              .map((tool) => tool.label)
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] text-text-muted md:text-right">
                      <span>{plugin.category}</span>
                      {plugin.version && (
                        <span className="ml-2 opacity-70">
                          v{plugin.version}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <div className="flex items-start gap-2.5 border-t border-border-subtle px-5 py-3.5 text-[11px] leading-5 text-text-muted md:px-6">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                />
                <p>
                  Un plugin n’est marqué prêt que si le backend confirme sa
                  configuration, son autorisation et sa disponibilité pour le
                  compte courant.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
