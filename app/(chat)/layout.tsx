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

  if (
    process.env.DEMO_MODE !== "true" &&
    session?.user.type === "regular" &&
    cookieStore.get("idealy_onboarding_completed")?.value !== "true"
  ) {
    try {
      const requestHeaders = await headers();
      const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "idealy.local";
      const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
      const onboarding = await getMyIdealyOnboardingStatus({
        request: new Request(`${protocol}://${host}/api/idealy/profile/onboarding`, {
          headers: requestHeaders,
        }),
      });
      onboardingRequired = onboarding.profileExists && !onboarding.onboardingCompleted;
    } catch (error) {
      // An unavailable profile service must not lock an existing workspace.
      console.warn("Unable to evaluate Idealy onboarding gate:", (error as Error)?.message || error);
    }
  }

  if (onboardingRequired) redirect("/onboarding");

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
