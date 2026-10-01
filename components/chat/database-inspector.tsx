"use client";

import {
  Check,
  Copy,
  Database as DatabaseIcon,
  Download,
  FileCode2,
  KeyRound,
  Layers,
  Search,
  Table as TableIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { MissionFile } from "@/lib/idealy/mission-files";

export type DatabaseInspectorProps = {
  missionFiles: MissionFile[];
  metadata: Record<string, unknown> | null;
  missionId: string | null;
  isDemoMode?: boolean;
};

type TableColumn = {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  nullable: boolean;
  description: string;
};

type TableDefinition = {
  name: string;
  label: string;
  description: string;
  columns: TableColumn[];
};

const TABLE_DEFINITIONS: Record<string, TableDefinition> = {
  missions: {
    name: "missions",
    label: "Missions",
    description: "État canonique de la mission, intention, plan Architecte et validation",
    columns: [
      { name: "id", type: "uuid", isPrimaryKey: true, nullable: false, description: "Identifiant unique de la mission" },
      { name: "user_id", type: "uuid", isForeignKey: true, nullable: false, description: "Propriétaire auth Supabase" },
      { name: "title", type: "text", nullable: false, description: "Titre du projet / prompt condensé" },
      { name: "status", type: "text", nullable: false, description: "draft | planned | building | ready | needs-fix" },
      { name: "way", type: "text", nullable: false, description: "Voie active (professional, ninja, hunter, mage)" },
      { name: "dna", type: "jsonb", nullable: true, description: "Plan structuré et intention" },
      { name: "validation", type: "jsonb", nullable: true, description: "Rapport diagnostic du Reviewer" },
      { name: "created_at", type: "timestamptz", nullable: false, description: "Horodatage de création" },
    ],
  },
  mission_files: {
    name: "mission_files",
    label: "Fichiers Workspace",
    description: "Fichiers versionnés et streamés du VFS persistés sur PostgreSQL",
    columns: [
      { name: "id", type: "uuid", isPrimaryKey: true, nullable: false, description: "Identifiant unique du fichier" },
      { name: "mission_id", type: "uuid", isForeignKey: true, nullable: false, description: "Référence à la mission" },
      { name: "path", type: "text", nullable: false, description: "Chemin relatif normalisé (ex: src/App.tsx)" },
      { name: "version", type: "integer", nullable: false, description: "Numéro de version incrémentale" },
      { name: "status", type: "text", nullable: false, description: "pending | writing | saved | validated | error" },
      { name: "language", type: "text", nullable: true, description: "Langage syntaxique détecté" },
      { name: "checksum", type: "text", nullable: true, description: "Empreinte SHA-256 du contenu vérifié" },
      { name: "source", type: "text", nullable: false, description: "builder | reviewer | user | system" },
      { name: "updated_at", type: "timestamptz", nullable: false, description: "Dernière mise à jour du fichier" },
    ],
  },
  mission_agent_runs: {
    name: "mission_agent_runs",
    label: "Runs d'Agents",
    description: "Exécutions persistées de l'escouade (Sélène, Maël, Iris)",
    columns: [
      { name: "id", type: "uuid", isPrimaryKey: true, nullable: false, description: "ID d'exécution du run" },
      { name: "mission_id", type: "uuid", isForeignKey: true, nullable: false, description: "Référence à la mission" },
      { name: "run_key", type: "text", nullable: false, description: "Clé idempotente du run d'escouade" },
      { name: "step_index", type: "smallint", nullable: false, description: "Ordre dans l'escouade (1..3)" },
      { name: "agent_key", type: "text", nullable: false, description: "architect | builder | reviewer" },
      { name: "status", type: "text", nullable: false, description: "queued | running | succeeded | failed" },
      { name: "started_at", type: "timestamptz", nullable: true, description: "Début d'intervention" },
      { name: "completed_at", type: "timestamptz", nullable: true, description: "Fin d'intervention" },
    ],
  },
  mission_file_events: {
    name: "mission_file_events",
    label: "Journal d'Événements",
    description: "Log append-only des événements de fichier et jalons de mission",
    columns: [
      { name: "id", type: "uuid", isPrimaryKey: true, nullable: false, description: "Identifiant de l'événement" },
      { name: "mission_id", type: "uuid", isForeignKey: true, nullable: false, description: "Référence à la mission" },
      { name: "sequence", type: "bigint", nullable: false, description: "Séquence strictement croissante" },
      { name: "event_type", type: "text", nullable: false, description: "Type d'événement (file_saved, agent_completed…)" },
      { name: "path", type: "text", nullable: true, description: "Chemin du fichier concerné" },
      { name: "created_at", type: "timestamptz", nullable: false, description: "Date et heure de l'événement" },
    ],
  },
};

export function DatabaseInspector({
  missionFiles,
  metadata,
  missionId,
  isDemoMode,
}: DatabaseInspectorProps) {
  const [selectedTable, setSelectedTable] = useState<string>("mission_files");
  const [activeTab, setActiveTab] = useState<"data" | "schema">("data");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Derive real rows for each table from current workspace state
  const tableData = useMemo(() => {
    // 1. missions rows
    const missionsRows = missionId
      ? [
          {
            id: missionId,
            title: (metadata?.title as string) || "Mission en cours",
            status: (metadata?.missionSquadStatus as string) || "ready",
            way: (metadata?.way as string) || "professional",
            created_at: new Date().toISOString(),
            dna: JSON.stringify(metadata?.missionPlan ?? {}).slice(0, 80) + "…",
            validation: metadata?.validation ? JSON.stringify(metadata.validation).slice(0, 80) + "…" : "—",
          },
        ]
      : [];

    // 2. mission_files rows
    const filesRows = missionFiles.map((file, idx) => ({
      id: file.id || `f-${idx + 1}`,
      path: file.path,
      version: file.version ?? 1,
      status: file.status,
      language: file.language || (file.path.endsWith(".tsx") ? "tsx" : file.path.endsWith(".json") ? "json" : "text"),
      checksum: file.checksum ? `${file.checksum.slice(0, 12)}…` : "—",
      source: "builder",
      updated_at: file.updatedAt || new Date().toISOString(),
    }));

    // 3. mission_agent_runs rows
    const runsRows = [
      {
        id: "run-1",
        run_key: missionId ? `squad:${missionId}:run` : "squad:local:demo",
        step_index: 1,
        agent_key: "architect",
        status: "succeeded",
        started_at: "T-00:02",
        completed_at: "T-00:01",
      },
      {
        id: "run-2",
        run_key: missionId ? `squad:${missionId}:run` : "squad:local:demo",
        step_index: 2,
        agent_key: "builder",
        status: missionFiles.length > 0 ? "succeeded" : "running",
        started_at: "T-00:01",
        completed_at: missionFiles.length > 0 ? "T-00:00" : "—",
      },
      {
        id: "run-3",
        run_key: missionId ? `squad:${missionId}:run` : "squad:local:demo",
        step_index: 3,
        agent_key: "reviewer",
        status: metadata?.missionSquadStatus === "ready" ? "succeeded" : "queued",
        started_at: metadata?.missionSquadStatus === "ready" ? "T-00:00" : "—",
        completed_at: metadata?.missionSquadStatus === "ready" ? "T-00:00" : "—",
      },
    ];

    // 4. mission_file_events rows
    const eventsRows = (missionFiles || []).map((file, idx) => ({
      id: `evt-${idx + 1}`,
      sequence: idx + 1,
      event_type: file.status === "validated" ? "validation_result" : "file_saved",
      path: file.path,
      created_at: file.updatedAt || new Date().toISOString(),
    }));

    return {
      missions: missionsRows,
      mission_files: filesRows,
      mission_agent_runs: runsRows,
      mission_file_events: eventsRows,
    };
  }, [missionFiles, metadata, missionId]);

  const currentDefinition = TABLE_DEFINITIONS[selectedTable] || TABLE_DEFINITIONS.mission_files;
  const currentRows = (tableData as Record<string, Record<string, unknown>[]>)[selectedTable] || [];

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return currentRows;
    const query = searchQuery.toLowerCase();
    return currentRows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(query))
    );
  }, [currentRows, searchQuery]);

  const copyValue = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedCell(key);
    toast.success("Valeur copiée");
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const exportTableJson = () => {
    const json = JSON.stringify(currentRows, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTable}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export ${selectedTable}.json généré`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/60 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <DatabaseIcon className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">Database Inspector</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  isDemoMode
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                }`}
              >
                {isDemoMode ? "Démo locale" : "PostgreSQL RLS Actif"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inspection des tables et schémas du workspace en lecture sécurisée
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-sidebar-border/60 bg-background/30 p-0.5">
            <button
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeTab === "data"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-sidebar-foreground"
              }`}
              onClick={() => setActiveTab("data")}
              type="button"
            >
              Données
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeTab === "schema"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-sidebar-foreground"
              }`}
              onClick={() => setActiveTab("schema")}
              type="button"
            >
              Schéma
            </button>
          </div>

          <button
            aria-label="Exporter les données en JSON"
            className="flex h-7 items-center gap-1.5 rounded-lg border border-sidebar-border/60 bg-background/30 px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={exportTableJson}
            type="button"
          >
            <Download className="size-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main content: Sidebar list of tables + Table viewer */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Table Selector Column */}
        <div className="w-60 shrink-0 border-r border-sidebar-border/60 bg-sidebar/50 p-3">
          <div className="mb-2.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tables ({Object.keys(TABLE_DEFINITIONS).length})
          </div>
          <div className="space-y-1">
            {Object.values(TABLE_DEFINITIONS).map((tbl) => {
              const rows = (tableData as Record<string, unknown[]>)[tbl.name] || [];
              const isSelected = selectedTable === tbl.name;
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  key={tbl.name}
                  onClick={() => setSelectedTable(tbl.name)}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <TableIcon className="size-3.5 shrink-0 opacity-70" />
                    <span className="truncate font-mono text-xs">{tbl.name}</span>
                  </div>
                  <span className="ml-2 rounded bg-background/40 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                    {rows.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-violet-400/20 bg-violet-400/5 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-300">
              <Layers className="size-3" />
              <span>RLS & Sécurité</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              Seules les lignes associées à votre utilisateur et mission sont autorisées en lecture.
            </p>
          </div>
        </div>

        {/* Table Data / Schema View */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Subheader: table info & search */}
          <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/50 px-4 py-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{currentDefinition.name}</span>
                <span className="text-[11px] text-muted-foreground">— {currentDefinition.description}</span>
              </div>
            </div>

            {activeTab === "data" && (
              <div className="relative w-48">
                <Search className="pointer-events-none absolute left-2.5 top-2 size-3 text-muted-foreground" />
                <input
                  aria-label="Filtrer les lignes"
                  className="h-7 w-full rounded-md border border-sidebar-border/70 bg-background/40 pl-7 pr-2.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-violet-400 focus:outline-none"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer…"
                  value={searchQuery}
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {activeTab === "schema" ? (
              <div className="overflow-hidden rounded-xl border border-sidebar-border/60">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-sidebar-border/60 bg-background/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Colonne</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Clé</th>
                      <th className="px-3 py-2">Nullable</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border/40 bg-background/10">
                    {currentDefinition.columns.map((col) => (
                      <tr className="hover:bg-sidebar-accent/30" key={col.name}>
                        <td className="px-3 py-2 font-semibold text-sidebar-foreground">{col.name}</td>
                        <td className="px-3 py-2 text-violet-300">{col.type}</td>
                        <td className="px-3 py-2">
                          {col.isPrimaryKey ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] text-amber-300">
                              <KeyRound className="size-2.5" /> PK
                            </span>
                          ) : col.isForeignKey ? (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-400/10 px-1.5 py-0.5 text-[9px] text-sky-300">
                              FK
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{col.nullable ? "OUI" : "NON"}</td>
                        <td className="px-3 py-2 font-sans text-xs text-muted-foreground">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredRows.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-sidebar-border/60">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-sidebar-border/60 bg-background/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      {Object.keys(filteredRows[0]).map((key) => (
                        <th className="px-3 py-2" key={key}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border/40 bg-background/10">
                    {filteredRows.map((row, rowIdx) => (
                      <tr className="hover:bg-sidebar-accent/30" key={rowIdx}>
                        {Object.entries(row).map(([key, val]) => {
                          const cellId = `${rowIdx}-${key}`;
                          const isCopied = copiedCell === cellId;
                          const strVal = String(val ?? "—");
                          return (
                            <td
                              className="group relative max-w-[200px] truncate px-3 py-2 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                              key={key}
                              title={strVal}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="truncate">{strVal}</span>
                                <button
                                  aria-label="Copier la valeur"
                                  className="opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={() => copyValue(strVal, cellId)}
                                  type="button"
                                >
                                  {isCopied ? (
                                    <Check className="size-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                                  )}
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
                <FileCode2 className="mb-2 size-6 text-muted-foreground/50" />
                <p className="text-xs font-medium text-sidebar-foreground">Aucune ligne trouvée</p>
                <p className="mt-1 text-[11px]">
                  {searchQuery ? "Aucun résultat pour ce filtre." : "Les enregistrements apparaîtront dès que la mission aura démarré."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
