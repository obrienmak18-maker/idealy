"use client";

import { useEffect, useState } from "react";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import { PlusIcon, CheckIcon } from "lucide-react";
import { getConnectorBrandLogo } from "./brand-logos";

interface OrbitalConnector {
  id: string;
  name: string;
  category: string;
  status: "available" | "slot";
}

const ORBITAL_CONNECTORS: OrbitalConnector[] = [
  // The orbital disc is presentation-only. Live connection state comes from props.
  { id: "github", name: "GitHub", category: "Code", status: "available" },
  { id: "supabase", name: "Supabase", category: "Database", status: "available" },
  { id: "stripe", name: "Stripe", category: "Payments", status: "available" },
  { id: "vercel", name: "Vercel", category: "Deploy", status: "available" },
  { id: "canva", name: "Canva", category: "Design", status: "available" },
  { id: "slack", name: "Slack", category: "Communication", status: "available" },

  // Arc Inférieur : Disques / Slots réservés pour futures intégrations
  { id: "slot-1", name: "Extension", category: "MCP Server", status: "slot" },
  { id: "slot-2", name: "Extension", category: "Webhooks", status: "slot" },
  { id: "slot-3", name: "Extension", category: "Custom API", status: "slot" },
  { id: "slot-4", name: "Extension", category: "Figma Sync", status: "slot" },
];

export function IdealyOrbitalDisc({
  connectedIds = [],
  onSelectConnector,
}: {
  connectedIds?: readonly string[];
  onSelectConnector?: (id: string) => void;
}) {
  const [activeItem, setActiveItem] = useState<string>("github");

  return (
    <div className="relative mx-auto flex flex-col items-center justify-center py-6 select-none overflow-hidden">
      {/* Rayonnement d'ambiance cosmique adapté light/dark */}
      <div className="absolute -top-10 size-96 rounded-full bg-gradient-to-tr from-violet-600/10 via-sky-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Anneau orbital central */}
      <div className="relative flex items-center justify-center size-[330px] sm:size-[380px]">
        {/* Anneau externe pointillé avec rotation discrète */}
        <div className="absolute inset-0 rounded-full border border-dashed border-border/80 dark:border-violet-500/30 animate-[spin_60s_linear_infinite]" />
        
        {/* Anneau intérieur solide */}
        <div className="absolute inset-6 rounded-full border border-border/60 dark:border-violet-400/20 bg-gradient-to-b from-primary/5 via-transparent to-card/40" />

        {/* Noyau central avec le logo Idealy tournant */}
        <div className="relative z-10 flex flex-col items-center justify-center size-28 sm:size-32 rounded-full border border-border bg-card/90 shadow-2xl shadow-primary/20 backdrop-blur-xl">
          <IdealyLogo animated compact={false} size={54} className="drop-shadow-[0_0_15px_rgba(56,189,248,0.35)]" />
          <span className="mt-1 text-[10px] font-bold tracking-wider uppercase text-foreground/80 font-mono">
            Idealy Core
          </span>
          <div className="absolute -bottom-1 size-2 rounded-full bg-emerald-500 animate-ping" />
        </div>

        {/* Disposition circulaire des connecteurs */}
        {ORBITAL_CONNECTORS.map((connector, index) => {
          const total = ORBITAL_CONNECTORS.length;
          // Angle de position sur le cercle (commençant par le haut)
          const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
          const radius = 135; // Rayon orbital
          const x = Math.round(radius * Math.cos(angle));
          const y = Math.round(radius * Math.sin(angle));

          const isSlot = connector.status === "slot";
          const isSelected = activeItem === connector.id;
          const isConnected = connectedIds.includes(connector.id);

          return (
            <div
              key={connector.id}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              className="absolute z-20 flex items-center justify-center transition-all duration-300"
            >
              {isSlot ? (
                // Disque d'extension holographique pour futures intégrations
                <div
                  title="Emplacement réservé pour futures intégrations"
                  className="group flex size-9 items-center justify-center rounded-full border border-dashed border-border bg-card/40 text-muted-foreground/60 transition-all hover:border-primary/60 hover:text-foreground hover:scale-110 cursor-pointer backdrop-blur-md"
                >
                  <PlusIcon className="size-3.5 group-hover:rotate-90 transition-transform duration-200" />
                </div>
              ) : (
                // Connecteur actif / disponible avec vrai logo officiel SVG
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(connector.id);
                    onSelectConnector?.(connector.id);
                  }}
                  className={`group relative flex size-11 items-center justify-center rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-xl ${
                    isSelected
                      ? "border-primary bg-primary/15 scale-110 shadow-lg shadow-primary/20 ring-1 ring-primary/40"
                      : "border-border/80 bg-card/90 hover:border-primary/50 hover:scale-105"
                  }`}
                  title={`${connector.name} (${connector.category})`}
                >
                  <div className="flex items-center justify-center">
                    {getConnectorBrandLogo(connector.id, "size-5 text-foreground")}
                  </div>
                  {isConnected && (
                    <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                      <CheckIcon className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                  {/* Tooltip flottant au survol */}
                  <span className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold whitespace-nowrap bg-background/95 px-2 py-0.5 rounded-md border border-border shadow-xs pointer-events-none z-30">
                    {connector.name}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende orbitale */}
      <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span>Connecteurs connectés</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full border border-dashed border-foreground/50" />
          <span>Emplacements d'extension futurs</span>
        </div>
      </div>
    </div>
  );
}
