"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Key,
  Loader2,
  Link2,
  Layers,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { getConnectorBrandLogo } from "@/components/connectors/brand-logos";
import type { ConnectorDefinition } from "@/lib/idealy/connectors";

interface ConnectorDetailViewProps {
  connector: ConnectorDefinition;
}

export function ConnectorDetailView({ connector }: ConnectorDetailViewProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/idealy/connectors/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Connector status unavailable");
        return response.json() as Promise<{
          integrations?: Array<{ provider?: string; status?: string; serverReady?: boolean }>
        }>;
      })
      .then((payload) => {
        if (!active) return;
        const status = payload.integrations?.find(
          (entry) => entry.provider === connector.id || entry.provider === connector.provider,
        );
        setIsConnected(status?.status === "active" && status.serverReady === true);
      })
      .catch(() => {
        if (active) setIsConnected(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, [connector.id, connector.provider]);

  const startOAuth = async () => {
    if (connector.auth !== "oauth2" || isConnected) return;
    setConnecting(true);
    const provider = connector.id === "google-drive" ? "google-drive" : connector.provider;
    try {
      const endpoint = provider === "vercel"
        ? "/api/idealy/connectors/vercel/start"
        : "/api/idealy/connectors/start";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (response.status === 401) {
        throw new Error("Connecte-toi à Idealy avant de relier ce compte.");
      }
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "La connexion OAuth est momentanément indisponible.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de démarrer la connexion.");
      setConnecting(false);
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation retour */}
        <div className="mb-6">
          <Link
            href="/connectors"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-2 text-xs font-medium text-on-surface-variant shadow-sm transition-colors hover:border-ring/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-3.5" />
            <span>Retour aux connecteurs</span>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between relative z-10">
            <div className="flex items-start gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-high shadow-sm">
                {getConnectorBrandLogo(connector.id, "size-8 text-foreground", 32)}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {connector.label}
                  </h1>
                  <span className="rounded-full border border-outline-variant bg-surface-container px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                    {connector.category}
                  </span>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-idealy-success/30 bg-idealy-success/10 px-3 py-0.5 text-xs font-medium text-idealy-success">
                      <CheckCircle2 className="size-3.5" /> Connecté
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-0.5 text-xs font-medium text-on-surface-variant">
                      À configurer
                    </span>
                  )}
                </div>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
                  {connector.description}
                </p>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex shrink-0 items-center gap-3">
              {connector.auth === "oauth2" && !isConnected ? (
                <button
                  type="button"
                  disabled={checking || connecting}
                  onClick={() => void startOAuth()}
                  className="inline-flex items-center gap-2 rounded-full border border-transparent bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {checking || connecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Link2 className="size-3.5" />
                  )}
                  <span>{checking ? "Vérification…" : connecting ? "Redirection…" : "Connecter avec " + connector.label}</span>
                </button>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-idealy-success/30 bg-idealy-success/10 px-3 py-2 text-xs font-medium text-idealy-success">
                  <CheckCircle2 className="size-3.5" />
                  Connecté
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  {connector.auth === "managed" ? "Géré par Idealy" : "Configuration serveur"}
                </span>
              )}

              {connector.docsUrl && (
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-on-surface-variant transition-colors hover:border-ring/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  title="Documentation officielle"
                  aria-label="Documentation officielle"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Grille des Détails Techniques */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Capacités & Opérations */}
          <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Capacités de l'Escouade
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Ce que les agents peuvent exécuter via ce connecteur :
            </p>

            <div className="space-y-2.5">
              {connector.operations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`size-2 rounded-full ${
                        op.risk === "read"
                          ? "bg-emerald-400"
                          : op.risk === "write"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                    />
                    <span className="font-medium text-foreground">
                      {op.label}
                    </span>
                  </div>
                  <span className="rounded-md bg-surface-container-high px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {op.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sécurité & Périmètre des Données */}
          <div className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <ShieldCheck className="size-4 text-idealy-success" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Sécurité & Confidentialité
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Garanties contractuelles de sécurité d'Idealy :
            </p>

            <div className="space-y-3 text-xs text-on-surface-variant">
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container p-3.5">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Key className="size-3.5 text-idealy-activity" />
                  <span>Isolation des secrets</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Le client navigateur ne reçoit jamais les secrets d'API ni les jetons sensibles. Toutes les requêtes transitent par notre proxy serveur sécurisé.
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/60 bg-surface-container p-3.5">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Layers className="size-3.5 text-violet-400" />
                  <span>Périmètre des données</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {connector.dataBoundary === "user-selected-assets"
                    ? "Accès restreint exclusivement aux ressources et dépôts explicitement sélectionnés par l'utilisateur."
                    : connector.dataBoundary === "metadata-only"
                    ? "Accès strictement limité aux métadonnées techniques sans lecture du contenu utilisateur."
                    : "Périmètre d'action géré de manière sécurisée côté serveur pour l'espace projet actif."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scopes & Notes */}
        {connector.scopes && connector.scopes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-outline-variant/70 bg-surface-container-low p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <Code2 className="size-4 text-violet-400" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Permissions OAuth requises
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {connector.scopes.map((scope) => (
                <span
                  key={scope}
                  className="rounded-lg border border-outline-variant bg-surface-container px-2.5 py-1 font-mono text-[11px] text-on-surface-variant"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes additionnelles */}
        {connector.notes && connector.notes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-outline-variant/70 bg-surface-container p-4">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {connector.notes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
