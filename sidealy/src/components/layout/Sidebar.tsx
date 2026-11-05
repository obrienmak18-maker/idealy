import {
  Download,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  Pin,
  Plug,
  Search,
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
      icon: LayoutGrid,
    },
    {
      key: "connectors" as const,
      label: "Connecteurs",
      icon: Plug,
    },
  ] as const;

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
          className={`flex items-center transition-all duration-150 rounded-lg ${
            isActive
              ? "bg-[var(--idealy-teal-bg)]/40 text-[var(--idealy-teal-petrol)] font-medium"
              : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
          } ${
            collapsed
              ? "mx-auto h-8 w-8 justify-center"
              : "h-8 w-full gap-2 px-2"
          }`}
          data-active={isActive}
        >
          {/* Main Select Button */}
          <button
            aria-current={isActive ? "true" : undefined}
            className={`flex flex-1 items-center gap-2 min-w-0 text-left focus-ring rounded-md ${
              collapsed ? "h-full w-full justify-center" : "h-full"
            }`}
            onClick={() => {
              setActiveConversationId(conversation.id);
              setActivePage("chat");
            }}
            title={conversation.title}
            type="button"
          >
            <MessageSquare
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive
                  ? "text-[var(--idealy-teal-petrol)]"
                  : "text-[var(--dsw-alias-label-tertiary)] group-hover/item:text-[var(--dsw-alias-label-primary)]"
              }`}
            />
            {!collapsed && (
              <span className="truncate text-xs tracking-tight">
                {conversation.title}
              </span>
            )}
          </button>

          {/* Options button on hover (Only when expanded) */}
          {!collapsed && (
            <div className="relative shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={`Options pour ${conversation.title}`}
                className="grid h-6 w-6 place-items-center rounded text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-bg-layer-3)] hover:text-[var(--dsw-alias-label-primary)] transition-colors focus-ring"
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
                  className="absolute right-0 top-7 z-50 w-44 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1 shadow-lg animate-fade-in"
                  ref={actionsRef}
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
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
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
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
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
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
    if (items.length === 0) return null;
    return (
      <section className="mb-2.5">
        {!collapsed && (
          <h3 className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-caption)]">
            {label}
          </h3>
        )}
        <div className="space-y-0.5" role="list">
          {items.map((conv) => renderConversation(conv))}
        </div>
      </section>
    );
  };

  return (
    <aside
      aria-label="Navigation latérale"
      className={`sidebar-root relative z-20 flex h-full shrink-0 flex-col border-r border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)]/90 backdrop-blur-md transition-all duration-200 select-none hidden md:flex ${
        collapsed ? "w-14" : "w-60 lg:w-64"
      }`}
    >
      {/* ─── 1. HEADER : logo ; replié, le logo devient le bouton d'agrandir au survol ─── */}
      <div
        className={`flex h-12 shrink-0 items-center ${
          collapsed ? "justify-center px-0" : "justify-between px-3"
        }`}
      >
        {collapsed ? (
          <button
            aria-label="Agrandir le menu"
            className="group relative grid h-9 w-9 place-items-center rounded-xl focus-ring"
            onClick={() => setCollapsed(false)}
            title="Agrandir le menu"
            type="button"
          >
            <span className="transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
              <IdealyLogo animated compact size={24} />
            </span>
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
            </span>
          </button>
        ) : (
          <>
            <button
              aria-label="Idealy, retour à l'accueil"
              className="flex items-center overflow-hidden rounded-lg focus-ring"
              onClick={() => setActivePage("chat")}
              type="button"
            >
              <IdealyLogo animated size={26} />
            </button>
            <div className="flex items-center gap-1">
              <button
                aria-label="Rechercher"
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors focus-ring"
                onClick={() => setIsCommandPaletteOpen(true)}
                title="Rechercher (Ctrl+K)"
                type="button"
              >
                <Search className="h-3.5 w-3.5" />
              </button>

              <button
                aria-label="Réduire le menu"
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] active:scale-90 transition-all duration-200 focus-ring"
                onClick={() => setCollapsed(true)}
                title="Réduire"
                type="button"
              >
                <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── 2. PRIMARY ACTION : NOUVELLE DISCUSSION ───────────────────────── */}
      <div className={`shrink-0 ${collapsed ? "px-2 py-1.5" : "px-2.5 py-1.5"}`}>
        <button
          className={`flex items-center justify-center font-medium transition-all duration-150 focus-ring ${
            collapsed
              ? "mx-auto h-8 w-8 rounded-lg"
              : "h-8 w-full gap-2 rounded-lg px-2.5 justify-start"
          } bg-gradient-to-r from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white shadow-xs hover:opacity-90 active:scale-[0.98]`}
          onClick={() => {
            createConversation();
            setActivePage("chat");
          }}
          title="Nouvelle conversation"
          type="button"
        >
          <SquarePen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {!collapsed && (
            <span className="text-xs font-semibold tracking-tight">
              Nouvelle discussion
            </span>
          )}
        </button>
      </div>

      {/* ─── 3. NAVIGATION PILLARS ───────────────────────────────────────── */}
      <nav aria-label="Sections principales" className="shrink-0 px-2 py-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-8 w-full items-center rounded-lg transition-colors focus-ring ${
                collapsed ? "mx-auto w-8 justify-center" : "gap-2 px-2"
              } ${
                isActive
                  ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)] font-semibold"
                  : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setActivePage(item.key)}
              title={item.label}
              type="button"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--dsw-alias-label-secondary)]" strokeWidth={1.8} />
              {!collapsed && (
                <span className="text-xs truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ─── 4. CHRONOLOGICAL DISCUSSION HISTORY ──────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-2 mt-1 idealy-scroll">
        {renderSection("Épinglés", groupedConversations.pinned)}
        {renderSection("Aujourd'hui", groupedConversations.today)}
        {renderSection("Hier", groupedConversations.yesterday)}
        {renderSection("7 derniers jours", groupedConversations.lastWeek)}
        {renderSection("Plus ancien", groupedConversations.older)}

        {/* Empty state when no chats */}
        {spaceConversations.length === 0 && !collapsed && (
          <div className="px-2 py-6 text-center text-xs text-[var(--dsw-alias-label-tertiary)]">
            <p className="font-medium">Aucune discussion</p>
          </div>
        )}
      </div>

      {/* ─── 5. FOOTER (UTILISATEUR, CRÉDITS & PARAMÈTRES) ─────────────────── */}
      <div className={`shrink-0 px-2 pb-1.5 ${collapsed ? "flex justify-center" : ""}`}>
        <CreditsPill compact={collapsed} />
      </div>

      <div
        className={`sidebar-footer shrink-0 flex border-t border-[var(--dsw-alias-border-l1)] ${
          collapsed
            ? "flex-col items-center gap-1.5 py-2"
            : "items-center justify-between h-12 px-2.5"
        }`}
      >
        <AccountChip
          collapsed={collapsed}
          onOpenSettings={() => setActivePage("settings")}
        />

        {!collapsed && (
          <button
            className="grid place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors focus-ring h-7 w-7"
            onClick={() => setActivePage("settings")}
            title="Paramètres généraux"
            type="button"
          >
            <Settings className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </aside>
  );
};
