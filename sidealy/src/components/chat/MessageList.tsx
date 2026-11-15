import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageItem } from './MessageItem';
import { ArrowDown, History, Info, Layers2, Sparkles, X } from 'lucide-react';
import { Composer } from './Composer';

const GREETINGS = [
  { prefix: "Ravi de vous revoir.", highlight: "Prêt quand vous l'êtes." },
  { prefix: "Par quoi", highlight: "voulez-vous commencer ?" },
  { prefix: "Qu'avez-vous", highlight: "en tête aujourd'hui ?" },
  { prefix: "Vos agents sont prêts.", highlight: "Que créons-nous ?" },
  { prefix: "Donnons vie à vos idées,", highlight: "ligne par ligne." },
];

const REAL_APP_IDEAS = [
  {
    title: "Dashboard SaaS réel & Facturation",
    prompt: "Construis un dashboard SaaS complet et modulaire en React + Tailwind avec métriques MRR/ARR, graphiques de croissance en temps réel, gestion des abonnements Stripe et table de factures téléchargeables.",
    description: "Métriques MRR, graphiques temps réel et facturation Stripe",
  },
  {
    title: "Plateforme E-Commerce & Panier",
    prompt: "Développe une boutique e-commerce moderne et réactive avec catalogue produits filtrable par catégorie/prix, panier dynamique avec calcul automatique de la TVA et processus de commande interactif.",
    description: "Catalogue dynamique, filtres, panier et checkout",
  },
  {
    title: "CRM Ventes & Pipeline Kanban",
    prompt: "Crée un CRM commercial complet avec tableau Kanban interactif en colonnes pour suivre les opportunités par étape (Prospect, Qualifié, Proposition, Gagné) et fiche détaillée par client.",
    description: "Pipeline Kanban d'opportunités et fiches clients",
  },
  {
    title: "Générateur de Factures & Devis PDF",
    prompt: "Conçois une application professionnelle de facturation permettant de créer des devis et factures, personnaliser le logo et les mentions légales, calculer les totaux HT/TTC et exporter en document PDF imprimable.",
    description: "Création de devis/factures avec calculs automatiques et export PDF",
  },
  {
    title: "Gestionnaire de Tâches d'Équipe",
    prompt: "Construis une application de gestion de projets d'équipe collaborative avec assignation des membres, priorités, dates d'échéance, filtres par statut et vue calendrier.",
    description: "Collaboration d'équipe, dates d'échéance et priorités",
  },
  {
    title: "Calculatrice Scientifique & Solveur IA",
    prompt: "Développe une calculatrice scientifique et graphique avancée avec parseur d'expressions mathématiques, tracé de courbes en temps réel, conversion d'unités et historique complet des opérations.",
    description: "Parseur d'expressions, courbes temps réel et historique",
  },
];

