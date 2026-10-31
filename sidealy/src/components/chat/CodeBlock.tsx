import { Check, Copy } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface CodeBlockProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language = "text",
  code,
  lineNumbers = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const lines = code.trimEnd().split("\n");

  return (
    <div
      className="my-3 rounded-xl overflow-hidden border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-markdown-code-block)] shadow-sm text-sm"
      data-code-block
    >
      {/* Code Block Banner (Sticky) */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3.5 py-2 bg-[var(--dsw-alias-markdown-code-block-banner)] border-b border-[var(--dsw-alias-border-l3)] text-xs text-[var(--dsw-alias-label-secondary)]"
        data-code-block-banner
      >
        <span className="font-mono text-[11px] font-semibold text-[var(--dsw-alias-label-primary)] uppercase tracking-wider">
          {language}
        </span>
        <button
          aria-label={copied ? "Code copié" : "Copier le code"}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors focus-ring"
          onClick={handleCopy}
          type="button"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--idealy-teal-petrol)]" />
              <span className="text-[var(--idealy-teal-petrol)] font-medium">
                Copié !
              </span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto text-xs md:text-[13px] font-mono leading-relaxed text-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-markdown-code-block)] selection:bg-[var(--idealy-teal-petrol)]/20">
        <pre className="m-0 p-0 font-inherit">
          <code>
            {lineNumbers
              ? lines.map((line, idx) => (
                  <div className="table-row" key={idx}>
                    <span className="table-cell pr-4 text-right select-none text-[var(--dsw-alias-label-caption)] opacity-60 w-8">
                      {idx + 1}
                    </span>
                    <span className="table-cell">{line}</span>
                  </div>
                ))
              : code}
          </code>
        </pre>
      </div>
    </div>
  );
};
