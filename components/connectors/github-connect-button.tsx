"use client";

import { Loader2Icon, LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function GitHubConnectButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const response = await fetch("/api/idealy/connectors/github/start", {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Connexion GitHub indisponible.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Connexion GitHub indisponible."
      );
      setLoading(false);
    }
  }

  return (
    <button
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-60"
      disabled={loading}
      onClick={handleConnect}
      type="button"
    >
      {loading ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : (
        <LinkIcon className="size-3.5" />
      )}
      {loading ? "Redirection…" : "Connecter"}
    </button>
  );
}