export const MessageList: React.FC = () => {
  const { activeMessages, generationStatus, setDraft, conversations, setActiveConversationId } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAutoScrollEnabled = useRef(true);

  const [activePanel, setActivePanel] = useState<"none" | "ideas" | "recent">("none");

  // Salutation aléatoire par session
  const greeting = useMemo(() => {
    const idx = Math.floor(Math.random() * GREETINGS.length);
    return GREETINGS[idx];
  }, []);

  // Vrais projets récents issus des conversations de l'utilisateur
  const recentProjects = useMemo(() => {
    return conversations
      .filter((c) => c.title && c.title !== "Nouvelle conversation" && !c.isArchived)
      .slice(0, 6);
  }, [conversations]);

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
      if (input) {
        input.focus();
        input.setSelectionRange(text.length, text.length);
      }
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
          <div className="idealy-home relative mx-auto flex min-h-full flex-1 w-full max-w-[720px] flex-col justify-center px-2 pb-8 pt-4 sm:px-6 sm:pb-12">
            
            {/* Header Greeting */}
            <div className="animate-fade-up text-center mb-5">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
                {greeting.prefix}{' '}
                <span className="bg-gradient-to-r from-[var(--idealy-teal-petrol)] via-[var(--idealy-indigo)] to-[rgb(167,139,250)] bg-clip-text text-transparent">
                  {greeting.highlight}
                </span>
              </h1>
            </div>

            {/* Prompt Composer (Responsive & Pro) */}
            <div className="animate-fade-up-delay mb-3.5 w-full">
              <Composer placement="home" />
            </div>

            {/* Boutons d'action subtils avec micro-zoom */}
            <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-up-delay-2" aria-label="Actions de départ">
              <button
                type="button"
                onClick={() => setActivePanel((curr) => curr === "ideas" ? "none" : "ideas")}
                className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  activePanel === "ideas"
                    ? "border-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)]/30 text-[var(--idealy-teal-petrol)] shadow-xs"
                    : "border-[var(--dsw-alias-border-l1)] text-[var(--dsw-alias-label-secondary)] bg-[var(--dsw-alias-bg-layer-2)]/60 hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
              >
                <Layers2 className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" aria-hidden="true" />
                <span>Créer une application</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel((curr) => curr === "recent" ? "none" : "recent")}
                className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  activePanel === "recent"
                    ? "border-[var(--idealy-indigo)] bg-[var(--idealy-indigo)]/15 text-[var(--idealy-indigo)] shadow-xs"
                    : "border-[var(--dsw-alias-border-l1)] text-[var(--dsw-alias-label-secondary)] bg-[var(--dsw-alias-bg-layer-2)]/60 hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
              >
                <History className="h-3.5 w-3.5 text-[var(--idealy-indigo)]" aria-hidden="true" />
                <span>Reprendre un projet</span>
              </button>
            </div>

            {/* Panel Déplié : Idées d'applications réelles (Responsive, Micro-zoom, Titre seul + Info) */}
            {activePanel === "ideas" && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[var(--dsw-alias-bg-layer-2)]/90 border border-[var(--dsw-alias-border-l2)] shadow-sm animate-fade-in w-full">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
                    Idées d'applications prêtes à concevoir
                  </span>
                  <button
                    onClick={() => setActivePanel("none")}
                    className="text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] p-1 rounded-lg hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                    type="button"
                    aria-label="Fermer les suggestions"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {REAL_APP_IDEAS.map((idea) => (
                    <button
                      key={idea.title}
                      onClick={() => applyPrompt(idea.prompt)}
                      className="group flex items-center justify-between gap-2 p-2.5 text-left rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] hover:border-[var(--idealy-teal-petrol)]/50 hover:bg-[var(--idealy-teal-bg)]/10 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 focus-ring"
                      type="button"
                      title={idea.description}
                    >
                      <span className="text-xs font-medium text-[var(--dsw-alias-label-primary)] group-hover:text-[var(--idealy-teal-petrol)] transition-colors truncate">
                        {idea.title}
                      </span>
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[var(--dsw-alias-label-tertiary)] group-hover:text-[var(--idealy-teal-petrol)] transition-colors"
                        title={idea.description}
                      >
                        <Info className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Panel Déplié : Projets récents */}
            {activePanel === "recent" && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[var(--dsw-alias-bg-layer-2)]/90 border border-[var(--dsw-alias-border-l2)] shadow-sm animate-fade-in w-full">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[var(--idealy-indigo)]" />
                    Vos projets & discussions récents
                  </span>
                  <button
                    onClick={() => setActivePanel("none")}
                    className="text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] p-1 rounded-lg hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                    type="button"
                    aria-label="Fermer les projets récents"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {recentProjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                    {recentProjects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setActiveConversationId(proj.id);
                          setActivePanel("none");
                        }}
                        className="group flex flex-col p-2.5 text-left rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] hover:border-[var(--idealy-indigo)]/50 hover:bg-[var(--idealy-indigo)]/10 hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 focus-ring"
                        type="button"
                      >
                        <span className="text-xs font-medium text-[var(--dsw-alias-label-primary)] group-hover:text-[var(--idealy-indigo)] transition-colors truncate w-full">
                          {proj.title}
                        </span>
                        <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)] mt-1 block">
                          {new Date(proj.updatedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--dsw-alias-label-secondary)] py-4 text-center">
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

      {/* Bouton flottant pour revenir en bas */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          type="button"
          aria-label="Revenir au dernier message"
          className="fixed bottom-24 right-8 md:right-16 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full idealy-glass text-[var(--dsw-alias-label-primary)] shadow-elevated hover:bg-[var(--dsw-alias-interactive-bg-hover)] active:scale-95 transition-all duration-200 ease-spring focus-ring text-xs font-medium"
        >
          <ArrowDown className="h-4 w-4" />
          <span>Derniers messages</span>
        </button>
      )}
    </div>
  );
};
