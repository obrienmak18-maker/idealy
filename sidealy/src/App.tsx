import type React from "react";
import { ConnectorsPage } from "./components/ConnectorsPage";
import { Composer } from "./components/chat/Composer";
import { MessageList } from "./components/chat/MessageList";
import { Header } from "./components/layout/Header";
import { MobileDrawer } from "./components/layout/MobileDrawer";
import { Sidebar } from "./components/layout/Sidebar";
import { SidecarPanel } from "./components/layout/SidecarPanel";
import { CommandPalette } from "./components/modals/CommandPalette";
import { ConfirmModal } from "./components/modals/ConfirmModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { SpaceModal } from "./components/modals/SpaceModal";
import { AgentsPage } from "./components/pages/AgentsPage";
import { LegalPage } from "./components/pages/LegalPage";
import { LibraryPage } from "./components/pages/LibraryPage";
import { WelcomePage } from "./components/pages/WelcomePage";
import { PricingPage } from "./components/pages/PricingPage";
import { ProductInfoPage } from "./components/pages/ProductInfoPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { AuthActionPage } from "./components/auth/AuthActionPage";
import { AuthPage } from "./components/auth/AuthPage";
import { OnboardingPage } from "./components/auth/OnboardingPage";
import { CreditAlert } from "./components/credits/CreditAlert";
import { AppProvider, useApp } from "./context/AppContext";

const AppContent: React.FC = () => {
  const { activeArtifact, activePage, activeMessages } = useApp();

  // Pages autonomes (hors layout de travail, sans sidebar rétractable) avec défilement garanti
  if (activePage === "welcome")
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#08070d]">
        <WelcomePage />
      </div>
    );
  if (activePage === "pricing")
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#08070d]">
        <PricingPage />
      </div>
    );
  if (activePage === "login")
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <AuthPage />
      </div>
    );
  if (activePage === "onboarding")
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <OnboardingPage />
      </div>
    );
  if (activePage === "authAction")
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <AuthActionPage />
      </div>
    );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-main font-sans selection:bg-brand-primary/20">
      <a className="idealy-skip-link" href="#main-content">
        Passer au contenu principal
      </a>
      {/* Desktop Sidebar Navigation */}
      <CreditAlert />
      <Sidebar />

      {/* Mobile Drawer (Accessible on mobile) */}
      <MobileDrawer />

      {/* Main Conversation & Working Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {activePage === "connectors" || activePage === "plugins" ? (
          <ConnectorsPage />
        ) : activePage === "agents" ? (
          <AgentsPage />
        ) : activePage === "privacy" ||
          activePage === "terms" ||
          activePage === "eula" ? (
          <LegalPage page={activePage} />
        ) : activePage === "library" ? (
          <LibraryPage />
        ) : activePage === "settings" ? (
          <SettingsPage />
        ) : activePage === "about" ||
          activePage === "docs" ||
          activePage === "support" ? (
          <ProductInfoPage page={activePage} />
        ) : (
          <>
            <Header />
            <main className="flex-1 flex flex-col overflow-hidden relative" id="main-content">
              <MessageList />
              {activeMessages.length > 0 && <Composer />}
            </main>
          </>
        )}
      </div>

      {/* Sidecar Panel for Artifacts / Deliverables */}
      {activePage === "chat" && activeArtifact && <SidecarPanel />}

      {/* Modals & Dialogues */}
      <CommandPalette />
      <ConfirmModal />
      <SpaceModal />
      <SettingsModal />
    </div>
  );
};

export const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
