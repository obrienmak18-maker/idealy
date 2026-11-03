import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageItem } from './MessageItem';
import { ArrowDown, History, Layers2 } from 'lucide-react';
import { Composer } from './Composer';

export const MessageList: React.FC = () => {
  const { activeMessages, generationStatus, setDraft, conversations, setActiveConversationId } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  // Monitor user scroll position to engage or disengage auto-scroll
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 120) {
      isAutoScrollEnabled.current = false;
      setShowScrollBottom(true);
    } else {
      isAutoScrollEnabled.current = true;
      setShowScrollBottom(false);
    }
  }, []);

  // Keep streaming updates immediate; repeated smooth scrolls fight each token.
  useEffect(() => {
    if (activeMessages.length === 0) {
      isAutoScrollEnabled.current = true;
      setShowScrollBottom(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      return;
    }
    if (isAutoScrollEnabled.current && bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({
        behavior: generationStatus === "receiving" ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [activeMessages, generationStatus]);

  const scrollToBottom = () => {
    isAutoScrollEnabled.current = true;
    setShowScrollBottom(false);
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const chooseStarter = (starter: string) => {
    if (!starter) {
      const recent = conversations.find((c) => c.id && (c as { messageCount?: number }).messageCount !== 0);
      if (recent) setActiveConversationId(recent.id);
      return;
    }
    setDraft(starter);
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>('[data-composer-input]');
      input?.focus();
      input?.setSelectionRange(starter.length, starter.length);
    });
  };

  const starters = [
    { icon: Layers2, title: 'Créer une application', prompt: 'Je veux créer une application qui ' },
    { icon: History, title: 'Reprendre un projet récent', prompt: '' },
  ] as const;

  const hour = new Date().getHours();
  const greeting = hour < 5 || hour >= 18 ? 'Bonsoir, que construisons-nous ?' : 'Bonjour, que construisons-nous ?';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="idealy-message-scroll idealy-scroll message-scroll-region flex-1 overflow-y-auto px-2 py-3 relative scroll-smooth sm:px-4 sm:py-4"
      tabIndex={0}
      aria-label="Fil de messages de la conversation"
      aria-live="polite"
      aria-relevant="additions"
      role="log"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[900px] flex-col space-y-4">
        {activeMessages.length === 0 ? (
          <div className="idealy-home relative mx-auto flex min-h-full w-full max-w-[760px] flex-col justify-center px-4 pb-16 pt-8 sm:px-8">
            <h1 className="animate-fade-up mb-8 text-center text-[28px] font-semibold leading-tight tracking-[-0.03em] text-text-main sm:text-[36px]">
              {greeting}
            </h1>
            <div className="animate-fade-up-delay">
              <Composer placement="home" />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 animate-fade-up-delay-2" aria-label="Suggestions de départ">
              {starters.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => chooseStarter(s.prompt)}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-[var(--dsw-alias-border-l1)] px-3.5 py-2 text-[13px] text-[var(--dsw-alias-label-secondary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          activeMessages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
        <div ref={bottomAnchorRef} className="h-2" />
      </div>

      {/* Floating button to return to bottom if user scrolled up */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          type="button"
          aria-label="Revenir au dernier message"
          className="fixed bottom-24 right-8 md:right-16 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full idealy-glass text-text-main shadow-elevated hover:bg-bg-subtle active:scale-95 transition-all duration-200 ease-spring focus-ring text-xs font-medium"
        >
          <ArrowDown className="w-4 h-4 text-brand-primary" />
          <span>Dernier message</span>
        </button>
      )}
    </div>
  );
};
