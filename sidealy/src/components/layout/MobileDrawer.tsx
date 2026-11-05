import {
  Archive,
  Bot,
  ChevronDown,
  Download,
  Edit3,
  FileText,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Plug,
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp, type AppPage } from "../../context/AppContext";
import { hasConversationActivity } from "../../services/conversationVisibility";
import { AccountChip } from "./AccountChip";
import { IdealyLogo } from "../branding/IdealyLogo";

export const MobileDrawer: React.FC = () => {
  const {
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    spaces,
    activeSpace,
    setActiveSpaceId,
    conversations,
    messages,
    conversationsHasMore,
    isLoadingConversations,
    loadMoreConversations,
    activeConversation,
    setActiveConversationId,
    createConversation,
    togglePinConversation,
    toggleArchiveConversation,
    exportConversation,
    deleteConversation,
    openConfirmModal,
    artifacts,
    openArtifact,
    setIsCommandPaletteOpen,
    activePage,
    setActivePage,
  } = useApp();

  const drawerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  const navigateTo = (page: AppPage) => {
    setActivePage(page);
    setIsMobileDrawerOpen(false);
  };

  useEffect(() => {
    if (!isMobileDrawerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openActionsId) {
          setOpenActionsId(null);
          actionsTriggerRef.current?.focus();
          return;
        }
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen, openActionsId, setIsMobileDrawerOpen]);

  useEffect(() => {
    if (!isMobileDrawerOpen) {
      setOpenActionsId(null);
    }
  }, [isMobileDrawerOpen]);

  useEffect(() => {
    if (!openActionsId) return;
    const closeOutside = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setOpenActionsId(null);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [openActionsId]);

  if (!isMobileDrawerOpen) {
    return null;
  }

  const spaceConversations = conversations
    .filter(
      (conversation) =>
        conversation.spaceId === activeSpace?.id &&
        !conversation.isArchived &&
        hasConversationActivity(conversation, messages),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const visibleConversations = showAllRecent
    ? spaceConversations
    : spaceConversations.slice(0, 5);
  const openConversation = (id: string) => {
    setActiveConversationId(id);
    setIsMobileDrawerOpen(false);
  };

  const renderConversation = (
    conversation: (typeof spaceConversations)[number],
  ) => {
    const isActive = activeConversation?.id === conversation.id;
    const hasDraft = Boolean(conversation.draft?.trim());
    const menuOpen = openActionsId === conversation.id;
    const deleteThisConversation = () => {
      setOpenActionsId(null);
      setIsMobileDrawerOpen(false);
      openConfirmModal({
        confirmLabel: "Supprimer définitivement",
        isDestructive: true,
        message:
          `Êtes-vous certain de vouloir supprimer définitivement « ${conversation.title} » ? ` +
          "Tous les messages et livrables associés seront effacés.",
        onConfirm: () => deleteConversation(conversation.id),
        title: "Supprimer cette conversation ?",
      });
    };
    return (
      <div
        className="rounded-lg"
        key={conversation.id}
        ref={menuOpen ? actionsRef : undefined}
      >
        <div className="flex min-w-0 items-center gap-1">
          <button
            aria-current={isActive ? "page" : undefined}
            className={`flex h-8 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs transition-colors focus-ring ${
              isActive
                ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium"
                : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
            }`}
            onClick={() => openConversation(conversation.id)}
            title={conversation.title}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              {conversation.isPinned ? (
                <Pin
                  aria-label="Épinglée"
                  className="h-3 w-3 shrink-0 text-[var(--idealy-teal-petrol)]"
                />
              ) : (
                <MessageSquare
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 opacity-70"
                />
              )}
              <span className="truncate">{conversation.title}</span>
            </span>
            {hasDraft && (
              <Edit3
                aria-label="Brouillon conservé"
                className="h-2.5 w-2.5 shrink-0 text-[var(--idealy-teal-petrol)]"
              />
            )}
          </button>
          <div className="relative">
            <button
              aria-expanded={menuOpen}
              aria-controls={`mobile-conversation-actions-${conversation.id}`}
              aria-label={`Options de ${conversation.title}`}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring ${menuOpen ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)]" : ""}`}
              onClick={() => setOpenActionsId(menuOpen ? null : conversation.id)}
              ref={menuOpen ? actionsTriggerRef : undefined}
              type="button"
            >
              <MoreHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div
            id={`mobile-conversation-actions-${conversation.id}`}
            className="ml-2 mt-0.5 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] p-0.5 shadow-[var(--dsw-elevation-panel)]"
            aria-label={`Actions pour ${conversation.title}`}
            role="group"
          >
            <button
              aria-pressed={conversation.isPinned}
              className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => {
                togglePinConversation(conversation.id);
                setOpenActionsId(null);
              }}
              type="button"
            >
              <Pin aria-hidden="true" className="h-3 w-3" />
              {conversation.isPinned ? "Désépingler" : "Épingler"}
            </button>
            <button
              className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => {
                exportConversation(conversation.id);
                setOpenActionsId(null);
              }}
              type="button"
            >
              <Download aria-hidden="true" className="h-3 w-3" />
              Exporter
            </button>
            <button
              className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => {
                toggleArchiveConversation(conversation.id);
                setOpenActionsId(null);
                setIsMobileDrawerOpen(false);
              }}
              type="button"
            >
              <Archive aria-hidden="true" className="h-3 w-3" />
              {conversation.isArchived ? "Désarchiver" : "Archiver"}
            </button>
            <button
              className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] text-[var(--dsw-alias-state-error-primary)] hover:bg-red-500/10 focus-ring"
              onClick={deleteThisConversation}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-3 w-3" />
              Supprimer
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      aria-label="Navigation"
      aria-modal="true"
      className="fixed inset-0 z-50 flex md:hidden"
      role="dialog"
    >
      <button
        aria-label="Fermer la navigation"
        className="fixed inset-0 bg-black/55 backdrop-blur-sm"
        onClick={() => setIsMobileDrawerOpen(false)}
        type="button"
      />
      <aside
        className="sidebar-shell relative z-10 flex h-full w-[min(280px,82vw)] flex-col shadow-2xl animate-in slide-in-from-left duration-200"
        ref={drawerRef}
      >
        <header className="flex h-11 shrink-0 items-center justify-between px-3 border-b border-[var(--dsw-alias-border-l1)]">
          <div className="flex items-center gap-2">
            <IdealyLogo animated size={24} />
          </div>
          <button
            aria-label="Fermer la navigation"
            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
            onClick={() => setIsMobileDrawerOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="shrink-0 space-y-0.5 px-2.5 pb-2 pt-2">
          <button
            className="sidebar-new-chat flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-semibold bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)] border border-[var(--idealy-teal-border)] shadow-xs transition-colors focus-ring"
            onClick={() => {
              createConversation();
              setIsMobileDrawerOpen(false);
            }}
            type="button"
          >
            <SquarePen aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Nouvelle discussion</span>
          </button>

          <button
            aria-current={activePage === "agents" ? "page" : undefined}
            className={`flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-xs transition-colors focus-ring ${
              activePage === "agents"
                ? "bg-[var(--idealy-indigo-bg)] text-[var(--idealy-indigo)] font-semibold"
                : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
            }`}
            onClick={() => navigateTo("agents")}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Bot aria-hidden="true" className="h-3.5 w-3.5 text-[var(--idealy-indigo)]" />
              <span>Agents</span>
            </div>
          </button>

          <button
            aria-current={activePage === "library" ? "page" : undefined}
            className={`flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs transition-colors focus-ring ${activePage === "library" ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium" : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"}`}
            onClick={() => navigateTo("library")}
            type="button"
          >
            <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Bibliothèque</span>
          </button>
          <button
            aria-current={activePage === "connectors" ? "page" : undefined}
            className={`flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-xs transition-colors focus-ring ${
              activePage === "connectors"
                ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium"
                : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
            }`}
            onClick={() => {
              setActivePage("connectors");
              setIsMobileDrawerOpen(false);
            }}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Plug aria-hidden="true" className="h-3.5 w-3.5 text-violet-500" />
              <span>Connecteurs</span>
            </div>
          </button>
          <button
            className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-xs text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              setIsCommandPaletteOpen(true);
            }}
            type="button"
          >
            <Search aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Rechercher</span>
          </button>
        </div>

        {spaces.length > 1 && (
          <div className="shrink-0 px-2.5 pb-2">
            <label className="sr-only" htmlFor="mobile-space-select">
              Espace de travail
            </label>
            <div className="relative">
              <select
                className="h-8 w-full appearance-none rounded-lg bg-transparent pl-2 pr-7 text-xs text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
                id="mobile-space-select"
                onChange={(event) => setActiveSpaceId(event.target.value)}
                value={activeSpace?.id ?? ""}
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--dsw-alias-label-tertiary)]"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {artifacts.length > 0 && (
            <section aria-label="Bibliothèque" className="mb-2">
              <h2 className="sidebar-section-heading flex items-center gap-1.5 px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)]">
                <LayoutGrid aria-hidden="true" className="h-3 w-3" />
                <span>Bibliothèque</span>
              </h2>
              <nav
                aria-label="Artefacts de la bibliothèque"
                className="space-y-px"
              >
                {artifacts.map((artifact) => (
                  <button
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
                    key={artifact.id}
                    onClick={() => {
                      openArtifact(artifact.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    title={artifact.title}
                    type="button"
                  >
                    <FileText
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 opacity-75"
                    />
                    <span className="truncate">{artifact.title}</span>
                  </button>
                ))}
              </nav>
            </section>
          )}
          {(spaceConversations.length > 0 || conversationsHasMore) && (
            <section aria-label="Toutes les conversations">
              <h2 className="sidebar-section-heading px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)]">
                Conversations
              </h2>
              <nav aria-label="Conversations" className="space-y-px">
                {visibleConversations.map((conversation) =>
                  renderConversation(conversation),
                )}
              </nav>
              {(spaceConversations.length > 5 || conversationsHasMore) && (
                <button
                  aria-expanded={showAllRecent}
                  className="mt-0.5 flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-[11px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
                  onClick={() => {
                    setShowAllRecent((value) => !value);
                    if (conversationsHasMore) void loadMoreConversations();
                  }}
                  type="button"
                >
                  <span>
                    {isLoadingConversations
                      ? "Chargement…"
                      : showAllRecent
                        ? "Moins"
                        : "Plus"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3 w-3 transition-transform ${showAllRecent ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </section>
          )}
        </div>
        <footer className="sidebar-footer flex shrink-0 items-center px-2.5 py-1.5">
          <AccountChip
            onOpenSettings={() => {
              setActivePage("settings");
              setIsMobileDrawerOpen(false);
            }}
          />
        </footer>
      </aside>
    </div>
  );
};
