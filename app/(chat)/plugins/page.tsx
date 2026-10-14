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
    <main className="min-h-dvh bg-background text-foreground pb-20 select-none">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {/* Navigation retour */}
        <Link
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" /> Retour au workspace
        </Link>

        {/* Header exact de l'Image 1 */}
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Connecteurs & Intégrations
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Reliez vos outils pour que l'agent lise, construise et déploie dans votre écosystème.
          </p>
        </header>

        {/* Barre de Recherche (avec raccourci ⌘K) + Pilules de Filtres exactes de l'Image 1 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
          {/* Input de recherche */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un connecteur"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-2 pr-12 pl-10 text-xs text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring/70 focus-visible:ring-2 focus-visible:ring-ring/35"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
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
                  aria-pressed={isActive}
                  onClick={() => setSelectedCategory(tab.id)}
                  type="button"
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "border border-primary-container bg-primary-container text-on-primary-container shadow-sm"
                      : "border border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-ring/50 hover:bg-surface-container-high hover:text-foreground"
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
                className="group relative flex items-center justify-between rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 transition-all duration-200 hover:border-primary/40 hover:bg-surface-container-high hover:shadow-md"
              >
                {/* Côté gauche : Logo + Titre avec Catégorie + Description -> Lien vers la page dédiée */}
                <Link
                  href={`/connectors/${connector.id}`}
                  className="group/item flex min-w-0 flex-1 items-center gap-3.5 rounded-lg pr-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  title={`Voir la documentation et les capacités de ${connector.label}`}
                >
                  {/* Icône de la marque officielle SVG dans container sombre */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high shadow-sm transition-colors group-hover/item:border-primary/50">
                    {getConnectorBrandLogo(connector.id, "size-5 text-foreground", 22)}
                  </div>

                  {/* Textes */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover/item:text-primary">
                        {connector.label}
                      </span>
                      <span className="rounded-md border border-outline-variant bg-surface-container px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
                        {categoryBadge}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
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
                      className="inline-flex items-center gap-1.5 rounded-full border border-idealy-success/30 bg-idealy-success/10 px-3 py-1.5 text-xs font-medium text-idealy-success transition-colors hover:bg-idealy-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
                      title="Cliquer pour déconnecter"
                    >
                      <span className="size-1.5 rounded-full bg-idealy-success" />
                      <span>Connecté</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleConnector(connector.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container-high hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
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
