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
  Settings,
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
        className="rounded-xl"
        key={conversation.id}
        ref={menuOpen ? actionsRef : undefined}
      >
        <div className="flex min-w-0 items-center gap-1">
          <button
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors focus-ring ${
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
                  className="h-3.5 w-3.5 shrink-0 text-[var(--idealy-teal-petrol)]"
                />
              ) : (
                <MessageSquare
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 opacity-70"
                />
              )}
              <span className="truncate">{conversation.title}</span>
            </span>
            {hasDraft && (
              <Edit3
                aria-label="Brouillon conservé"
                className="h-3 w-3 shrink-0 text-[var(--idealy-teal-petrol)]"
              />
            )}
          </button>
          <div className="relative">
            <button
              aria-expanded={menuOpen}
              aria-controls={`mobile-conversation-actions-${conversation.id}`}
              aria-label={`Options de ${conversation.title}`}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring ${menuOpen ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)]" : ""}`}
              onClick={() => setOpenActionsId(menuOpen ? null : conversation.id)}
              ref={menuOpen ? actionsTriggerRef : undefined}
              type="button"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div
            id={`mobile-conversation-actions-${conversation.id}`}
            className="ml-3 mt-1 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] p-1 shadow-[var(--dsw-elevation-panel)]"
            aria-label={`Actions pour ${conversation.title}`}
            role="group"
          >
            <button
              aria-pressed={conversation.isPinned}
              className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => {
                togglePinConversation(conversation.id);
                setOpenActionsId(null);
              }}
              type="button"
            >
              <Pin aria-hidden="true" className="h-3.5 w-3.5" />
              {conversation.isPinned ? "Retirer des épinglées" : "Épingler la conversation"}
            </button>
            <button
              className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => {
                exportConversation(conversation.id);
                setOpenActionsId(null);
              }}
              type="button"
            >
              <Download aria-hidden="true" className="h-3.5 w-3.5" />
              Exporter en Markdown
            </button>
            <button
              className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
              onClick={() => {
                toggleArchiveConversation(conversation.id);
                setOpenActionsId(null);
                setIsMobileDrawerOpen(false);
              }}
              type="button"
            >
              <Archive aria-hidden="true" className="h-3.5 w-3.5" />
              {conversation.isArchived ? "Désarchiver" : "Archiver la conversation"}
            </button>
            <button
              className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] text-[var(--dsw-alias-state-error-primary)] hover:bg-red-500/10 focus-ring"
              onClick={deleteThisConversation}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Supprimer la conversation
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
        className="sidebar-shell relative z-10 flex h-full w-[min(320px,86vw)] flex-col shadow-2xl animate-in slide-in-from-left duration-200"
        ref={drawerRef}
      >
        <header className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-[var(--dsw-alias-border-l1)]">
          <div className="flex items-center gap-2.5">
            <IdealyLogo animated size={28} />
          </div>
          <button
            aria-label="Fermer la navigation"
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
            onClick={() => setIsMobileDrawerOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 space-y-0.5 px-3 pb-3 pt-2">
          <button
            className="sidebar-new-chat flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)] border border-[var(--idealy-teal-border)] shadow-xs transition-colors focus-ring"
            onClick={() => {
              createConversation();
              setIsMobileDrawerOpen(false);
            }}
            type="button"
          >
            <SquarePen aria-hidden="true" className="h-4.5 w-4.5" />
            <span>Nouvelle discussion</span>
          </button>

          {/* Escouade Multi-Agents */}
          <button
            aria-current={activePage === "agents" ? "page" : undefined}
            className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-[13px] transition-colors focus-ring ${
              activePage === "agents"
                ? "bg-[var(--idealy-indigo-bg)] text-[var(--idealy-indigo)] font-semibold shadow-xs"
                : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
            }`}
            onClick={() => navigateTo("agents")}
            type="button"
          >
            <div className="flex items-center gap-2.5">
              <Bot aria-hidden="true" className="h-4 w-4 text-[var(--idealy-indigo)]" />
              <span>Escouade Multi-Agents</span>
            </div>
            <span className="rounded-full bg-[var(--idealy-indigo)]/15 px-1.5 py-0.2 text-[9px] font-bold text-[var(--idealy-indigo)]">
              Multi
            </span>
          </button>

          <button
            aria-current={activePage === "library" ? "page" : undefined}
            className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] transition-colors focus-ring ${activePage === "library" ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium" : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"}`}
            onClick={() => navigateTo("library")}
            type="button"
          >
            <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            <span>Bibliothèque</span>
          </button>
          <button
            aria-current={activePage === "connectors" ? "page" : undefined}
            className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-[13px] transition-colors focus-ring ${
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
            <div className="flex items-center gap-2.5">
              <Plug aria-hidden="true" className="h-4 w-4 text-violet-500" />
              <span>Connecteurs</span>
            </div>
            <span className="rounded-full bg-violet-500/15 px-1.5 py-0.2 text-[9px] font-bold text-violet-500">
              Hub
            </span>
          </button>
          <button
            className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              setIsCommandPaletteOpen(true);
            }}
            type="button"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            <span>Rechercher</span>
          </button>
        </div>

        {spaces.length > 1 && (
          <div className="shrink-0 px-3 pb-2">
            <label className="sr-only" htmlFor="mobile-space-select">
              Espace de travail
            </label>
            <div className="relative">
              <select
                className="h-9 w-full appearance-none rounded-lg bg-transparent pl-2.5 pr-8 text-[13px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
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
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--dsw-alias-label-tertiary)]"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {artifacts.length > 0 && (
            <section aria-label="Bibliothèque" className="mb-3">
              <h2 className="sidebar-section-heading flex items-center gap-2 px-3 pb-1.5 pt-2 text-[13px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Bibliothèque</span>
              </h2>
              <nav
                aria-label="Artefacts de la bibliothèque"
                className="space-y-0.5"
              >
                {artifacts.map((artifact) => (
                  <button
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
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
                      className="h-3.5 w-3.5 shrink-0 opacity-75"
                    />
                    <span className="truncate">{artifact.title}</span>
                  </button>
                ))}
              </nav>
            </section>
          )}
          {(spaceConversations.length > 0 || conversationsHasMore) && (
            <section aria-label="Toutes les conversations">
              <h2 className="sidebar-section-heading px-3 pb-1.5 pt-2 text-[13px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                Toutes
              </h2>
              <nav aria-label="Conversations" className="space-y-0.5">
                {visibleConversations.map((conversation) =>
                  renderConversation(conversation),
                )}
              </nav>
              {(spaceConversations.length > 5 || conversationsHasMore) && (
                <button
                  aria-expanded={showAllRecent}
                  className="mt-1 flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-xs text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
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
                        ? "Afficher moins"
                        : "Afficher plus"}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition-transform ${showAllRecent ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </section>
          )}
        </div>
        <footer className="sidebar-footer flex shrink-0 items-center gap-1 px-3 py-2">
          <AccountChip
            onOpenSettings={() => {
              setActivePage("settings");
              setIsMobileDrawerOpen(false);
            }}
          />
          <button
            aria-current={activePage === "settings" ? "page" : undefined}
            aria-label="Paramètres"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors focus-ring ${activePage === "settings" ? "sidebar-item-active text-[var(--dsw-alias-label-primary)]" : "text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"}`}
            onClick={() => {
              setActivePage("settings");
              setIsMobileDrawerOpen(false);
            }}
            title="Paramètres"
            type="button"
          >
            <Settings aria-hidden="true" className="h-4 w-4" />
          </button>
        </footer>
      </aside>
    </div>
  );
};
