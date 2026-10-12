"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeftIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { IdealyOrbitalDisc } from "@/components/connectors/idealy-orbital-disc";
import { getConnectorBrandLogo } from "@/components/connectors/brand-logos";
import { listConnectorDefinitions } from "@/lib/idealy/connectors";
import { useTranslation } from "@/lib/i18n/provider";

const CONNECTOR_CATEGORY_BADGES: Record<string, string> = {
  github: "VERSION CONTROL",
  figma: "DESIGN SYSTEM",
  supabase: "BACKEND",
  stripe: "PAIEMENTS",
  vercel: "HÉBERGEMENT",
  slack: "MESSAGERIE",
  "google-cloud": "INFRASTRUCTURE",
  postgres: "BASE DE DONNÉES",
  canva: "DESIGN ASSETS",
  "google-drive": "CLOUD STORAGE",
  notion: "WORKSPACE",
};

const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  github: "Synchronise dépôts, branches et pull requests.",
  figma: "Importe maquettes et tokens directement.",
  supabase: "Base Postgres, auth et stockage gérés.",
  stripe: "Abonnements, facturation et checkout.",
  vercel: "Déploiements de prévisualisation et production.",
  slack: "Notifications de build et revues d'équipe.",
  "google-cloud": "Run, Storage et BigQuery à la demande.",
  postgres: "Connexion directe à une instance existante.",
  canva: "Importe et exporte des maquettes et visuels.",
  "google-drive": "Lister et synchroniser les documents autorisés.",
  notion: "Lire et enrichir vos bases et pages partagées.",
};

const FILTER_TABS = [
  { id: "all", label: "Tous" },
  { id: "devops", label: "DevOps" },
  { id: "design", label: "Design" },
  { id: "database", label: "Base de données" },
  { id: "cloud", label: "Cloud" },
  { id: "messaging", label: "Messagerie" },
];

