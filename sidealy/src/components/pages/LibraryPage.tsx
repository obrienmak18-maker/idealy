import {
  ArrowRight,
  Bot,
  Check,
  Clock,
  Code2,
  Copy,
  Layers,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { hasConversationActivity } from "../../services/conversationVisibility";
import { PageFrame } from "../layout/PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { voiesCatalog, type WayAgent } from "../../services/voies-catalog";

type LibraryFilter = "all" | "chats" | "artifacts" | "creations" | "pinned";

export const LibraryPage: React.FC = () => {
  const {
    artifacts,
    conversations,
    createConversation,
    deleteConversation,
    messages,
    openArtifact,
    openConfirmModal,
    setActiveConversationId,
    setActivePage,
    setDraft,
    togglePinConversation,
  } = useApp();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLocaleLowerCase();

  // Total active non-archived conversations (without query / pin filter)
  const activeConversationsCount = useMemo(
    () =>
      conversations
        .filter((c) => !c.isArchived)
        .filter((c) => hasConversationActivity(c, messages)).length,
    [conversations, messages],
  );

  // Active non-archived conversations matching current filter & query
  const matchingConversations = useMemo(
    () =>
      conversations
        .filter((c) => !c.isArchived)
        .filter((c) => hasConversationActivity(c, messages))
        .filter(
          (c) =>
            !normalizedQuery ||
            c.title.toLocaleLowerCase().includes(normalizedQuery),
        )
        .filter((c) => (filter === "pinned" ? c.isPinned : true))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, messages, normalizedQuery, filter],
  );

  // Deliverables / Artifacts
  const matchingArtifacts = useMemo(
    () =>
      artifacts.filter(
        (a) =>
          !normalizedQuery ||
          a.title.toLocaleLowerCase().includes(normalizedQuery) ||
          a.type.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [artifacts, normalizedQuery],
  );

  // Gems (Multi-Agent Personas from all Voies)
  const allGems: WayAgent[] = useMemo(() => {
    return Object.values(voiesCatalog).flatMap((way) => way.agents);
  }, []);

  const matchingGems = useMemo(
    () =>
      allGems.filter(
        (g) =>
          !normalizedQuery ||
          g.name.toLocaleLowerCase().includes(normalizedQuery) ||
          g.role.toLocaleLowerCase().includes(normalizedQuery) ||
          g.specialty.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [allGems, normalizedQuery],
  );

  const handleCopyArtifactContent = async (
    e: React.MouseEvent,
    id: string,
    content: string,
  ) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleLaunchWithPrompt = (prompt: string, title?: string) => {
    createConversation(undefined, title ?? "Nouvelle création");
    setDraft(prompt);
    setActivePage("chat");
  };

  return (
    <PageFrame label="Bibliothèque">
      <div className="idealy-page-enter mx-auto max-w-5xl pb-16">
        <PageHeader
          action={
            <button
              className="group relative overflow-hidden inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] px-5 text-xs font-semibold text-white shadow-md hover:shadow-glow-teal active:scale-95 transition-all focus-ring"
              onClick={() => {
                createConversation();
                setActivePage("chat");
              }}
              type="button"
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s linear infinite',
                }}
                aria-hidden="true"
              />
              <Plus aria-hidden="true" className="h-4 w-4 relative z-10" />
              <span className="relative z-10">Nouvelle discussion</span>
            </button>
          }
          description="Retrouvez l'ensemble de vos discussions, fichiers produits, livrables de mission et profils d'agents spécialisés."
          eyebrow="Espace de Connaissance & Livrables"
          title="Bibliothèque"
        />

        {/* ─── 1. GEMINI STATS OVERVIEW BANNER ─────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-up">
          <div className="idealy-card-premium p-4"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
              e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)]">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[11px] font-medium text-[var(--dsw-alias-label-secondary)]">
                  Discussions actives
                </span>
                <p className="text-2xl font-bold text-[var(--dsw-alias-label-primary)] idealy-stat-number">
                  {activeConversationsCount}
                </p>
              </div>
            </div>
          </div>

          <div className="idealy-card-premium p-4"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
              e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--idealy-indigo-bg)] text-[var(--idealy-indigo)]">
                <Code2 className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[11px] font-medium text-[var(--dsw-alias-label-secondary)]">
                  Livrables & Fichiers
                </span>
                <p className="text-2xl font-bold text-[var(--dsw-alias-label-primary)] idealy-stat-number">
                  {artifacts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="idealy-card-premium p-4"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
              e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-400">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[11px] font-medium text-[var(--dsw-alias-label-secondary)]">
                  Créations & Agents Disponibles
                </span>
                <p className="text-2xl font-bold text-[var(--dsw-alias-label-primary)] idealy-stat-number">
                  {allGems.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. GEMINI SEARCH & FILTER PILLS ─────────────────────────────── */}
        <div className="mt-7 flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative flex h-12 items-center rounded-2xl idealy-glass px-4 shadow-sm focus-within:border-[var(--idealy-teal-petrol)]/60 focus-within:shadow-glow-teal transition-all duration-300">
            <Search className="h-4 w-4 shrink-0 text-[var(--dsw-alias-label-tertiary)] mr-2.5" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] outline-none"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une discussion, un livrable de code ou un agent..."
              value={query}
            />
            {query && (
              <button
                className="text-xs text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)]"
                onClick={() => setQuery("")}
                type="button"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Filter Pills (Gemini Style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                filter === "all"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setFilter("all")}
              type="button"
            >
              <span>Tout</span>
            </button>

            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                filter === "chats"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setFilter("chats")}
              type="button"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discussions ({activeConversationsCount})</span>
            </button>

            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                filter === "artifacts"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setFilter("artifacts")}
              type="button"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Livrables ({artifacts.length})</span>
            </button>

            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                filter === "creations"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setFilter("creations")}
              type="button"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Créations & Agents ({allGems.length})</span>
            </button>

            <button
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                filter === "pinned"
                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                  : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              onClick={() => setFilter("pinned")}
              type="button"
            >
              <Pin className="h-3.5 w-3.5" />
              <span>Épinglés</span>
            </button>
          </div>
        </div>

        {/* ─── 3. DISCUSSIONS SECTION (GEMINI RICH CARDS) ─────────────────── */}
        {(filter === "all" || filter === "chats" || filter === "pinned") && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--idealy-teal-petrol)]" />
                Discussions ({matchingConversations.length})
              </h3>
            </div>

            {matchingConversations.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {matchingConversations.map((conv) => {
                  const dateStr = new Date(conv.updatedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      className="idealy-card-premium group flex flex-col justify-between p-4 cursor-pointer"
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setActivePage("chat");
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                        e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                      }}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)] group-hover:text-[var(--idealy-teal-petrol)] transition-colors line-clamp-1">
                            {conv.title}
                          </h4>
                          {conv.isPinned && (
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)]">
                              <Pin className="h-3 w-3 fill-current" />
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)] line-clamp-2 leading-relaxed">
                          {conv.draft ? `Brouillon : ${conv.draft}` : "Discussion interactive avec l'escouade d'agents Idealy."}
                        </p>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-[var(--dsw-alias-border-l1)] flex items-center justify-between text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dateStr}
                        </span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-1 rounded-lg hover:text-[var(--idealy-teal-petrol)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinConversation(conv.id);
                            }}
                            title={conv.isPinned ? "Désépingler" : "Épingler"}
                            type="button"
                          >
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 rounded-lg hover:text-red-500 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConfirmModal({
                                title: "Supprimer cette conversation ?",
                                confirmLabel: "Supprimer",
                                isDestructive: true,
                                message: `Supprimer « ${conv.title} » ?`,
                                onConfirm: () => deleteConversation(conv.id),
                              });
                            }}
                            title="Supprimer"
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : filter === "chats" || filter === "pinned" ? (
              <div className="rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/40 p-8 text-center text-xs text-[var(--dsw-alias-label-secondary)]">
                Aucune discussion ne correspond à vos critères.
              </div>
            ) : null}
          </section>
        )}

        {/* ─── 4. DELIVERABLES / ARTIFACTS SECTION ─────────────────────────── */}
        {(filter === "all" || filter === "artifacts") && (
          <section className="mt-9">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[var(--idealy-indigo)]" />
                Livrables de Code & Spécifications ({matchingArtifacts.length})
              </h3>
            </div>

            {matchingArtifacts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matchingArtifacts.map((art) => (
                  <div
                    className="idealy-card-premium group flex flex-col justify-between p-4 cursor-pointer"
                    key={art.id}
                    onClick={() => openArtifact(art.id)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                      e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-lg bg-[var(--idealy-indigo-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--idealy-indigo)]">
                          {art.language || art.type}
                        </span>
                        <button
                          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                          onClick={(e) => handleCopyArtifactContent(e, art.id, art.content)}
                          title="Copier le contenu"
                          type="button"
                        >
                          {copiedId === art.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-[var(--dsw-alias-label-primary)] line-clamp-1">
                        {art.title}
                      </h4>
                      <pre className="mt-2 max-h-20 overflow-hidden rounded-lg bg-[var(--dsw-alias-bg-base)] p-2 font-mono text-[11px] text-[var(--dsw-alias-label-secondary)] leading-relaxed">
                        <code>{art.content.slice(0, 160)}</code>
                      </pre>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[var(--dsw-alias-border-l1)] flex items-center justify-between text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                      <span>{(art.content.length / 1024).toFixed(1)} Ko</span>
                      <span className="flex items-center gap-1 text-[var(--idealy-indigo)] font-semibold">
                        Ouvrir dans Aperçu <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : filter === "artifacts" ? (
              <div className="rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/40 p-8 text-center text-xs text-[var(--dsw-alias-label-secondary)]">
                Aucun livrable généré pour le moment.
              </div>
            ) : null}
          </section>
        )}

        {/* ─── 5. CRÉATIONS & AGENTS GALLERY SECTION ─────────────────────── */}
        {(filter === "all" || filter === "creations") && (
          <section className="mt-9">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-500" />
                Créations & Agents Spécialisés ({matchingGems.length})
              </h3>
              <button
                className="text-xs font-semibold text-[var(--idealy-teal-petrol)] hover:underline flex items-center gap-1"
                onClick={() => setActivePage("agents")}
                type="button"
              >
                Explorer toute l'escouade <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchingGems.slice(0, 6).map((gem) => (
                <div
                  className="idealy-card-premium group flex flex-col justify-between p-4 cursor-pointer"
                  key={gem.name}
                  onClick={() => {
                    createConversation(undefined, `Mission avec ${gem.name}`);
                    setDraft(`Bonjour ${gem.name}, intervenons sur : `);
                    setActivePage("chat");
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                  }}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--dsw-alias-border-l3)] shadow-xs">
                        <img
                          alt={gem.name}
                          className="h-full w-full object-cover"
                          src={gem.avatarUrl}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">
                          {gem.name}
                        </h4>
                        <span className="text-[11px] font-medium text-violet-500">
                          {gem.role}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-xs text-[var(--dsw-alias-label-secondary)] line-clamp-2 leading-relaxed">
                      {gem.specialty}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-[var(--dsw-alias-border-l1)] flex items-center justify-between text-xs font-semibold text-violet-500">
                    <span>Mobiliser l'agent</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 6. GEMINI INSPIRATION CARDS (WHEN CONTENT IS SPARSE) ───────── */}
        {conversations.length === 0 && artifacts.length === 0 && (
          <div className="mt-10 rounded-2xl border border-[var(--idealy-teal-petrol)]/30 bg-[var(--idealy-teal-bg)]/20 p-6">
            <h3 className="text-base font-bold text-[var(--dsw-alias-label-primary)] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--idealy-teal-petrol)]" />
              Projets recommandés pour débuter votre bibliothèque
            </h3>
            <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
              Sélectionnez une mission type pour mobiliser l'escouade et générer vos premiers livrables.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className="flex items-start gap-3 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-3.5 text-left hover:border-[var(--idealy-teal-petrol)] transition-all"
                onClick={() =>
                  handleLaunchWithPrompt(
                    "Construis une application web React avec Tailwind CSS et dashboard interactif.",
                    "Application Dashboard React",
                  )
                }
                type="button"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)]">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--dsw-alias-label-primary)]">
                    Application Web Complète
                  </h4>
                  <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] mt-0.5">
                    Orchestrez Minato et Naruto pour créer un dashboard modulaire.
                  </p>
                </div>
              </button>

              <button
                className="flex items-start gap-3 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-3.5 text-left hover:border-[var(--idealy-indigo)] transition-all"
                onClick={() =>
                  handleLaunchWithPrompt(
                    "Conçois une architecture d'API sécurisée avec schéma de base de données PostgreSQL.",
                    "Architecture Backend & Schéma",
                  )
                }
                type="button"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--idealy-indigo-bg)] text-[var(--idealy-indigo)]">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--dsw-alias-label-primary)]">
                    Architecture & Modèles de Données
                  </h4>
                  <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] mt-0.5">
                    Mobilisez Sasuke pour spécifier un schéma robuste et performant.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </PageFrame>
  );
};
