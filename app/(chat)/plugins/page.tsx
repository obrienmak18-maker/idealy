"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeftIcon,
  SearchIcon,
  PlugZapIcon,
  CheckCircle2Icon,
  PlusIcon,
  ExternalLinkIcon,
  LayersIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { IdealyOrbitalDisc } from "@/components/connectors/idealy-orbital-disc";
import { listConnectorDefinitions } from "@/lib/idealy/connectors";
import { useTranslation } from "@/lib/i18n/provider";

export default function PluginsPage() {
  const { language } = useTranslation();
  const connectors = listConnectorDefinitions();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectedList, setConnectedList] = useState<string[]>(["github", "supabase"]);

  const categories = [
    { id: "all", label: "Tous", count: connectors.length },
    { id: "enabled", label: "Actifs", count: connectedList.length },
    { id: "code", label: "Code & Git", count: connectors.filter((c) => c.category === "code" || c.category === "deploy").length },
    { id: "data", label: "Données & Cloud", count: connectors.filter((c) => c.category === "data").length },
    { id: "billing", label: "Paiements", count: connectors.filter((c) => c.category === "billing").length },
    { id: "design", label: "Design & Médias", count: connectors.filter((c) => c.category === "design").length },
    { id: "communication", label: "Communication", count: connectors.filter((c) => c.category === "communication").length },
  ];

  const filteredConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      const matchesSearch =
        connector.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        connector.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "enabled") return connectedList.includes(connector.id);
      if (selectedCategory === "code") return connector.category === "code" || connector.category === "deploy";
      return connector.category === selectedCategory;
    });
  }, [connectors, searchQuery, selectedCategory, connectedList]);

  const toggleConnect = (id: string) => {
    if (connectedList.includes(id)) {
      setConnectedList(connectedList.filter((item) => item !== id));
      toast.info(`Connecteur ${id} déconnecté.`);
    } else {
      setConnectedList([...connectedList, id]);
      toast.success(`Connecteur ${id} activé et prêt pour l'escouade.`);
    }
  };

  const getConnectorEmoji = (id: string) => {
    switch (id) {
      case "github": return "🐙";
      case "supabase": return "⚡";
      case "stripe": return "💳";
      case "vercel": return "▲";
      case "canva": return "🎨";
      case "figma": return "❖";
      case "notion": return "📝";
      case "google-drive": return "📁";
      case "slack": return "💬";
      default: return "🔌";
    }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground pb-20">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        {/* Navigation retour */}
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          href="/"
        >
          <ArrowLeftIcon className="size-4" /> Retour au workspace
        </Link>

        {/* Section Orbe & Disque Cosmique d'Idealy */}
        <section className="mb-10 rounded-3xl border border-border/70 bg-gradient-to-b from-card/90 via-card/40 to-background p-6 sm:p-10 shadow-2xl overflow-hidden relative">
          <div className="max-w-2xl mx-auto text-center mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400 mb-3">
              <SparklesIcon className="size-3.5" /> Écosystème Connecteurs Idealy
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Construisez avec vos outils préférés
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              L'escouade d'agents se connecte à vos dépôts, bases de données et services de déploiement pour exécuter vos ordres en direct.
            </p>
          </div>

          {/* Animation du disque orbital */}
          <IdealyOrbitalDisc
            onSelectConnector={(id) => {
              setSearchQuery(id);
              setSelectedCategory("all");
            }}
          />
        </section>

        {/* Section Actifs & Raccourcis style ChatGPT */}
        <section className="mb-8 rounded-2xl border border-border/60 bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CheckCircle2Icon className="size-3.5 text-emerald-500" /> Connecteurs Actifs ({connectedList.length})
            </h2>
            <span className="text-xs text-muted-foreground">Prêts pour l'orchestration</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {connectedList.map((id) => {
              const conn = connectors.find((c) => c.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-foreground backdrop-blur-sm"
                >
                  <span className="text-sm">{getConnectorEmoji(id)}</span>
                  <span>{conn?.label || id}</span>
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Layout façon Lovable : Barre de recherche + Filtres + Grille */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          {/* Panneau de filtres latéral */}
          <aside className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full rounded-xl border border-border/70 bg-card/60 pl-9 pr-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>

            <nav className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  type="button"
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      selectedCategory === cat.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              ))}
            </nav>

            <div className="rounded-2xl border border-border/60 bg-card/40 p-4 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <ShieldCheckIcon className="size-4 text-primary" /> Sécurité des clés
              </div>
              <p className="leading-relaxed text-[11px]">
                Vos jetons OAuth et clés de connecteurs sont isolés et protégés par chiffrement AES-GCM côté serveur.
              </p>
            </div>
          </aside>

          {/* Grille de cartes de connecteurs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredConnectors.map((connector) => {
              const isConnected = connectedList.includes(connector.id);
              return (
                <article
                  key={connector.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 backdrop-blur-sm ${
                    isConnected
                      ? "border-primary/50 bg-card/80 shadow-md shadow-primary/5"
                      : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-background text-lg shadow-xs">
                          {getConnectorEmoji(connector.id)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                            {connector.label}
                            {isConnected && (
                              <span className="size-2 rounded-full bg-emerald-500" />
                            )}
                          </h3>
                          <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
                            {connector.category}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                          isConnected
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isConnected ? "Actif" : "Disponible"}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {connector.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {connector.operations.slice(0, 3).map((op) => (
                        <span
                          key={op.id}
                          className="rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {op.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                    {connector.docsUrl ? (
                      <a
                        href={connector.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>Documentation</span>
                        <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={() => toggleConnect(connector.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isConnected
                          ? "border border-border/80 bg-background text-foreground hover:bg-muted"
                          : "bg-foreground text-background hover:opacity-90 shadow-xs"
                      }`}
                    >
                      {isConnected ? (
                        <span>Déconnecter</span>
                      ) : (
                        <>
                          <PlusIcon className="size-3.5" />
                          <span>Connecter</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
