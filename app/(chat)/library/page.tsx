"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowUpRight,
  BookOpenIcon,
  Clock3,
  Search,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";

type ChatRecord = {
  id: string;
  title: string;
  createdAt: string;
};

type HistoryResponse = { chats?: ChatRecord[]; hasMore?: boolean };

const messages = {
  fr: {
    back: "Retour au workspace",
    description: "Retrouvez vos missions enregistrées et reprenez exactement là où vous en étiez.",
    empty: "Vos missions apparaîtront ici après votre première création.",
    emptyAction: "Créer une première mission",
    error: "Impossible de charger votre bibliothèque.",
    heading: "Vos projets, au même endroit.",
    loading: "Chargement de vos missions…",
    noResults: "Aucun projet ne correspond à votre recherche.",
    search: "Rechercher un projet",
    title: "Bibliothèque",
    total: (count: number) => `${count} ${count === 1 ? "mission" : "missions"}`,
    updated: (date: string) => `Créée le ${date}`,
    retry: "Réessayer",
    loadMore: "Charger plus de projets",
    loadingMore: "Chargement…",
    loadMoreError: "Impossible de charger la suite de l’historique.",
  },
  en: {
    back: "Back to workspace",
    description: "Find saved missions and pick up right where you left off.",
    empty: "Your missions will appear here after your first creation.",
    emptyAction: "Start your first mission",
    error: "Your library could not be loaded.",
    heading: "Your projects, all in one place.",
    loading: "Loading your missions…",
    noResults: "No projects match your search.",
    search: "Search projects",
    title: "Library",
    total: (count: number) => `${count} ${count === 1 ? "mission" : "missions"}`,
    updated: (date: string) => `Created ${date}`,
    retry: "Try again",
    loadMore: "Load more projects",
    loadingMore: "Loading…",
    loadMoreError: "More of your history could not be loaded.",
  },
  es: {
    back: "Volver al espacio de trabajo",
    description: "Encuentra tus misiones guardadas y continúa justo donde lo dejaste.",
    empty: "Tus misiones aparecerán aquí después de tu primera creación.",
    emptyAction: "Crear mi primera misión",
    error: "No se pudo cargar tu biblioteca.",
    heading: "Tus proyectos, en un solo lugar.",
    loading: "Cargando tus misiones…",
    noResults: "Ningún proyecto coincide con tu búsqueda.",
    search: "Buscar proyectos",
    title: "Biblioteca",
    total: (count: number) => `${count} ${count === 1 ? "misión" : "misiones"}`,
    updated: (date: string) => `Creada ${date}`,
    retry: "Reintentar",
    loadMore: "Cargar más proyectos",
    loadingMore: "Cargando…",
    loadMoreError: "No se pudo cargar el resto del historial.",
  },
} as const;

export default function LibraryPage() {
  const { language } = useTranslation();
  const locale = language === "en" || language === "es" ? language : "fr";
  const copy = messages[locale];
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    void fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?limit=50`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("history_unavailable");
        return (await response.json()) as HistoryResponse;
      })
      .then((data) => {
        setChats(Array.isArray(data.chats) ? data.chats : []);
        setHasMore(data.hasMore === true);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reload]);

  const filteredChats = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return chats;
    return chats.filter((chat) => chat.title.toLocaleLowerCase(locale).includes(normalizedQuery));
  }, [chats, locale, query]);

  const retry = useCallback(() => setReload((current) => current + 1), []);
  const loadMore = useCallback(async () => {
    const lastChat = chats.at(-1);
    if (!lastChat || !hasMore || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const params = new URLSearchParams({ ending_before: lastChat.id, limit: "50" });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("history_unavailable");
      const data = (await response.json()) as HistoryResponse;
      const nextChats = Array.isArray(data.chats) ? data.chats : [];
      setChats((current) => {
        const existingIds = new Set(current.map((chat) => chat.id));
        return [...current, ...nextChats.filter((chat) => !existingIds.has(chat.id))];
      });
      setHasMore(data.hasMore === true);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [chats, hasMore, loadingMore]);
  const dateLocale = locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";

  return (
    <main className="idealy-public-shell min-h-dvh px-5 py-7 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          className="mb-8 inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" /> {copy.back}
        </Link>

        <header className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/55 px-6 py-7 shadow-[var(--shadow-float)] backdrop-blur-xl sm:px-9 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-28 size-72 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="mb-4 flex size-11 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-500">
                <BookOpenIcon aria-hidden="true" className="size-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">{copy.title}</p>
              <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{copy.heading}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
            </div>
            <div aria-live="polite" className="inline-flex w-fit items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles aria-hidden="true" className="size-3.5 text-sky-500" /> {loading ? copy.loading : copy.total(chats.length)}
            </div>
          </div>
        </header>

        <section aria-label={copy.title} className="mt-7">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold">{copy.title}</h2>
            {!loading && chats.length > 0 ? (
              <label className="relative block w-full sm:max-w-xs">
                <span className="sr-only">{copy.search}</span>
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-xl border border-border/60 bg-background/55 pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  type="search"
                  value={query}
                />
              </label>
            ) : null}
          </div>

          {loading ? (
            <div aria-label={copy.loading} aria-live="polite" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="h-36 animate-pulse rounded-2xl border border-border/40 bg-muted/35 motion-reduce:animate-none" key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-8 text-center" role="alert">
              <p className="text-sm text-foreground">{copy.error}</p>
              <button className="mt-4 min-h-10 rounded-full border border-border/60 px-4 text-sm font-medium transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={retry} type="button">
                {copy.retry}
              </button>
            </div>
          ) : filteredChats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredChats.map((chat) => {
                const date = new Date(chat.createdAt);
                const formattedDate = Number.isNaN(date.getTime())
                  ? ""
                  : new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(date);
                return (
                  <Link
                    className="group flex min-h-36 flex-col justify-between rounded-2xl border border-border/55 bg-card/45 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/75 hover:shadow-[var(--shadow-float)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
                    href={`/chat/${chat.id}`}
                    key={chat.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-5">{chat.title || "Idealy"}</h3>
                      <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    {formattedDate ? (
                      <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 aria-hidden="true" className="size-3.5" /> {copy.updated(formattedDate)}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border/70 bg-card/20 px-5 py-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted/65 text-muted-foreground">
                <BookOpenIcon aria-hidden="true" className="size-5" />
              </div>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{chats.length ? copy.noResults : copy.empty}</p>
              {!chats.length ? (
                <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" href="/">
                  {copy.emptyAction}
                </Link>
              ) : null}
            </div>
          )}

          {!loading && !error && hasMore ? (
            <div className="mt-5 flex flex-col items-center gap-2">
              {loadMoreError ? <p className="text-xs text-destructive" role="alert">{copy.loadMoreError}</p> : null}
              <button
                className="min-h-10 rounded-full border border-border/60 bg-card/40 px-5 text-sm font-medium transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                type="button"
              >
                {loadingMore ? copy.loadingMore : copy.loadMore}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
