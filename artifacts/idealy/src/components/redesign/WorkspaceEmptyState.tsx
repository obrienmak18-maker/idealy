'use client';

/**
 * WorkspaceEmptyState — Claude-style empty workspace for Idealy.
 * Icon rail (56px) + centered greeting + 4 suggestion cards + command bar,
 * with an energy gauge (label varies by Voie) top-right.
 */

import { useRef, useState } from 'react';
import {
  ArrowUp,
  Command,
  Paperclip,
  Mic,
  FolderKanban,
  MonitorPlay,
  Activity,
  Plug,
  Globe,
  LayoutDashboard,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ACCENT_GRADIENT = 'linear-gradient(90deg, #8b5cf6, #f97316)';

/* ------------------------------------------------------------------ */
/* Voie theming                                                        */
/* ------------------------------------------------------------------ */

export type Voie = 'ninja' | 'mage' | 'hunter' | 'pro';

const VOIE_CONFIG: Record<
  Voie,
  { aura: string; energyLabel: string }
> = {
  ninja: { aura: '#64748b', energyLabel: 'Chakra' }, // slate
  mage: { aura: '#8b5cf6', energyLabel: 'Mana' }, // violet
  hunter: { aura: '#f59e0b', energyLabel: 'Nen' }, // amber
  pro: { aura: '#3b82f6', energyLabel: 'Énergie' }, // blue
};

/* ------------------------------------------------------------------ */
/* Energy gauge (circular SVG, gradient stroke)                        */
/* ------------------------------------------------------------------ */

function EnergyGauge({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="flex items-center gap-2.5"
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} restant : ${clamped}\u00A0%`}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="energy-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#1f1f2a"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="url(#energy-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[#f4f4f5]">
          {clamped}&nbsp;%
        </span>
        <span className="text-xs text-[#a1a1aa]">{label}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Command bar (same pattern as LandingHero, kept local for reuse)     */
/* ------------------------------------------------------------------ */

function CommandBar({
  onSubmit,
}: {
  onSubmit?: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed); // TODO: create mission via API
    setValue('');
  };

  return (
    <div className="rounded-2xl p-px" style={{ background: ACCENT_GRADIENT }}>
      <div className="flex flex-col gap-2 rounded-[calc(1rem-1px)] bg-[#12121a] p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // CJK IME protection
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Décrivez votre prochaine mission…"
          aria-label="Décrire une nouvelle mission"
          rows={2}
          className="w-full resize-none bg-transparent text-sm leading-6 text-[#f4f4f5] placeholder:text-[#a1a1aa]/70 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Commandes slash"
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              <Command className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Joindre un fichier"
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Dicter au micro"
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Lancer la mission"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]"
            style={{ background: ACCENT_GRADIENT }}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Suggestions & rail                                                  */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  {
    icon: Globe,
    title: 'Landing page',
    prompt: 'Crée une landing page pour mon produit SaaS avec un formulaire de contact',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    prompt: 'Construis un dashboard analytics avec des graphiques et un tableau de données',
  },
  {
    icon: ShoppingBag,
    title: 'Boutique',
    prompt: 'Crée une boutique en ligne avec panier et paiement Stripe',
  },
  {
    icon: FileText,
    title: 'Blog',
    prompt: 'Construis un blog avec pages articles, catégories et recherche',
  },
];

const RAIL_ITEMS = [
  { icon: FolderKanban, label: 'Missions', href: '/workspace/missions' },
  { icon: MonitorPlay, label: 'Aperçus', href: '/workspace/previews' },
  { icon: Activity, label: 'Activité', href: '/workspace/activity' },
  { icon: Plug, label: 'Connecteurs', href: '/workspace/connectors' },
];

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function WorkspaceEmptyState({
  voie = 'pro',
  userName,
  energyPercent = 82,
  onLaunchMission,
}: {
  voie?: Voie;
  userName?: string;
  energyPercent?: number;
  onLaunchMission?: (prompt: string) => void;
}) {
  const config = VOIE_CONFIG[voie];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-[#0a0a0f] text-[#f4f4f5]">
        {/* Icon rail */}
        <nav
          aria-label="Navigation du workspace"
          className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-[#1f1f2a] py-4 sm:flex"
        >
          {RAIL_ITEMS.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <a
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                >
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-[#1f1f2a] px-4">
            {/* Mobile rail replacement */}
            <div className="flex items-center gap-1 sm:hidden">
              {RAIL_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#a1a1aa] hover:bg-white/5 hover:text-[#f4f4f5]"
                >
                  <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </a>
              ))}
            </div>
            <span className="hidden text-sm font-medium text-[#a1a1aa] sm:block">
              Nouveau projet
            </span>
            <EnergyGauge percent={energyPercent} label={config.energyLabel} />
          </header>

          {/* Centered content */}
          <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Kage avatar with subtle voie-colored aura */}
              <div
                className="rounded-full p-px"
                style={{
                  boxShadow: `0 0 24px ${config.aura}33`,
                  background: config.aura,
                }}
              >
                <img
                  src="/agents/avatar_pro_daniel_1785476092067.jpg"
                  alt=""
                  aria-hidden="true"
                  width={36}
                  height={36}
                  className="block h-9 w-9 rounded-full bg-[#12121a] object-cover"
                />
              </div>
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {userName
                  ? `${userName}, que construisons-nous aujourd\u2019hui\u00A0?`
                  : 'Que construisons-nous aujourd\u2019hui\u00A0?'}
              </h1>
            </div>

            {/* Suggestion cards */}
            <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.title}
                  type="button"
                  onClick={() => onLaunchMission?.(suggestion.prompt)}
                  className="group flex items-start gap-3 rounded-xl border border-[#1f1f2a] bg-[#12121a] p-4 text-left transition-colors hover:border-[#8b5cf6]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                >
                  <suggestion.icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa] transition-colors group-hover:text-[#f4f4f5]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {suggestion.title}
                    </span>
                    <span className="text-xs leading-5 text-[#a1a1aa]">
                      {suggestion.prompt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </main>

          {/* Command bar pinned at the bottom */}
          <div className="px-4 pb-6">
            <div className="mx-auto w-full max-w-2xl">
              <CommandBar onSubmit={onLaunchMission} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
