import {
  BookOpen,
  ChevronDown,
  Edit3,
  FileText,
  LayoutGrid,
  MessageSquare,
  Pin,
  Plug,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";

export const MobileDrawer: React.FC = () => {
  const {
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
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
    activePage,
    setActivePage,
  } = useApp();

  const drawerRef = useRef<HTMLDivElement>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);

  useEffect(() => {
    if (!isMobileDrawerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen, setIsMobileDrawerOpen]);

  if (!isMobileDrawerOpen) {
    return null;
  }

  const spaceConversations = conversations
    .filter(
      (conversation) =>
        conversation.spaceId === activeSpace?.id && !conversation.isArchived,
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
    return (
      <button
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors focus-ring ${
          isActive
            ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium"
            : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
        }`}
        key={conversation.id}
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
        <header className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white">
              <Sparkles aria-hidden="true" className="h-4 w-4 fill-current" />
            </div>
            <span className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
              Idealy
            </span>
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

        <div className="shrink-0 space-y-0.5 px-3 pb-3 pt-1">
          <button
            className="sidebar-new-chat flex h-12 w-full items-center gap-2.5 rounded-full px-3 text-[15px] font-medium transition-colors focus-ring"
            onClick={() => {
              createConversation();
              setIsMobileDrawerOpen(false);
            }}
            type="button"
          >
            <SquarePen aria-hidden="true" className="h-5 w-5" />
            <span>Nouvelle conversation</span>
          </button>
          <button
            aria-current={activePage === "library" ? "page" : undefined}
            className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors focus-ring ${activePage === "library" ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium" : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"}`}
            onClick={() => setActivePage("library")}
            type="button"
          >
            <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            <span>Bibliothèque</span>
          </button>
          <button
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              setIsCommandPaletteOpen(true);
            }}
            type="button"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            <span>Rechercher</span>
          </button>
          <button
            aria-current={activePage === "connectors" ? "page" : undefined}
            className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors focus-ring ${
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
            <Plug aria-hidden="true" className="h-4 w-4" />
            <span>Connecteurs</span>
          </button>
          <button
            aria-current={activePage === "settings" ? "page" : undefined}
            className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors focus-ring ${activePage === "settings" ? "sidebar-item-active text-[var(--dsw-alias-label-primary)] font-medium" : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"}`}
            onClick={() => setActivePage("settings")}
            type="button"
          >
            <Settings aria-hidden="true" className="h-4 w-4" />
            <span>Paramètres</span>
          </button>
          <button
            className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
            onClick={() => {
              setActivePage("docs");
              setIsMobileDrawerOpen(false);
            }}
            type="button"
          >
            <BookOpen aria-hidden="true" className="h-4 w-4" />
            <span>Documentation</span>
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
          {spaceConversations.length > 0 && (
            <section aria-label="Toutes les conversations">
              <h2 className="sidebar-section-heading px-3 pb-1.5 pt-2 text-[13px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                Toutes
              </h2>
              <nav aria-label="Conversations" className="space-y-0.5">
                {visibleConversations.map((conversation) =>
                  renderConversation(conversation),
                )}
              </nav>
              {spaceConversations.length > 5 && (
                <button
                  aria-expanded={showAllRecent}
                  className="mt-1 flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-xs text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
                  onClick={() => setShowAllRecent((value) => !value)}
                  type="button"
                >
                  <span>
                    {showAllRecent ? "Afficher moins" : "Afficher plus"}
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
      </aside>
    </div>
  );
};
