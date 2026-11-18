import { ChevronDown, Download, FileArchive, Menu, PanelRight, Pencil, Pin, SquarePen, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { hasConversationWorkspace } from "../../services/conversationWorkspace";

export const Header: React.FC = () => {
  const {
    setIsMobileDrawerOpen,
    activeConversation,
    activeMessages,
    artifacts,
    createConversation,
    renameConversation,
    togglePinConversation,
    exportConversation,
    deleteConversation,
    openConfirmModal,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const hasMessages = activeMessages.length > 0;
  const hasWorkspace = hasConversationWorkspace(
    activeMessages,
    artifacts,
    activeConversation?.id,
  );

  const openWorkspace = () => {
    window.dispatchEvent(new Event("idealy:open-workspace"));
  };

  const handleStartRename = () => {
    if (!activeConversation) return;
    setRenameTitle(activeConversation.title);
    setIsRenaming(true);
    setMenuOpen(false);
  };

  const handleSaveRename = () => {
    if (activeConversation && renameTitle.trim()) {
      renameConversation(activeConversation.id, renameTitle.trim());
    }
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (!activeConversation) return;
    setMenuOpen(false);
    openConfirmModal({
      title: "Supprimer la conversation",
      message: "Êtes-vous sûr de vouloir supprimer cette discussion ? Cette action est irréversible.",
      confirmLabel: "Supprimer",
      isDestructive: true,
      onConfirm: () => deleteConversation(activeConversation.id),
    });
  };

  return (
    <header
      className={`relative z-10 flex h-11 shrink-0 items-center justify-between px-3 transition-all duration-300 md:px-5 ${
        hasMessages
          ? "border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)]/80 backdrop-blur-md"
          : "bg-transparent"
      }`}
      data-window-drag
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label="Ouvrir le menu de navigation"
          className="grid h-8 w-8 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring md:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="h-4.5 w-4.5" />
        </button>

        {hasMessages && activeConversation && (
          <div className="relative min-w-0" ref={menuRef}>
            {isRenaming ? (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename();
                    if (e.key === "Escape") setIsRenaming(false);
                  }}
                  autoFocus
                  className="rounded-lg border border-[var(--idealy-indigo)] bg-[var(--dsw-alias-bg-layer-2)] px-2 py-0.5 text-xs font-semibold text-[var(--dsw-alias-label-primary)] outline-none sm:w-72"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="group flex max-w-[240px] sm:max-w-md items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
                title="Options de la discussion"
              >
                <span className="truncate font-semibold text-[var(--dsw-alias-label-primary)]">
                  {activeConversation.title}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-[var(--dsw-alias-label-tertiary)] group-hover:text-[var(--dsw-alias-label-primary)] transition-colors" />
              </button>
            )}

            {menuOpen && (
              <div
                role="menu"
                aria-label="Actions de la conversation"
                className="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-1 shadow-xl backdrop-blur-md animate-scale-in"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleStartRename}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                  <span>Renommer</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    togglePinConversation(activeConversation.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                >
                  <Pin className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                  <span>{activeConversation.isPinned ? "Désépingler" : "Épingler"}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    exportConversation(activeConversation.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                  <span>Exporter (JSON)</span>
                </button>
                {hasWorkspace && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      window.dispatchEvent(new Event("idealy:export-zip"));
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                  >
                    <FileArchive className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                    <span>Télécharger le ZIP</span>
                  </button>
                )}
                <div className="my-1 border-t border-[var(--dsw-alias-border-l1)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Supprimer la discussion</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {hasWorkspace && (
          <button
            aria-label="Aperçu"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 hover:bg-violet-500/20 transition-colors focus-ring xl:hidden"
            onClick={openWorkspace}
            title="Aperçu"
            type="button"
          >
            <PanelRight aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Aperçu</span>
          </button>
        )}
        <button
          aria-label="Nouvelle conversation"
          className="grid h-8 w-8 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring md:hidden"
          onClick={() => createConversation()}
          type="button"
        >
          <SquarePen aria-hidden="true" className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
};
