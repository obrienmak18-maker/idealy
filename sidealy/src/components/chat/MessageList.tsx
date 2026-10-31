import { ArrowDown, MessageSquarePlus, Sparkles } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { EmptyState } from "../common/EmptyState";
import { MessageItem } from "./MessageItem";

export const MessageList: React.FC = () => {
  const { activeMessages, activeSpace } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  // Monitor user scroll position to engage or disengage auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 120) {
      isAutoScrollEnabled.current = false;
      setShowScrollBottom(true);
    } else {
      isAutoScrollEnabled.current = true;
      setShowScrollBottom(false);
    }
  }, []);

  // Auto-scroll when messages update, ONLY if auto-scroll is enabled
  useEffect(() => {
    if (isAutoScrollEnabled.current && bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const scrollToBottom = () => {
    isAutoScrollEnabled.current = true;
    setShowScrollBottom(false);
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      aria-label="Fil de messages de la conversation"
      aria-live="polite"
      className="message-scroll-region flex-1 overflow-y-auto px-2 md:px-4 py-4 relative scroll-smooth"
      onScroll={handleScroll}
      ref={scrollContainerRef}
      role="log"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {activeMessages.length === 0 ? (
          <div className="py-12">
            <EmptyState
              description={
                activeSpace?.instructions
                  ? `Directives actives : ${activeSpace.instructions}`
                  : "Démarrez une nouvelle réflexion en posant une question ou en demandant l'élaboration d'un document."
              }
              icon={
                <MessageSquarePlus className="w-8 h-8 text-brand-primary" />
              }
              title={`Bienvenue dans ${activeSpace?.name || "votre Espace"}`}
            />
            {/* Quick suggested prompt cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mt-6 px-4">
              <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-surface hover:border-brand-primary/40 transition-all text-xs text-text-muted">
                <div className="flex items-center gap-1.5 font-medium text-text-main mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Explorer une architecture</span>
                </div>
                <span>
                  Comparer deux choix techniques avec leurs compromis.
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-surface hover:border-brand-primary/40 transition-all text-xs text-text-muted">
                <div className="flex items-center gap-1.5 font-medium text-text-main mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                  <span>Produire une spécification</span>
                </div>
                <span>
                  Générer un cahier des charges structuré et l'extraire en
                  artefact.
                </span>
              </div>
            </div>
          </div>
        ) : (
          activeMessages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))
        )}
        <div className="h-2" ref={bottomAnchorRef} />
      </div>

      {/* Floating button to return to bottom if user scrolled up */}
      {showScrollBottom && (
        <button
          aria-label="Revenir au dernier message"
          className="fixed bottom-24 right-8 md:right-16 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full bg-bg-surface border border-border-subtle text-text-main shadow-elevated hover:bg-bg-subtle active:scale-95 transition-all focus-ring text-xs font-medium"
          onClick={scrollToBottom}
          type="button"
        >
          <ArrowDown className="w-4 h-4 text-brand-primary" />
          <span>Dernier message</span>
        </button>
      )}
    </div>
  );
};
