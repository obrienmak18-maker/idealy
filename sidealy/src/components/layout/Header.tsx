import {
  Archive,
  Download,
  Menu,
  MoreHorizontal,
  Pin,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";

export const Header: React.FC = () => {
  const {
    activeConversation,
    setIsMobileDrawerOpen,
    togglePinConversation,
    toggleArchiveConversation,
    deleteConversation,
    exportConversation,
    openConfirmModal,
  } = useApp();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }
    const closeOutside = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setActionsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [actionsOpen]);

  const handleDeleteConversation = () => {
    if (!activeConversation) {
      return;
    }
    setActionsOpen(false);
    openConfirmModal({
      confirmLabel: "Supprimer définitivement",
      isDestructive: true,
      message:
        "Êtes-vous certain de vouloir supprimer définitivement « " +
        activeConversation.title +
        " » ? Tous les messages et livrables associés seront effacés.",
      onConfirm: () => deleteConversation(activeConversation.id),
      title: "Supprimer cette conversation ?",
    });
  };

  return (
    <header
      className="relative z-10 flex h-10 shrink-0 items-center justify-between px-3 md:px-5 bg-transparent"
      data-window-drag
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label="Ouvrir le menu de navigation"
          className="md:hidden grid h-9 w-9 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors focus-ring"
          onClick={() => setIsMobileDrawerOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {activeConversation && (
        <div className="relative" ref={actionsRef}>
          <button
            aria-expanded={actionsOpen}
            aria-haspopup="true"
            aria-label="Options de la conversation"
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors focus-ring"
            onClick={() => setActionsOpen((open) => !open)}
            ref={triggerRef}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" className="h-[18px] w-[18px]" />
          </button>

          {actionsOpen && (
            <div className="absolute right-0 top-10 z-30 w-56 rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] p-1.5 shadow-[var(--dsw-elevation-panel)]">
              <button
                aria-pressed={activeConversation.isPinned}
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
                onClick={() => {
                  togglePinConversation(activeConversation.id);
                  setActionsOpen(false);
                }}
                type="button"
              >
                <Pin aria-hidden="true" className="h-4 w-4" />
                {activeConversation.isPinned
                  ? "Retirer des épinglées"
                  : "Épingler la conversation"}
              </button>
              <button
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
                onClick={() => {
                  exportConversation(activeConversation.id);
                  setActionsOpen(false);
                }}
                type="button"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Exporter en Markdown
              </button>
              <button
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
                onClick={() => {
                  toggleArchiveConversation(activeConversation.id);
                  setActionsOpen(false);
                }}
                type="button"
              >
                <Archive aria-hidden="true" className="h-4 w-4" />
                {activeConversation.isArchived
                  ? "Désarchiver la conversation"
                  : "Archiver la conversation"}
              </button>
              <button
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] text-[var(--dsw-alias-state-error-primary)] hover:bg-red-500/10 focus-ring"
                onClick={handleDeleteConversation}
                type="button"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Supprimer la conversation
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
