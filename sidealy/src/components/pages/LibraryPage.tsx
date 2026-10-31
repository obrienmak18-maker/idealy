import { FileText, MessageSquare, Plus, Search } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";

export const LibraryPage: React.FC = () => {
  const {
    artifacts,
    conversations,
    createConversation,
    openArtifact,
    setActiveConversationId,
    spaces,
  } = useApp();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingConversations = useMemo(
    () =>
      conversations
        .filter((conversation) => !conversation.isArchived)
        .filter(
          (conversation) =>
            !normalizedQuery ||
            conversation.title.toLocaleLowerCase().includes(normalizedQuery),
        )
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [conversations, normalizedQuery],
  );
  const matchingArtifacts = artifacts.filter(
    (artifact) =>
      !normalizedQuery ||
      artifact.title.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <main className="h-full overflow-y-auto px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              Votre espace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-main">
              Bibliothèque
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
              Retrouvez vos discussions et les fichiers produits dans vos
              conversations.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-medium text-brand-onPrimary hover:opacity-90 focus-ring"
            onClick={() => createConversation()}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" /> Nouvelle discussion
          </button>
        </div>

        <label className="mt-8 flex h-11 items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface px-3.5 text-text-muted focus-within:border-brand-primary/50">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="sr-only">Rechercher dans la bibliothèque</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-muted"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une discussion ou un livrable"
            value={query}
          />
        </label>

        <section aria-labelledby="library-conversations" className="mt-9">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold text-text-main"
              id="library-conversations"
            >
              Discussions
            </h2>
            <span className="text-xs text-text-muted">
              {matchingConversations.length}
            </span>
          </div>
          {matchingConversations.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {matchingConversations.map((conversation) => {
                const spaceName = spaces.find(
                  (space) => space.id === conversation.spaceId,
                )?.name;
                return (
                  <button
                    className="group min-h-[86px] rounded-2xl border border-border-subtle bg-bg-surface p-4 text-left transition-colors hover:border-brand-primary/40 hover:bg-bg-subtle focus-ring"
                    key={conversation.id}
                    onClick={() => setActiveConversationId(conversation.id)}
                    type="button"
                  >
                    <span className="flex items-start gap-3">
                      <MessageSquare
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-text-muted group-hover:text-brand-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-main">
                          {conversation.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-text-muted">
                          {spaceName ?? "Espace principal"} ·{" "}
                          {new Date(conversation.updatedAt).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-sm text-text-muted">
              Aucune discussion ne correspond à cette recherche.
            </p>
          )}
        </section>

        <section aria-labelledby="library-artifacts" className="mt-9 pb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-sm font-semibold text-text-main"
              id="library-artifacts"
            >
              Livrables
            </h2>
            <span className="text-xs text-text-muted">
              {matchingArtifacts.length}
            </span>
          </div>
          {matchingArtifacts.length ? (
            <div className="space-y-2">
              {matchingArtifacts.map((artifact) => (
                <button
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-left hover:bg-bg-subtle focus-ring"
                  key={artifact.id}
                  onClick={() => {
                    openArtifact(artifact.id);
                    setActiveConversationId(artifact.conversationId);
                  }}
                  type="button"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-brand-primary">
                    <FileText aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main">
                    {artifact.title}
                  </span>
                  <span className="text-xs text-text-muted">
                    {artifact.type}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border-subtle px-4 py-6 text-sm text-text-muted">
              Les livrables générés apparaîtront ici.
            </p>
          )}
        </section>
      </div>
    </main>
  );
};
