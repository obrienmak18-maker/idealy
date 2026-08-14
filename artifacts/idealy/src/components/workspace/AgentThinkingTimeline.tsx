import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert, CircleCheck, CircleDot, Crosshair, Hammer, LayoutDashboard, ScanSearch, Sparkles, Target, Terminal, WandSparkles, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Way, WayAgent } from '@/lore/ways';
import type { MissionTeam } from '@/core/mission/missionTeam';
import type { MissionExecutionStage } from './MissionActivityPanel';

interface AgentThinkingTimelineProps {
  way: Way;
  team: MissionTeam;
  stage: MissionExecutionStage;
  visible: boolean;
  progress?: number;
}

type TimelineStep = {
  id: 'planning' | 'building' | 'validating';
  label: string;
  detail: string;
  agent: WayAgent;
  icon: LucideIcon;
};

const ORDER: TimelineStep['id'][] = ['planning', 'building', 'validating'];

const WAY_VISUALS: Record<Way['id'], { headerIcon: LucideIcon; stepIcons: [LucideIcon, LucideIcon, LucideIcon]; planningDuration: number }> = {
  ninja: { headerIcon: Zap, stepIcons: [Crosshair, Hammer, ScanSearch], planningDuration: 0.78 },
  mage: { headerIcon: WandSparkles, stepIcons: [Sparkles, WandSparkles, CircleCheck], planningDuration: 1.45 },
  hunter: { headerIcon: Target, stepIcons: [Target, Crosshair, ScanSearch], planningDuration: 1.05 },
  pro: { headerIcon: CircleDot, stepIcons: [LayoutDashboard, CircleCheck, Terminal], planningDuration: 1.25 },
};

function indexOfStage(stage: MissionExecutionStage): number {
  if (stage === 'needs-fix') return 2;
  if (stage === 'completed') return 3;
  return ORDER.indexOf(stage);
}

function statusFor(stepId: TimelineStep['id'], stage: MissionExecutionStage): 'queued' | 'active' | 'done' | 'error' {
  if (stage === 'needs-fix' && stepId === 'validating') return 'error';
  const current = indexOfStage(stage);
  const index = ORDER.indexOf(stepId);
  if (index < current || stage === 'completed') return 'done';
  if (index === current) return 'active';
  return 'queued';
}

function AgentMark({ agent, active, way }: { agent: WayAgent; active: boolean; way: Way }) {
  return agent.avatar ? (
    <img src={agent.avatar} alt="" className={`h-7 w-7 rounded-lg object-cover ${active ? 'ring-2 ring-white/20' : 'opacity-60'}`} />
  ) : (
    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${active ? way.primaryClass : 'bg-white/10 text-ink-400'}`}>
      {agent.name.slice(0, 1)}
    </span>
  );
}

export function AgentThinkingTimeline({ way, team, stage, visible, progress = 0 }: AgentThinkingTimelineProps) {
  const shouldReduceMotion = useReducedMotion();
  const visual = WAY_VISUALS[way.id];
  const HeaderIcon = visual.headerIcon;
  const steps: TimelineStep[] = [
    {
      id: 'planning',
      label: 'Orchestrateur',
      detail: `${team.strategist.name} transforme votre demande en plan d’action.`,
      agent: team.strategist,
      icon: visual.stepIcons[0],
    },
    {
      id: 'building',
      label: 'Bâtisseur',
      detail: `${team.builder.name} assemble l’interface et les fichiers du projet.`,
      agent: team.builder,
      icon: visual.stepIcons[1],
    },
    {
      id: 'validating',
      label: 'Terminal',
      detail: 'Le terminal vérifie le résultat sans inventer de réflexion.',
      agent: team.validator,
      icon: visual.stepIcons[2],
    },
  ];

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          aria-live="polite"
          aria-label="Chronologie de travail des agents"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -5 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={`mx-auto mb-5 w-full max-w-3xl overflow-hidden rounded-2xl border ${way.borderClass} bg-ink-950/70`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <motion.span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${way.primaryClass} text-ink-950`}
                animate={stage === 'planning' && !shouldReduceMotion ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
                transition={{ duration: visual.planningDuration, repeat: stage === 'planning' && !shouldReduceMotion ? Infinity : 0 }}
              >
                <HeaderIcon size={14} />
              </motion.span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">Atelier en cours</p>
                <p className="truncate text-[11px] text-ink-400">Les agents travaillent dans le Canvas, pas dans une bulle de chat.</p>
              </div>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] ${way.textClass}`}>
              {stage === 'completed' ? 'Prêt' : stage === 'needs-fix' ? 'À corriger' : 'En cours'}
            </span>
          </div>

          <div className="relative px-4 py-3">
            <div className="absolute bottom-8 left-[29px] top-8 w-px bg-white/10" aria-hidden="true" />
            <div className="relative space-y-3">
              {steps.map((step) => {
                const status = statusFor(step.id, stage);
                const Icon = step.icon;
                const isActive = status === 'active';
                const isDone = status === 'done';
                return (
                  <motion.div
                    key={step.id}
                    layout={!shouldReduceMotion}
                    className="grid grid-cols-[30px_1fr_auto] items-center gap-3"
                  >
                    <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink-950">
                      {isDone ? <span className={`flex h-6 w-6 items-center justify-center rounded-full ${way.primaryClass} text-ink-950`}><Check size={13} /></span> : status === 'error' ? <CircleAlert size={18} className="text-amber-300" /> : <AgentMark agent={step.agent} active={isActive} way={way} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon size={13} className={isActive ? way.textClass : isDone ? 'text-emerald-300' : 'text-ink-500'} />
                        <span className={`text-xs font-semibold ${isActive || isDone ? 'text-white' : 'text-ink-500'}`}>{step.label}</span>
                        <span className="truncate text-[10px] text-ink-500">{step.agent.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-ink-400">{step.detail}</p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          className={`h-full origin-left rounded-full ${status === 'error' ? 'bg-amber-300' : way.primaryClass}`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: isDone ? 1 : isActive ? Math.max(0.08, Math.min(1, progress / 100)) : 0 }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? way.textClass : isDone ? 'text-emerald-300' : status === 'error' ? 'text-amber-300' : 'text-ink-600'}`}>
                      {isActive ? `${Math.round(progress)}%` : isDone ? 'Terminé' : status === 'error' ? 'Erreur' : 'En attente'}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
