import { Menu } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

export const PageFrame: React.FC<{
  children: React.ReactNode;
  label?: string;
}> = ({ children }) => {
  const { setIsMobileDrawerOpen } = useApp();

  return (
    <div className="idealy-page-shell flex flex-col h-full w-full overflow-hidden bg-bg-base text-text-main relative">
      {/* Bouton de tiroir mobile discret sans top bar robotique */}
      <button
        aria-label="Ouvrir la navigation"
        className="fixed left-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l2)] text-text-muted hover:text-text-main shadow-xs md:hidden focus-ring"
        onClick={() => setIsMobileDrawerOpen(true)}
        type="button"
      >
        <Menu aria-hidden="true" className="h-4.5 w-4.5" />
      </button>

      <main className="idealy-page flex-1 overflow-y-auto" id="main-content">
        {children}
      </main>
    </div>
  );
};
