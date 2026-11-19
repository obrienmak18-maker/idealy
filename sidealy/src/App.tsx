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
import { useTranslation } from "./services/i18n";
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

const StudioLayoutSkeleton: React.FC = () => (
  <div className="flex h-screen w-screen overflow-hidden bg-[#08070d] text-white">
    <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-gradient-to-r from-transparent via-[#858cf8] to-transparent animate-pulse" />
    <aside className="hidden md:flex h-full w-[260px] flex-col border-r border-white/5 bg-[#0d0f17] p-3 space-y-4">
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="h-7 w-7 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
      </div>
      <div className="h-9 w-full rounded-xl bg-white/5 animate-pulse" />
      <div className="flex-1 space-y-2 pt-2">
        <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-white/5 animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-white/5 animate-pulse" />
        <div className="h-8 w-full rounded-lg bg-white/5 animate-pulse" />
      </div>
      <div className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
    </aside>
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-12 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-20 rounded-full bg-white/5 animate-pulse" />
          <div className="h-7 w-7 rounded-full bg-white/5 animate-pulse" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <IdealyLogo animated size={44} />
        <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#858cf8]" />
        </div>
        <p className="mt-3 text-xs text-[#7f899b]">
          Restoring your workspace…
        </p>
      </main>
      <footer className="mx-auto w-full max-w-3xl p-4">
        <div className="h-14 w-full rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
      </footer>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { t } = useTranslation();
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
    userWay,
    language,
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
    // between protected pages. Avoid a blocking security screen per click.
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

    const checkAuth = async () => {
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

      if (!user.emailVerified) {
        try {
          await user.reload();
        } catch {}
      }
      if (!user.emailVerified) {
        setActivePage("login");
        return;
      }

      const hasActiveSession =
        typeof window !== "undefined" &&
        localStorage.getItem("idealy_session") === "active";

      if (!hasActiveSession) {
        await createBackendSession(user);
      }

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
        throw new Error(
          language === "fr"
            ? "Le profil Idealy n’a pas pu être vérifié. Réessayez."
            : language === "es"
              ? "No se pudo verificar el perfil de Idealy. Reintentar."
              : "Unable to verify your Idealy workspace. Please retry."
        );
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
    };

    // Bounded timeout to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            language === "fr"
              ? "La vérification de session a expiré. Vérifiez votre connexion et réessayez."
              : language === "es"
                ? "La verificación de sesión ha expirado. Compruebe la conexión y reintente."
                : "Session verification timed out. Check your connection and retry."
          )
        );
      }, 7000);
      return () => clearTimeout(timer);
    });

    Promise.race([checkAuth(), timeoutPromise]).catch((error: unknown) => {
      if (!active) {
        return;
      }
      setAuthGateError(
        error instanceof Error
          ? error.message
          : language === "fr"
            ? "La session Idealy n’a pas pu être vérifiée."
            : language === "es"
              ? "La sesión de Idealy no pudo verificarse."
              : "The Idealy session could not be verified."
      );
      setAuthGateState("error");
    });

    return () => {
      active = false;
    };
  }, [activePage, authGateRetry, language, requiresAuthentication, setActivePage]);

  if (requiresAuthentication && authGateState === "checking") {
    return <StudioLayoutSkeleton />;
  }

  if (requiresAuthentication && authGateState === "error") {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#0b0d14] px-5 py-10 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#191b22] p-8 shadow-2xl sm:p-10">
          <IdealyLogo animated={false} size={40} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            {language === "fr"
              ? "Impossible de vérifier votre espace"
              : language === "es"
                ? "No se pudo verificar su espacio"
                : "Unable to verify your workspace"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#9ca6b8]">
            {authGateError}
          </p>
          <button
            className="mt-7 h-12 w-full rounded-xl bg-[#777ff2] text-sm font-semibold text-white transition hover:bg-[#858cf8]"
            onClick={() => setAuthGateRetry((value) => value + 1)}
            type="button"
          >
            {language === "fr"
              ? "Réessayer"
              : language === "es"
                ? "Reintentar"
                : "Try again"}
          </button>
          <button
            className="mt-4 w-full text-sm font-medium text-[#aeb6c7] transition hover:text-white"
            onClick={() => setActivePage("login")}
            type="button"
          >
            {language === "fr"
              ? "Retour à la connexion"
              : language === "es"
                ? "Volver a inicio de sesión"
                : "Back to sign in"}
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
  if (activePage === "privacy" || activePage === "terms" || activePage === "eula") {
    return (
      <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-bg-base">
        <CookieNotice />
        <LegalPage page={activePage} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-main font-sans selection:bg-brand-primary/20">
      <a className="idealy-skip-link" href="#main-content">
        {t("common.skipToMain")}
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
        wayName={userWay}
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
