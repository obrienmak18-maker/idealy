"use client";

import { useState, useEffect } from "react";
import { DatabaseIcon, DownloadIcon, RefreshCwIcon, HardDriveIcon, CheckCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";

const dataCopy = {
  fr: {
    title: "Données & mémoire du workspace",
    subtitle: "Gérez la persistance, l'exportation et le cache de vos missions et projets Idealy.",
    storageTitle: "Utilisation du stockage local",
    storageDesc: "Espace utilisé par les brouillons, artefacts et arbres de fichiers du Virtual File System.",
    vfsTitle: "Système de fichiers virtuel (VFS)",
    vfsDesc: "Chaque mission maintient un journal séquentiel de fichiers synchronisé avec votre espace. Les versions d'artefacts sont restaurées à la réouverture.",
    exportTitle: "Exporter mes données de projet",
    exportDesc: "Téléchargez l'intégralité de vos missions, historiques et préférences au format JSON standard.",
    exportBtn: "Exporter toutes mes données (JSON)",
    resetMemoryTitle: "Mémoire d'escouade & contexte",
    resetMemoryDesc: "L'escouade mémorise les choix techniques, stacks préférées et règles métier. Vous pouvez réinitialiser cette mémoire à tout moment.",
    resetMemoryBtn: "Réinitialiser la mémoire de l'escouade",
    memoryResetSuccess: "Mémoire d'escouade réinitialisée avec succès.",
    exportSuccess: "Exportation des données générée avec succès.",
  },
  en: {
    title: "Workspace data & memory",
    subtitle: "Manage persistence, export, and cache for your Idealy missions and projects.",
    storageTitle: "Local storage usage",
    storageDesc: "Space consumed by drafts, artifacts, and Virtual File System project trees.",
    vfsTitle: "Virtual File System (VFS)",
    vfsDesc: "Each mission maintains a sequential file event log. Artifact versions are seamlessly restored upon reopening.",
    exportTitle: "Export project data",
    exportDesc: "Download all your missions, histories, and preferences in standard JSON format.",
    exportBtn: "Export all my data (JSON)",
    resetMemoryTitle: "Squad memory & context",
    resetMemoryDesc: "The squad remembers technical decisions, preferred stacks, and project rules. You can reset this memory anytime.",
    resetMemoryBtn: "Reset squad memory",
    memoryResetSuccess: "Squad context memory successfully reset.",
    exportSuccess: "Project data export generated successfully.",
  },
  es: {
    title: "Datos y memoria del workspace",
    subtitle: "Administra la persistencia, exportación y caché de tus misiones y proyectos.",
    storageTitle: "Uso del almacenamiento local",
    storageDesc: "Espacio consumido por borradores, artefactos y el árbol de archivos virtual.",
    vfsTitle: "Sistema de archivos virtual (VFS)",
    vfsDesc: "Cada misión mantiene un registro de eventos sincronizado. Los artefactos se restauran automáticamente.",
    exportTitle: "Exportar datos del proyecto",
    exportDesc: "Descarga todas tus misiones, historiales y preferencias en formato JSON estándar.",
    exportBtn: "Exportar todos mis datos (JSON)",
    resetMemoryTitle: "Memoria del equipo y contexto",
    resetMemoryDesc: "El equipo recuerda decisiones técnicas y pilas preferidas. Puedes restablecer esta memoria en cualquier momento.",
    resetMemoryBtn: "Restablecer memoria del equipo",
    memoryResetSuccess: "Memoria de contexto restablecida con éxito.",
    exportSuccess: "Exportación generada con éxito.",
  },
} as const;

export default function DataPage() {
  const { language } = useTranslation();
  const copy = dataCopy[language] || dataCopy.fr;
  const [storageKb, setStorageKb] = useState(128);

  useEffect(() => {
    if (typeof window !== "undefined") {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          total += (localStorage.getItem(key)?.length || 0) * 2;
        }
      }
      setStorageKb(Math.max(48, Math.round(total / 1024)));
    }
  }, []);

  const handleExportData = () => {
    try {
      const dump: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        workspace: "Idealy Studio",
      };
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.includes("token") && !key.includes("secret") && !key.includes("key")) {
          dump[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `idealy-workspace-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(copy.exportSuccess);
    } catch {
      toast.error("Erreur lors de l'exportation des données.");
    }
  };

  const handleResetMemory = () => {
    if (window.confirm("Voulez-vous vraiment réinitialiser la mémoire contextuelle d'apprentissage de l'escouade ?")) {
      localStorage.removeItem("idealy_squad_memory");
      localStorage.removeItem("idealy_context_cache");
      toast.success(copy.memoryResetSuccess);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{copy.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{copy.subtitle}</p>
      </div>

      {/* Storage Gauge */}
      <section className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDriveIcon className="size-4 text-violet-400" />
            <h4 className="text-sm font-semibold">{copy.storageTitle}</h4>
          </div>
          <span className="text-xs font-mono font-medium text-foreground">{storageKb} KB / 5 MB</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, (storageKb / 5120) * 100))}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{copy.storageDesc}</p>
      </section>

      {/* VFS Card */}
      <section className="rounded-2xl border border-border/60 p-4 space-y-2">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <DatabaseIcon className="size-4 text-primary" />
          <span>{copy.vfsTitle}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{copy.vfsDesc}</p>
      </section>

      {/* Export Data */}
      <section className="rounded-2xl border border-border/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold">{copy.exportTitle}</h4>
        <p className="text-xs text-muted-foreground">{copy.exportDesc}</p>
        <button
          onClick={handleExportData}
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity cursor-pointer"
        >
          <DownloadIcon className="size-3.5" />
          {copy.exportBtn}
        </button>
      </section>

      {/* Reset Squad Memory */}
      <section className="rounded-2xl border border-border/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold">{copy.resetMemoryTitle}</h4>
        <p className="text-xs text-muted-foreground">{copy.resetMemoryDesc}</p>
        <button
          onClick={handleResetMemory}
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border/80 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <RefreshCwIcon className="size-3.5" />
          {copy.resetMemoryBtn}
        </button>
      </section>
    </div>
  );
}
