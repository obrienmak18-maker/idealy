import { Menu, PanelRight, SquarePen } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

export const Header: React.FC = () => {
  const {
    setIsMobileDrawerOpen,
    activeConversation,
    activeMessages,
    createConversation,
  } = useApp();

  const hasMessages = activeMessages.length > 0;

  const openWorkspace = () => {
    window.dispatchEvent(new Event("idealy:open-workspace"));
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
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Ouvrir le menu de navigation"
          className="grid h-8 w-8 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring md:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="h-4.5 w-4.5" />
        </button>

        {hasMessages && activeConversation && (
          <div className="flex min-w-0 items-center gap-2 text-xs animate-fade-in">
            <span className="max-w-[240px] truncate font-semibold text-[var(--dsw-alias-label-primary)] sm:max-w-md">
              {activeConversation.title}
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          aria-label="Ouvrir l’espace de prévisualisation"
          className="grid h-8 w-8 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring xl:hidden"
          onClick={openWorkspace}
          title="Ouvrir le workspace"
          type="button"
        >
          <PanelRight aria-hidden="true" className="h-4 w-4" />
        </button>
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
