import type React from "react";
import { IdealyLogo } from "../branding/IdealyLogo";

export const authField =
  "h-14 w-full rounded-2xl border border-white/[0.10] bg-[#242730] px-4 text-[16px] text-white placeholder:text-[#8d97a9] outline-none transition-all focus:border-[#858bf8] focus:ring-4 focus:ring-[#7b83f5]/10";
export const authPrimary =
  "focus-ring flex min-h-16 w-full items-center justify-center rounded-2xl bg-[#777ff2] px-5 text-[16px] font-semibold text-white shadow-[0_12px_32px_-12px_rgba(113,123,242,0.65)] transition-all duration-200 hover:bg-[#858cf8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
export const authSecondary =
  "focus-ring flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.11] bg-[#22252e] px-5 text-[15px] font-medium text-white transition-colors hover:border-white/20 hover:bg-[#292d37] disabled:opacity-50";
export const authLink =
  "focus-ring rounded text-[13px] text-[#aeb6c7] underline-offset-4 transition-colors hover:text-white hover:underline";

export const AuthShell: React.FC<{
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  width?: number;
  ambient?: string;
}> = ({ title, subtitle, children, width = 620 }) => (
  <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-[#0b0d14] px-4 py-10 font-sans text-zinc-100 antialiased sm:px-6">
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(55% 55% at 50% 35%, rgba(104, 116, 245, 0.14), rgba(139, 92, 246, 0.07) 48%, transparent 78%)",
        filter: "blur(60px)",
      }}
    />
    <section
      className="w-full rounded-[30px] border border-white/[0.10] bg-[#191b22]/95 p-7 shadow-[0_28px_90px_-38px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-10 lg:p-12"
      style={{ maxWidth: width }}
    >
      <div className="mb-9 space-y-7 text-left">
        <a
          aria-label="Accueil Idealy"
          className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#858bf8]"
          href="/welcome"
        >
          <IdealyLogo animated={false} size={40} />
        </a>
        <div className="space-y-3">
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-[40px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-[480px] text-base leading-relaxed text-[#9ca6b8] sm:text-[18px]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  </main>
);

export const Message: React.FC<{ error?: string | null; notice?: string | null }> = ({ error, notice }) => (
  <>
    {error ? (
      <div aria-live="polite" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] leading-relaxed text-red-300" role="alert">
        {error}
      </div>
    ) : null}
    {notice ? (
      <div className="rounded-xl border border-violet-400/25 bg-violet-400/10 p-3 text-[13px] leading-relaxed text-violet-200" role="status">
        {notice}
      </div>
    ) : null}
  </>
);
