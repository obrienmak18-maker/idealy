import {
  Check,
  Menu,
  Plug,
  Search,
  ShieldCheck,
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

type CategoryFilter = "all" | "dev" | "data" | "ai" | "productivity";

export const ConnectorsPage: React.FC = () => {
  const { setIsMobileDrawerOpen } = useApp();

  const [connectors, setConnectors] = useState<ConnectorDefinition[]>(
    DEFAULT_CONNECTORS_CATALOG,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [selectedConnector, setSelectedConnector] =
    useState<ConnectorDefinition | null>(null);
  const [_apiKeyInput, _setApiKeyInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch live backend connectors if available
  useEffect(() => {
    let cancelled = false;
    fetch("/api/idealy/plugins", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
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

  const handleToggleConnection = () => {
    if (!selectedConnector) return;
    const isCurrentlyConnected = selectedConnector.available;

    setConnectors((prev) =>
      prev.map((c) =>
        c.id === selectedConnector.id
          ? {
              ...c,
              available: !isCurrentlyConnected,
              installed: !isCurrentlyConnected,
              configurationRequired: false,
            }
          : c,
      ),
    );

    setSelectedConnector((prev) =>
      prev
        ? {
            ...prev,
            available: !isCurrentlyConnected,
            installed: !isCurrentlyConnected,
          }
        : null,
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

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
            Connectez vos plateformes favorites pour amplifier la portée de votre escouade d'agents.
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
            {([
              ["all", "Tous"],
              ["dev", "Développement"],
              ["data", "Bases de données"],
              ["ai", "Modèles & IA"],
              ["productivity", "Productivité"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                className={`rounded-full px-3 py-1 font-medium transition-all shrink-0 ${
                  activeCategory === key
                    ? "bg-brand-primary text-white"
                    : "bg-bg-surface text-text-muted border border-border-subtle hover:text-text-main"
                }`}
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
            const isConnected = connector.available;

            return (
              <button
                key={connector.id}
                onClick={() => setSelectedConnector(connector)}
                className={`flex flex-col text-left p-3.5 rounded-xl border bg-bg-surface transition-all duration-150 hover:border-brand-primary/40 hover:bg-bg-subtle/50 group cursor-pointer focus-ring ${
                  isConnected
                    ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                    : "border-border-subtle"
                }`}
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
                        : "text-text-muted bg-bg-subtle border border-border-subtle"
                    }`}
                  >
                    {isConnected ? "Connecté" : "Détails"}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedConnector(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Escape") setSelectedConnector(null); }}
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
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div>
                <h4 className="font-semibold text-text-main mb-1">Description</h4>
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

              {saveSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Statut mis à jour avec succès !</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors"
                onClick={() => setSelectedConnector(null)}
                type="button"
              >
                Fermer
              </button>

              <button
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedConnector.available
                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20"
                    : "bg-brand-primary text-white hover:opacity-90 shadow-sm"
                }`}
                onClick={handleToggleConnection}
                type="button"
              >
                {selectedConnector.available ? "Déconnecter l'outil" : "Connecter à mon espace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
