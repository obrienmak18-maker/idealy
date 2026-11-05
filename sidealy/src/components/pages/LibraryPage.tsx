import {
  ArrowRight,
  Bot,
  Check,
  Code2,
  Copy,
  MessageSquare,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
  Layers,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { hasConversationActivity } from "../../services/conversationVisibility";
import { PageFrame } from "../layout/PageFrame";
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

  const activeConversationsCount = useMemo(
    () =>
      conversations
        .filter((c) => !c.isArchived)
        .filter((c) => hasConversationActivity(c, messages)).length,
    [conversations, messages],
  );

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

  const filterPillClass = (active: boolean) =>
    `inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all shrink-0 active:scale-95 ${
      active
        ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
        : "bg-[var(--dsw-alias-bg-layer-2)] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l2)] hover:border-[var(--dsw-alias-border-l3)] hover:text-[var(--dsw-alias-label-primary)]"
    }`;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <PageFrame label="Bibliothèque">
      <div className="idealy-page-enter mx-auto max-w-4xl px-4 pb-12">
        {/* ─── Compact header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1 pb-4">
          <div>
            <h1 className="text-lg font-bold text-[var(--dsw-alias-label-primary)]">Bibliothèque</h1>
            <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] mt-0.5">
              Discussions, livrables et agents
            </p>
          </div>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--idealy-teal-petrol)] px-3 text-[11px] font-semibold text-white hover:brightness-110 active:scale-95 transition-all"
            onClick={() => {
              createConversation();
              setActivePage("chat");
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Nouvelle discussion
          </button>
        </div>

        {/* ─── Search bar (compact) ───────────────────────────────────── */}
        <div className="relative flex h-9 items-center rounded-lg bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l2)] px-3 focus-within:border-[var(--idealy-teal-petrol)]/60 transition-colors">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--dsw-alias-label-tertiary)] mr-2" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] outline-none"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            value={query}
          />
          {query && (
            <button
              className="p-0.5 text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)]"
              onClick={() => setQuery("")}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ─── Filter pills ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
          <button className={filterPillClass(filter === "all")} onClick={() => setFilter("all")} type="button">
            Tout
          </button>
          <button className={filterPillClass(filter === "chats")} onClick={() => setFilter("chats")} type="button">
            <MessageSquare className="h-3 w-3" />
            Discussions ({activeConversationsCount})
          </button>
          <button className={filterPillClass(filter === "artifacts")} onClick={() => setFilter("artifacts")} type="button">
            <Code2 className="h-3 w-3" />
            Livrables ({artifacts.length})
          </button>
          <button className={filterPillClass(filter === "creations")} onClick={() => setFilter("creations")} type="button">
            <Bot className="h-3 w-3" />
            Agents ({allGems.length})
          </button>
          <button className={filterPillClass(filter === "pinned")} onClick={() => setFilter("pinned")} type="button">
            <Pin className="h-3 w-3" />
            Épinglés
          </button>
        </div>

        {/* ─── Inline stats ───────────────────────────────────────────── */}
        <div className="mt-4 flex items-center gap-4 text-[11px] text-[var(--dsw-alias-label-tertiary)]">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-[var(--idealy-teal-petrol)]" />
            {activeConversationsCount} discussions
          </span>
          <span className="flex items-center gap-1">
            <Code2 className="h-3 w-3 text-[var(--idealy-indigo)]" />
            {artifacts.length} livrables
          </span>
          <span className="flex items-center gap-1">
            <Bot className="h-3 w-3 text-violet-500" />
            {allGems.length} agents
          </span>
        </div>

        {/* ─── Conversations list ─────────────────────────────────────── */}
        {(filter === "all" || filter === "chats" || filter === "pinned") && (
          <section className="mt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3 text-[var(--idealy-teal-petrol)]" />
              Discussions
            </h3>

            {matchingConversations.length > 0 ? (
              <div className="space-y-px rounded-lg border border-[var(--dsw-alias-border-l2)] overflow-hidden">
                {matchingConversations.map((conv) => (
                  <div
                    className="group flex items-center gap-3 px-3 py-2 bg-[var(--dsw-alias-bg-layer-2)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] cursor-pointer transition-colors"
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setActivePage("chat");
                    }}
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)]">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[var(--dsw-alias-label-primary)] truncate">
                          {conv.title}
                        </span>
                        {conv.isPinned && (
                          <Pin className="h-2.5 w-2.5 shrink-0 text-[var(--idealy-teal-petrol)] fill-current" />
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                        {formatDate(conv.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded hover:text-[var(--idealy-teal-petrol)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinConversation(conv.id);
                        }}
                        title={conv.isPinned ? "Désépingler" : "Épingler"}
                        type="button"
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                      <button
                        className="p-1 rounded hover:text-red-500 hover:bg-red-500/10"
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
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (filter === "chats" || filter === "pinned") ? (
              <div className="rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/40 p-5 text-center text-[11px] text-[var(--dsw-alias-label-secondary)]">
                Aucune discussion ne correspond à vos critères.
              </div>
            ) : null}
          </section>
        )}

        {/* ─── Artifacts list ─────────────────────────────────────────── */}
        {(filter === "all" || filter === "artifacts") && (
          <section className="mt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] mb-2 flex items-center gap-1.5">
              <Code2 className="h-3 w-3 text-[var(--idealy-indigo)]" />
              Livrables
            </h3>

            {matchingArtifacts.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {matchingArtifacts.map((art) => (
                  <div
                    className="group flex items-start gap-2.5 p-2.5 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] hover:border-[var(--idealy-indigo)]/40 cursor-pointer transition-colors"
                    key={art.id}
                    onClick={() => openArtifact(art.id)}
                  >
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[var(--idealy-indigo-bg)] text-[var(--idealy-indigo)] shrink-0 mt-0.5">
                      {art.language || art.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-[var(--dsw-alias-label-primary)] truncate">
                        {art.title}
                      </h4>
                      <p className="text-[10px] text-[var(--dsw-alias-label-tertiary)] mt-0.5">
                        {(art.content.length / 1024).toFixed(1)} Ko
                      </p>
                    </div>
                    <button
                      className="p-1 rounded text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleCopyArtifactContent(e, art.id, art.content)}
                      title="Copier"
                      type="button"
                    >
                      {copiedId === art.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : filter === "artifacts" ? (
              <div className="rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/40 p-5 text-center text-[11px] text-[var(--dsw-alias-label-secondary)]">
                Aucun livrable généré pour le moment.
              </div>
            ) : null}
          </section>
        )}

        {/* ─── Agents gallery ─────────────────────────────────────────── */}
        {(filter === "all" || filter === "creations") && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] flex items-center gap-1.5">
                <Bot className="h-3 w-3 text-violet-500" />
                Agents
              </h3>
              <button
                className="text-[11px] font-medium text-[var(--idealy-teal-petrol)] hover:underline flex items-center gap-0.5"
                onClick={() => setActivePage("agents")}
                type="button"
              >
                Tout voir <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {matchingGems.slice(0, 6).map((gem) => (
                <div
                  className="group flex items-center gap-2.5 p-2.5 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] hover:border-violet-500/40 cursor-pointer transition-colors"
                  key={gem.name}
                  onClick={() => {
                    createConversation(undefined, `Mission avec ${gem.name}`);
                    setDraft(`Bonjour ${gem.name}, intervenons sur : `);
                    setActivePage("chat");
                  }}
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--dsw-alias-border-l3)]">
                    <img
                      alt={gem.name}
                      className="h-full w-full object-cover"
                      src={gem.avatarUrl}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-[var(--dsw-alias-label-primary)] truncate">
                      {gem.name}
                    </h4>
                    <span className="text-[10px] text-violet-500">{gem.role}</span>
                  </div>
                  <ArrowRight className="h-3 w-3 shrink-0 text-[var(--dsw-alias-label-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Empty state: starter ideas ─────────────────────────────── */}
        {conversations.length === 0 && artifacts.length === 0 && (
          <div className="mt-8 rounded-lg border border-[var(--idealy-teal-petrol)]/20 bg-[var(--idealy-teal-bg)]/10 p-4">
            <h3 className="text-xs font-bold text-[var(--dsw-alias-label-primary)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
              Projets pour débuter
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                className="flex items-center gap-2.5 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-2.5 text-left hover:border-[var(--idealy-teal-petrol)] transition-all"
                onClick={() =>
                  handleLaunchWithPrompt(
                    "Construis une application web React avec Tailwind CSS et dashboard interactif.",
                    "Application Dashboard React",
                  )
                }
                type="button"
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)]">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-[var(--dsw-alias-label-primary)]">
                    Application Web Complète
                  </h4>
                  <p className="text-[10px] text-[var(--dsw-alias-label-secondary)] mt-0.5">
                    Dashboard modulaire avec React et Tailwind.
                  </p>
                </div>
              </button>
              <button
                className="flex items-center gap-2.5 rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-2.5 text-left hover:border-[var(--idealy-indigo)] transition-all"
                onClick={() =>
                  handleLaunchWithPrompt(
                    "Conçois une architecture d'API sécurisée avec schéma de base de données PostgreSQL.",
                    "Architecture Backend & Schéma",
                  )
                }
                type="button"
              >
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--idealy-indigo-bg)] text-[var(--idealy-indigo)]">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-[var(--dsw-alias-label-primary)]">
                    Architecture & Données
                  </h4>
                  <p className="text-[10px] text-[var(--dsw-alias-label-secondary)] mt-0.5">
                    API sécurisée avec schéma PostgreSQL.
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