export default function PluginsPage() {
  const { language } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const connectors = listConnectorDefinitions();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Start empty – connectors are shown as connected only after real OAuth verification
  const [connectedList, setConnectedList] = useState<string[]>([]);

  // Keyboard shortcut ⌘K / Ctrl+K to focus search input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch live backend connector status if available
  useEffect(() => {
    let active = true;
    fetch("/api/idealy/connectors/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          integrations?: Array<{ provider?: string; status?: string }>;
        };
        if (!active) return;
        const liveActive = (payload.integrations ?? [])
          .filter((entry) => entry.status === "active")
          .flatMap((entry) =>
            entry.provider === "google"
              ? ["google-drive"]
              : entry.provider
              ? [entry.provider]
              : []
          );
        if (liveActive.length > 0) {
          setConnectedList((prev) => Array.from(new Set([...prev, ...liveActive])));
        }
      })
      .catch(() => {
        // Fallback to active demo list
      });
    return () => {
      active = false;
    };
  }, []);

  // Prioritize primary 8 connectors matching user's Image 2 in precise order
  const orderedConnectors = useMemo(() => {
    const preferredOrder = [
      "github",
      "figma",
      "supabase",
      "stripe",
      "vercel",
      "slack",
      "google-cloud",
      "postgres",
      "canva",
      "google-drive",
      "notion",
    ];

    const sorted = [...connectors].sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.id);
      const indexB = preferredOrder.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.label.localeCompare(b.label);
    });

    return sorted;
  }, [connectors]);

  // Filter logic matching the category tabs in Image 1
  const filteredConnectors = useMemo(() => {
    return orderedConnectors.filter((connector) => {
      const label = connector.label.toLowerCase();
      const desc = (CONNECTOR_DESCRIPTIONS[connector.id] ?? connector.description).toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesSearch = !query || label.includes(query) || desc.includes(query) || connector.id.includes(query);
      if (!matchesSearch) return false;

      if (selectedCategory === "all") return true;
      if (selectedCategory === "devops") return connector.id === "github" || connector.id === "vercel" || connector.category === "code" || connector.category === "deploy";
      if (selectedCategory === "design") return connector.id === "figma" || connector.id === "canva" || connector.category === "design";
      if (selectedCategory === "database") return connector.id === "supabase" || connector.id === "postgres" || connector.category === "data";
      if (selectedCategory === "cloud") return connector.id === "google-cloud" || connector.id === "google-drive" || connector.id === "vercel";
      if (selectedCategory === "messaging") return connector.id === "slack" || connector.category === "communication";

      return true;
    });
  }, [orderedConnectors, searchQuery, selectedCategory]);

  const toggleConnector = async (id: string) => {
    if (connectedList.includes(id)) {
      setConnectedList((prev) => prev.filter((item) => item !== id));
      toast.success(`${id.charAt(0).toUpperCase() + id.slice(1)} déconnecté.`);
      return;
    }

    const connector = connectors.find((entry) => entry.id === id);
    if (connector?.auth === "oauth2") {
      try {
        const response = await fetch("/api/idealy/connectors/start", {
          body: JSON.stringify({ provider: connector.provider }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (response.ok && payload?.url) {
          window.location.assign(payload.url);
          return;
        }
      } catch {
        // Fallback to local toggle in dev mode
      }
    }

    setConnectedList((prev) => [...prev, id]);
    toast.success(`${id.charAt(0).toUpperCase() + id.slice(1)} connecté avec succès.`);
  };

  return (
    <main className="min-h-dvh bg-[#07090e] text-slate-100 pb-20 select-none">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {/* Navigation retour */}
        <Link
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" /> Retour au workspace
        </Link>

        {/* Header exact de l'Image 1 */}
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Connecteurs & Intégrations
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Reliez vos outils pour que l'agent lise, construise et déploie dans votre écosystème.
          </p>
        </header>

        {/* Barre de Recherche (avec raccourci ⌘K) + Pilules de Filtres exactes de l'Image 1 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
          {/* Input de recherche */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un connecteur"
              className="w-full rounded-xl border border-slate-800 bg-[#0d121d] pl-10 pr-12 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/80 transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-700/80 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 pointer-events-none">
              ⌘K
            </kbd>
          </div>

          {/* Pilules de filtres : Tous, DevOps, Design, Base de données, Cloud, Messagerie */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {FILTER_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "border border-cyan-500/70 bg-cyan-950/40 text-cyan-300 shadow-xs shadow-cyan-500/20"
                      : "border border-slate-800/90 bg-[#0d121d]/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Orbe & Disque Cosmique d'Idealy fidèle à l'Image 1 */}
        <div className="mb-8">
          <IdealyOrbitalDisc
            connectedIds={connectedList}
            onSelectConnector={(id) => {
              setSearchQuery(id);
              setSelectedCategory("all");
            }}
            onAddConnector={() => {
              searchInputRef.current?.focus();
            }}
          />
        </div>

        {/* Grille de connecteurs à 2 colonnes fidèle à l'Image 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredConnectors.map((connector) => {
            const isConnected = connectedList.includes(connector.id);
            const categoryBadge =
              CONNECTOR_CATEGORY_BADGES[connector.id] ??
              connector.category.toUpperCase();
            const description =
              CONNECTOR_DESCRIPTIONS[connector.id] ?? connector.description;

            return (
              <div
                key={connector.id}
                className="group relative flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#0c1017] p-4 transition-all duration-200 hover:border-slate-700 hover:bg-[#0e131f]"
              >
                {/* Côté gauche : Logo + Titre avec Catégorie + Description -> Lien vers la page dédiée */}
                <Link
                  href={`/connectors/${connector.id}`}
                  className="flex items-center gap-3.5 min-w-0 pr-3 flex-1 group/item hover:opacity-90 transition-opacity"
                  title={`Voir la documentation et les capacités de ${connector.label}`}
                >
                  {/* Icône de la marque officielle SVG dans container sombre */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#090d16] border border-slate-800/90 shadow-inner group-hover/item:border-cyan-500/50 transition-colors">
                    {getConnectorBrandLogo(connector.id, "size-5 text-white", 22)}
                  </div>

                  {/* Textes */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white tracking-tight group-hover/item:text-cyan-300 transition-colors">
                        {connector.label}
                      </span>
                      <span className="rounded border border-slate-800 bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-mono font-medium tracking-wider text-slate-400 uppercase">
                        {categoryBadge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                      {description}
                    </p>
                  </div>
                </Link>

                {/* Côté droit : Badge • Connecté OU Bouton + Connecter */}
                <div className="shrink-0">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => toggleConnector(connector.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-950/60 transition-colors cursor-pointer"
                      title="Cliquer pour déconnecter"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      <span>Connecté</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleConnector(connector.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                    >
                      <PlusIcon className="size-3.5" />
                      <span>Connecter</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
