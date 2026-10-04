"use client";

import { ExternalLink, Globe2, LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type Preview = {
  description: string | null;
  host: string;
  siteName: string;
  title: string;
  url: string;
};

type LinkPreviewAnchorProps = ComponentProps<"a"> & {
  children?: ReactNode;
  node?: unknown;
};

export function LinkPreviewAnchor({
  children,
  href,
  node: _node,
  ...anchorProps
}: LinkPreviewAnchorProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const isExternalHttpLink =
    typeof href === "string" && /^https?:\/\//i.test(href);

  const loadPreview = useCallback(
    async (signal: AbortSignal) => {
      if (!isExternalHttpLink || preview || failed) {
        return;
      }
      try {
        const response = await fetch(
          `/api/link-preview?url=${encodeURIComponent(href)}`,
          { cache: "force-cache", signal }
        );
        if (!response.ok) {
          throw new Error("Preview unavailable");
        }
        const payload = (await response.json()) as Preview;
        if (
          typeof payload.title !== "string" ||
          typeof payload.host !== "string" ||
          typeof payload.siteName !== "string"
        ) {
          throw new Error("Invalid preview");
        }
        setPreview(payload);
      } catch {
        if (!signal.aborted) {
          setFailed(true);
        }
      }
    },
    [failed, href, isExternalHttpLink, preview]
  );

  useEffect(() => {
    if (!open || !isExternalHttpLink || preview || failed) {
      return;
    }
    const controller = new AbortController();
    loadPreview(controller.signal).then(
      () => undefined,
      () => undefined
    );
    return () => controller.abort();
  }, [failed, isExternalHttpLink, loadPreview, open, preview]);

  if (!isExternalHttpLink) {
    return (
      <a href={href} {...anchorProps}>
        {children}
      </a>
    );
  }

  return (
    <HoverCard
      closeDelay={160}
      onOpenChange={setOpen}
      open={open}
      openDelay={350}
    >
      <HoverCardTrigger asChild>
        <a
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          {...anchorProps}
        >
          {children}
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] p-0"
        side="top"
      >
        {preview ? (
          <a
            className="block overflow-hidden rounded-2xl text-inherit no-underline"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="bg-gradient-to-br from-primary/15 via-secondary/70 to-muted px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-primary">
                  <Globe2 className="size-4" />
                </span>
                <span className="min-w-0 truncate">{preview.siteName}</span>
                <ExternalLink className="ml-auto size-3.5 shrink-0" />
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {preview.title}
              </h3>
            </div>
            <div className="px-4 py-3">
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {preview.description ?? preview.host}
              </p>
              <p className="mt-2 truncate text-[10px] text-muted-foreground/70">
                {preview.host}
              </p>
            </div>
          </a>
        ) : (
          <div
            aria-live="polite"
            className="flex min-h-20 items-center gap-3 p-4"
          >
            {failed ? (
              <Globe2 className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {failed ? "Aperçu indisponible" : "Lecture du site…"}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {safeHost(href)}
              </p>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
