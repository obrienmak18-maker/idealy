import { IdealyLogo } from "@/components/branding/idealy-logo";

export function IdealyLoading({
  label,
}: {
  label?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md transition-opacity duration-300"
      role="status"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Floating translucent star — no box, no rigid square borders */}
        <div className="relative flex size-14 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 blur-xl animate-pulse" />
          <IdealyLogo animated size={36} />
        </div>
        {label ? (
          <p className="text-xs font-medium tracking-wide text-muted-foreground/80 animate-pulse">
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}
