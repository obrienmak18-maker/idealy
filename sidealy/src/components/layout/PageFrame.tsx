import { ArrowLeft, Menu } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

export const PageFrame: React.FC<{
  children: React.ReactNode;
  label: string;
}> = ({ children, label }) => {
  const { setIsMobileDrawerOpen, setActivePage } = useApp();

  return (
    <div className="idealy-page-shell flex flex-col h-full w-full overflow-hidden bg-bg-base text-text-main">
      <header className="h-12 shrink-0 border-b border-border-subtle/60 px-4 md:px-6 flex items-center justify-between bg-bg-base/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            aria-label="Ouvrir la navigation"
            className="grid h-8 w-8 place-items-center rounded-xl text-text-muted hover:text-text-main hover:bg-bg-subtle transition-colors focus-ring md:hidden"
            onClick={() => setIsMobileDrawerOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" className="h-4.5 w-4.5" />
          </button>

          <button
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main px-2 py-1 rounded-lg hover:bg-bg-subtle transition-colors"
            onClick={() => setActivePage("chat")}
            title="Revenir à la discussion"
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Discussion</span>
          </button>

          <span className="text-border-subtle">|</span>

          <h2 className="text-sm font-semibold text-text-main tracking-tight">
            {label}
          </h2>
        </div>
      </header>
      <main className="idealy-page flex-1 overflow-y-auto" id="main-content">
        {children}
      </main>
    </div>
  );
};
