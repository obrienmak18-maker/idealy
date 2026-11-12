import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthActionPage } from "./components/auth/AuthActionPage";
import { AuthPage } from "./components/auth/AuthPage";
import { OnboardingPage } from "./components/auth/OnboardingPage";
import { IdealyLogo } from "./components/branding/IdealyLogo";
import { ConnectorsPage } from "./components/ConnectorsPage";
import { Composer } from "./components/chat/Composer";
import { LiveVoiceDialog } from "./components/chat/LiveVoiceDialog";
import { MessageList } from "./components/chat/MessageList";
import { CookieNotice } from "./components/cookies/CookieNotice";
import { CreditAlert } from "./components/credits/CreditAlert";
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
import { PricingPage } from "./components/pages/PricingPage";
import { ProductInfoPage } from "./components/pages/ProductInfoPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { WelcomePage } from "./components/pages/WelcomePage";
import { ClarifyingQuestionsCard } from "./components/studio/clarifying-questions-card";
import { NotificationBanner } from "./components/studio/notification-banner";
import { AppProvider, useApp } from "./context/AppContext";
import { hasConversationWorkspace } from "./services/conversationWorkspace";
import {
  createBackendSession,
  ensureFirebaseConfigured,
  getBearerToken,
  getFirebaseAuth,
} from "./services/firebase";

const PROTECTED_PAGES = new Set([
  "chat",
  "connectors",
  "library",
  "agents",
  "settings",
  "plugins",
  "onboarding",
]);

