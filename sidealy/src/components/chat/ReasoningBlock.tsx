import { Check, ChevronRight, Copy } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface ReasoningBlockProps {
  duration?: number;
  isStreaming?: boolean;
  reasoning: string;
}

/**
 * Réflexion : dépliée pendant le travail, elle se replie d'elle-même une fois terminée
 * (« Pensé pendant 12 s »). L'utilisateur peut toujours la rouvrir.
 */
export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({ reasoning, isStreaming = false, duration }) => {
  const [expanded, setExpanded] = useState<boolean>(isStreaming);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState<number>(duration ?? 0);
  const wasStreaming = useRef(isStreaming);
  const touched = useRef(false);

  useEffect(() => {
    if (isStreaming) {
      if (!touched.current) setExpanded(true);
    } else if (wasStreaming.current && !touched.current) {
      // Fin de la réflexion : repli automatique, sauf si l'utilisateur l'a manipulée.
      setExpanded(false);
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      if (duration !== undefined) setElapsed(duration);
      return;
    }
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.max(1, Math.round((Date.now() - start) / 1000))), 500);
    return () => window.clearInterval(timer);
  }, [isStreaming, duration]);

  if (!reasoning && !isStreaming) return null;

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(reasoning);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const label = isStreaming ? "Réflexion en cours" : elapsed > 0 ? `Pensé pendant ${elapsed} s` : "Réflexion";

  return (
    <div className="my-2" data-reasoning-block>
      <div className="flex items-center gap-1">
        <button
          aria-expanded={expanded}
          className="focus-ring group -ml-1 flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] text-[var(--dsw-alias-label-tertiary)] transition-colors hover:text-[var(--dsw-alias-label-secondary)]"
          onClick={() => {
            touched.current = true;
            setExpanded((v) => !v);
          }}
          type="button"
        >
          <ChevronRight aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
          <span className={isStreaming ? "idealy-shimmer-text" : ""}>{label}</span>
          {isStreaming && <span className="tabular-nums opacity-70">· {elapsed || 1} s</span>}
        </button>
        {expanded && reasoning && (
          <button aria-label="Copier la réflexion" className="focus-ring grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]" onClick={copy} type="button">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      <div className={`grid transition-all duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="mt-1 ml-[3px] max-h-[320px] overflow-y-auto border-l border-[var(--dsw-alias-border-l2)] pl-4 text-[13.5px] leading-[1.7] text-[var(--dsw-alias-label-tertiary)] whitespace-pre-wrap break-words idealy-scroll">
            {reasoning}
          </div>
        </div>
      </div>
    </div>
  );
};
