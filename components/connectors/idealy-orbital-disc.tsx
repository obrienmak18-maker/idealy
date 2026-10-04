"use client";

import { useEffect, useState } from "react";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import { SparklesIcon, PlusIcon, CheckIcon } from "lucide-react";

interface OrbitalConnector {
  id: string;
  name: string;
  category: string;
  status: "connected" | "available" | "slot";
  color: string;
  iconText?: string;
  logoUrl?: string;
}

const ORBITAL_CONNECTORS: OrbitalConnector[] = [
  // Arc Supérieur : Connecteurs actifs et prêts
  { id: "github", name: "GitHub", category: "Code", status: "connected", color: "from-purple-500 to-indigo-500", iconText: "🐙" },
  { id: "supabase", name: "Supabase", category: "Database", status: "connected", color: "from-emerald-500 to-teal-500", iconText: "⚡" },
  { id: "stripe", name: "Stripe", category: "Payments", status: "available", color: "from-blue-600 to-violet-600", iconText: "💳" },
  { id: "vercel", name: "Vercel", category: "Deploy", status: "available", color: "from-zinc-900 to-zinc-700", iconText: "▲" },
  { id: "canva", name: "Canva", category: "Design", status: "available", color: "from-cyan-400 to-blue-500", iconText: "🎨" },
  { id: "slack", name: "Slack", category: "Chat", status: "available", color: "from-amber-400 to-rose-500", iconText: "💬" },

  // Arc Inférieur : Disques holographiques / Slots réservés pour l'extension
  { id: "slot-1", name: "Slot libre", category: "MCP Server", status: "slot", color: "from-zinc-700 to-zinc-800" },
  { id: "slot-2", name: "Slot libre", category: "Webhooks", status: "slot", color: "from-zinc-700 to-zinc-800" },
  { id: "slot-3", name: "Slot libre", category: "Custom API", status: "slot", color: "from-zinc-700 to-zinc-800" },
  { id: "slot-4", name: "Slot libre", category: "Figma Sync", status: "slot", color: "from-zinc-700 to-zinc-800" },
];

export function IdealyOrbitalDisc({ onSelectConnector }: { onSelectConnector?: (id: string) => void }) {
  const [activeItem, setActiveItem] = useState<string>("github");

  return (
    <div className="relative mx-auto flex flex-col items-center justify-center py-6 select-none overflow-hidden">
      {/* Rayonnement d'ambiance cosmique */}
      <div className="absolute -top-10 size-96 rounded-full bg-gradient-to-tr from-violet-600/15 via-sky-500/15 to-transparent blur-3xl pointer-events-none" />

      {/* Anneau orbital central */}
      <div className="relative flex items-center justify-center size-[330px] sm:size-[380px]">
        {/* Anneau externe pointillé */}
        <div className="absolute inset-0 rounded-full border border-dashed border-violet-500/30 animate-[spin_60s_linear_infinite]" />
        
        {/* Anneau intérieur solide avec gradient */}
        <div className="absolute inset-6 rounded-full border border-violet-400/20 bg-gradient-to-b from-violet-500/5 via-transparent to-card/40" />

        {/* Noyau central avec le logo Idealy tournant */}
        <div className="relative z-10 flex flex-col items-center justify-center size-28 sm:size-32 rounded-full border border-border/80 bg-card/90 shadow-2xl shadow-violet-500/30 backdrop-blur-xl">
          <IdealyLogo animated compact={false} size={54} className="drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]" />
          <span className="mt-1 text-[10px] font-bold tracking-wider uppercase text-foreground/80">
            Idealy Core
          </span>
          <div className="absolute -bottom-1 size-2 rounded-full bg-emerald-400 animate-ping" />
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

          return (
            <div
              key={connector.id}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              className="absolute z-20 flex items-center justify-center transition-all duration-300"
            >
              {isSlot ? (
                // Disque normal holographique (Arc inférieur)
                <div
                  title="Emplacement disponible pour nouveau connecteur"
                  className="group flex size-9 items-center justify-center rounded-full border border-dashed border-border/70 bg-card/40 text-muted-foreground/50 transition-all hover:border-primary/60 hover:text-foreground hover:scale-110 cursor-pointer backdrop-blur-md"
                >
                  <PlusIcon className="size-3.5 group-hover:rotate-90 transition-transform duration-200" />
                </div>
              ) : (
                // Connecteur disponible (Arc supérieur)
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(connector.id);
                    onSelectConnector?.(connector.id);
                  }}
                  className={`group relative flex size-11 items-center justify-center rounded-2xl border transition-all duration-300 cursor-pointer backdrop-blur-xl ${
                    isSelected
                      ? "border-primary bg-primary/20 scale-110 shadow-lg shadow-primary/30"
                      : "border-border/80 bg-card/80 hover:border-primary/50 hover:scale-105"
                  }`}
                  title={`${connector.name} (${connector.category})`}
                >
                  <span className="text-base select-none">{connector.iconText}</span>
                  {connector.status === "connected" && (
                    <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                      <CheckIcon className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                  {/* Tooltip flottant au survol */}
                  <span className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold whitespace-nowrap bg-background/90 px-2 py-0.5 rounded-md border border-border shadow-xs pointer-events-none">
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
          <span className="size-2 rounded-full bg-emerald-400" />
          <span>Connecteurs opérationnels</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full border border-dashed border-foreground/40" />
          <span>Emplacements d'extension</span>
        </div>
      </div>
    </div>
  );
}
