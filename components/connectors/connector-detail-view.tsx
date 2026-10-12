"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
  Plus,
  Key,
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
  const [connectedList, setConnectedList] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("idealy:connected-connectors");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setConnectedList(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const isConnected = connectedList.includes(connector.id);

  const toggleConnection = () => {
    const nextList = isConnected
      ? connectedList.filter((c) => c !== connector.id)
      : [...connectedList, connector.id];

    setConnectedList(nextList);
    try {
      window.localStorage.setItem(
        "idealy:connected-connectors",
        JSON.stringify(nextList)
      );
    } catch {
      // ignore
    }

    if (isConnected) {
      toast.info(`${connector.label} déconnecté.`);
    } else {
      toast.success(`${connector.label} connecté avec succès à l'escouade.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation retour */}
        <div className="mb-6">
          <Link
            href="/connectors"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0d121d] px-3.5 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="size-3.5" />
            <span>Retour aux connecteurs</span>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-[#0e1422] to-[#090d16] p-6 sm:p-8 shadow-2xl">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between relative z-10">
            <div className="flex items-start gap-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#070a12] border border-slate-700/80 shadow-inner">
                {getConnectorBrandLogo(connector.id, "size-8 text-white", 32)}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {connector.label}
                  </h1>
                  <span className="rounded-full border border-slate-700/80 bg-slate-800/70 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-300">
                    {connector.category}
                  </span>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-0.5 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="size-3.5" /> Connecté
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/40 px-3 py-0.5 text-xs font-medium text-slate-400">
                      À configurer
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base max-w-2xl">
                  {connector.description}
                </p>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={toggleConnection}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer shadow-md ${
                  isConnected
                    ? "border border-red-900/40 bg-red-950/30 text-red-300 hover:bg-red-900/40"
                    : "border border-cyan-500/60 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                }`}
              >
                {isConnected ? (
                  <>
                    <Lock className="size-3.5" />
                    <span>Déconnecter</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" />
                    <span>Connecter maintenant</span>
                  </>
                )}
              </button>

              {connector.docsUrl && (
                <a
                  href={connector.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/50 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
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
          <div className="rounded-2xl border border-slate-800/80 bg-[#0c1017] p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles className="size-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Capacités de l'Escouade
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Ce que les agents peuvent exécuter via ce connecteur :
            </p>

            <div className="space-y-2.5">
              {connector.operations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-[#080c14] p-3 text-xs"
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
                    <span className="font-medium text-slate-200">
                      {op.label}
                    </span>
                  </div>
                  <span className="rounded bg-slate-800/70 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                    {op.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sécurité & Périmètre des Données */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0c1017] p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <ShieldCheck className="size-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Sécurité & Confidentialité
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Garanties contractuelles de sécurité d'Idealy :
            </p>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="rounded-xl border border-slate-800/60 bg-[#080c14] p-3.5">
                <div className="flex items-center gap-2 font-medium text-white mb-1">
                  <Key className="size-3.5 text-sky-400" />
                  <span>Isolation des secrets</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Le client navigateur ne reçoit jamais les secrets d'API ni les jetons sensibles. Toutes les requêtes transitent par notre proxy serveur sécurisé.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-[#080c14] p-3.5">
                <div className="flex items-center gap-2 font-medium text-white mb-1">
                  <Layers className="size-3.5 text-violet-400" />
                  <span>Périmètre des données</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
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
          <div className="mt-6 rounded-2xl border border-slate-800/80 bg-[#0c1017] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <Code2 className="size-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Permissions OAuth requises
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {connector.scopes.map((scope) => (
                <span
                  key={scope}
                  className="rounded-lg border border-slate-800 bg-[#080c14] px-2.5 py-1 font-mono text-[11px] text-slate-300"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes additionnelles */}
        {connector.notes && connector.notes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800/60 bg-[#080c14] p-4">
            <div className="space-y-1.5 text-xs text-slate-400">
              {connector.notes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-500">•</span>
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
