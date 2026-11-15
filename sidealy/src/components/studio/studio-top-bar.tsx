import {
  ChevronDown,
  Code2,
  Database,
  Download,
  ExternalLink,
  Globe,
  History,
  Laptop,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Smartphone,
  Tablet,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import type { StudioTab } from "./studio-layout";

type DeviceViewport = "desktop" | "tablet" | "mobile";

interface StudioTopBarProps {
  activeRoute?: string;
  activeTab: StudioTab;
  /** For preview: currently selected device viewport */
  device?: DeviceViewport;
  onDeviceChange?: (d: DeviceViewport) => void;
  /** For preview: open in new tab */
  onOpenExternal?: () => void;
  /** For preview: refresh callback */
  onRefresh?: () => void;
  onRouteChange?: (path: string) => void;
  onTabChange: (tab: StudioTab) => void;
  /** Version history toggle */
  onToggleHistory?: () => void;
  /** Right pane width — to collapse button labels */
  rightPaneWidth?: number;
  /** Available routes for preview route selector */
  routes?: Array<{ label: string; path: string }>;
}

const TABS: Array<{ id: StudioTab; label: string; icon: React.ReactNode }> = [
  { icon: <Globe className="h-3.5 w-3.5" />, id: "preview", label: "Aperçu" },
  { icon: <Code2 className="h-3.5 w-3.5" />, id: "code", label: "Code" },
  {
    icon: <Database className="h-3.5 w-3.5" />,
    id: "database",
    label: "Database",
  },
  {
    icon: <MoreHorizontal className="h-3.5 w-3.5" />,
    id: "more",
    label: "More",
  },
];

const DEVICES: Array<{
  id: DeviceViewport;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    icon: <Laptop className="h-3.5 w-3.5" />,
    id: "desktop",
    label: "Ordinateur",
  },
  { icon: <Tablet className="h-3.5 w-3.5" />, id: "tablet", label: "Tablette" },
  {
    icon: <Smartphone className="h-3.5 w-3.5" />,
    id: "mobile",
    label: "Mobile",
  },
];

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  activeTab,
  onTabChange,
  device = "desktop",
  onDeviceChange,
  onRefresh,
  onOpenExternal,
  routes = [],
  activeRoute = "/",
  onRouteChange,
  onToggleHistory,
  rightPaneWidth = 800,
}) => {
  const {
    activeConversation,
    renameConversation,
    openConfirmModal,
    deleteConversation,
    exportConversation,
  } = useApp();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const routeMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const compact = rightPaneWidth < 620;

  // Close menus on outside click
  useEffect(() => {
    if (!projectMenuOpen && !routeMenuOpen) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (
        projectMenuOpen &&
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
      if (
        routeMenuOpen &&
        routeMenuRef.current &&
        !routeMenuRef.current.contains(e.target as Node)
      ) {
        setRouteMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectMenuOpen, routeMenuOpen]);

  const startRename = () => {
    setRenameValue(activeConversation?.title || "");
    setRenaming(true);
    setProjectMenuOpen(false);
    requestAnimationFrame(() => renameInputRef.current?.select());
  };

  const commitRename = () => {
    if (activeConversation && renameValue.trim()) {
      renameConversation(activeConversation.id, renameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <header className="studio-top-bar flex h-10 shrink-0 items-center justify-between border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)]/95 px-2 backdrop-blur-md">
      {/* Left: Project title + dropdown */}
      <div
        className="flex items-center gap-1.5 min-w-0 shrink-0"
        ref={projectMenuRef}
      >
        {renaming ? (
          <input
            className="h-7 w-44 rounded-lg border border-[var(--idealy-teal-petrol)] bg-[var(--dsw-alias-bg-layer-2)] px-2 text-xs font-medium text-[var(--dsw-alias-label-primary)] outline-none"
            onBlur={commitRename}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitRename();
              }
              if (e.key === "Escape") {
                setRenaming(false);
              }
            }}
            ref={renameInputRef}
            value={renameValue}
          />
        ) : (
          <button
            className="group flex max-w-[180px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors truncate"
            onClick={() => setProjectMenuOpen((o) => !o)}
            type="button"
          >
            <span className="truncate">
              {activeConversation?.title || "Idealy Project"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-[var(--dsw-alias-label-tertiary)] group-hover:text-[var(--dsw-alias-label-primary)] transition-colors" />
          </button>
        )}

        {projectMenuOpen && (
          <div className="absolute top-9 left-2 z-50 w-52 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1 shadow-elevated animate-scale-in">
            <button
              className="studio-dropdown-item"
              onClick={startRename}
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" /> Renommer
            </button>
            <button
              className="studio-dropdown-item"
              onClick={() => {
                setProjectMenuOpen(false);
                if (activeConversation) {
                  exportConversation(activeConversation.id);
                }
              }}
              type="button"
            >
              <Download className="h-3.5 w-3.5" /> Exporter ZIP
            </button>
            <button
              className="studio-dropdown-item"
              onClick={onToggleHistory}
              type="button"
            >
              <History className="h-3.5 w-3.5" /> Historique des versions
            </button>
            <div className="my-1 h-px bg-[var(--dsw-alias-border-l1)]" />
            <button
              className="studio-dropdown-item text-destructive hover:bg-destructive/10"
              onClick={() => {
                setProjectMenuOpen(false);
                if (activeConversation) {
                  openConfirmModal({
                    confirmLabel: "Supprimer",
                    isDestructive: true,
                    message: `Êtes-vous sûr de vouloir supprimer « ${activeConversation.title} » ? Cette action est irréversible.`,
                    onConfirm: () => deleteConversation(activeConversation.id),
                    title: "Supprimer le projet",
                  });
                }
              }}
              type="button"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Center: Segmented tab switcher */}
      <nav
        aria-label="Vue du workspace"
        className="flex items-center rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-0.5"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              aria-selected={active}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                active
                  ? "bg-[var(--dsw-alias-bg-base)] text-[var(--dsw-alias-label-primary)] shadow-xs"
                  : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.icon}
              {!compact && <span>{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Right: Contextual actions */}
      <div className="flex items-center gap-1 shrink-0">
        {activeTab === "preview" && (
          <>
            {/* Device viewport toggle */}
            <div className="flex items-center rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-0.5">
              {DEVICES.map((d) => (
                <button
                  aria-label={d.label}
                  className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                    device === d.id
                      ? "bg-[var(--dsw-alias-bg-base)] text-[var(--dsw-alias-label-primary)] shadow-xs"
                      : "text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)]"
                  }`}
                  key={d.id}
                  onClick={() => onDeviceChange?.(d.id)}
                  title={d.label}
                  type="button"
                >
                  {d.icon}
                </button>
              ))}
            </div>

            {/* Route selector */}
            {routes.length > 1 && (
              <div className="relative" ref={routeMenuRef}>
                <button
                  className="flex items-center gap-1 rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] px-2 py-1 text-[11px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                  onClick={() => setRouteMenuOpen((o) => !o)}
                  type="button"
                >
                  <span className="max-w-[80px] truncate">{activeRoute}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {routeMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 max-h-60 w-52 overflow-y-auto rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1 shadow-elevated animate-scale-in">
                    {routes.map((r) => (
                      <button
                        className={`studio-dropdown-item text-[11px] ${r.path === activeRoute ? "text-[var(--idealy-teal-petrol)] font-semibold" : ""}`}
                        key={r.path}
                        onClick={() => {
                          onRouteChange?.(r.path);
                          setRouteMenuOpen(false);
                        }}
                        type="button"
                      >
                        {r.label || r.path}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Refresh */}
            <button
              aria-label="Rafraîchir l'aperçu"
              className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
              onClick={onRefresh}
              title="Rafraîchir"
              type="button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* Open in new tab */}
            <button
              aria-label="Ouvrir dans un nouvel onglet"
              className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
              onClick={onOpenExternal}
              title="Ouvrir dans un nouvel onglet"
              type="button"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* Share & Publish always visible */}
        <button
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--dsw-alias-border-l1)] px-2 py-1 text-[11px] font-medium text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
          type="button"
        >
          <Share2 className="h-3 w-3" />
          {!compact && "Partager"}
        </button>
        <button
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--idealy-teal-petrol)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 active:scale-95 transition-all"
          type="button"
        >
          Publier
        </button>
      </div>
    </header>
  );
};
