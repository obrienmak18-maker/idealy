import { useState } from 'react';
import {
  ChevronDown,
  Crown,
  Eye,
  FileCode2,
  FolderOpen,
  LogOut,
  Plug,
  Rocket,
  Plus,
  ScrollText,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/Brand';
import type { WayId } from '@/lore/ways';
import { WAYS } from '@/lore/ways';

export type RailDestination = 'missions' | 'preview' | 'files' | 'code' | 'activity' | 'connectors' | 'deploy';

type RailMission = {
  id: string;
  title: string;
  previewReady?: boolean;
};

type IconRailProps = {
  wayId: WayId;
  displayName: string;
  avatarHue: number;
  missions: RailMission[];
  currentMissionId: string | null;
  activeDestination: RailDestination;
  hidden?: boolean;
  onNewMission: () => void;
  onSelectMission: (missionId: string) => void;
  onSelectDestination: (destination: RailDestination) => void;
  onUpgrade: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

const destinations: Array<{ id: RailDestination; label: string; icon: LucideIcon }> = [
  { id: 'missions', label: 'Mission', icon: Sparkles },
  { id: 'preview', label: 'Aperçu', icon: Eye },
  { id: 'files', label: 'Fichiers', icon: FolderOpen },
  { id: 'code', label: 'Code', icon: FileCode2 },
  { id: 'activity', label: 'Activité', icon: ScrollText },
  { id: 'connectors', label: 'Connexions', icon: Plug },
  { id: 'deploy', label: 'Déployer', icon: Rocket },
];

export function IconRail({
  wayId,
  displayName,
  avatarHue,
  missions,
  currentMissionId,
  activeDestination,
  hidden = false,
  onNewMission,
  onSelectMission,
  onSelectDestination,
  onUpgrade,
  onOpenSettings,
  onSignOut,
}: IconRailProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const way = WAYS[wayId];

  return (
    <aside
      aria-label="Navigation Idealy"
      className={`relative z-30 flex w-[72px] shrink-0 flex-col items-center border-r border-white/5 bg-[#0d0d14]/95 py-3 backdrop-blur-xl transition-[margin,opacity] duration-200 ${hidden ? '-ml-[72px] opacity-0' : 'opacity-100'}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Accueil Idealy" className="mb-5 rounded-xl p-1.5 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-400/60">
            <Logo size={30} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Idealy</TooltipContent>
      </Tooltip>

      <div className={`mb-4 h-1.5 w-7 rounded-full ${way.primaryClass}`} aria-label={`Voie ${way.name}`} />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onNewMission}
            aria-label="Nouvelle mission"
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 text-white shadow-lg shadow-violet-950/30 transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-orange-300/70"
          >
            <Plus size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Nouvelle mission</TooltipContent>
      </Tooltip>

      <nav className="flex flex-col items-center gap-1" aria-label="Navigation principale">
        {destinations.map(({ id, label, icon: Icon }) => {
          const active = activeDestination === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectDestination(id)}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-white/40 ${active ? `bg-white/10 ${way.textClass}` : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {active && <span aria-hidden="true" className={`absolute -left-[13px] h-5 w-0.5 rounded-full ${way.primaryClass}`} />}
                  <Icon size={17} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-4 flex min-h-0 flex-1 flex-col items-center">
        <div className="mb-2 h-px w-7 bg-white/10" />
        <div className="min-h-0 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Missions récentes">
          {missions.slice(0, 8).map((mission) => (
            <Tooltip key={mission.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelectMission(mission.id)}
                  aria-label={`Ouvrir ${mission.title}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-white/30 ${currentMissionId === mission.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${mission.previewReady ? 'bg-emerald-400' : 'bg-ink-500'}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{mission.title}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="relative mt-3 flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onUpgrade}
              aria-label="Voir les options de crédits"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-amber-300 transition hover:bg-amber-300/10 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
            >
              <Crown size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Options de crédits</TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={() => setProfileMenuOpen((open) => !open)}
          aria-label={`Menu de ${displayName}`}
          aria-expanded={profileMenuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold text-ink-950 transition hover:ring-2 hover:ring-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{ background: `hsl(${avatarHue} 70% 60%)` }}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </button>

        {profileMenuOpen && (
          <div className="absolute bottom-0 left-12 z-50 w-48 rounded-xl border border-white/10 bg-[#12121a] p-1.5 shadow-2xl">
            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-ink-300">
              <span className={`h-1.5 w-1.5 rounded-full ${way.primaryClass}`} />
              <span className="truncate">{way.grades[0]} · {way.name}</span>
              <ChevronDown size={12} className="ml-auto rotate-[-90deg] text-ink-500" />
            </div>
            <button type="button" onClick={() => { setProfileMenuOpen(false); onOpenSettings(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-ink-200 transition hover:bg-white/5 hover:text-white">
              <Settings size={14} /> Paramètres
            </button>
            <button type="button" onClick={() => { setProfileMenuOpen(false); onSignOut(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-ink-200 transition hover:bg-white/5 hover:text-white">
              <LogOut size={14} /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
