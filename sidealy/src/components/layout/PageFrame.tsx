import { Menu } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

export const PageFrame: React.FC<{
  children: React.ReactNode;
  label?: string;
}> = ({ children }) => {
  const { setIsMobileDrawerOpen } = useApp();

  return (
    <div className="idealy-page-shell">
      <button
        aria-label="Ouvrir la navigation"
        className="idealy-page-menu focus-ring fixed left-3 top-3 z-30 md:hidden"
        onClick={() => setIsMobileDrawerOpen(true)}
        type="button"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>
      <main className="idealy-page" id="main-content">
        {children}
      </main>
    </div>
  );
};
