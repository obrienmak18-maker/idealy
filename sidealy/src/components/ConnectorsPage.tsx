import {
  ArrowLeft,
  CheckCircle2,
  Key,
  Menu,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { getConnectorBrandLogo } from "./connectors/brand-logos";
import {
  DEFAULT_CONNECTORS_CATALOG,
  type ConnectorDefinition,
} from "./connectors/default-connectors";
import { PageHeader } from "./layout/PageHeader";

type CategoryFilter = "all" | "dev" | "data" | "ai" | "productivity";

export const ConnectorsPage: React.FC = () => {
  const { setActivePage, setIsMobileDrawerOpen } = useApp();

  const [connectors, setConnectors] = useState<ConnectorDefinition[]>(
    DEFAULT_CONNECTORS_CATALOG,
  );
  const [authRequired, setAuthRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [selectedConnector, setSelectedConnector] =
    useState<ConnectorDefinition | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch live backend connectors if available, but never block the UI
  useEffect(() => {
    let cancelled = false;
    fetch("/api/idealy/plugins", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) setAuthRequired(true);
          return;
        }
        if (!response.ok) return;
        const payload = (await response.json().catch(() => ({}))) as {
          plugins?: Array<{
            id: string;
            installed?: boolean;
            available?: boolean;
            configurationRequired?: boolean;
          }>;
        };
        if (Array.isArray(payload.plugins) && payload.plugins.length > 0 && !cancelled) {
          // Merge with default connectors
          setConnectors((prev) => {
            const backendMap = new Map(payload.plugins!.map((p) => [p.id, p]));
            return prev.map((item) => {
              const remote = backendMap.get(item.id);
              if (remote) {
                return {
                  ...item,
                  installed: Boolean(remote.installed),
                  available: Boolean(remote.available),
                  configurationRequired: Boolean(remote.configurationRequired),
                };
              }
              return item;
            });
          });
        }
      })
      .catch(() => {
        // Fallback gracefully to default catalog
      });

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

  const readyCount = connectors.filter((c) => c.available).length;

  const handleOpenConfig = (connector: ConnectorDefinition) => {
    setSelectedConnector(connector);
    setApiKeyInput("");
    setSaveSuccess(false);
  };

  const handleSaveConfig = () => {
    if (!selectedConnector) return;
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === selectedConnector.id
          ? { ...c, available: true, installed: true, configurationRequired: false }
          : c,
      ),
    );
    setSaveSuccess(true);
    setTimeout(() => {
      setSelectedConnector(null);
      setSaveSuccess(false);
    }, 1200);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--dsw-alias-bg-base)] text-[var(--dsw-alias-label-primary)]">
      {/* ─── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)]/85 px-4 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden grid h-8 w-8 place-items-center rounded-lg text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
            onClick={() => setIsMobileDrawerOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--dsw-alias-label-secondary)]">
            <span>Idealy</span>
            <span>/</span>
            <span className="font-semibold text-[var(--dsw-alias-label-primary)]">
              Connecteurs & Marketplace
            </span>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dsw-alias-interactive-bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--dsw-alias-label-primary)] hover:bg-[var(--idealy-teal-petrol)] hover:text-white transition-colors"
          onClick={() => setActivePage("chat")}
          type="button"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour au chat</span>
        </button>
      </div>

      <div className="idealy-page-enter mx-auto w-full max-w-5xl px-4 py-8 md:px-8 pb-20">
        <PageHeader
          action={
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/80 px-3.5 text-xs text-[var(--dsw-alias-label-secondary)] backdrop-blur-sm shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-medium text-[var(--dsw-alias-label-primary)]">{readyCount}</span> connecteur{readyCount > 1 ? "s" : ""} prêt{readyCount > 1 ? "s" : ""}
              </span>
            </div>
          }
          description="Explorez le catalogue de connecteurs d'Idealy (style ChatGPT & LobeChat). Intégrez vos outils de développement, vos bases de données et vos modèles d'IA pour enrichir les capacités de vos escouades."
          eyebrow="Marketplace d'Intégrations & Outils"
          title="Connecteurs & MCP"
        />

        {/* ─── INFORMATIVE GUEST BANNER (NON-BLOCKING) ───────────────────── */}
        {authRequired && (
          <div className="mt-6 rounded-2xl border border-[var(--idealy-indigo)]/30 bg-[var(--idealy-indigo-bg)]/40 p-4.5 text-xs text-[var(--dsw-alias-label-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm shadow-sm animate-fade-up">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[var(--idealy-indigo)] shrink-0" />
              <div>
                <strong className="text-[var(--dsw-alias-label-primary)] block text-xs">
                  Mode Exploration & Clés Locales (BYOK)
                </strong>
                <span className="text-[11.5px] leading-relaxed">
                  Vous pouvez tester, configurer vos connecteurs et apporter vos clés API. Connectez votre compte Idealy pour synchroniser les tokens de production.
                </span>
              </div>
            </div>
            <a
              className="rounded-xl bg-gradient-to-r from-[var(--idealy-indigo)] to-[var(--idealy-teal-petrol)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all shrink-0"
              href="/login?callbackUrl=%2Fconnectors"
            >
              Se connecter
            </a>
          </div>
        )}

        {/* ─── SEARCH & CATEGORY TABS (LOBECHAT / CHATGPT STYLE) ─────────── */}
        <div className="mt-8 space-y-3.5">
          {/* Search bar */}
          <div className="relative flex h-12 items-center rounded-2xl idealy-glass px-4 shadow-sm focus-within:border-[var(--idealy-teal-petrol)]/60 focus-within:shadow-glow-teal transition-all duration-300">
            <Search className="h-4 w-4 shrink-0 text-[var(--dsw-alias-label-tertiary)] mr-2.5" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, catégorie (ex: GitHub, Supabase, Vercel, Slack)..."
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="text-xs text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)]"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                activeCategory === "all"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setActiveCategory("all")}
              type="button"
            >
              Toutes les intégrations ({connectors.length})
            </button>
            <button
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                activeCategory === "dev"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setActiveCategory("dev")}
              type="button"
            >
              Développement & Git
            </button>
            <button
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                activeCategory === "data"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setActiveCategory("data")}
              type="button"
            >
              Base de données & Cloud
            </button>
            <button
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                activeCategory === "ai"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setActiveCategory("ai")}
              type="button"
            >
              Modèles d'IA & LLMs
            </button>
            <button
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                activeCategory === "productivity"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setActiveCategory("productivity")}
              type="button"
            >
              Productivité & Collaboration
            </button>
          </div>
        </div>

        {/* ─── CONNECTORS GRID (CHATGPT STORE / LOBECHAT STYLE) ───────────── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredConnectors.map((connector) => {
            const logo = getConnectorBrandLogo(connector.id, "h-6 w-6", 24);
            const isReady = connector.available;

            return (
              <div
                className={`idealy-card-premium group flex flex-col justify-between p-5 cursor-pointer ${
                  isReady
                    ? "border-[var(--idealy-teal-petrol)]/40 bg-[var(--idealy-teal-bg)]/20 shadow-glow-teal"
                    : ""
                }`}
                key={connector.id}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}
              >
                <div>
                  {/* Card Header: Brand Logo + Status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--dsw-alias-bg-base)] border border-[var(--dsw-alias-border-l2)] p-2 shadow-xs group-hover:scale-110 transition-transform duration-200">
                        {logo}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">
                          {connector.name}
                        </h3>
                        <span className="text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                          v{connector.version} • {connector.categoryLabel}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`idealy-badge ${
                        isReady ? "idealy-badge--teal" : ""
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-500 idealy-pulse-dot" : "bg-zinc-400"}`}
                      />
                      {isReady ? "Connecté" : "Non configuré"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-3.5 text-xs leading-relaxed text-[var(--dsw-alias-label-secondary)] line-clamp-3">
                    {connector.description}
                  </p>

                  {/* Tools preview */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {connector.tools.slice(0, 3).map((t) => (
                      <span
                        className="rounded-md bg-[var(--dsw-alias-bg-base)] px-2 py-0.5 text-[10px] font-mono text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l1)]"
                        key={t.id}
                      >
                        {t.id}
                      </span>
                    ))}
                    {connector.tools.length > 3 && (
                      <span className="rounded-md bg-[var(--dsw-alias-bg-base)] px-1.5 py-0.5 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                        +{connector.tools.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="mt-5 pt-3.5 border-t border-[var(--dsw-alias-border-l1)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--dsw-alias-label-caption)]">
                    {connector.tools.length} fonction{connector.tools.length > 1 ? "s" : ""}
                  </span>
                  <button
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 focus-ring ${
                      isReady
                        ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-bg-layer-3)]"
                        : "bg-gradient-to-r from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white hover:opacity-90 shadow-xs"
                    }`}
                    onClick={() => handleOpenConfig(connector)}
                    type="button"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>{isReady ? "Gérer" : "Configurer"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── MODAL DE CONFIGURATION / BYOK ──────────────────────────────── */}
        {selectedConnector && (
          <div
            aria-label="Configuration du connecteur"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            role="dialog"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--dsw-alias-border-l1)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--dsw-alias-bg-base)] border border-[var(--dsw-alias-border-l2)] p-2">
                    {getConnectorBrandLogo(selectedConnector.id, "h-5 w-5", 22)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">
                      {selectedConnector.name}
                    </h3>
                    <span className="text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                      Configuration d'authentification
                    </span>
                  </div>
                </div>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                  onClick={() => setSelectedConnector(null)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {saveSuccess ? (
                <div className="py-8 text-center text-emerald-500">
                  <CheckCircle2 className="mx-auto h-10 w-10 animate-bounce" />
                  <p className="mt-2 text-sm font-bold">Connecteur activé avec succès !</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-[var(--dsw-alias-label-secondary)] leading-relaxed">
                    Saisissez votre clé d'API ou token pour autoriser les escouades Idealy à invoquer ce service :
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
                      Clé secrète / Token API
                    </label>
                    <div className="relative flex items-center">
                      <Key className="absolute left-3 h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
                      <input
                        className="w-full rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-base)] pl-9 pr-3 py-2 text-xs text-[var(--dsw-alias-label-primary)] outline-none focus:border-[var(--idealy-teal-petrol)] font-mono"
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="sk-... ou ghp_..."
                        type="password"
                        value={apiKeyInput}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-3 text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                    <p className="font-semibold text-[var(--dsw-alias-label-secondary)]">Outils autorisés :</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {selectedConnector.tools.map((t) => (
                        <li key={t.id}>{t.label} ({t.id})</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-[var(--dsw-alias-border-l1)]">
                    <button
                      className="rounded-xl px-3.5 py-2 text-xs font-semibold text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                      onClick={() => setSelectedConnector(null)}
                      type="button"
                    >
                      Annuler
                    </button>
                    <button
                      className="rounded-xl bg-gradient-to-r from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all"
                      onClick={handleSaveConfig}
                      type="button"
                    >
                      Enregistrer & Activer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
