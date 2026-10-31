import {
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

export interface ReasoningBlockProps {
  duration?: number;
  isStreaming?: boolean;
  reasoning: string;
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  reasoning,
  isStreaming = false,
  duration,
}) => {
  const [expanded, setExpanded] = useState<boolean>(isStreaming);
  const [copied, setCopied] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(duration ?? 0);

  // Auto-expand while streaming; when streaming ends, default to collapsed
  useEffect(() => {
    if (isStreaming) {
      setExpanded(true);
    }
  }, [isStreaming]);

  // Elapsed timer while streaming
  useEffect(() => {
    if (!isStreaming) {
      if (duration !== undefined) {
        setElapsedSeconds(duration);
      }
      return;
    }
    const start = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - start) / 1000)));
    }, 500);
    return () => window.clearInterval(interval);
  }, [isStreaming, duration]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reasoning);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  // Extract first line summary for preview
  const firstLine =
    reasoning
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) || "";
  const cleanSummary = firstLine.replace(/\*\*/g, "").slice(0, 80);

  if (!reasoning && !isStreaming) {
    return null;
  }

  return (
    <div
      className={`my-3 rounded-xl border transition-all duration-200 overflow-hidden ${
        expanded
          ? "border-[var(--dsw-alias-border-l2)] bg-[var(--idealy-teal-bg)]/40"
          : "border-[var(--dsw-alias-border-l3)] hover:border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-interactive-bg-hover)]/30"
      }`}
      data-reasoning-block
    >
      {/* Disclosure Header Row */}
      <div className="flex items-center gap-1.5">
        <button
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-2 text-left text-xs text-[var(--dsw-alias-label-secondary)] transition-colors hover:text-[var(--dsw-alias-label-primary)] focus-ring"
          onClick={() => setExpanded((prev) => !prev)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-colors ${
                isStreaming
                  ? "text-[var(--idealy-teal-petrol)]"
                  : "text-[var(--dsw-alias-label-tertiary)]"
              }`}
            >
              {isStreaming ? (
                <Sparkles
                  className="h-3.5 w-3.5 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="shrink-0 font-medium text-[var(--dsw-alias-label-secondary)]">
              {isStreaming
                ? `Raisonnement en cours (${elapsedSeconds}s)...`
                : elapsedSeconds > 0
                  ? `Pensé pendant ${elapsedSeconds} s`
                  : "Processus de raisonnement"}
            </span>
            {!expanded && cleanSummary && (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--dsw-alias-label-caption)] opacity-60" />
                <span className="truncate text-[11px] italic text-[var(--dsw-alias-label-tertiary)]">
                  {cleanSummary}...
                </span>
              </>
            )}
          </span>
          <span className="shrink-0 text-[var(--dsw-alias-label-tertiary)]">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
        {expanded && reasoning && (
          <button
            aria-label="Copier le raisonnement"
            className="grid h-8 w-8 shrink-0 place-items-center rounded text-[var(--dsw-alias-label-tertiary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] focus-ring"
            onClick={handleCopy}
            title="Copier le raisonnement"
            type="button"
          >
            {copied ? (
              <Check className="h-3 w-3 text-[var(--idealy-teal-petrol)]" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Body Content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--dsw-alias-border-l3)]/60 text-[13px] leading-relaxed text-[var(--dsw-alias-label-secondary)] font-normal">
          <div className="pl-2 border-l-2 border-[var(--idealy-teal-soft)]/40 space-y-2 whitespace-pre-wrap break-words font-sans">
            {reasoning}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3 ml-1 bg-[var(--idealy-teal-petrol)] animate-pulse align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
