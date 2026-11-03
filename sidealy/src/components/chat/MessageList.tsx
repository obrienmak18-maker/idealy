import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageItem } from './MessageItem';
import { ArrowDown, Braces, Code2, FileText, Layers2, Sparkles, Wand2, Zap } from 'lucide-react';
import { Composer } from './Composer';

export const MessageList: React.FC = () => {
  const { activeMessages, generationStatus, setDraft } = useApp();
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
    setDraft(starter);
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>('[data-composer-input]');
      input?.focus();
      input?.setSelectionRange(starter.length, starter.length);
    });
  };

  const starters = [
    {
      icon: Layers2,
      title: 'Créer une application',
      desc: "Décrivez votre idée, Idealy fait le reste.",
      prompt: 'Je veux créer une application qui ',
      color: 'var(--idealy-indigo)',
      bgColor: 'var(--idealy-indigo-bg)',
    },
    {
      icon: Braces,
      title: 'Explorer du code',
      desc: "Comprendre, corriger, optimiser.",
      prompt: 'Aide-moi à comprendre ou améliorer ce code : ',
      color: 'var(--idealy-teal-petrol)',
      bgColor: 'var(--idealy-teal-bg)',
    },
    {
      icon: Wand2,
      title: 'Générer du contenu',
      desc: "Textes, images, données, fichiers.",
      prompt: 'Génère-moi ',
      color: 'rgb(167, 139, 250)',
      bgColor: 'rgba(167, 139, 250, 0.1)',
    },
    {
      icon: FileText,
      title: 'Préparer un plan',
      desc: "Structurer les prochaines étapes.",
      prompt: 'Aide-moi à préparer un plan pour ',
      color: 'var(--dsw-alias-label-secondary)',
      bgColor: 'var(--dsw-alias-interactive-bg-hover)',
    },
  ] as const;

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
          <div className="idealy-home relative mx-auto flex min-h-full w-full max-w-[860px] flex-col justify-center px-4 pb-12 pt-8 sm:px-8">
            {/* ─── Gradient Mesh Background ────────────────────────── */}
            <div className="idealy-gradient-mesh" aria-hidden="true" />

            {/* ─── Eyebrow Badge ────────────────────────────────────── */}
            <div className="mb-8 sm:mb-10 animate-fade-up">
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/60 px-3.5 py-1.5 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11.5px] font-medium tracking-wide text-text-muted">
                  Votre espace de création
                </span>
                <span className="idealy-badge--teal idealy-badge">
                  <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                  Prêt
                </span>
              </div>

              {/* ─── Hero Heading ─────────────────────────────────────── */}
              <h1 className="max-w-2xl text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-text-main sm:text-[46px]">
                Que voulez-vous{' '}
                <span
                  className="bg-gradient-to-r from-[var(--idealy-teal-petrol)] via-[var(--idealy-indigo)] to-[rgb(167,139,250)] bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% auto', animation: 'gradientShift 6s ease-in-out infinite' }}
                >
                  construire
                </span>
                <span className="text-text-muted">&thinsp;?</span>
              </h1>

              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-text-muted sm:text-[15px]">
                Décrivez votre idée. Idealy peut clarifier le besoin, préparer les étapes et travailler dans un espace projet.
              </p>
            </div>

            {/* ─── Starter Cards Grid ────────────────────────────────── */}
            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Suggestions de départ"
            >
              {starters.map((s, i) => {
                const Icon = s.icon;
                const delayClass = i === 0
                  ? 'animate-fade-up'
                  : i === 1
                    ? 'animate-fade-up-delay'
                    : i === 2
                      ? 'animate-fade-up-delay-2'
                      : 'animate-fade-up-delay-3';

                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => chooseStarter(s.prompt)}
                    className={`idealy-card-premium group flex flex-col justify-between gap-4 p-4 text-left focus-ring min-h-[120px] ${delayClass}`}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                      e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                    }}
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                      style={{
                        background: s.bgColor,
                        color: s.color,
                        boxShadow: 'none',
                      }}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="block text-[13px] font-semibold text-text-main tracking-tight">
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-text-muted">
                        {s.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ─── Composer ──────────────────────────────────────────── */}
            <div className="animate-fade-up-delay-3">
              <Composer placement="home" />
            </div>

            {/* ─── Bottom Capabilities Strip ─────────────────────────── */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 animate-fade-up-delay-3">
              {[
                { icon: Code2, label: 'Génération de code' },
                { icon: Sparkles, label: 'IA multi-modèle' },
                { icon: Layers2, label: 'Projets complets' },
              ].map(({ icon: CIcon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted/60"
                >
                  <CIcon className="h-3 w-3" aria-hidden="true" />
                  {label}
                </span>
              ))}
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
