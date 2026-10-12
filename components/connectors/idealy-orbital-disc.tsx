"use client";

import React from "react";
import { PlusIcon } from "lucide-react";
import { IdealyMark } from "@/components/branding/idealy-logo";
import {
  GitHubLogo,
  FigmaLogo,
  SupabaseLogo,
  StripeLogo,
  VercelLogo,
} from "./brand-logos";

interface IdealyOrbitalDiscProps {
  connectedIds?: readonly string[];
  activeConnectorId?: string;
  onSelectConnector?: (id: string) => void;
  onAddConnector?: () => void;
}

export function IdealyOrbitalDisc({
  connectedIds = [],
  activeConnectorId,
  onSelectConnector,
  onAddConnector,
}: IdealyOrbitalDiscProps) {
  // 5 top-arc nodes: GitHub, Figma, Supabase, Stripe, Vercel
  const activeNodes = [
    {
      id: "github",
      label: "GitHub",
      left: "10%",
      top: "54%",
      logo: <GitHubLogo size={22} className="text-white" />,
    },
    {
      id: "figma",
      label: "Figma",
      left: "26%",
      top: "26%",
      logo: <FigmaLogo size={22} />,
    },
    {
      id: "supabase",
      label: "Supabase",
      left: "50%",
      top: "12%",
      logo: <SupabaseLogo size={22} />,
    },
    {
      id: "stripe",
      label: "Stripe",
      left: "74%",
      top: "26%",
      logo: <StripeLogo size={22} className="text-[#635BFF]" />,
    },
    {
      id: "vercel",
      label: "Vercel",
      left: "90%",
      top: "54%",
      logo: <VercelLogo size={20} className="text-white" />,
    },
  ];

  // 4 bottom-arc empty slot nodes
  const emptySlots = [
    { id: "slot-1", left: "19%", top: "77%" },
    { id: "slot-2", left: "38%", top: "90%" },
    { id: "slot-3", left: "62%", top: "90%" },
    { id: "slot-4", left: "81%", top: "77%" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-4xl py-6 select-none overflow-visible">
      {/* Container */}
      <div className="relative w-full h-[280px] sm:h-[340px] md:h-[380px] flex items-center justify-center">
        {/* SVG Background: Elliptical orbital tracks */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 900 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="orbital-grad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>

          {/* Inner dashed elliptical orbit */}
          <ellipse
            cx="450" cy="190" rx="320" ry="115"
            stroke="url(#orbital-grad)"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.35"
          />

          {/* Main elliptical orbital track */}
          <ellipse
            cx="450" cy="190" rx="370" ry="142"
            stroke="url(#orbital-grad)"
            strokeWidth="1.2"
            opacity="0.5"
          />
        </svg>

        {/* Center: Real Idealy Logo (large, animated) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            {/* Glow aura behind the logo */}
            <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-teal-500/20 via-cyan-500/15 to-purple-500/20 blur-2xl animate-pulse" />
            <IdealyMark
              size={80}
              animated
              className="relative drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]"
            />
          </div>
        </div>

        {/* TOP ARC: 5 Active Connected Nodes */}
        {activeNodes.map((node) => {
          const isSelected = activeConnectorId === node.id;
          const isConnected = connectedIds.includes(node.id);

          return (
            <div
              key={node.id}
              style={{ left: node.left, top: node.top }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
              onClick={() => onSelectConnector?.(node.id)}
            >
              {/* Soft radial glow aura */}
              <div
                className={`absolute -inset-3 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
                  isSelected
                    ? "bg-cyan-400/40 scale-125"
                    : isConnected
                    ? "bg-cyan-500/25 group-hover:bg-cyan-400/35"
                    : "bg-slate-700/20 group-hover:bg-cyan-500/20"
                }`}
              />

              {/* Dark circular disc node */}
              <button
                type="button"
                className={`relative flex size-12 sm:size-14 items-center justify-center rounded-full bg-[#0b101b] border transition-all duration-300 shadow-xl ${
                  isSelected
                    ? "border-cyan-400 scale-110 shadow-cyan-500/30"
                    : "border-slate-800 hover:border-cyan-500/60 group-hover:scale-105"
                }`}
                aria-label={`Sélectionner ${node.label}`}
              >
                {node.logo}
              </button>

              {/* Label */}
              <span className="mt-2 text-xs font-medium text-slate-300 tracking-wide transition-colors group-hover:text-white">
                {node.label}
              </span>
            </div>
          );
        })}

        {/* BOTTOM ARC: 4 Empty Slot Nodes */}
        {emptySlots.map((slot) => (
          <div
            key={slot.id}
            style={{ left: slot.left, top: slot.top }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10"
          >
            <button
              type="button"
              onClick={() => onAddConnector?.()}
              title="Ajouter une intégration"
              className="flex size-7 sm:size-8 items-center justify-center rounded-full border border-dashed border-slate-700 bg-slate-900/60 text-slate-500 hover:border-cyan-500/70 hover:text-cyan-400 hover:scale-110 transition-all duration-200 cursor-pointer"
            >
              <PlusIcon className="size-3 sm:size-3.5 stroke-[2]" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
