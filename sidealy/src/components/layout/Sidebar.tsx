import {
  Download,
  LayoutGrid,
  Pencil,
  Search,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Pin,
  Plug,
  Settings,
  SquarePen,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { hasConversationActivity } from "../../services/conversationVisibility";
import { AccountChip } from "./AccountChip";
import { CreditsPill } from "../credits/CreditsPill";
import { IdealyLogo } from "../branding/IdealyLogo";

export const Sidebar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    activeSpace,
    conversations,
    messages,
    activeConversation,
    setActiveConversationId,
    createConversation,
    togglePinConversation,
    exportConversation,
    deleteConversation,
    openConfirmModal,
    renameConversation,
    setIsCommandPaletteOpen,
  } = useApp();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("idealy.sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("idealy.sidebar.collapsed", collapsed ? "1" : "0");
    } catch {
      /* stockage indisponible */
    }
  }, [collapsed]);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!openActionsId) return;
    const closeOutside = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setOpenActionsId(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionsId(null);
        actionsTriggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openActionsId]);

  const spaceConversations = useMemo(
    () =>
      conversations
        .filter(
          (conversation) =>
            conversation.spaceId === activeSpace?.id &&
            !conversation.isArchived &&
            hasConversationActivity(conversation, messages),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, activeSpace, messages],
  );

  // Chronological grouping (Aujourd'hui, Hier, 7 derniers jours, Plus ancien)
  const groupedConversations = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const today: typeof spaceConversations = [];
    const yesterday: typeof spaceConversations = [];
    const lastWeek: typeof spaceConversations = [];
    const older: typeof spaceConversations = [];

    const pinned: typeof spaceConversations = [];
    for (const conv of spaceConversations) {
      if (conv.isPinned) {
        pinned.push(conv);
        continue;
      }
      const diff = now - conv.updatedAt;
      if (diff < oneDay) {
        today.push(conv);
      } else if (diff < 2 * oneDay) {
        yesterday.push(conv);
      } else if (diff < 7 * oneDay) {
        lastWeek.push(conv);
      } else {
        older.push(conv);
      }
    }

    return { pinned, today, yesterday, lastWeek, older };
  }, [spaceConversations]);

  const navItems = [
    {
      key: "library" as const,
      label: "Bibliothèque",
      badge: null,
      icon: LayoutGrid,
      iconColor: "text-[var(--dsw-alias-label-secondary)]",
      activeBg: "bg-[var(--dsw-alias-interactive-bg-hover)]",
      activeText: "text-[var(--dsw-alias-label-primary)]",
      badgeClass: "",
    },
    {
      key: "connectors" as const,
      label: "Connecteurs",
      badge: null,
      icon: Plug,
      iconColor: "text-[var(--dsw-alias-label-secondary)]",
      activeBg: "bg-[var(--dsw-alias-interactive-bg-hover)]",
      activeText: "text-[var(--dsw-alias-label-primary)]",
      badgeClass: "idealy-badge--violet",
    },
  ] as const;

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const renderConversation = (
    conversation: (typeof spaceConversations)[number],
  ) => {
    const isActive = activeConversation?.id === conversation.id && activePage === "chat";
    const menuOpen = openActionsId === conversation.id;

    const deleteThisConversation = () => {
      setOpenActionsId(null);
      openConfirmModal({
        title: "Supprimer cette conversation ?",
        confirmLabel: "Supprimer définitivement",
        isDestructive: true,
        message: `Supprimer « ${conversation.title} » ? Tous les messages et livrables associés seront effacés.`,
        onConfirm: () => deleteConversation(conversation.id),
      });
    };

    return (
      <div className="relative group/item" key={conversation.id}>
        <div
          className={`idealy-active-indicator group flex items-center transition-all duration-200 ease-spring ${
            isActive
              ? "bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)] font-medium"
              : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
          } ${
            collapsed
              ? "mx-auto h-10 w-10 justify-center rounded-xl"
              : "h-9 w-full gap-2 rounded-xl px-2.5"
          }`}
          data-active={isActive}
        >
          {renamingId === conversation.id ? (
            <input
              autoFocus
              className="h-7 min-w-0 flex-1 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] px-2 text-[12.5px] text-[var(--dsw-alias-label-primary)] outline-none"
              onBlur={() => {
                const next = renameValue.trim();
                if (next && next !== conversation.title) renameConversation(conversation.id, next);
                setRenamingId(null);
              }}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setRenamingId(null);
              }}
              value={renameValue}
            />
          ) : (
          <button
            aria-current={isActive ? "true" : undefined}
            className={`flex flex-1 items-center gap-2 min-w-0 text-left focus-ring rounded-lg ${
              collapsed ? "h-full w-full justify-center" : "h-full"
            }`}
            onClick={() => {
              setActiveConversationId(conversation.id);
              setActivePage("chat");
            }}
            title={conversation.title}
            type="button"
          >
            {!collapsed && (
              <span className="truncate text-[13px] font-normal tracking-tight">
                {conversation.title}
              </span>
            )}
          </button>
          )}

          {/* Options button on hover (Only when expanded) */}
          {!collapsed && (
            <div className="relative shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={`Options pour ${conversation.title}`}
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-bg-layer-3)] hover:text-[var(--dsw-alias-label-primary)] transition-colors focus-ring"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionsId(menuOpen ? null : conversation.id);
                }}
                ref={menuOpen ? actionsTriggerRef : undefined}
                type="button"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {menuOpen && (
                <div
                  aria-label="Options de la discussion"
                  className="absolute right-0 top-8 z-50 w-48 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1.5 shadow-elevated idealy-glass animate-scale-in"
                  ref={actionsRef}
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                    onClick={() => {
                      setOpenActionsId(null);
                      togglePinConversation(conversation.id);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Pin className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                    <span>{conversation.isPinned ? "Désépingler" : "Épingler"}</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                    onClick={() => {
                      setOpenActionsId(null);
                      setRenameValue(conversation.title);
                      setRenamingId(conversation.id);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                    <span>Renommer</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                    onClick={() => {
                      setOpenActionsId(null);
                      exportConversation(conversation.id);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Download className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                    <span>Exporter (JSON)</span>
                  </button>
                  <div className="my-1 border-t border-[var(--dsw-alias-border-l1)]" />
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    onClick={deleteThisConversation}
                    role="menuitem"
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (
    label: string,
    items: typeof spaceConversations,
  ) => {
    if (items.length === 0 || collapsed) return null;
    return (
      <section className="mb-3">
        {!collapsed && (
          <h3 className="px-2.5 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dsw-alias-label-caption)]">
            {label}
          </h3>
        )}
        <nav className="space-y-0.5">
          {items.map((conv) => renderConversation(conv))}
        </nav>
      </section>
    );
  };

  return (
    <aside
      className={`sidebar-shell hidden md:flex h-full shrink-0 flex-col select-none transition-[width] duration-300 ease-spring ${
        collapsed ? "w-[60px]" : "w-[260px]"
      }`}
      aria-label="Navigation principale"
      id="desktop-sidebar-navigation"
      role="navigation"
    >
      {/* ─── 1. HEADER : logo ; replié, le logo devient le bouton d'agrandir au survol ─── */}
      <div
        className={`flex h-[56px] shrink-0 items-center ${
          collapsed ? "justify-center px-0" : "justify-between px-3.5"
        }`}
      >
        {collapsed ? (
          <button
            aria-label="Agrandir le menu"
            className="group relative grid h-10 w-10 place-items-center rounded-xl focus-ring"
            onClick={() => setCollapsed(false)}
            title="Agrandir le menu"
            type="button"
          >
            <span className="transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
              <IdealyLogo animated compact size={28} />
            </span>
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
          </button>
        ) : (
          <>
            <button
              aria-label="Idealy, retour à l'accueil de l'espace"
              className="flex items-center overflow-hidden rounded-lg focus-ring"
              onClick={() => setActivePage("chat")}
              type="button"
            >
              <IdealyLogo animated size={30} />
            </button>
            <button
              aria-label="Réduire le menu"
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => setCollapsed(true)}
              title="Réduire le menu"
              type="button"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>

      {/* ─── 2. PRIMARY CTA (NOUVELLE DISCUSSION) ─────────────────────────── */}
      <div className={`shrink-0 ${collapsed ? "px-2.5 py-2" : "px-3 py-2"}`}>
        <button
          className={`group relative overflow-hidden flex items-center justify-center font-medium transition-all duration-200 ease-spring focus-ring ${
            collapsed
              ? "mx-auto h-10 w-10 rounded-2xl"
              : "h-10 w-full gap-2.5 rounded-xl px-3 justify-start"
          } bg-gradient-to-r from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white shadow-md hover:shadow-glow-teal active:scale-[0.97]`}
          onClick={() => {
            createConversation();
            setActivePage("chat");
          }}
          title="Nouvelle conversation"
          type="button"
        >
          {/* Shimmer overlay */}
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
            aria-hidden="true"
          />
          <SquarePen
            className="h-4 w-4 shrink-0 relative z-10"
            strokeWidth={2.2}
          />
          {!collapsed && (
            <span className="text-[13px] font-semibold tracking-tight relative z-10">
              Nouvelle discussion
            </span>
          )}
        </button>
      </div>

      {/* ─── 3. NAVIGATION PILLARS ───────────────────────────────────────── */}
      <nav aria-label="Sections principales" className="shrink-0 px-2.5 py-1.5 space-y-0.5">
        <button
          className={`flex h-10 w-full items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring ${collapsed ? "mx-auto w-10 justify-center" : "gap-2.5 px-2.5"}`}
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Rechercher"
          type="button"
        >
          <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          {!collapsed && <span className="text-[13px]">Rechercher</span>}
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              aria-current={isActive ? "page" : undefined}
              className={`idealy-active-indicator flex h-10 w-full items-center rounded-xl transition-all duration-200 ease-spring focus-ring ${
                collapsed ? "mx-auto w-10 justify-center" : "gap-2.5 px-2.5"
              } ${
                isActive
                  ? `${item.activeBg} ${item.activeText} font-semibold`
                  : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              data-active={isActive}
              onClick={() => setActivePage(item.key)}
              title={item.label}
              type="button"
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 transition-all duration-200 ${item.iconColor} ${isActive ? "scale-110" : ""}`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span className="text-[13px] truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`idealy-badge ${item.badgeClass}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ─── 5. CHRONOLOGICAL DISCUSSION HISTORY ──────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 idealy-scroll mt-1">
        {renderSection("Épinglés", groupedConversations.pinned)}
        {renderSection("Aujourd'hui", groupedConversations.today)}
        {renderSection("Hier", groupedConversations.yesterday)}
        {renderSection("7 derniers jours", groupedConversations.lastWeek)}
        {renderSection("Plus ancien", groupedConversations.older)}

        {/* Empty state when no chats */}
        {spaceConversations.length === 0 && !collapsed && (
          <div className="px-3 py-8 text-center text-xs text-[var(--dsw-alias-label-tertiary)]">
            <p className="font-medium">Aucune discussion</p>
            <p className="mt-1 text-[10.5px] text-[var(--dsw-alias-label-caption)]">
              Cliquez sur « Nouvelle discussion » pour commencer.
            </p>
          </div>
        )}
      </div>

      {/* ─── 6. FOOTER (UTILISATEUR, LANGUE & PARAMÈTRES) ─────────────────── */}
      <div className={`shrink-0 px-3.5 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
        <CreditsPill compact={collapsed} />
      </div>
      <div
        className={`sidebar-footer shrink-0 flex border-t border-[var(--dsw-alias-border-l1)] transition-all duration-300 ${
          collapsed
            ? "flex-col items-center gap-2 py-3"
            : "items-center justify-between h-[54px] px-3.5"
        }`}
      >
        <AccountChip
          collapsed={collapsed}
          onOpenSettings={() => setActivePage("settings")}
        />

        {!collapsed && (
          <div className="flex items-center gap-0.5">
            {/* Language Switcher */}
            <button
              className="px-2 py-1 rounded-lg text-[10.5px] font-bold text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-all duration-200 focus-ring"
              onClick={() => setLanguage((l) => (l === "fr" ? "en" : "fr"))}
              title="Changer de langue"
              type="button"
            >
              {language.toUpperCase()}
            </button>

            {/* Settings button */}
            <button
              className="grid place-items-center rounded-xl text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:rotate-45 active:scale-90 transition-all duration-300 ease-spring focus-ring h-8 w-8"
              onClick={() => setActivePage("settings")}
              title="Paramètres"
              type="button"
            >
              <Settings className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
