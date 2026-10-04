import { IdealyLogo } from "@/components/branding/idealy-logo";

export function IdealyLoading({
  label = "Préparation de votre espace…",
}: {
  label?: string;
}) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="idealy-app-background flex min-h-dvh items-center justify-center p-6"
      role="status"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-5 rounded-3xl border border-border/50 bg-card/65 px-8 py-10 text-center shadow-[var(--shadow-float)] backdrop-blur-xl">
        <IdealyLogo animated size={42} />
        <div className="w-full">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <div
            aria-hidden="true"
            className="idealy-loading-track mt-4 h-1 overflow-hidden rounded-full bg-muted"
          >
            <span className="idealy-loading-indicator block h-full w-1/3 rounded-full bg-gradient-to-r from-sky-500 via-teal-400 to-violet-500" />
          </div>
        </div>
      </div>
    </main>
  );
}
