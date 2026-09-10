"use client";
import { DatabaseIcon } from "lucide-react";

export default function DataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Données et mémoire du workspace</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Structure et persistance des missions et artefacts.
        </p>
      </div>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <DatabaseIcon className="size-3.5" /> Système de fichiers virtuel (VFS)
          </p>
          <p className="mt-1">
            Chaque mission maintient un journal séquentiel d&apos;événements de fichiers synchronisé avec Supabase RLS.
            Les fichiers générés sont versionnés et réhydratés automatiquement à la réouverture du workspace.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Mémoire de contexte</p>
          <p className="mt-1">
            L&apos;escouade retient les décisions architecturales, les préférences de stack et les conventions
            du projet. Cette mémoire est isolée par workspace et peut être réinitialisée à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
}
