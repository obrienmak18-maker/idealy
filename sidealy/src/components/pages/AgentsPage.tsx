import {
  Check,
  ChevronRight,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  alvinMessenger,
  voiesCatalog,
  type WayAgent,
  type WayDetailed,
} from "../../services/voies-catalog";
import { PageFrame } from "../layout/PageFrame";
import { PageHeader } from "../layout/PageHeader";

export const AgentsPage: React.FC = () => {
  const { createConversation, setActivePage, setDraft } = useApp();
  const [selectedWayKey, setSelectedWayKey] = useState<string>("ninja");

  const currentWay: WayDetailed = voiesCatalog[selectedWayKey] ?? voiesCatalog.ninja;

  const handleStartMissionWithAgent = (agent: WayAgent) => {
    const title = `Mission avec ${agent.name} (${agent.role})`;
    createConversation(undefined, title);
    setDraft(`Bonjour ${agent.name}, j'ai besoin de ton expertise en tant que ${agent.role}. `);
    setActivePage("chat");
  };

  return (
    <PageFrame label="Escouade Multi-Agents">
      <div className="idealy-page-enter mx-auto max-w-6xl pb-16">
        <PageHeader
          action={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-sm shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Architecture Multi-Agents Active
              </span>
            </div>
          }
          description="Explorez et commandez les agents d'élite d'Idealy. Chaque agent possède une spécialité pointue, une stratégie propre et agit en coordination tactique."
          eyebrow="Système d'Escouade • Atoms / Idealy Engine"
          title="Escouade Multi-Agents"
        />

        {/* ─── UNIVERSAL MESSENGER BANNER (ALVIN) ─────────────────────────── */}
        <div className="mt-6 relative overflow-hidden rounded-2xl border border-[var(--idealy-indigo)]/40 bg-gradient-to-r from-[var(--idealy-indigo-bg)]/80 via-[var(--dsw-alias-bg-layer-2)] to-[var(--idealy-teal-bg)]/50 p-6 shadow-elevated idealy-glass animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--idealy-indigo)]/50 shadow-md">
                <img
                  alt={alvinMessenger.name}
                  className="h-full w-full object-cover"
                  src={alvinMessenger.avatarUrl}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[var(--dsw-alias-bg-base)] idealy-pulse-dot" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-[var(--dsw-alias-label-primary)]">
                    {alvinMessenger.name}
                  </h3>
                  <span className="idealy-badge idealy-badge--indigo">
                    <Radio className="h-3 w-3" />
                    {alvinMessenger.role}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--dsw-alias-label-secondary)] max-w-2xl">
                  {alvinMessenger.description}
                </p>
              </div>
            </div>
            <button
              className="group relative overflow-hidden inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--idealy-indigo)] to-[var(--idealy-teal-petrol)] px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:shadow-glow-indigo active:scale-95 transition-all shrink-0 focus-ring"
              onClick={() => {
                createConversation(undefined, "Briefing Général avec Alvin");
                setDraft("Alvin, transmets cet ordre de mission à l'escouade : ");
                setActivePage("chat");
              }}
              type="button"
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s linear infinite',
                }}
                aria-hidden="true"
              />
              <Sparkles className="h-3.5 w-3.5 relative z-10" />
              <span className="relative z-10">Briefer Alvin</span>
            </button>
          </div>
        </div>

        {/* ─── WAY SELECTOR (Voie du Ninja, Mages, Hunters, Pro) ──────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)]">
              Sélectionnez la Voie de l'Escouade
            </h2>
            <span className="text-xs text-[var(--dsw-alias-label-caption)]">
              Énergie active : <strong className="text-[var(--dsw-alias-label-primary)]">{currentWay.resourceLabel}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
            {Object.entries(voiesCatalog).map(([key, way]) => {
              const isSelected = selectedWayKey === key;
              return (
                <button
                  className={`idealy-card-premium flex flex-col items-start p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? "border-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)] shadow-glow-teal"
                      : "hover:border-[var(--dsw-alias-border-l3)]"
                  }`}
                  key={key}
                  onClick={() => setSelectedWayKey(key)}
                  type="button"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-bold text-[var(--dsw-alias-label-primary)]">
                      {way.label}
                    </span>
                    {isSelected && (
                      <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[var(--idealy-teal-petrol)] text-white shadow-xs">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[11px] text-[var(--dsw-alias-label-secondary)]">
                    Chef : {way.chiefName || "Leader"}
                  </span>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span>Ressource : {way.resourceLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── WAY PHILOSOPHY & STATS ─────────────────────────────────────── */}
        <div className="mt-6 rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--idealy-teal-petrol)]">
                Philosophie d'intervention
              </span>
              <h3 className="text-base font-semibold text-[var(--dsw-alias-label-primary)] mt-0.5">
                {currentWay.tagline}
              </h3>
              <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)] max-w-2xl">
                {currentWay.philosophy}
              </p>
            </div>

            {/* Radar / Stat bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--dsw-alias-bg-layer-2)] p-3 rounded-xl border border-[var(--dsw-alias-border-l3)] shrink-0">
              <div className="text-center">
                <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)]">Vitesse</span>
                <p className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">{currentWay.stats.speed}%</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)]">Stratégie</span>
                <p className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">{currentWay.stats.strategy}%</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)]">Créativité</span>
                <p className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">{currentWay.stats.creativity}%</p>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)]">Robustesse</span>
                <p className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">{currentWay.stats.robustness}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── AGENTS GRID (ATOMS.DEV STYLE) ───────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)] flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--idealy-indigo)]" />
              Membres de l'Escouade ({currentWay.agents.length} Agents Spécialisés)
            </h2>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {currentWay.agents.map((agent) => {
              const isChief = Boolean(agent.isChief);
              return (
                <div
                  className={`idealy-card-premium group relative flex flex-col justify-between p-4.5 cursor-pointer ${
                    isChief
                      ? "border-[var(--idealy-teal-petrol)]/60 bg-[var(--idealy-teal-bg)]/30 shadow-glow-teal"
                      : ""
                  }`}
                  key={agent.name}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                  }}
                >
                  <div>
                    {/* Header: Avatar + Name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--dsw-alias-border-l3)] shadow-sm">
                          <img
                            alt={agent.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            src={agent.avatarUrl}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white dark:border-black idealy-pulse-dot" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-[var(--dsw-alias-label-primary)]">
                              {agent.name}
                            </h4>
                            {isChief && (
                              <span className="idealy-badge idealy-badge--teal">
                                Chef
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] font-medium text-[var(--idealy-indigo)]">
                            {agent.role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Specialty description */}
                    <p className="mt-3 text-xs leading-relaxed text-[var(--dsw-alias-label-secondary)] line-clamp-3">
                      {agent.specialty}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[var(--dsw-alias-border-l1)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--dsw-alias-label-caption)] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Prêt pour mission
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dsw-alias-interactive-bg-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--dsw-alias-label-primary)] hover:bg-[var(--idealy-teal-petrol)] hover:text-white active:scale-95 transition-all focus-ring"
                      onClick={() => handleStartMissionWithAgent(agent)}
                      type="button"
                    >
                      <span>Mobiliser</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── ANTAGONISTS (BUGS & ANOMALIES COUNTERED) ────────────────────── */}
        {currentWay.antagonists && currentWay.antagonists.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)]">
                Anomalies & Bugs Neutalisés par cette Escouade
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {currentWay.antagonists.map((bug) => (
                <div
                  className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs"
                  key={bug.name}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-amber-500/30">
                      <img
                        alt={bug.name}
                        className="h-full w-full object-cover"
                        src={bug.avatarUrl}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--dsw-alias-label-primary)]">{bug.name}</h4>
                      <span className="text-[10.5px] font-medium text-amber-600 dark:text-amber-400">
                        {bug.bugType}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--dsw-alias-label-secondary)] leading-normal">
                    {bug.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageFrame>
  );
};
