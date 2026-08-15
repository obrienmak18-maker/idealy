import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, CircleCheck, CircleDot, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Way, WayAgent } from '@/lore/ways';
import { FileCreationIndicator, ThinkingIndicator } from './MissionStateIndicators';

export type MissionFlowStatus = 'appearing' | 'active' | 'completed';
export type MissionFlowKind = 'user' | 'lia' | 'agent' | 'system' | 'result';
export type MissionFlowIndicator = { kind: 'thinking' } | { kind: 'file'; path: string };

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
  indicator?: MissionFlowIndicator;
  action?: { label: string; onClick: () => void };
}

interface MissionFlowProps {
  steps: MissionFlowStep[];
  way: Way;
  emptyState?: React.ReactNode;
}

const WAY_FLOW_ACCENTS: Record<Way['id'], { marker: string; glow: string; line: string; border: string }> = {
  ninja: { marker: 'bg-ember-400 text-ink-950', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.25)]', line: 'bg-ember-400/35', border: 'border-ember-300/75' },
  mage: { marker: 'bg-electric-300 text-ink-950', glow: 'shadow-[0_0_22px_rgba(167,139,250,0.35)]', line: 'bg-electric-300/35', border: 'border-electric-300/75' },
  hunter: { marker: 'bg-success-300 text-ink-950', glow: 'shadow-[0_0_18px_rgba(74,222,128,0.24)]', line: 'bg-success-300/35', border: 'border-success-300/75' },
  pro: { marker: 'bg-white text-ink-950', glow: 'shadow-[0_0_14px_rgba(255,255,255,0.18)]', line: 'bg-white/30', border: 'border-white/60' },
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
      animate={active ? { scale: [1, 1.04, 1], opacity: [0.86, 1, 0.86] } : { scale: 1, opacity: step.status === 'completed' ? 0.62 : 1 }}
      transition={active ? { duration: way.id === 'mage' ? 1.8 : 1.15, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 text-[10px] font-bold ${accent.marker} ${active ? accent.glow : ''}`}
      aria-hidden="true"
    >
      {step.agent?.avatar ? <img src={step.agent.avatar} alt="" className="h-full w-full object-cover" /> : step.kind === 'lia' ? <Sparkles size={13} /> : avatarFallback(step)}
    </motion.div>
  );
}

function UserPromptBubble({ step, way }: { step: MissionFlowStep; way: Way }) {
  const shouldReduceMotion = useReducedMotion();
  const text = visibleText(step.shortText);
  const accent = WAY_FLOW_ACCENTS[way.id];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8, x: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <div className={`relative max-w-[min(90%,42rem)] rounded-2xl border ${accent.border} bg-[linear-gradient(110deg,rgba(139,92,246,0.28),rgba(249,115,22,0.2),rgba(139,92,246,0.28))] bg-[length:220%_100%] p-px shadow-[inset_0_0_22px_rgba(255,255,255,0.06)] ${shouldReduceMotion ? '' : 'motion-safe:animate-shimmer'}`}>
        <div className="rounded-[15px] bg-ink-900/75 px-4 py-3 backdrop-blur-sm">
          <p className="whitespace-pre-wrap text-sm leading-6 text-ink-100">{text}</p>
        </div>
      </div>
    </motion.article>
  );
}

function ActiveIndicator({ indicator }: { indicator?: MissionFlowIndicator }) {
  if (!indicator) return null;
  return indicator.kind === 'file' ? <FileCreationIndicator path={indicator.path} /> : <ThinkingIndicator />;
}

function FlowStep({ step, way, index }: { step: MissionFlowStep; way: Way; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const accent = WAY_FLOW_ACCENTS[way.id];
  const isActive = step.status === 'active' || step.status === 'appearing';
  const detail = visibleText(step.detailText ?? '');
  const summary = visibleText(step.summary ?? '');

  if (step.kind === 'user') return <UserPromptBubble step={step} way={way} />;

  return (
    <motion.article
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: step.status === 'completed' ? 0.78 : 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.025, 0.15), ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex gap-3 ${step.indent ? 'ml-5' : ''}`}
    >
      <FlowAvatar step={step} way={way} active={isActive} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-bold text-white">{step.agentName}</span>
          <span className={`text-[10px] uppercase tracking-[0.12em] ${way.textClass}`}>{step.role}</span>
          {step.status === 'active' && <CircleDot size={11} className="text-ink-500" aria-label="En cours" />}
          {step.status === 'completed' && <CircleCheck size={12} className="text-emerald-300" aria-label="Terminé" />}
        </div>
        <div className="mt-1 min-h-6">
          {isActive && step.indicator ? <ActiveIndicator indicator={step.indicator} /> : (
            <p className={`whitespace-pre-wrap text-sm leading-6 ${step.status === 'completed' ? 'text-ink-400' : 'text-ink-200'}`}>{visibleText(step.shortText)}</p>
          )}
        </div>
        {step.status === 'completed' && summary && summary !== visibleText(step.shortText) && <p className="mt-1 truncate text-xs text-ink-500">{summary}</p>}
        {step.action && (
          <button type="button" onClick={step.action.onClick} className={`mt-2 inline-flex items-center rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium ${way.textClass} transition hover:border-white/20 hover:bg-white/5 hover:text-white`}>
            {step.action.label}
          </button>
        )}
        {step.status === 'completed' && (detail || step.code) && (
          <div className="mt-2">
            <button type="button" onClick={() => setExpanded((value) => !value)} className={`inline-flex items-center gap-1 text-[11px] ${way.textClass} transition hover:text-white`} aria-expanded={expanded}>
              Voir la réflexion <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2 }} className="overflow-hidden">
                  <div className="mt-2 border-l border-white/10 pl-3 text-xs leading-5 text-ink-400">
                    {detail && <p className="whitespace-pre-wrap">{detail}</p>}
                    {step.code && <pre className="mt-3 max-h-80 overflow-auto border-l border-emerald-300/30 pl-3 font-mono text-[11px] text-emerald-100"><code>{step.code}</code></pre>}
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
          <div className={`pointer-events-none absolute bottom-10 left-3.5 top-10 w-px ${accent.line}`} aria-hidden="true" />
          {steps.map((step, index) => <FlowStep key={step.id} step={step} way={way} index={index} />)}
        </div>
      )}
    </section>
  );
}
