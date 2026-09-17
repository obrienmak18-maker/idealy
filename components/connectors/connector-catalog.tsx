"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { ConnectorCard } from "./connector-card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type { ConnectorDefinition, ConnectorCategory } from "@/lib/idealy/connectors";
import { useTranslation } from "@/lib/i18n/provider";

type IntegrationStatus = {
  provider: string;
  status: "active" | "error" | "revoked" | "pending";
  displayName?: string | null;
};

const CATEGORIES: { id: "all" | ConnectorCategory; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "code", label: "Code & DevTools" },
  { id: "design", label: "Design" },
  { id: "data", label: "Données & Base" },
  { id: "deploy", label: "Déploiement" },
  { id: "communication", label: "Communication" },
  { id: "billing", label: "Facturation" },
];

export function ConnectorCatalog({
  connectors,
}: {
  connectors: readonly ConnectorDefinition[];
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | ConnectorCategory>("all");

  useEffect(() => {
    let active = true;
    async function loadStatuses() {
      try {
        const response = await fetch("/api/idealy/connectors/status", {
          cache: "no-store",
        });
        if (response.status === 401) {
          if (active) setNotice(t("connectors.authRequired", "Connectez-vous pour relier vos propres comptes."));
          return;
        }
        if (!response.ok) throw new Error("Statut indisponible");
        const payload = (await response.json()) as { integrations?: IntegrationStatus[] };
        if (active) setStatuses(Array.isArray(payload.integrations) ? payload.integrations : []);
      } catch {
        if (active) setNotice(t("connectors.statusUnavailable", "Le statut des comptes est momentanément indisponible."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStatuses();
    return () => {
      active = false;
    };
  }, [t]);

  const statusByProvider = useMemo(
    () => new Map(statuses.map((status) => [status.provider, status])),
    [statuses]
  );

  const filteredConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      const matchesCategory =
        selectedCategory === "all" || connector.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        connector.label.toLowerCase().includes(query) ||
        connector.description.toLowerCase().includes(query) ||
        connector.provider.toLowerCase().includes(query) ||
        connector.operations.some((op) => op.label.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [connectors, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6" id="catalogue">
      {notice ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {notice}
        </p>
      ) : null}

      {/* Search & Category Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("connectors.searchPlaceholder", "Rechercher un connecteur, une API ou un outil...")}
            className="pl-10 pr-10 h-10 rounded-xl bg-card/60 backdrop-blur-sm border-border/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              aria-label="Effacer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <Button
                key={cat.id}
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-8 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
              >
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredConnectors.length} connecteur{filteredConnectors.length > 1 ? "s" : ""}{" "}
          disponible{filteredConnectors.length > 1 ? "s" : ""}
        </span>
        {selectedCategory !== "all" || searchQuery ? (
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>

      {/* Connectors List */}
      <div className="grid gap-3.5">
        {filteredConnectors.length > 0 ? (
          filteredConnectors.map((connector) => {
            const status = statusByProvider.get(connector.provider);
            const connected = status?.status === "active";
            const managed = connector.availability === "configured";

            return (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                connected={connected}
                managed={managed}
                displayName={status?.displayName}
              />
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <Sparkles className="mx-auto size-8 text-muted-foreground/40 mb-3" />
            <h4 className="font-medium text-sm text-foreground">Aucun connecteur trouvé</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Essayez avec un autre mot-clé ou sélectionnez une autre catégorie.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
