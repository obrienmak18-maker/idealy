import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageItem } from './MessageItem';
import { ArrowDown, History, Layers2, Sparkles, X } from 'lucide-react';
import { Composer } from './Composer';

const GREETINGS = [
  { prefix: "Ravi de vous revoir.", highlight: "Prêt quand vous l'êtes." },
  { prefix: "Par quoi", highlight: "voulez-vous commencer ?" },
  { prefix: "Qu'avez-vous", highlight: "en tête aujourd'hui ?" },
  { prefix: "Vos agents sont prêts.", highlight: "Que créons-nous ?" },
  { prefix: "Donnons vie à vos idées,", highlight: "ligne par ligne." },
];

const APP_IDEAS = [
  { title: "Dashboard SaaS Temps Réel", prompt: "Crée un dashboard SaaS analytique moderne avec graphiques en temps réel, cartes KPI et filtres dynamiques." },
  { title: "Calculatrice IA & Synthétiseur Web Audio", prompt: "Crée une calculatrice scientifique complète en HTML/CSS/JS avec un parseur d'expression AST et du son via Web Audio API." },
  { title: "Générateur de Composants React + Tailwind", prompt: "Conçois une application web de prévisualisation et génération de composants UI React modernes avec Tailwind CSS." },
  { title: "Tableau Kanban Collaboratif", prompt: "Construis une application de gestion de tâches Kanban avec colonnes glisser-déposer, tags et stockage local." },
];

export const MessageList: React.FC = () => {
  const { activeMessages, generationStatus, setDraft, conversations, setActiveConversationId } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  const [activePanel, setActivePanel] = useState<"none" | "ideas" | "recent">("none");

  // Pick a random greeting on first render or based on current session
  const greeting = useMemo(() => {
    const idx = Math.floor(Math.random() * GREETINGS.length);
    return GREETINGS[idx];
  }, []);

  // Real recent projects from conversations
  const recentProjects = useMemo(() => {
    return conversations
      .filter((c) => c.title && c.title !== "Nouvelle conversation")
      .slice(0, 4);
  }, [conversations]);

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

  const applyPrompt = (text: string) => {
    setDraft(text);
    setActivePanel("none");
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLTextAreaElement>('[data-composer-input]');
      input?.focus();
      input?.setSelectionRange(text.length, text.length);
    });
  };

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
      <div className="mx-auto flex min-h-full w-full max-w-[840px] flex-col space-y-4">
        {activeMessages.length === 0 ? (
          <div className="idealy-home relative mx-auto flex min-h-full flex-1 w-full max-w-[720px] flex-col justify-center px-3 pb-8 pt-6 sm:px-6 sm:pb-12">
            
            {/* Header Greeting (Harmonisé & compact, style Gemini / DeepSeek) */}
            <div className="animate-fade-up text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
                {greeting.prefix}{' '}
                <span className="bg-gradient-to-r from-[var(--idealy-teal-petrol)] via-[var(--idealy-indigo)] to-[rgb(167,139,250)] bg-clip-text text-transparent">
                  {greeting.highlight}
                </span>
              </h1>
            </div>

            {/* Prompt Composer (Adapté et proportionné) */}
            <div className="animate-fade-up-delay mb-4">
              <Composer placement="home" />
            </div>

            {/* Action Buttons : Créer une application vs Reprendre un projet */}
            <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-up-delay-2" aria-label="Actions de départ">
              <button
                type="button"
                onClick={() => setActivePanel((curr) => curr === "ideas" ? "none" : "ideas")}
                className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  activePanel === "ideas"
                    ? "border-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)]/30 text-[var(--idealy-teal-petrol)]"
                    : "border-[var(--dsw-alias-border-l1)] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
              >
                <Layers2 className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" aria-hidden="true" />
                <span>Créer une application</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel((curr) => curr === "recent" ? "none" : "recent")}
                className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  activePanel === "recent"
                    ? "border-[var(--idealy-indigo)] bg-[var(--idealy-indigo)]/10 text-[var(--idealy-indigo)]"
                    : "border-[var(--dsw-alias-border-l1)] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
              >
                <History className="h-3.5 w-3.5 text-[var(--idealy-indigo)]" aria-hidden="true" />
                <span>Reprendre un projet</span>
              </button>
            </div>

            {/* Panel Déplié : Idées d'applications (Quand "Créer une application" est cliqué) */}
            {activePanel === "ideas" && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l2)] shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
                    Idées d'applications prêtes à concevoir
                  </span>
                  <button
                    onClick={() => setActivePanel("none")}
                    className="text-text-muted hover:text-text-main p-1 rounded-md"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {APP_IDEAS.map((idea) => (
                    <button
                      key={idea.title}
                      onClick={() => applyPrompt(idea.prompt)}
                      className="p-2.5 text-left rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)] hover:border-[var(--idealy-teal-petrol)]/50 hover:bg-[var(--idealy-teal-bg)]/10 transition-colors group"
                      type="button"
                    >
                      <h4 className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] group-hover:text-[var(--idealy-teal-petrol)] transition-colors">
                        {idea.title}
                      </h4>
                      <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] line-clamp-2 mt-0.5">
                        {idea.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Panel Déplié : Projets récents (Quand "Reprendre un projet" est cliqué) */}
            {activePanel === "recent" && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l2)] shadow-sm animate-fade-in">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[var(--idealy-indigo)]" />
                    Vos projets & discussions récents
                  </span>
                  <button
                    onClick={() => setActivePanel("none")}
                    className="text-text-muted hover:text-text-main p-1 rounded-md"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {recentProjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentProjects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setActiveConversationId(proj.id);
                          setActivePanel("none");
                        }}
                        className="p-2.5 text-left rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)] hover:border-[var(--idealy-indigo)]/50 hover:bg-[var(--idealy-indigo)]/10 transition-colors group"
                        type="button"
                      >
                        <h4 className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] group-hover:text-[var(--idealy-indigo)] transition-colors truncate">
                          {proj.title}
                        </h4>
                        <span className="text-[10.5px] text-[var(--dsw-alias-label-tertiary)] mt-0.5 block">
                          Modifié le {new Date(proj.updatedAt).toLocaleDateString("fr-FR")}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted p-2 text-center">
                    Aucun projet récent trouvé. Lancez votre première création ci-dessus !
                  </p>
                )}
              </div>
            )}

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
          <ArrowDown className="h-4 w-4" />
          <span>Derniers messages</span>
        </button>
      )}
    </div>
  );
};
