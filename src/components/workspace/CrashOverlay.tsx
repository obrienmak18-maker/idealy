import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, Crosshair, RefreshCw, ShieldAlert, Sparkles, Target, WandSparkles, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Way } from '@/lore/ways';

interface CrashOverlayProps {
  way: Way;
  open: boolean;
  logs: string[];
  resolving: boolean;
  onAnalyze: () => void;
  onDismiss: () => void;
}

type CrashVisual = {
  icon: LucideIcon;
  label: string;
  animation: { initial: Record<string, number>; animate: Record<string, number | number[]>; transition: Record<string, unknown> };
  scanClass: string;
};

const CRASH_VISUALS: Record<Way['id'], CrashVisual> = {
  ninja: {
    icon: Zap,
    label: 'Reconnaissance rapide',
    animation: { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.2, ease: 'easeOut' } },
    scanClass: 'bg-slate-200/20',
  },
  mage: {
    icon: WandSparkles,
    label: 'Dissipation de l’anomalie',
    animation: { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
    scanClass: 'bg-violet-300/25 shadow-[0_0_24px_rgba(167,139,250,0.35)]',
  },
  hunter: {
    icon: Crosshair,
    label: 'Verrouillage de la cause',
    animation: { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: 'easeOut' } },
    scanClass: 'bg-amber-300/25 shadow-[0_0_18px_rgba(251,191,36,0.32)]',
  },
  pro: {
    icon: Activity,
    label: 'Analyse structurée',
    animation: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.24, ease: 'easeOut' } },
    scanClass: 'bg-slate-200/15',
  },
};

export function CrashOverlay({ way, open, logs, resolving, onAnalyze, onDismiss }: CrashOverlayProps) {
  const reduceMotion = useReducedMotion();
  const visual = CRASH_VISUALS[way.id];
  const Icon = visual.icon;
  const errorPreview = logs.filter((line) => /error|exception|failed|module|address/i.test(line)).slice(-3).join(' ').slice(0, 260);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="crash-overlay-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : visual.animation.initial}
            animate={visual.animation.animate}
            transition={reduceMotion ? { duration: 0.01 } : visual.animation.transition}
            className={`relative w-full max-w-md overflow-hidden rounded-2xl border ${way.borderClass} bg-ink-950/95 p-6 shadow-2xl`}
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${visual.scanClass}`} />
            <div className="flex items-start gap-3">
              <motion.div
                animate={reduceMotion || way.id === 'pro' ? undefined : { opacity: [0.65, 1, 0.65] }}
                transition={reduceMotion || way.id === 'pro' ? undefined : { duration: way.id === 'ninja' ? 0.8 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${way.primaryClass} text-ink-950`}
              >
                <Icon size={20} />
              </motion.div>
              <div className="min-w-0">
                <h2 id="crash-overlay-title" className="text-sm font-semibold text-white">Le Bâtisseur a rencontré une anomalie structurelle.</h2>
                <p className={`mt-1 text-xs ${way.textClass}`}>{resolving ? 'Analyse et correction en cours…' : visual.label}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                <ShieldAlert size={15} className="text-amber-200" />
                {!reduceMotion && <motion.span className={`absolute inset-0 rounded-lg border ${way.borderClass}`} animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.94, 1.08, 0.94] }} transition={{ duration: way.id === 'ninja' ? 0.9 : 1.8, repeat: Infinity }} />}
              </div>
              <p className="text-xs leading-5 text-ink-300">La version stable est conservée. Idealy prépare une correction vérifiable avant toute nouvelle écriture dans la preview.</p>
            </div>

            {errorPreview && <pre className="mt-4 max-h-20 overflow-hidden whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 font-mono text-[10px] leading-4 text-ink-500">{errorPreview}</pre>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={onDismiss} disabled={resolving} className="rounded-lg px-3 py-2 text-xs text-ink-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40">Garder la version stable</button>
              <button onClick={onAnalyze} disabled={resolving} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-950 transition ${way.primaryClass} disabled:cursor-wait disabled:opacity-60`}>
                {resolving ? <RefreshCw size={13} className="animate-spin" /> : way.id === 'mage' ? <Sparkles size={13} /> : way.id === 'hunter' ? <Target size={13} /> : <Icon size={13} />}
                {resolving ? 'Correction en cours' : 'Analyser et corriger'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
