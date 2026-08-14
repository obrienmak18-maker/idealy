import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert, Clock3, Hammer, ScanSearch, Sparkles, UserRoundPlus } from 'lucide-react';
import type { Way, WayAgent } from '@/lore/ways';
import type { MissionTeam } from '@/core/mission/missionTeam';

export type MissionExecutionStage = 'planning' | 'building' | 'validating' | 'completed' | 'needs-fix';

interface MissionActivityPanelProps {
  way: Way;
  team: MissionTeam;
  stage: MissionExecutionStage;
  visible: boolean;
}

type ActivityStep = {
  id: Exclude<MissionExecutionStage, 'completed' | 'needs-fix'>;
  label: string;
  detail: string;
  agent: WayAgent;
  icon: typeof ScanSearch;
};

const STAGE_ORDER: MissionExecutionStage[] = ['planning', 'building', 'validating', 'completed'];

function stageIndex(stage: MissionExecutionStage): number {
  if (stage === 'needs-fix') return 2;
  return STAGE_ORDER.indexOf(stage);
}

export function MissionActivityPanel({ way, team, stage, visible }: MissionActivityPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const activeIndex = stageIndex(stage);
  const steps: ActivityStep[] = [
    {
      id: 'planning',
      label: 'Stratégie',
      detail: `${team.strategist.name} analyse l’idée et prépare le plan.`,
      agent: team.strategist,
      icon: ScanSearch,
    },
    {
      id: 'building',
      label: 'Construction',
      detail: `${team.builder.name} transforme le plan en première application.`,
      agent: team.builder,
      icon: Hammer,
    },
    {
      id: 'validating',
      label: 'Validation',
      detail: `${team.validator.name} vérifie les contrats et la version générée.`,
      agent: team.validator,
      icon: Check,
    },
  ];

  const reinforcement = stage === 'building' && team.optimizer;
  const completed = stage === 'completed';
  const needsFix = stage === 'needs-fix';

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          aria-live="polite"
          aria-label="Progression de la mission"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-5 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900/65"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <motion.span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${way.primaryClass} text-ink-950`}
                animate={stage === 'planning' && !shouldReduceMotion ? { rotate: [0, -7, 7, 0] } : { rotate: 0 }}
                transition={{ duration: 1.2, repeat: stage === 'planning' && !shouldReduceMotion ? Infinity : 0 }}
              >
                <Sparkles size={14} />
              </motion.span>
              <div>
                <p className="text-xs font-semibold text-white">Escouade en mission</p>
                <p className="text-[11px] text-ink-400">Les étapes ci-dessous reflètent l’avancement réel de la génération.</p>
              </div>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] ${way.textClass}`}>
              {completed ? 'Mission validée' : needsFix ? 'Correction requise' : 'En cours'}
            </span>
          </div>

          <div className="grid gap-2 p-3 sm:grid-cols-3">
            {steps.map((step, index) => {
              const isCurrent = step.id === stage;
              const isDone = index < activeIndex || completed;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.05 }}
                  className={`relative min-h-[94px] rounded-xl border p-3 transition-colors ${
                    isCurrent ? `${way.bgClass} border-current/25` : isDone ? 'border-white/10 bg-white/[0.035]' : 'border-white/5 bg-white/[0.015]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isCurrent || isDone ? way.primaryClass : 'bg-white/5'} ${isCurrent || isDone ? 'text-ink-950' : 'text-ink-500'}`}>
                      {isDone ? <Check size={14} /> : <Icon size={14} />}
                    </span>
                    {isCurrent && (
                      <motion.span
                        aria-label="Étape en cours"
                        className={`h-2 w-2 rounded-full ${way.primaryClass}`}
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${isCurrent || isDone ? 'text-white' : 'text-ink-500'}`}>{step.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-ink-400">{step.detail}</p>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {reinforcement && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5"
              >
                <UserRoundPlus size={14} className={way.textClass} />
                <p className="text-[11px] text-ink-300"><span className="font-semibold text-white">Renfort disponible :</span> {team.optimizer?.name ?? 'un spécialiste'} pourra être sollicité pour une prochaine itération de qualité et de performance.</p>
              </motion.div>
            )}
            {(completed || needsFix) && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mx-3 mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 ${needsFix ? 'border border-amber-400/20 bg-amber-400/10' : 'bg-white/[0.04]'}`}
              >
                {needsFix ? <CircleAlert size={14} className="text-amber-300" /> : <Clock3 size={14} className={way.textClass} />}
                <p className="text-[11px] text-ink-300">
                  {needsFix ? 'La validation a trouvé des points à corriger. Le rapport dans l’onglet Mission indique la suite.' : 'La version générée est prête à être examinée dans l’aperçu et dans l’onglet Mission.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
