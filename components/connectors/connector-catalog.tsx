"use client";

import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LinkIcon,
  Loader2Icon,
  LockKeyholeIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GitHubConnectButton } from "@/components/connectors/github-connect-button";
import type { ConnectorDefinition } from "@/lib/idealy/connectors";

type IntegrationStatus = {
  provider: string;
  status: "active" | "error" | "revoked" | "pending";
  displayName?: string | null;
};

export function ConnectorCatalog({
  connectors,
}: {
  connectors: readonly ConnectorDefinition[];
}) {
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStatuses() {
      try {
        const response = await fetch("/api/idealy/connectors/status", {
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) setNotice("Connectez-vous pour relier vos propres comptes.");
          return;
        }
        if (!response.ok) throw new Error("Statut indisponible");
        const payload = (await response.json()) as { integrations?: IntegrationStatus[] };
        if (active) setStatuses(Array.isArray(payload.integrations) ? payload.integrations : []);
      } catch {
        if (active) setNotice("Le statut des comptes est momentanément indisponible.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStatuses();
    return () => {
      active = false;
    };
  }, []);

  const statusByProvider = useMemo(
    () => new Map(statuses.map((status) => [status.provider, status])),
    [statuses],
  );

  return (
    <div className="grid gap-3" id="catalogue">
      {notice ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
      {connectors.map((connector) => {
        const status = statusByProvider.get(connector.provider);
        const connected = status?.status === "active";
        const managed = connector.availability === "configured";
        return (
          <article
            className="group relative overflow-hidden rounded-2xl border border-border/65 bg-card/72 p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
            key={connector.id}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#4285f4]/0 via-[#34a853]/50 via-[#fbbc05]/40 to-[#ea4335]/0" />
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{connector.label}</h2>
                  {connected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2Icon className="size-3" /> Connecté{status?.displayName ? ` · ${status.displayName}` : ""}
                    </span>
                  ) : managed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/12 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                      <LockKeyholeIcon className="size-3" /> Géré par Idealy
                    </span>
                  ) : (
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                      À configurer
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {connector.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground/80">
                  {connector.operations.length} capacités · {connector.auth === "managed" ? "accès serveur contrôlé" : "accès sur consentement"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {connector.id === "github" && !connected ? <GitHubConnectButton /> : null}
                {connector.id === "github" && connected ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2Icon className="size-3.5" /> Autorisé
                  </span>
                ) : null}
                {connector.id !== "github" && !managed ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/75">
                    {loading ? <Loader2Icon className="size-3 animate-spin" /> : <CircleAlertIcon className="size-3" />}
                    OAuth à relier côté serveur
                  </span>
                ) : null}
                {managed ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/75">
                    <LinkIcon className="size-3" /> Lecture protégée
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
