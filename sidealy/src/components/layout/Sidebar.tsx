import {
  ChevronDown,
  Edit3,
  FileText,
  LayoutGrid,
  MessageSquare,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Pin,
  Plug,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  Sun,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

export const Sidebar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    theme,
    setTheme,
    spaces,
    activeSpace,
    setActiveSpaceId,
    conversations,
    activeConversation,
    setActiveConversationId,
    createConversation,
    artifacts,
    openArtifact,
    setIsCommandPaletteOpen,
    setIsSettingsOpen,
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const spaceConversations = conversations
    .filter(
      (conversation) =>
        conversation.spaceId === activeSpace?.id && !conversation.isArchived,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const visibleConversations = showAllRecent
    ? spaceConversations
    : spaceConversations.slice(0, 5);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const renderConversation = (
    conversation: (typeof spaceConversations)[number],
  ) => {
    const isActive = activeConversation?.id === conversation.id;
    const hasDraft = Boolean(conversation.draft?.trim());

    return (
      <button
        aria-current={isActive ? "page" : undefined}
        className={`group relative flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus-ring ${
          collapsed
            ? "mx-auto h-10 w-10 justify-center rounded-xl bg-transparent hover:bg-white/10"
            : "h-[38px] w-full justify-between rounded-lg px-3"
        } ${
          isActive
            ? "bg-white/10 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        }`}
        key={conversation.id}
        onClick={() => setActiveConversationId(conversation.id)}
        title={conversation.title}
        type="button"
      >
        <span
          className={`flex min-w-0 items-center ${collapsed ? "" : "gap-3"}`}
        >
          {conversation.isPinned ? (
            <Pin
              className="h-4 w-4 shrink-0 text-emerald-400"
              strokeWidth={2.5}
            />
          ) : (
            <MessageSquare
              className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
              strokeWidth={2}
            />
          )}
          <span
            className={`truncate text-[13px] transition-all duration-300 origin-left ${
              collapsed
                ? "w-0 opacity-0 scale-95 hidden"
                : "w-auto opacity-100 scale-100"
            }`}
          >
            {conversation.title}
          </span>
        </span>
        {!collapsed && hasDraft && (
          <Edit3 className="h-3 w-3 shrink-0 text-emerald-500" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`hidden md:flex h-full shrink-0 flex-col select-none bg-[#0a0a0a] border-r border-white/[0.06] transition-[width] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
        collapsed ? "w-[64px]" : "w-[260px]"
      }`}
      id="desktop-sidebar-navigation"
    >
      {/* --- HEADER --- */}
      <div
        className={`flex h-[60px] shrink-0 items-center ${collapsed ? "justify-center px-0" : "justify-between px-4"}`}
      >
        {/* LOGO & BRAND (Seulement si déplié) */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-zinc-100 truncate">
              Idealy
            </span>
          </div>
        )}

        {/* BOUTON TOGGLE */}
        <button
          aria-label={collapsed ? "Agrandir" : "Réduire"}
          className={`flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-all focus-ring ${
            collapsed ? "h-10 w-10" : "h-8 w-8"
          }`}
          onClick={() => setCollapsed((v) => !v)}
          type="button"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* --- NEW CHAT BUTTON --- */}
      <div
        className={`shrink-0 transition-all duration-500 ${collapsed ? "px-3 py-3" : "px-3 py-2"}`}
      >
        <button
          className={`group flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] shadow-sm text-zinc-200 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] focus-ring ${
            collapsed
              ? "mx-auto h-10 w-10 rounded-xl"
              : "h-10 w-full gap-2 rounded-lg px-3 justify-start"
          }`}
          onClick={() => createConversation()}
          title="Nouvelle conversation"
          type="button"
        >
          <SquarePen
            className="h-[16px] w-[16px] shrink-0 text-zinc-400 group-hover:text-white transition-colors"
            strokeWidth={2}
          />
          {!collapsed && (
            <span className="text-[13px] font-medium tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300">
              Nouvelle discussion
            </span>
          )}
        </button>
      </div>

      {/* Connecteurs: navigation dédiée, sans exposer d'intégrations non configurées. */}
      <div className={`shrink-0 px-2 pb-2 ${collapsed ? "pt-0" : "pt-1"}`}>
        <button
          aria-current={activePage === "connectors" ? "page" : undefined}
          className={`flex h-10 w-full items-center rounded-lg transition-colors focus-ring ${
            collapsed ? "mx-auto w-10 justify-center" : "gap-3 px-3"
          } ${activePage === "connectors" ? "bg-white/10 text-white font-medium" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
          onClick={() => setActivePage("connectors")}
          title="Connecteurs"
          type="button"
        >
          <Plug className="h-4 w-4 shrink-0" strokeWidth={2} />
          {!collapsed && <span className="text-[13px]">Connecteurs</span>}
        </button>
      </div>

      {/* --- ESPACE DE TRAVAIL (Select) --- */}
      {!collapsed && spaces.length > 1 && (
        <div className="shrink-0 px-3 pb-2">
          <div className="relative group/select">
            <select
              className="h-9 w-full appearance-none rounded-lg bg-transparent pl-2.5 pr-8 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors focus-ring cursor-pointer outline-none border border-transparent focus:border-white/10"
              onChange={(event) => setActiveSpaceId(event.target.value)}
              value={activeSpace?.id ?? ""}
            >
              {spaces.map((space) => (
                <option
                  className="bg-[#0a0a0a] text-zinc-200"
                  key={space.id}
                  value={space.id}
                >
                  {space.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500 group-hover/select:text-zinc-300 transition-colors"
              strokeWidth={2.5}
            />
          </div>
        </div>
      )}

      {/* --- ZONE DE SCROLL --- */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 sidebar-scrollbar">
        {/* Bibliothèque */}
        {artifacts.length > 0 && (
          <section className="mb-4">
            {!collapsed && (
              <h2 className="px-2 pb-1 pt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutGrid className="h-3 w-3" strokeWidth={2.5} />{" "}
                Bibliothèque
              </h2>
            )}
            <nav className="space-y-0.5 mt-1">
              {artifacts.map((artifact) => (
                <button
                  className={`group flex items-center transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] text-zinc-400 hover:text-zinc-200 hover:bg-white/5 focus-ring ${
                    collapsed
                      ? "mx-auto h-10 w-10 justify-center rounded-xl"
                      : "h-[34px] w-full gap-2.5 rounded-md px-2.5"
                  }`}
                  key={artifact.id}
                  onClick={() => openArtifact(artifact.id)}
                  title={artifact.title}
                  type="button"
                >
                  <FileText
                    className="h-[15px] w-[15px] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                    strokeWidth={2}
                  />
                  {!collapsed && (
                    <span className="truncate text-[13px] transition-all duration-300 origin-left">
                      {artifact.title}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </section>
        )}

        {/* Discussions */}
        {spaceConversations.length > 0 && (
          <section>
            {!collapsed && (
              <h2 className="px-2 pb-1 pt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Toutes
              </h2>
            )}
            <nav className="space-y-0.5 mt-1">
              {visibleConversations.map((conversation) =>
                renderConversation(conversation),
              )}
            </nav>

            {!collapsed && spaceConversations.length > 5 && (
              <button
                className="mt-2 flex h-8 w-full items-center justify-between rounded-md px-2.5 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300 focus-ring"
                onClick={() => setShowAllRecent((v) => !v)}
                type="button"
              >
                <span>
                  {showAllRecent ? "Afficher moins" : "Afficher plus"}
                </span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-300 ${showAllRecent ? "rotate-180" : ""}`}
                  strokeWidth={2.5}
                />
              </button>
            )}
          </section>
        )}
      </div>

      {/* --- FOOTER (Utilisateur / Paramètres / Thème) --- */}
      <div
        className={`shrink-0 flex border-t border-white/[0.06] bg-[#0a0a0a]/50 backdrop-blur-md transition-all duration-500 ${
          collapsed
            ? "flex-col items-center gap-2 py-4"
            : "items-center justify-between h-[56px] px-4"
        }`}
      >
        {/* Bouton Recherche rapide (Seulement si déplié) */}
        {!collapsed && (
          <button
            className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors focus-ring"
            onClick={() => setIsCommandPaletteOpen(true)}
            type="button"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span>Rechercher</span>
            <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-sans text-zinc-400">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Actions (Thème & Paramètres) */}
        <div
          className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-1"}`}
        >
          <button
            className={`grid place-items-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors focus-ring ${
              collapsed ? "h-9 w-9" : "h-8 w-8"
            }`}
            onClick={toggleTheme}
            title={theme === "dark" ? "Thème clair" : "Thème sombre"}
            type="button"
          >
            {theme === "dark" ? (
              <Sun className="h-[15px] w-[15px]" strokeWidth={2} />
            ) : (
              <Moon className="h-[15px] w-[15px]" strokeWidth={2} />
            )}
          </button>

          <button
            className={`grid place-items-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors focus-ring ${
              collapsed ? "h-9 w-9" : "h-8 w-8"
            }`}
            onClick={() => setIsSettingsOpen(true)}
            title="Paramètres"
            type="button"
          >
            <Settings className="h-[15px] w-[15px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
};
