import { Search, SquarePen, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { hasConversationActivity } from "../../services/conversationVisibility";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Recherche simple et discrète : un champ, vos discussions avec extraits. (Ctrl/Cmd + K) */
export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    conversations,
    messages,
    setActiveConversationId,
    createConversation,
    setActivePage,
  } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelected(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isCommandPaletteOpen]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const sorted = conversations
      .filter((c) => !c.isArchived && hasConversationActivity(c, messages))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    if (!q) return sorted.slice(0, 8).map((conversation) => ({ conversation, snippet: "" }));
    return sorted
      .map((conversation) => {
        if (normalize(conversation.title).includes(q)) return { conversation, snippet: "" };
        const hit = messages.find(
          (m) => m.conversationId === conversation.id && normalize(m.content).includes(q),
        );
        return hit ? { conversation, snippet: hit.content.replace(/\s+/g, " ").slice(0, 90) } : null;
      })
      .filter((r): r is { conversation: (typeof conversations)[number]; snippet: string } => r !== null)
      .slice(0, 12);
  }, [query, conversations, messages]);

  if (!isCommandPaletteOpen) return null;

  const close = () => setIsCommandPaletteOpen(false);
  const open = (id: string) => {
    setActiveConversationId(id);
    setActivePage("chat");
    close();
  };

  return (
    <div
      aria-label="Rechercher"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      role="dialog"
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 border-b border-[var(--dsw-alias-border-l1)] px-3.5">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--dsw-alias-label-tertiary)]" />
          <input
            className="h-12 flex-1 bg-transparent text-sm text-[var(--dsw-alias-label-primary)] outline-none placeholder:text-[var(--dsw-alias-label-tertiary)]"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[selected]) {
                open(results[selected].conversation.id);
              } else if (e.key === "Escape") {
                close();
              }
            }}
            placeholder="Rechercher dans vos discussions"
            ref={inputRef}
            value={query}
          />
          <button
            aria-label="Fermer"
            className="focus-ring grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
            onClick={close}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5 idealy-scroll">
          <button
            className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
            onClick={() => {
              createConversation();
              setActivePage("chat");
              close();
            }}
            type="button"
          >
            <SquarePen aria-hidden="true" className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
            <span>Nouvelle discussion</span>
          </button>
          {results.length > 0 && (
            <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)]">
              {query ? "Résultats" : "Récentes"}
            </p>
          )}
          {results.map(({ conversation, snippet }, i) => (
            <button
              className={`focus-ring block w-full rounded-xl px-3 py-2 text-left transition-colors ${
                i === selected
                  ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-primary)]"
                  : "hover:bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--dsw-alias-label-secondary)]"
              }`}
              key={conversation.id}
              onClick={() => open(conversation.id)}
              onMouseEnter={() => setSelected(i)}
              type="button"
            >
              <span className="block truncate text-xs font-medium text-[var(--dsw-alias-label-primary)]">
                {conversation.title}
              </span>
              {snippet && (
                <span className="mt-0.5 block truncate text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                  {snippet}
                </span>
              )}
            </button>
          ))}
          {query && results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[var(--dsw-alias-label-tertiary)]">
              Aucune discussion trouvée.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
