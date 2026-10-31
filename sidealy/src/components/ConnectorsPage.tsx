import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  LoaderCircle,
  Play,
  Menu,
  Plug,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { getConnectorBrandLogo } from "./connectors/brand-logos";

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
type PluginExecutionRecord = {
  id?: string;
  output?: unknown;
  started_at?: string | null;
  status?: string;
  tool_id?: string;
};
type PluginExecutionResponse = {
  error?: string;
  executions?: PluginExecutionRecord[];
  output?: unknown;
  ok?: boolean;
};
type PluginInstallReview = { plugin: BackendPlugin; permissions: string[] };

const NO_INPUT_READ_TOOLS = new Set([
  "github-list-repositories",
  "google-drive-list-drive-files",
  "vercel-list-projects",
  "canva-list-designs",
  "notion-search-pages",
  "slack-list-channels",
  "stripe-read-subscription",
  "stripe-read-invoice",
]);

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
  const [reloadKey, setReloadKey] = useState(0);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [review, setReview] = useState<PluginInstallReview | null>(null);
  const [installing, setInstalling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [openToolsPlugin, setOpenToolsPlugin] = useState<string | null>(null);
  const [executingTool, setExecutingTool] = useState<string | null>(null);
  const [executionHistory, setExecutionHistory] = useState<
    Record<string, PluginExecutionRecord[]>
  >({});
  const [executionResult, setExecutionResult] = useState<{
    output: unknown;
    pluginId: string;
  } | null>(null);

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
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/idealy/connectors/status", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          integrations?: Array<{
            provider?: string;
            serverReady?: boolean;
            status?: string;
          }>;
        };
        if (!response.ok || !Array.isArray(payload.integrations)) return;
        const providers = payload.integrations
          .filter(
            (entry) => entry.status === "active" && entry.serverReady === true,
          )
          .map((entry) =>
            entry.provider === "google" ? "google-drive" : entry.provider,
          )
          .filter(
            (provider): provider is string => typeof provider === "string",
          );
        setConnectedProviders(Array.from(new Set(providers)));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("connected");
    const errorCode = url.searchParams.get("error");
    if (!connected && !errorCode) return;
    if (connected)
      setActionError(
        `${url.searchParams.get("display") || connected} est connecté. Actualisation du registre…`,
      );
    if (errorCode)
      setActionError(
        `La connexion a échoué (${errorCode}). Réessayez depuis le connecteur.`,
      );
    url.searchParams.delete("connected");
    url.searchParams.delete("display");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    setReloadKey((key) => key + 1);
  }, []);

  const readyCount = plugins.filter((plugin) => plugin.available).length;

  const connectPlugin = async (plugin: BackendPlugin) => {
    const supportedProviders = new Set([
      "github",
      "canva",
      "figma",
      "google-drive",
      "notion",
      "slack",
      "vercel",
    ]);
    if (!supportedProviders.has(plugin.id)) {
      setActionError(
        `${plugin.name} utilise une configuration serveur ; aucune connexion OAuth n’est déclarée pour ce connecteur.`,
      );
      return;
    }
    setConnectingId(plugin.id);
    setActionError("");
    try {
      const endpoint =
        plugin.id === "vercel"
          ? "/api/idealy/connectors/vercel/start"
          : "/api/idealy/connectors/start";
      const response = await fetch(endpoint, {
        body: JSON.stringify({ provider: plugin.id }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !payload.url)
        throw new Error(
          payload.error ||
            "Le fournisseur n’a pas retourné de lien de connexion.",
        );
      window.location.assign(payload.url);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Impossible de démarrer la connexion.",
      );
      setConnectingId(null);
    }
  };

  const reviewPluginInstall = async (plugin: BackendPlugin) => {
    setActionError("");
    try {
      const response = await fetch(
        `/api/idealy/plugins/${encodeURIComponent(plugin.id)}/install`,
        {
          body: JSON.stringify({ confirmed: false }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        requestedPermissions?: string[];
      };
      if (
        response.status === 409 &&
        Array.isArray(payload.requestedPermissions)
      ) {
        setReview({ plugin, permissions: payload.requestedPermissions });
        return;
      }
      if (!response.ok)
        throw new Error(
          payload.error ||
            "Les autorisations du plugin n’ont pas pu être chargées.",
        );
      throw new Error(
        "Le registre n’a pas retourné les autorisations à examiner.",
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Les autorisations du plugin n’ont pas pu être chargées.",
      );
    }
  };

  const loadPluginExecutions = async (pluginId: string) => {
    const response = await fetch(
      "/api/idealy/plugins/" + encodeURIComponent(pluginId) + "/execute",
      { cache: "no-store", credentials: "same-origin" },
    );
    const payload = (await response.json().catch(() => ({}))) as PluginExecutionResponse;
    if (!response.ok)
      throw new Error(payload.error || "L�historique des outils est indisponible.");
    setExecutionHistory((current) => ({
      ...current,
      [pluginId]: Array.isArray(payload.executions) ? payload.executions : [],
    }));
  };

  const togglePluginTools = async (plugin: BackendPlugin) => {
    if (openToolsPlugin === plugin.id) {
      setOpenToolsPlugin(null);
      return;
    }
    setOpenToolsPlugin(plugin.id);
    setActionError("");
    try {
      await loadPluginExecutions(plugin.id);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "L�historique des outils est indisponible.",
      );
    }
  };

  const executeReadTool = async (plugin: BackendPlugin, toolId: string) => {
    if (!plugin.available || !NO_INPUT_READ_TOOLS.has(toolId) || executingTool)
      return;
    setExecutingTool(plugin.id + ":" + toolId);
    setActionError("");
    setExecutionResult(null);
    try {
      const response = await fetch(
        "/api/idealy/plugins/" + encodeURIComponent(plugin.id) + "/execute",
        {
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            input: {},
            toolId,
          }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as PluginExecutionResponse;
      if (!response.ok || payload.ok !== true)
        throw new Error(payload.error || "L�outil n�a pas pu �tre ex�cut�.");
      setExecutionResult({ output: payload.output ?? null, pluginId: plugin.id });
      await loadPluginExecutions(plugin.id);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "L�outil n�a pas pu �tre ex�cut�.",
      );
    } finally {
      setExecutingTool(null);
    }
  };

  const confirmPluginInstall = async () => {
    if (!review) return;
    setInstalling(true);
    setActionError("");
    try {
      const response = await fetch(
        `/api/idealy/plugins/${encodeURIComponent(review.plugin.id)}/install`,
        {
          body: JSON.stringify({
            confirmed: true,
            permissions: review.permissions,
          }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "L’installation du plugin a échoué.");
      setReview(null);
      setActionError(`${review.plugin.name} a été installé.`);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "L’installation du plugin a échoué.",
      );
    } finally {
      setInstalling(false);
    }
  };

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
                        {getConnectorBrandLogo(
                          plugin.id,
                          "h-[18px] w-[18px]",
                        ) ??
                          (plugin.available ? (
                            <Check
                              aria-hidden="true"
                              className="h-4 w-4 text-success"
                            />
                          ) : (
                            <Plug aria-hidden="true" className="h-4 w-4" />
                          ))}
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
                        {plugin.available &&
                          plugin.tools.some(
                            (tool) =>
                              NO_INPUT_READ_TOOLS.has(tool.id) &&
                              tool.requiresConfirmation === false,
                          ) && (
                            <div className="mt-3">
                              <button
                                aria-expanded={openToolsPlugin === plugin.id}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-subtle px-3 text-[11px] font-medium text-text-main hover:bg-bg-subtle focus-ring"
                                onClick={() => void togglePluginTools(plugin)}
                                type="button"
                              >
                                Outils de lecture
                                <ChevronDown
                                  aria-hidden="true"
                                  className={"h-3.5 w-3.5 transition-transform " + (openToolsPlugin === plugin.id ? "rotate-180" : "")}
                                />
                              </button>
                              {openToolsPlugin === plugin.id && (
                                <section
                                  aria-label={"Outils de lecture " + plugin.name}
                                  className="mt-3 rounded-xl border border-border-subtle bg-bg-base p-3"
                                >
                                  <p className="text-[11px] leading-5 text-text-muted">
                                    Ces outils lisent les donn�es du compte connect�. Les actions d��criture et de publication ne sont pas lanc�es depuis ce panneau.
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {plugin.tools
                                      .filter(
                                        (tool) =>
                                          NO_INPUT_READ_TOOLS.has(tool.id) &&
                                          tool.requiresConfirmation === false,
                                      )
                                      .map((tool) => (
                                        <button
                                          className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-bg-subtle px-3 text-[11px] font-medium text-text-main hover:bg-border-subtle focus-ring disabled:opacity-50"
                                          disabled={executingTool !== null}
                                          key={tool.id}
                                          onClick={() => void executeReadTool(plugin, tool.id)}
                                          type="button"
                                        >
                                          {executingTool === plugin.id + ":" + tool.id ? (
                                            <LoaderCircle aria-hidden="true" className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Play aria-hidden="true" className="h-3 w-3" />
                                          )}
                                          {tool.label}
                                        </button>
                                      ))}
                                  </div>
                                  {executionResult?.pluginId === plugin.id && (
                                    <pre
                                      aria-label={"R�sultat " + plugin.name}
                                      className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-bg-surface p-3 font-mono text-[10px] leading-4 text-text-muted"
                                    >
                                      {JSON.stringify(executionResult.output, null, 2)}
                                    </pre>
                                  )}
                                  <div className="mt-3">
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                                      Ex�cutions r�centes
                                    </h4>
                                    {executionHistory[plugin.id]?.length ? (
                                      <ul className="mt-2 space-y-1.5">
                                        {executionHistory[plugin.id].slice(0, 5).map((execution, index) => (
                                          <li
                                            className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-muted"
                                            key={execution.id ?? (execution.tool_id || "tool") + "-" + index}
                                          >
                                            <span className="truncate">
                                              {execution.tool_id ?? "Outil"}
                                              {execution.started_at
                                                ? " � " + new Date(execution.started_at).toLocaleString("fr-FR")
                                                : ""}
                                            </span>
                                            <span className={execution.status === "succeeded" ? "text-success" : ""}>
                                              {execution.status ?? "�tat inconnu"}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="mt-1.5 text-[10px] text-text-muted">
                                        Aucune ex�cution enregistr�e.
                                      </p>
                                    )}
                                  </div>
                                </section>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                      <span className="text-[10px] text-text-muted">
                        {plugin.category}
                        {plugin.version ? ` · v${plugin.version}` : ""}
                      </span>
                      {plugin.available ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-medium text-success">
                          Prêt
                        </span>
                      ) : (
                        <>
                          {[
                            "github",
                            "canva",
                            "figma",
                            "google-drive",
                            "notion",
                            "slack",
                            "vercel",
                          ].includes(plugin.id) && (
                            <button
                              className="inline-flex h-8 items-center rounded-full border border-border-subtle px-3 text-[11px] font-medium text-text-main hover:bg-bg-subtle focus-ring disabled:opacity-60"
                              disabled={connectingId === plugin.id || loading}
                              onClick={() => void connectPlugin(plugin)}
                              type="button"
                            >
                              {connectingId === plugin.id
                                ? "Connexion…"
                                : connectedProviders.includes(plugin.id)
                                  ? "Compte connecté"
                                  : "Connecter"}
                            </button>
                          )}
                          {!plugin.installed && (
                            <button
                              className="inline-flex h-8 items-center rounded-full bg-bg-subtle px-3 text-[11px] font-medium text-text-main hover:bg-border-subtle focus-ring"
                              onClick={() => void reviewPluginInstall(plugin)}
                              type="button"
                            >
                              Examiner l’installation
                            </button>
                          )}
                        </>
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
          {actionError && (
            <p
              aria-live="polite"
              className="mt-4 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-[12px] text-text-muted"
            >
              {actionError}
            </p>
          )}
        </div>
      </main>

      {review && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="plugin-install-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-elevated"
            role="dialog"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Autorisation explicite
            </p>
            <h2
              className="mt-2 text-lg font-semibold text-text-main"
              id="plugin-install-title"
            >
              Installer {review.plugin.name} ?
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              L’installation demandera les permissions suivantes. L’application
              les transmet au backend seulement après votre confirmation.
            </p>
            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-bg-base p-3">
              {review.permissions.map((permission) => (
                <li className="text-xs text-text-main" key={permission}>
                  {permission}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-9 rounded-lg px-3 text-xs text-text-muted hover:bg-bg-subtle focus-ring"
                onClick={() => setReview(null)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-primary px-3 text-xs font-medium text-brand-onPrimary hover:opacity-90 focus-ring disabled:opacity-60"
                disabled={installing}
                onClick={() => void confirmPluginInstall()}
                type="button"
              >
                {installing && (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                )}
                Autoriser et installer
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