const AppContent: React.FC = () => {
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const handleCloseLiveVoice = useCallback(() => setIsLiveVoiceOpen(false), []);

  useEffect(() => {
    const handleOpenLiveVoice = () => setIsLiveVoiceOpen(true);
    window.addEventListener("idealy:open-live-voice", handleOpenLiveVoice);
    return () =>
      window.removeEventListener("idealy:open-live-voice", handleOpenLiveVoice);
  }, []);

  const {
    activeConversation,
    activePage,
    activeMessages,
    artifacts,
    setActivePage,
  } = useApp();
  const hasActiveWorkspace = hasConversationWorkspace(
    activeMessages,
    artifacts,
    activeConversation?.id
  );
  const requiresAuthentication = PROTECTED_PAGES.has(activePage);
  const [authGateState, setAuthGateState] = useState<
    "checking" | "ready" | "error"
  >("checking");
  const [authGateError, setAuthGateError] = useState<string | null>(null);
  const [authGateRetry, setAuthGateRetry] = useState(0);
  const verifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    void authGateRetry;
    if (!requiresAuthentication) {
      setAuthGateState("ready");
      setAuthGateError(null);
      return;
    }

    // A completed verification remains valid while the same user navigates
    // between protected Vite pages. Avoid a blocking security screen per click.
    let currentUserId: string | null = null;
    try {
      currentUserId = getFirebaseAuth().currentUser?.uid ?? null;
    } catch {
      currentUserId = null;
    }
    if (currentUserId && verifiedUserIdRef.current === currentUserId) {
      setAuthGateState("ready");
      setAuthGateError(null);
      return;
    }
    if (!currentUserId) {
      verifiedUserIdRef.current = null;
    }

    let active = true;
    setAuthGateState("checking");
    setAuthGateError(null);

    void (async () => {
      const configured = await ensureFirebaseConfigured();
      if (!active) {
        return;
      }
      if (!configured) {
        setActivePage("login");
        return;
      }

      const firebaseAuth = getFirebaseAuth();
      await firebaseAuth.authStateReady();
      if (!active) {
        return;
      }

      const user = firebaseAuth.currentUser;
      if (!user) {
        setActivePage("login");
        return;
      }

      await user.reload();
      if (!user.emailVerified) {
        setActivePage("login");
        return;
      }

      await createBackendSession(user);
      const bearer = await getBearerToken();
      if (!bearer) {
        setActivePage("login");
        return;
      }

      const response = await fetch("/api/idealy/profile/onboarding", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!active) {
        return;
      }
      if (response.status === 401) {
        setActivePage("login");
        return;
      }
      if (!response.ok) {
        throw new Error("Le profil Idealy n’a pas pu être vérifié. Réessayez.");
      }

      const profile = (await response.json()) as {
        onboardingCompleted?: boolean;
      };
      verifiedUserIdRef.current = user.uid;
      if (profile.onboardingCompleted !== true && activePage !== "onboarding") {
        setActivePage("onboarding");
        return;
      }
      if (profile.onboardingCompleted === true && activePage === "onboarding") {
        setActivePage("chat");
        return;
      }

      setAuthGateState("ready");
    })().catch((error: unknown) => {
      if (!active) {
        return;
      }
      setAuthGateError(
        error instanceof Error
          ? error.message
          : "La session Idealy n’a pas pu être vérifiée."
      );
      setAuthGateState("error");
    });

    return () => {
      active = false;
    };
  }, [activePage, authGateRetry, requiresAuthentication, setActivePage]);

  if (requiresAuthentication && authGateState === "checking") {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#0b0d14] px-5 text-white">
        <div className="flex flex-col items-center gap-5 text-center">
          <IdealyLogo animated size={48} />
          <div className="h-1 w-36 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#858cf8]" />
          </div>
          <p className="text-sm text-[#9ca6b8]">
            Vérification sécurisée de votre espace…
          </p>
        </div>
      </main>
    );
  }

  if (requiresAuthentication && authGateState === "error") {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#0b0d14] px-5 py-10 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#191b22] p-8 shadow-2xl sm:p-10">
          <IdealyLogo animated={false} size={40} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            Impossible de vérifier votre espace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#9ca6b8]">
            {authGateError}
          </p>
          <button
            className="mt-7 h-12 w-full rounded-xl bg-[#777ff2] text-sm font-semibold text-white transition hover:bg-[#858cf8]"
            onClick={() => setAuthGateRetry((value) => value + 1)}
            type="button"
          >
            Réessayer
          </button>
          <button
            className="mt-4 w-full text-sm font-medium text-[#aeb6c7] transition hover:text-white"
            onClick={() => setActivePage("login")}
            type="button"
          >
            Retour à la connexion
          </button>
        </section>
      </main>
    );
  }

  // Pages autonomes (hors layout de travail, sans sidebar rétractable) avec défilement garanti
  if (activePage === "welcome") {
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#08070d]">
        <CookieNotice />
        <WelcomePage />
      </div>
    );
  }
  if (activePage === "pricing") {
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-[#08070d]">
        <CookieNotice />
        <PricingPage />
      </div>
    );
  }
  if (activePage === "login") {
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <CookieNotice />
        <AuthPage />
      </div>
    );
  }
  if (activePage === "onboarding") {
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <CookieNotice />
        <OnboardingPage />
      </div>
    );
  }
  if (activePage === "authAction") {
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <CookieNotice />
        <AuthActionPage />
      </div>
    );
  }

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
            <main
              className="flex-1 flex flex-col overflow-hidden relative"
              id="main-content"
            >
              <MessageList />
              <NotificationBanner />
              <ClarifyingQuestionsCard />
              {activeMessages.length > 0 && <Composer />}
            </main>
          </>
        )}
      </div>

      {/* Sidecar Panel for Artifacts / Deliverables */}
      {activePage === "chat" && hasActiveWorkspace && (
        <SidecarPanel key={activeConversation?.id ?? "workspace"} />
      )}

      {/* Modals & Dialogues */}
      <CookieNotice />
      <CommandPalette />
      <ConfirmModal />
      <SpaceModal />
      <SettingsModal />
      <LiveVoiceDialog
        isOpen={isLiveVoiceOpen}
        onClose={handleCloseLiveVoice}
        wayName={localStorage.getItem("idealy_user_way") || "Ninja"}
      />
    </div>
  );
};

export const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
