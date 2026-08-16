import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import type { WayId } from '@/lore/ways';
import { WAYS } from '@/lore/ways';

type EnergyGaugeProps = {
  wayId: WayId;
  current: number;
  max: number;
  onUpgrade: () => void;
};

export function EnergyGauge({ wayId, current, max, onUpgrade }: EnergyGaugeProps) {
  const way = WAYS[wayId];
  const percentage = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;

  return (
    <button
      type="button"
      onClick={onUpgrade}
      aria-label={`${way.energy} : ${current} sur ${max}. Ouvrir les options de crédits.`}
      className="group flex min-w-[156px] items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-left transition hover:border-white/15 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-400/60"
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${way.bgClass} ${way.textClass}`}>
        <Zap size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-400">
          <span className="truncate">{way.energy}</span>
          <span className="font-mono normal-case tracking-normal text-ink-200">{current}/{max}</span>
        </span>
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10">
          <motion.span
            className={`block h-full rounded-full ${way.primaryClass}`}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </span>
      </span>
      <span className="sr-only">Ouvrir les options de crédits</span>
    </button>
  );
}
