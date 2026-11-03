import { Menu } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

export const PageFrame: React.FC<{
  children: React.ReactNode;
  label: string;
}> = ({ children, label }) => {
  const { setIsMobileDrawerOpen } = useApp();

  return (
    <div className="idealy-page-shell">
      <header className="idealy-page-topbar">
        <button
          aria-label="Ouvrir la navigation"
          className="idealy-page-menu focus-ring"
          onClick={() => setIsMobileDrawerOpen(true)}
          type="button"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <p className="idealy-page-breadcrumb">
          <span>Idealy</span>
          <span aria-hidden="true" className="idealy-page-breadcrumb__separator">
            /
          </span>
          <span>{label}</span>
        </p>
      </header>
      <main className="idealy-page" id="main-content">
        {children}
      </main>
    </div>
  );
};
