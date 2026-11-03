import { Menu, SquarePen, Sparkles } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

export const Header: React.FC = () => {
  const { setIsMobileDrawerOpen, activeConversation, activeMessages, createConversation } = useApp();

  const hasMessages = activeMessages.length > 0;

  return (
    <header
      className={`relative z-10 flex shrink-0 items-center justify-between px-3 md:px-5 transition-all duration-300 ${
        hasMessages
          ? "h-12 border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)]/80 backdrop-blur-md"
          : "h-12 bg-transparent"
      }`}
      data-window-drag
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          aria-label="Ouvrir le menu de navigation"
          className="grid h-8 w-8 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring md:hidden"
          onClick={() => setIsMobileDrawerOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="h-4.5 w-4.5" />
        </button>

        {hasMessages && activeConversation && (
          <div className="flex items-center gap-2 min-w-0 text-xs animate-fade-in">
            <span className="font-semibold text-[var(--dsw-alias-label-primary)] truncate max-w-[240px] sm:max-w-md">
              {activeConversation.title}
            </span>
          </div>
        )}
      </div>

      {!hasMessages && (
        <span className="absolute left-1/2 -translate-x-1/2 text-[15px] font-medium tracking-tight text-[var(--dsw-alias-label-primary)] md:hidden">
          Idealy
        </span>
      )}

      <button
        aria-label="Nouvelle conversation"
        className="grid h-8 w-8 place-items-center rounded-xl text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring md:hidden"
        onClick={() => createConversation()}
        type="button"
      >
        <SquarePen aria-hidden="true" className="h-4.5 w-4.5" />
      </button>

      {hasMessages && (
        <div className="hidden items-center gap-2 md:flex">
          <span className="idealy-badge idealy-badge--teal">
            <Sparkles className="h-2.5 w-2.5" />
            Escouade Active
          </span>
        </div>
      )}
    </header>
  );
};
