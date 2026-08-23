import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Code2,
  Database,
  EyeOff,
  GitMerge,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Star,
} from "lucide-react";

const chatLines = [
  "Mode clair réellement différent, plus lumineux et",
  "légèrement chaud.",
  "Orange mieux harmonisé avec le violet.",
  "Bouton de bascule clair/sombre ajouté dans la",
  "navigation.",
  "Animation respirante discrète autour du champ",
  "principal.",
  "Respect de prefers-reduced-motion.",
  "Tokens CSS invalides (red) corrigés.",
  "Typecheck validé.",
  "Rendu vérifié en mode sombre et clair dans le",
  "navigateur.",
];

export default function ReferenceLayoutPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#fafafa] text-[#171717]">
      <div className="flex h-dvh min-w-[980px] flex-col">
        <header className="flex h-11 shrink-0 items-center border-b border-[#e7e7e7] bg-white px-3 text-[#666]">
          <div className="flex w-[31%] min-w-[360px] items-center gap-4 pr-4">
            <button
              aria-label="Panel"
              className="rounded-md p-1.5 text-[#606060]"
              type="button"
            >
              <span className="block h-4 w-4 rounded-[4px] border-2 border-[#777]" />
            </button>
            <Star className="size-[17px]" />
            <span className="text-[14px] font-medium text-[#262626]">
              UI/UX analysis
            </span>
            <ChevronDown className="size-3.5" />
          </div>
          <div className="flex flex-1 items-center justify-between gap-3">
            <nav className="flex items-center gap-1 text-[#5d5d5d]">
              <button
                aria-label="Hide preview"
                className="rounded-md p-2"
                type="button"
              >
                <EyeOff className="size-[17px]" />
              </button>
              <button
                aria-label="Design"
                className="rounded-md p-2"
                type="button"
              >
                <Sparkles className="size-[17px]" />
              </button>
              <button
                aria-label="Code"
                className="rounded-md p-2"
                type="button"
              >
                <Code2 className="size-[17px]" />
              </button>
              <button
                aria-label="Database"
                className="rounded-md p-2"
                type="button"
              >
                <Database className="size-[17px]" />
              </button>
            </nav>
            <div className="flex h-8 flex-1 items-center justify-between border-x border-[#dedede] px-2 text-[#777]">
              <ArrowLeft className="size-3.5" />
              <ArrowRight className="size-3.5" />
              <Smartphone className="size-3.5 text-[#333]" />
              <span className="text-xs text-[#777]">/</span>
              <RefreshCw className="size-3.5" />
              <ChevronDown className="size-3.5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2 font-medium text-[#555]">Latest</span>
              <button
                aria-label="More"
                className="rounded-md p-2"
                type="button"
              >
                <MoreHorizontal className="size-[17px]" />
              </button>
              <button
                aria-label="Share"
                className="rounded-md p-2"
                type="button"
              >
                <Share2 className="size-[17px]" />
              </button>
              <span className="flex items-center gap-1 px-2 text-[#555]">
                <span className="size-2 rounded-full bg-[#eb5757]" />
                Site
              </span>
              <button
                aria-label="Merge pull request"
                className="flex items-center gap-2 rounded-lg bg-[#171717] px-3 py-2 font-medium text-white"
                type="button"
              >
                <GitMerge className="size-3.5" />
                Merge PR
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex w-[31%] min-w-[360px] flex-col border-r border-[#e7e7e7] bg-white">
            <div className="min-h-0 flex-1 overflow-hidden px-6 py-2">
              <div className="space-y-2 text-[16px] leading-7 text-[#252525]">
                {chatLines.map((line, index) => (
                  <p
                    className={
                      index === 0 ||
                      index === 2 ||
                      index === 4 ||
                      index === 6 ||
                      index === 8 ||
                      index === 9 ||
                      index === 10
                        ? "relative pl-5"
                        : "pl-5"
                    }
                    key={`${line}-${index}`}
                  >
                    {(index === 0 ||
                      index === 2 ||
                      index === 4 ||
                      index === 6 ||
                      index === 8 ||
                      index === 9 ||
                      index === 10) && (
                      <span className="absolute left-0 top-3 size-1.5 rounded-full bg-[#d8d8d8]" />
                    )}
                    {line}
                  </p>
                ))}
                <p className="mt-4 text-[16px] leading-7">
                  Le bouton de thème fonctionne sur desktop ; la prochaine passe
                  pourra ajouter sa présence dans le menu mobile et mémoriser le
                  choix de l’utilisateur.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-sm text-[#777]">
                <Sparkles className="size-4" />
                Worked for 2m 22s <span className="ml-auto">◷ 3:29 AM</span>
                <MoreHorizontal className="size-4" />
              </div>
            </div>
            <div className="border-t border-[#e2e2e2] bg-[#fafafa] p-2">
              <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e2e2e2] bg-white px-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <Plus className="size-5 text-[#666]" />
                <span className="text-sm text-[#222]">ok</span>
                <span className="ml-auto flex items-center gap-3 text-[#aaa]">
                  <CircleHelp className="size-[17px]" />
                  <Paperclip className="size-[17px]" />
                  <ArrowDown className="size-[17px]" />
                  <Send className="size-[17px]" />
                </span>
              </div>
              <div className="flex h-10 items-center gap-2 px-1 text-sm text-[#777]">
                <AlertTriangle className="size-[17px]" />
                <span>0 messages left today.</span>
                <span className="ml-auto font-medium text-[#1477c9]">
                  Upgrade Plan
                </span>
              </div>
            </div>
          </section>

          <section className="flex min-w-0 flex-1 items-center justify-center bg-white">
            <div className="flex max-w-[420px] flex-col items-center text-center text-[#777]">
              <div className="mb-5 text-2xl font-semibold tracking-[-0.12em] text-[#888]">
                v0
              </div>
              <h1 className="text-[18px] font-semibold text-[#171717]">
                No Dev Script Found
              </h1>
              <p className="mt-4 text-[16px] leading-7">
                This project doesn&apos;t have a dev script in package.json.
                <br />
                You can still ask v0 to make changes. Once you&apos;re
                <br />
                ready, open a PR to create a preview deployment.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
