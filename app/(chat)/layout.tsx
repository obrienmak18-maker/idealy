import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Script from "next/script";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/chat/app-sidebar";
import { DataStreamProvider } from "@/components/chat/data-stream-provider";
import { ChatShell } from "@/components/chat/shell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ActiveChatProvider } from "@/hooks/use-active-chat";
import { getMyIdealyOnboardingStatus } from "@/lib/idealy/backend-adapter";
import { auth } from "../(auth)/auth";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />
      <DataStreamProvider>
        <Suspense fallback={<div className="flex h-dvh bg-sidebar" />}>
          <SidebarShell>{children}</SidebarShell>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

async function SidebarShell({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";
  let onboardingRequired = false;
  let onboardingStatusUnavailable = false;
  if (
    process.env.DEMO_MODE !== "true" &&
    session?.user.type === "regular"
  ) {
    try {
      const requestHeaders = await headers();
      const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
      const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
      const onboarding = await getMyIdealyOnboardingStatus({
        request: new Request(`${protocol}://${host}/api/idealy/profile/onboarding`, {
          headers: requestHeaders,
        }),
      });
      onboardingRequired = !onboarding.onboardingCompleted;
    } catch (error) {
      onboardingStatusUnavailable = true;
      console.error(
        "Idealy onboarding status could not be verified:",
        (error as Error)?.message || "unknown",
      );
    }
  }

  if (onboardingRequired) redirect("/onboarding");

  if (onboardingStatusUnavailable) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-md rounded-2xl border border-border/60 bg-card p-8 text-center shadow-[var(--shadow-float)]">
          <h1 className="text-lg font-semibold">Impossible de vérifier votre profil</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Idealy ne peut pas confirmer l’état de votre onboarding pour le moment.
            Aucun accès au workspace n’est accordé tant que cette vérification n’a pas réussi.
          </p>
          <a
            href="/onboarding"
            className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Réessayer
          </a>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-[var(--shadow-float)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Aller au contenu principal
      </a>
      <ActiveChatProvider>
        <AppSidebar user={session?.user} />
        <SidebarInset>
          <Toaster
            position="top-center"
            theme="system"
            toastOptions={{
              className:
                "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
            }}
          />
          {children}
        </SidebarInset>
      </ActiveChatProvider>
    </SidebarProvider>
  );
}
