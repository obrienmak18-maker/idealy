import {
  AlertTriangle,
  Check,
  LoaderCircle,
  Menu,
  Plug,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { authenticatedFetch, getBearerToken } from "../services/firebase";
import { getConnectorBrandLogo } from "./connectors/brand-logos";
import {
  type ConnectorDefinition,
  DEFAULT_CONNECTORS_CATALOG,
} from "./connectors/default-connectors";

type CategoryFilter = "all" | "dev" | "data" | "ai" | "productivity";

export const ConnectorsPage: React.FC = () => {
  const { setIsMobileDrawerOpen } = useApp();

  const [connectors, setConnectors] = useState<ConnectorDefinition[]>(() =>
    DEFAULT_CONNECTORS_CATALOG.map((c) => ({
      ...c,
      status: c.installed
        ? "connected"
        : c.available
          ? "not_connected"
          : "unavailable",
    }))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [selectedConnector, setSelectedConnector] =
    useState<ConnectorDefinition | null>(null);
  const [configToken, setConfigToken] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testFeedback, setTestFeedback] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (selectedConnector) {
      setConfigToken("");
      setTestStatus("idle");
      setTestFeedback("");
      setShowAdvanced(false);
      setIsAuthenticating(false);
    }
  }, [selectedConnector]);

  const syncConnectorStatus = async () => {
    try {
      const bearer = await getBearerToken();
      const headers: Record<string, string> = { "Cache-Control": "no-store" };
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const res = await authenticatedFetch("/api/idealy/connectors/status", {
        cache: "no-store",
        credentials: "same-origin",
        headers,
      });

      if (res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          integrations?: Array<{
            provider: string;
            status: string;
            serverReady: boolean;
            expiresAt: string | null;
          }>;
        };

        if (Array.isArray(payload?.integrations)) {
          const map = new Map(payload.integrations.map((i) => [i.provider, i]));
          setConnectors((prev) =>
            prev.map((c) => {
              const canonical = c.id === "google" ? "google-drive" : c.id;
              const remote = map.get(canonical) || map.get(c.id);
              if (remote) {
                const isConnected = remote.status === "connected";
                const isExpired = remote.status === "expired";
                const status = isConnected
                  ? "connected"
                  : isExpired
                    ? "expired"
                    : remote.serverReady
                      ? "not_connected"
                      : "configuration_required";

                return {
                  ...c,
                  available: remote.serverReady ?? c.available,
                  configurationRequired: !remote.serverReady,
                  installed: isConnected,
                  status,
                };
              }
              return c;
            })
          );
        }
      }
    } catch {
      // Keep existing catalog fallback on offline / unauthenticated states
    }
  };

  const handleOAuthConnect = async (connector: ConnectorDefinition) => {
    setIsAuthenticating(true);
    setTestStatus("testing");
    setTestFeedback(
      `Initializing authentication with ${connector.name}...`
    );

    try {
      const bearer = await getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      let endpoint = "/api/idealy/connectors/start";
      let body: Record<string, unknown> = { provider: connector.id };
      if (connector.id === "github") {
        endpoint = "/api/idealy/connectors/github/start";
        body = {};
      } else if (connector.id === "vercel") {
        endpoint = "/api/idealy/connectors/vercel/start";
        body = {};
      }

      const res = await authenticatedFetch(endpoint, {
        body: JSON.stringify(body),
        headers,
        method: "POST",
      });

      const data = (await res.json().catch(() => null)) as {
        authorizationUrl?: string;
        url?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        setIsAuthenticating(false);
        setTestStatus("error");
        setTestFeedback(
          data?.error ||
            `Unable to initiate connection with ${connector.name}.`
        );
        return;
      }

      const redirectUrl = data?.authorizationUrl || data?.url;
      if (redirectUrl) {
        setTestFeedback(`Secure redirect to ${connector.name}...`);
        window.location.assign(redirectUrl);
        return;
      }

      setTestStatus("success");
      setTestFeedback(`Connector ${connector.name} synchronized successfully.`);
      setIsAuthenticating(false);
      await syncConnectorStatus();
      setTimeout(() => {
        setSelectedConnector(null);
      }, 700);
    } catch (err: unknown) {
      setIsAuthenticating(false);
      setTestStatus("error");
      const message = err instanceof Error ? err.message : "Unexpected error";
      setTestFeedback(`Error during connection attempt: ${message}`);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedConnector) return;
    if (!configToken.trim()) {
      setTestStatus("error");
      setTestFeedback("Please enter a token or key to test.");
      return;
    }
    setTestStatus("testing");
    setTestFeedback(
      `Verifying live connection with the ${selectedConnector.name} API...`
    );

    try {
      const bearer = await getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const res = await authenticatedFetch("/api/idealy/connectors/test", {
        body: JSON.stringify({
          provider: selectedConnector.id,
          token: configToken.trim(),
        }),
        headers,
        method: "POST",
      });

      const data = (await res.json().catch(() => ({}))) as {
        account?: { name?: string; login?: string };
        error?: string;
        latencyMs?: number;
        success?: boolean;
      };

      if (res.ok && data.success) {
        setTestStatus("success");
        const accountStr = data.account?.name || data.account?.login;
        setTestFeedback(
          `Authentification réussie auprès de ${selectedConnector.name}${
            accountStr ? ` (${accountStr})` : ""
          } — latence : ${data.latencyMs ?? 0}ms.`
        );
      } else {
        setTestStatus("error");
        setTestFeedback(
          data.error ||
            `Credential verification failed with ${selectedConnector.name}.`
        );
      }
    } catch (err) {
      setTestStatus("error");
      const msg = err instanceof Error ? err.message : "Connection error";
      setTestFeedback(`Unable to verify credentials: ${msg}`);
    }
  };

  const handleSaveConnector = async () => {
    if (!selectedConnector || !configToken.trim()) {
      return;
    }
    setTestStatus("testing");
    setTestFeedback(
      "Secure transmission and saving on server..."
    );

    try {
      const bearer = await getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const res = await authenticatedFetch(
        "/api/idealy/connectors/credentials",
        {
          body: JSON.stringify({
            provider: selectedConnector.id,
            token: configToken.trim(),
          }),
          headers,
          method: "POST",
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        displayName?: string;
        error?: string;
        success?: boolean;
      };

      if (res.ok && data.success) {
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === selectedConnector.id
              ? {
                  ...c,
                  configurationRequired: false,
                  installed: true,
                  status: "connected",
                }
              : c
          )
        );
        setTestStatus("success");
        setTestFeedback(
          `Connector ${selectedConnector.name} saved and activated.`
        );
        await syncConnectorStatus();
        setTimeout(() => {
          setSelectedConnector(null);
        }, 800);
      } else {
        setTestStatus("error");
        setTestFeedback(
          data.error ||
            `Unable to save connector ${selectedConnector.name}.`
        );
      }
    } catch (err) {
      setTestStatus("error");
      const msg = err instanceof Error ? err.message : "Network error";
      setTestFeedback(`Error saving: ${msg}`);
    }
  };

  const handleDisconnectConnector = async () => {
    if (!selectedConnector) {
      return;
    }
    setTestStatus("testing");
    setTestFeedback("Revoking access on server...");

    try {
      const bearer = await getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }

      const res = await authenticatedFetch(
        "/api/idealy/connectors/disconnect",
        {
          body: JSON.stringify({
            provider: selectedConnector.id,
          }),
          headers,
          method: "POST",
        }
      );

      if (res.ok) {
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === selectedConnector.id
              ? {
                  ...c,
                  configurationRequired: false,
                  installed: false,
                  status: "not_connected",
                }
              : c
          )
        );
        setSelectedConnector(null);
        await syncConnectorStatus();
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setTestStatus("error");
        setTestFeedback(
          data.error ||
            `Unable to disconnect ${selectedConnector.name}.`
        );
      }
    } catch (err) {
      setTestStatus("error");
      const msg = err instanceof Error ? err.message : "Network error";
      setTestFeedback(`Error disconnecting: ${msg}`);
    }
  };

  // Fetch live backend connectors & status on mount, and handle OAuth return params
  useEffect(() => {
    let cancelled = false;

    // Handle OAuth return query parameters (from Supabase integration-callback redirect)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const connectedProvider = urlParams.get("connected");
      const oauthError = urlParams.get("error");
      const displayName = urlParams.get("display");

      if (connectedProvider) {
        setTestStatus("success");
        setTestFeedback(`Connected to ${displayName || connectedProvider} successfully.`);
        const cleanUrl = window.location.pathname + (urlParams.get("page") ? `?page=${urlParams.get("page")}` : "");
        window.history.replaceState({}, document.title, cleanUrl);
      } else if (oauthError) {
        setTestStatus("error");
        setTestFeedback(`Connection failed: ${oauthError.replace(/_/g, " ")}`);
        const cleanUrl = window.location.pathname + (urlParams.get("page") ? `?page=${urlParams.get("page")}` : "");
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    syncConnectorStatus().catch(() => undefined);

    getBearerToken()
      .then((bearer) => {
        const headers: Record<string, string> = {};
        if (bearer) {
          headers.Authorization = `Bearer ${bearer}`;
        }
        return authenticatedFetch("/api/idealy/plugins", {
          cache: "no-store",
          credentials: "same-origin",
          headers,
        });
      })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as {
          plugins?: Array<{
            id: string;
            installed?: boolean;
            available?: boolean;
            configurationRequired?: boolean;
          }>;
        };
        if (
          Array.isArray(payload.plugins) &&
          payload.plugins.length > 0 &&
          !cancelled
        ) {
          setConnectors((prev) => {
            const backendMap = new Map(payload.plugins?.map((p) => [p.id, p]));
            return prev.map((item) => {
              const remote = backendMap.get(item.id);
              if (remote) {
                return {
                  ...item,
                  available: Boolean(remote.available),
                  configurationRequired: Boolean(remote.configurationRequired),
                  installed: Boolean(remote.installed) || item.installed,
                };
              }
              return item;
            });
          });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredConnectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return connectors.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.categoryLabel.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "all" || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [connectors, searchQuery, activeCategory]);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-bg-base text-text-main selection:bg-brand-primary/20 relative">
      {/* Mobile drawer trigger */}
      <button
        aria-label="Ouvrir la navigation"
        className="fixed left-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l2)] text-text-muted hover:text-text-main shadow-xs md:hidden focus-ring"
        onClick={() => setIsMobileDrawerOpen(true)}
        type="button"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-text-main">
            Connecteurs & Outils
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Connectez vos plateformes favorites pour amplifier la portée de
            votre escouade d'agents.
          </p>
        </div>

        {/* Controls: Search + Category Pills */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex h-10 items-center rounded-xl bg-bg-surface border border-border-subtle px-3.5 focus-within:border-brand-primary/60 transition-colors">
            <Search className="h-4 w-4 shrink-0 text-text-muted mr-2.5" />
            <input
              className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-text-main placeholder:text-text-muted outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un connecteur (GitHub, Supabase, Vercel, Slack...)"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="text-xs text-text-muted hover:text-text-main"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                Effacer
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {(
              [
                ["all", "Tous"],
                ["dev", "Développement"],
                ["data", "Bases de données"],
                ["ai", "Modèles & IA"],
                ["productivity", "Productivité"],
              ] as const
            ).map(([key, label]) => (
              <button
                className={`rounded-full px-3 py-1 font-medium transition-all shrink-0 ${
                  activeCategory === key
                    ? "bg-brand-primary text-white"
                    : "bg-bg-surface text-text-muted border border-border-subtle hover:text-text-main"
                }`}
                key={key}
                onClick={() => setActiveCategory(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── CONNECTORS GRID (Simplicité, Logo, Nom, Description) ──────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnectors.map((connector) => {
            const logo = getConnectorBrandLogo(connector.id, "h-5 w-5", 20);
            const isConnected =
              connector.status === "connected" || connector.installed;
            const isExpired = connector.status === "expired";
            const isConfigRequired =
              connector.status === "configuration_required" ||
              connector.configurationRequired;
            const isAvailable = connector.available;

            return (
              <button
                className={`flex flex-col text-left p-3.5 rounded-xl border bg-bg-surface transition-all duration-150 hover:border-brand-primary/40 hover:bg-bg-subtle/50 group cursor-pointer focus-ring ${
                  isConnected
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : "border-border-subtle"
                }`}
                key={connector.id}
                onClick={() => setSelectedConnector(connector)}
                type="button"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg-subtle border border-border-subtle p-1.5">
                      {logo}
                    </div>
                    <span className="text-xs font-semibold text-text-main truncate">
                      {connector.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      isConnected
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : isExpired
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : isConfigRequired
                            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            : isAvailable
                              ? "text-text-muted bg-bg-subtle border border-border-subtle"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                    }`}
                  >
                    {isConnected
                      ? "Connecté"
                      : isExpired
                        ? "Expiré"
                        : isConfigRequired
                          ? "Configuration requise"
                          : isAvailable
                            ? "Disponible"
                            : "Indisponible"}
                  </span>
                </div>

                <p className="text-[11.5px] text-text-muted line-clamp-2 leading-relaxed">
                  {connector.description}
                </p>
              </button>
            );
          })}
        </div>
      </main>

      {/* ─── MODAL DÉTAILS CONNECTEUR (ChatGPT / Lovable Style) ─────────────── */}
      {selectedConnector && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedConnector(null)}
          role="dialog"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSelectedConnector(null);
              }
            }}
            role="document"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-bg-subtle border border-border-subtle p-2">
                  {getConnectorBrandLogo(selectedConnector.id, "h-7 w-7", 28)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-main">
                    {selectedConnector.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-text-muted capitalize">
                      {selectedConnector.categoryLabel}
                    </span>
                    <span className="text-text-muted">·</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
                      <ShieldCheck className="h-3 w-3" />
                      Vérifié
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors"
                onClick={() => setSelectedConnector(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-3.5 text-xs leading-relaxed">
              <div>
                <h4 className="font-semibold text-text-main mb-1">
                  Description
                </h4>
                <p className="text-text-muted">
                  {selectedConnector.description}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-bg-subtle/50 border border-border-subtle space-y-1.5">
                <h4 className="font-semibold text-text-main flex items-center gap-1.5">
                  <Plug className="h-3.5 w-3.5 text-brand-primary" />
                  Capacités accordées aux agents Idealy
                </h4>
                <ul className="text-[11px] text-text-muted space-y-1 list-disc list-inside">
                  <li>Lecture des schémas et contextes d'intégration</li>
                  <li>Exécution sécurisée de requêtes et actions autorisées</li>
                  <li>Synchronisation directe des livrables de session</li>
                </ul>
              </div>

              {/* 1-Click OAuth Connect (Standard) */}
              <div className="pt-2">
                {selectedConnector.status === "connected" ||
                selectedConnector.installed ? (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                      <Check className="h-4 w-4" />
                      <span>Connecteur actif & synchronisé</span>
                    </div>
                    <button
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                      onClick={handleDisconnectConnector}
                      type="button"
                    >
                      Déconnecter
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-brand-primary hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:opacity-60"
                    disabled={isAuthenticating}
                    onClick={() => handleOAuthConnect(selectedConnector)}
                    type="button"
                  >
                    {isAuthenticating ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      getConnectorBrandLogo(selectedConnector.id, "h-4 w-4", 16)
                    )}
                    <span>
                      {isAuthenticating
                        ? "OAuth connection in progress..."
                        : `Connect with ${selectedConnector.name} (OAuth)`}
                    </span>
                  </button>
                )}
              </div>

              {testFeedback && (
                <p
                  className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    testStatus === "success"
                      ? "text-emerald-400"
                      : testStatus === "error"
                        ? "text-rose-400"
                        : "text-amber-400"
                  }`}
                >
                  {testStatus === "success" && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {testStatus === "error" && (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {testStatus === "testing" && (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {testFeedback}
                </p>
              )}

              {/* Advanced / Optional Personal Token Toggle */}
              <div className="pt-1">
                <button
                  className="text-[11px] text-text-muted hover:text-text-main flex items-center gap-1 font-medium transition-colors"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  type="button"
                >
                  <span>
                    {showAdvanced
                      ? "▾ Hide"
                      : "▸ Advanced settings (Optional personal token)"}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-2 space-y-2 p-2.5 rounded-xl bg-bg-subtle/60 border border-border-subtle animate-scale-in">
                    <label
                      className="text-[10.5px] font-semibold text-text-muted block"
                      htmlFor="personal-access-token"
                    >
                      Personal Access Token
                    </label>
                    <input
                      className="w-full px-3 py-1.5 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-main placeholder:text-text-muted outline-none focus:border-brand-primary font-mono"
                      id="personal-access-token"
                      onChange={(e) => {
                        setConfigToken(e.target.value);
                        if (testStatus !== "idle") {
                          setTestStatus("idle");
                        }
                      }}
                      placeholder={`Ex : ${selectedConnector.id === "github" ? "ghp_..." : selectedConnector.id === "supabase" ? "sbp_..." : "sk_..."}`}
                      type="password"
                      value={configToken}
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors disabled:opacity-40"
                        disabled={
                          testStatus === "testing" || !configToken.trim()
                        }
                        onClick={handleTestConnection}
                        type="button"
                      >
                        Test token
                      </button>
                      <button
                        className="px-3 py-1 rounded-md text-[11px] font-semibold bg-brand-primary text-white hover:opacity-90 disabled:opacity-40 transition-colors"
                        disabled={!configToken.trim()}
                        onClick={handleSaveConnector}
                        type="button"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors"
                onClick={() => setSelectedConnector(null)}
                type="button"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
