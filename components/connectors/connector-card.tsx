"use client";

import { useState } from "react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  LockKeyholeIcon,
  Settings2,
  Sparkles,
} from "lucide-react";
import type { ConnectorDefinition } from "@/lib/idealy/connectors";
import { GitHubConnectButton } from "./github-connect-button";
import { McpConfigModal } from "./mcp-config-modal";
import { Button } from "../ui/button";

interface ConnectorCardProps {
  connector: ConnectorDefinition;
  connected: boolean;
  managed: boolean;
  displayName?: string | null;
}

export function ConnectorCard({
  connector,
  connected,
  managed,
  displayName,
}: ConnectorCardProps) {
  const [mcpOpen, setMcpOpen] = useState(false);

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-[0_8px_30px_rgba(56,189,248,0.12)] dark:hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[15px] text-foreground tracking-tight">
                {connector.label}
              </h3>

              {connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2Icon className="size-3" /> Connecté{displayName ? ` · ${displayName}` : ""}
                </span>
              ) : managed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <LockKeyholeIcon className="size-3" /> Géré par Idealy
                </span>
              ) : (
                <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] text-muted-foreground font-medium">
                  À configurer
                </span>
              )}

              {connected && (
                <span className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80">
                  Vérifié par le service connecteur
                </span>
              )}
            </div>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {connector.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
              <span className="rounded-md bg-muted/50 px-2 py-0.5 font-medium">
                {connector.category.toUpperCase()}
              </span>
              <span>·</span>
              <span>{connector.operations.length} capacités</span>
              <span>·</span>
              <span>
                {connector.auth === "managed" ? "Accès serveur sécurisé" : "Consentement OAuth"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {connector.provider === "github" ? (
              <GitHubConnectButton />
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMcpOpen(true)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Settings2 className="size-3.5 text-primary" />
              <span>Configurer MCP</span>
            </Button>

            {connector.docsUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                asChild
              >
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Documentation externe"
                >
                  <ExternalLinkIcon className="size-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {connector.operations.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-border/40 flex flex-wrap gap-1.5">
            {connector.operations.slice(0, 4).map((op) => (
              <span
                key={op.id}
                className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 text-[10.5px] text-muted-foreground"
              >
                <Sparkles className="size-2.5 text-primary/70" />
                {op.label}
              </span>
            ))}
            {connector.operations.length > 4 && (
              <span className="text-[10.5px] text-muted-foreground self-center">
                +{connector.operations.length - 4} autres
              </span>
            )}
          </div>
        )}
      </article>

      <McpConfigModal
        open={mcpOpen}
        onOpenChange={setMcpOpen}
        connectorName={connector.label}
      />
    </>
  );
}
