import type React from "react";

export const authField =
  "h-12 w-full rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] px-4 text-[15px] text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-tertiary)] focus-ring";
export const authPrimary =
  "focus-ring h-12 w-full rounded-xl bg-[var(--dsw-alias-label-primary)] text-[15px] font-medium text-[var(--dsw-alias-bg-layer-1)] transition-opacity hover:opacity-90 disabled:opacity-50";
export const authSecondary =
  "focus-ring flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--dsw-alias-border-l2)] text-[15px] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] disabled:opacity-50";
export const authLink =
  "focus-ring rounded text-[13px] text-[var(--dsw-alias-label-secondary)] underline-offset-4 hover:text-[var(--dsw-alias-label-primary)] hover:underline";

export const AuthShell: React.FC<{
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  width?: number;
}> = ({ title, subtitle, children, width = 380 }) => (
  <main className="flex min-h-[100dvh] w-screen items-center justify-center bg-bg-base px-5 py-8 text-text-main">
    <div className="w-full" style={{ maxWidth: width }}>
      <p className="mb-6 text-[15px] font-medium tracking-tight text-[var(--dsw-alias-label-secondary)]">Idealy</p>
      <h1 className="text-[26px] font-medium tracking-[-0.02em]">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] leading-snug text-[var(--dsw-alias-label-secondary)]">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  </main>
);

export const Message: React.FC<{ error?: string | null; notice?: string | null }> = ({ error, notice }) => (
  <>
    {error && (
      <p className="text-[13px] text-red-400" role="alert">
        {error}
      </p>
    )}
    {notice && (
      <p className="text-[13px] text-[var(--dsw-alias-label-secondary)]" role="status">
        {notice}
      </p>
    )}
  </>
);

/** Après authentification : onboarding si le profil n'est pas complet, sinon l'espace de travail. */
export async function routeAfterAuth(): Promise<void> {
  try {
    const res = await fetch("/api/idealy/profile/onboarding", { credentials: "include" });
    if (res.ok) {
      const status = (await res.json()) as { onboardingCompleted?: boolean };
      if (status.onboardingCompleted === false) {
        window.location.replace("/onboarding");
        return;
      }
    }
  } catch {
    /* backend indisponible : on ouvre l'espace de travail */
  }
  window.location.replace("/");
}
