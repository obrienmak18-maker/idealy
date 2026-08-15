import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, CircleCheck, CircleDot, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Way, WayAgent } from '@/lore/ways';

export type MissionFlowStatus = 'appearing' | 'active' | 'completed';
export type MissionFlowKind = 'user' | 'lia' | 'agent' | 'system' | 'result';

export interface MissionFlowStep {
  id: string;
  kind: MissionFlowKind;
  agent?: WayAgent;
  agentName: string;
  role: string;
  shortText: string;
  status: MissionFlowStatus;
  summary?: string;
  detailText?: string;
  code?: string;
  indent?: boolean;
}

interface MissionFlowProps {
  steps: MissionFlowStep[];
  way: Way;
  emptyState?: React.ReactNode;
}

const WAY_FLOW_ACCENTS: Record<Way['id'], { marker: string; glow: string; line: string }> = {
  ninja: { marker: 'bg-ember-400 text-ink-950', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.25)]', line: 'bg-ember-400/35' },
  mage: { marker: 'bg-electric-300 text-ink-950', glow: 'shadow-[0_0_22px_rgba(167,139,250,0.35)]', line: 'bg-electric-300/35' },
  hunter: { marker: 'bg-success-300 text-ink-950', glow: 'shadow-[0_0_18px_rgba(74,222,128,0.24)]', line: 'bg-success-300/35' },
  pro: { marker: 'bg-white text-ink-950', glow: 'shadow-[0_0_14px_rgba(255,255,255,0.18)]', line: 'bg-white/30' },
};

function visibleText(text: string): string {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').replace(/<\/think>/gi, '').trim();
}

function avatarFallback(step: MissionFlowStep): string {
  return step.kind === 'user' ? 'V' : step.agentName.slice(0, 1).toUpperCase();
}

function FlowAvatar({ step, way, active }: { step: MissionFlowStep; way: Way; active: boolean }) {
  const accent = WAY_FLOW_ACCENTS[way.id];
  return (
    <motion.div
      animate={active ? { scale: [1, 1.04, 1], opacity: [0.86, 1, 0.86] } : { scale: 1, opacity: step.status === 'completed' ? 0.6 : 1 }}
      transition={active ? { duration: way.id === 'mage' ? 1.8 : 1.15, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 text-xs font-bold ${step.kind === 'user' ? 'bg-white/10 text-white' : accent.marker} ${active ? accent.glow : ''}`}
    >
      {step.agent?.avatar ? <img src={step.agent.avatar} alt="" className="h-full w-full object-cover" /> : step.kind === 'lia' ? <Sparkles size={17} /> : avatarFallback(step)}
    </motion.div>
  );
}

function FlowStep({ step, way, index }: { step: MissionFlowStep; way: Way; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const accent = WAY_FLOW_ACCENTS[way.id];
  const isActive = step.status === 'active' || step.status === 'appearing';
  const detail = visibleText(step.detailText ?? '');
  const summary = visibleText(step.summary ?? '');

  return (
    <motion.article
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: step.status === 'completed' ? 0.78 : 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.025, 0.15), ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex gap-3 ${step.indent ? 'ml-5' : ''}`}
    >
      <FlowAvatar step={step} way={way} active={isActive} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-bold text-white">{step.agentName}</span>
          <span className={`text-[10px] uppercase tracking-[0.12em] ${way.textClass}`}>{step.role}</span>
          {step.status === 'active' && <span className="inline-flex items-center gap-1 text-[10px] text-ink-500"><Loader2 size={10} className="animate-spin" /> en cours</span>}
          {step.status === 'completed' && <CircleCheck size={12} className="text-emerald-300" />}
          {step.status === 'appearing' && <CircleDot size={12} className="text-ink-500" />}
        </div>
        <p className={`mt-1 max-w-2xl text-sm leading-6 ${step.status === 'completed' ? 'text-ink-400' : 'text-ink-200'}`}>{visibleText(step.shortText)}</p>
        {step.status === 'completed' && summary && <p className="mt-1 truncate text-xs text-ink-500">{summary}</p>}
        {step.status === 'completed' && (detail || step.code) && (
          <div className="mt-2">
            <button type="button" onClick={() => setExpanded((value) => !value)} className={`inline-flex items-center gap-1 text-[11px] ${way.textClass} transition hover:text-white`} aria-expanded={expanded}>
              Voir le détail <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.24 }} className="overflow-hidden">
                  <div className="mt-2 rounded-xl border border-white/8 bg-ink-950/65 p-3 text-xs leading-5 text-ink-300">
                    {detail && <p className="whitespace-pre-wrap">{detail}</p>}
                    {step.code && <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/30 p-3 font-mono text-[11px] text-emerald-100"><code>{step.code}</code></pre>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function MissionFlow({ steps, way, emptyState }: MissionFlowProps) {
  const accent = WAY_FLOW_ACCENTS[way.id];
  return (
    <section aria-label="Flux narratif de mission" aria-live="polite" className="mx-auto flex h-full w-full max-w-3xl flex-col">
      {steps.length === 0 ? emptyState : (
        <div className="relative space-y-5 px-1 py-6">
          <div className={`absolute bottom-10 left-6 top-10 w-px ${accent.line}`} aria-hidden="true" />
          {steps.map((step, index) => <FlowStep key={step.id} step={step} way={way} index={index} />)}
        </div>
      )}
    </section>
  );
}
