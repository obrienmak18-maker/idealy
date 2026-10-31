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
import { LibraryPage } from "./components/pages/LibraryPage";
import { PricingPage } from "./components/pages/PricingPage";
import { ProductInfoPage } from "./components/pages/ProductInfoPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { AppProvider, useApp } from "./context/AppContext";

const AppContent: React.FC = () => {
  const { activeArtifact, activePage } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-main font-sans selection:bg-brand-primary/20">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Mobile Drawer (Accessible on mobile) */}
      <MobileDrawer />

      {/* Main Conversation & Working Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {activePage === "connectors" ? (
          <ConnectorsPage />
        ) : activePage === "library" ? (
          <LibraryPage />
        ) : activePage === "settings" ? (
          <SettingsPage />
        ) : activePage === "pricing" ? (
          <PricingPage />
        ) : activePage === "welcome" ||
          activePage === "about" ||
          activePage === "docs" ||
          activePage === "support" ? (
          <ProductInfoPage page={activePage} />
        ) : (
          <>
            <Header />
            <main className="flex-1 flex flex-col overflow-hidden relative">
              <MessageList />
              <Composer />
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
