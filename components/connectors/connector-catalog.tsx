"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConnectorDefinition } from "@/lib/idealy/connectors";
import { Input } from "../ui/input";
import { ConnectorCard } from "./connector-card";

type IntegrationStatus = {
  provider: string;
  status: string;
  serverReady?: boolean;
  displayName?: string | null;
};

const VISIBLE_PROVIDERS = new Set([
  "github",
  "supabase",
  "stripe",
  "vercel",
  "canva",
  "figma",
  "google-drive",
  "notion",
  "slack",
]);

export function ConnectorCatalog({
  connectors,
}: {
  connectors: readonly ConnectorDefinition[];
}) {
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectServiceState, setConnectServiceState] = useState<
    "checking" | "ready" | "unavailable"
  >("checking");
  const [query, setQuery] = useState("");
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setQuery(event.target.value),
    []
  );

  useEffect(() => {
    let active = true;
    fetch("/api/idealy/connectors/status", { cache: "no-store" })
      .then((response) => {
        if (response.status === 401) {
          throw new Error("Connectez-vous pour relier vos propres comptes.");
        }
        if (!response.ok) {
          throw new Error(
            "Le statut des comptes est momentanément indisponible."
          );
        }
        return response.json() as Promise<{
          integrations?: IntegrationStatus[];
        }>;
      })
      .then((payload) => {
        if (active) {
          setConnectServiceState("ready");
          setStatuses(
            Array.isArray(payload.integrations) ? payload.integrations : []
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setConnectServiceState("unavailable");
          setNotice(
            error instanceof Error ? error.message : "Statut indisponible."
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const statusByProvider = useMemo(
    () => new Map(statuses.map((status) => [status.provider, status])),
    [statuses]
  );
  const visible = connectors.filter((connector) => {
    if (!VISIBLE_PROVIDERS.has(connector.provider)) {
      return false;
    }
    const value =
      `${connector.label} ${connector.description} ${connector.provider}`.toLowerCase();
    return value.includes(query.trim().toLowerCase());
  });

  return (
    <section className="space-y-3" id="catalogue">
      {notice ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}
      <div className="relative block">
        <label className="sr-only" htmlFor="connector-search">
          Rechercher un connecteur
        </label>
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="h-10 rounded-xl border-outline-variant bg-surface-container-low pl-9"
          id="connector-search"
          onChange={handleSearchChange}
          placeholder="Rechercher un connecteur…"
          value={query}
        />
      </div>
      <div className="divide-y divide-outline-variant/60 overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-container-low">
        {visible.map((connector) => {
          const canonicalProvider = connector.provider === "google" ? "google-drive" : connector.provider;
          const status = statusByProvider.get(canonicalProvider) ?? statusByProvider.get(connector.id);
          return (
            <ConnectorCard
              connected={status?.status === "active" && status.serverReady === true}
              connector={connector}
              connectServiceState={connectServiceState}
              connectUnavailableReason={notice}
              displayName={status?.displayName ?? null}
              key={connector.id}
              managed={connector.availability === "configured"}
            />
          );
        })}
        {visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Aucun résultat.
          </p>
        ) : null}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        D’autres connecteurs seront ajoutés après vérification de leur connexion
        réelle.
      </p>
    </section>
  );
}
