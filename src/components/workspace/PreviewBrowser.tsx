import { motion } from 'framer-motion';
import { Monitor, RefreshCw, Smartphone, Tablet, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Way } from '@/lore/ways';
import { Logo } from '@/components/Brand';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface PreviewBrowserProps {
  way?: Way;
  url: string | null;
  device: PreviewDevice;
  loading: boolean;
  error?: boolean;
  onDeviceChange: (device: PreviewDevice) => void;
  onRefresh: () => void;
  children?: ReactNode;
}

const DEVICE_OPTIONS: Array<{ id: PreviewDevice; label: string; icon: typeof Monitor }> = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablette', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

function deviceFrameClass(device: PreviewDevice): string {
  if (device === 'mobile') return 'h-full max-h-[720px] w-[min(390px,calc(100%-2rem))] rounded-[2.2rem] border-[8px] border-ink-950 shadow-2xl';
  if (device === 'tablet') return 'h-full max-h-[780px] w-[min(860px,calc(100%-2rem))] rounded-[1.2rem] border-4 border-ink-950 shadow-2xl';
  return 'h-full w-full';
}

export function PreviewBrowser({ way, url, device, loading, error = false, onDeviceChange, onRefresh, children }: PreviewBrowserProps) {
  const accentBorder = way?.borderClass ?? 'border-white/10';
  const accentFill = way?.primaryClass ?? 'bg-electric-500';
  const accentText = way?.textClass ?? 'text-electric-300';

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border ${accentBorder} bg-[#090d14]`}>
      <div className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#111722] px-3 py-2">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/8 bg-[#0a0f18] px-3 py-1.5">
          <Wifi size={12} className={url ? 'text-emerald-300' : 'text-ink-600'} />
          <span className="truncate font-mono text-[10px] text-ink-400">{url ?? 'localhost:5173'}</span>
        </div>
        <button onClick={onRefresh} disabled={loading} aria-label="Rafraîchir la preview" title="Rafraîchir" className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/8 hover:text-white disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/6 bg-[#0d131d] px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-300 animate-pulse' : error ? 'bg-red-400' : `${accentFill} shadow-[0_0_10px_currentColor]`}`} />
          <span className="text-[10px] text-ink-500">{loading ? 'Préparation de l’environnement' : error ? 'Preview indisponible' : 'Preview live'}</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-black/20 p-0.5" role="group" aria-label="Taille de preview">
          {DEVICE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = device === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onDeviceChange(option.id)}
                aria-pressed={active}
                title={option.label}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition ${active ? `bg-white/10 ${accentText}` : 'text-ink-500 hover:text-ink-200'}`}
              >
                <Icon size={12} />
                <span className="hidden lg:inline">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,#172130_0%,#0a0f18_55%,#070a10_100%)] p-3">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#090d14]/96 px-8 text-center">
            <motion.div
              animate={{ opacity: [0.55, 1, 0.55], scale: [0.98, 1.03, 0.98] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accentFill} text-ink-950 shadow-2xl`}
            >
              <Logo size={28} />
            </motion.div>
            <div className="w-full max-w-md space-y-2">
              <div className="h-3 overflow-hidden rounded-full bg-white/8"><motion.div className="h-full w-2/5 rounded-full bg-white/20" animate={{ x: ['-120%', '280%'] }} transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }} /></div>
              <div className="mx-auto h-2 w-2/3 overflow-hidden rounded-full bg-white/6"><motion.div className="h-full w-1/2 rounded-full bg-white/12" animate={{ x: ['-140%', '260%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }} /></div>
            </div>
            <p className="text-xs text-ink-400">Idealy prépare votre application…</p>
          </div>
        )}
        <div className={`${deviceFrameClass(device)} overflow-hidden bg-white transition-[width,height,border-radius] duration-200`}>
          {children}
        </div>
      </div>
    </div>
  );
}
