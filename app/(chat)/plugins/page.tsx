"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeftIcon,
  SearchIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { IdealyOrbitalDisc } from "@/components/connectors/idealy-orbital-disc";
import { getConnectorBrandLogo } from "@/components/connectors/brand-logos";
import { listConnectorDefinitions } from "@/lib/idealy/connectors";

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const connectors = listConnectorDefinitions();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // This list is always hydrated from the authenticated backend; never toggled locally.
  const [connectedList, setConnectedList] = useState<string[]>([]);
  const [statusState, setStatusState] = useState<
    "checking" | "ready" | "unauthenticated" | "unavailable"
  >("checking");
  const [statusMessage, setStatusMessage] = useState(
    "Vérification du statut des connexions…"
  );
  const [connectingId, setConnectingId] = useState<string | null>(null);

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

  // Load the backend's persisted OAuth state. An unavailable/unauthenticated
  // status must never fall back to a locally simulated connected state.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadConnectorStatus() {
      try {
        const response = await fetch("/api/idealy/connectors/status", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!active) return;
        if (response.status === 401) {
          setConnectedList([]);
          setStatusState("unauthenticated");
          setStatusMessage(
            "Connecte-toi à Idealy pour consulter les autorisations de tes connecteurs."
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Le service de statut a répondu ${response.status}.`
          );
        }

        const payload = (await response.json()) as {
          integrations?: Array<{
            provider?: string;
            status?: string;
            serverReady?: boolean;
          }>;
        };
        if (!Array.isArray(payload.integrations)) {
          throw new Error("Le service a renvoyé un statut de connecteurs invalide.");
        }

        const liveActive = payload.integrations
          .filter(
            (entry) => entry.status === "active" && entry.serverReady === true
          )
          .flatMap((entry) =>
            entry.provider === "google"
              ? ["google-drive"]
              : entry.provider
                ? [entry.provider]
                : []
          );

        if (!active) return;
        setConnectedList(Array.from(new Set(liveActive)));
        setStatusState("ready");
        setStatusMessage(
          liveActive.length > 0
            ? `${liveActive.length} autorisation(s) OAuth enregistrée(s), avec la configuration serveur disponible.`
            : "Aucune autorisation OAuth active avec configuration serveur disponible n’a été trouvée."
        );
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setConnectedList([]);
        setStatusState("unavailable");
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Le statut des connecteurs est actuellement indisponible."
        );
      }
    }

    void loadConnectorStatus();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  // OAuth returns here after consent. Report the result once and remove callback
  // parameters so a page refresh does not replay the notification.
  useEffect(() => {
    const url = new URL(window.location.href);
    const connectedProvider = url.searchParams.get("connected");
    const displayName = url.searchParams.get("display");
    const error = url.searchParams.get("error");

    if (connectedProvider) {
      toast.success((displayName || connectedProvider) + " est connecté à Idealy.");
    } else if (error) {
      const friendlyErrors: Record<string, string> = {
        access_denied: "Autorisation refusée. Aucun compte n’a été connecté.",
        provider_not_configured: "Ce connecteur n’est pas encore configuré côté serveur.",
        oauth_server_not_configured: "Le service de connexion n’est pas encore configuré côté serveur.",
        invalid_or_expired_state: "Cette demande de connexion a expiré. Réessaie.",
        token_exchange_failed: "Le fournisseur n’a pas accepté l’échange de connexion. Vérifie la configuration OAuth.",
        credential_storage_failed: "Le compte a répondu, mais Idealy n’a pas pu enregistrer les identifiants de façon sécurisée.",
        plugin_activation_failed: "Le compte a répondu, mais l’activation du connecteur n’a pas abouti.",
        integration_callback_failed: "La connexion n’a pas abouti. Réessaie depuis Idealy.",
      };
      toast.error(friendlyErrors[error] ?? "La connexion a échoué. Réessaie depuis Idealy.");
    }

    if (connectedProvider || error || displayName) {
      url.searchParams.delete("connected");
      url.searchParams.delete("display");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
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
    const connector = connectors.find((entry) => entry.id === id);
    if (!connector) {
      toast.error("Connecteur introuvable.");
      return;
    }

    if (connectedList.includes(id)) {
      toast.info(
        "La déconnexion depuis Idealy n’est pas encore disponible. Aucun état local n’a été modifié."
      );
      return;
    }

    if (connector.auth !== "oauth2") {
      const message =
        connector.auth === "managed"
          ? "Cette intégration est gérée côté serveur et ne se connecte pas depuis ce bouton."
          : "Ce connecteur nécessite une configuration serveur. Aucun faux état de connexion ne sera affiché.";
      toast.error(message);
      return;
    }

    setConnectingId(id);
    try {
      const oauthProvider =
        connector.id === "google-drive" ? "google-drive" : connector.provider;
      const startEndpoint =
        oauthProvider === "vercel"
          ? "/api/idealy/connectors/vercel/start"
          : "/api/idealy/connectors/start";
      const response = await fetch(startEndpoint, {
        body: JSON.stringify({ provider: oauthProvider }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || typeof payload?.url !== "string" || !payload.url) {
        throw new Error(
          payload?.error ??
            `Le service OAuth de ${connector.label} n’a pas fourni d’URL d’autorisation.`
        );
      }

      // The persisted state is refreshed after the provider redirects back.
      // Do not set connectedList here: opening OAuth is not a completed connection.
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Impossible de démarrer la connexion à ${connector.label}.`
      );
      setConnectingId(null);
    }
  };

  return (
    <main className="relative min-h-dvh bg-background text-foreground pb-20 select-none overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -left-36 -top-32 size-[30rem] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute -right-40 top-[18%] size-[34rem] rounded-full bg-violet-500/[0.07] blur-[135px]" />
        <div className="absolute bottom-[-12rem] left-[24%] size-[28rem] rounded-full bg-cyan-500/[0.05] blur-[120px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
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
            Relie tes outils pour donner à Idealy les autorisations dont il a réellement besoin.
          </p>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Le statut provient du backend et du dernier retour OAuth. Il ne garantit pas, à lui seul, que chaque opération du fournisseur soit disponible.
          </p>
          <p
            aria-live="polite"
            className="mt-3 flex items-start gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
            role="status"
          >
            <span
              aria-hidden="true"
              className={`mt-1 size-1.5 shrink-0 rounded-full ${
                statusState === "ready"
                  ? "bg-emerald-500"
                  : statusState === "unavailable"
                    ? "bg-amber-500"
                    : statusState === "unauthenticated"
                      ? "bg-muted-foreground"
                      : "animate-pulse bg-primary"
              }`}
            />
            <span>
              {statusMessage}
              {statusState === "unauthenticated"
                ? " Aucun connecteur n’est affiché comme connecté sans session vérifiée."
                : ""}
            </span>
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

                {/* Les états positifs viennent exclusivement du backend. */}
                <div className="shrink-0">
                  {isConnected ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-idealy-success/30 bg-idealy-success/10 px-3 py-1.5 text-xs font-medium text-idealy-success"
                      title="Autorisation enregistrée côté serveur"
                    >
                      <span className="size-1.5 rounded-full bg-idealy-success" />
                      <span>Autorisation active</span>
                    </span>
                  ) : connector.auth === "oauth2" ? (
                    <button
                      disabled={connectingId === connector.id || statusState === "checking"}
                      type="button"
                      onClick={() => void toggleConnector(connector.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/50 hover:bg-surface-container-high hover:text-foreground disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <PlusIcon className="size-3.5" />
                      <span>
                        {connectingId === connector.id
                          ? "Ouverture…"
                          : "Connecter"}
                      </span>
                    </button>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full border border-outline-variant bg-surface-container px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground"
                      title={
                        connector.auth === "managed"
                          ? "Cette intégration est gérée côté serveur."
                          : "Cette intégration nécessite une configuration côté serveur."
                      }
                    >
                      {connector.auth === "managed"
                        ? "Géré côté serveur"
                        : "Configuration serveur"}
                    </span>
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
