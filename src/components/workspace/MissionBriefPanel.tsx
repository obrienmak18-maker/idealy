import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowRight, Check, CircleHelp, Network, RotateCcw, ShieldCheck, Users, Zap } from 'lucide-react';
import type { Way } from '@/lore/ways';
import type { MissionContracts } from '@/core/mission/contracts';
import { deriveMissionRoute } from '@/core/mission/missionRouting';

interface MissionBriefPanelProps {
  way: Way;
  prompt: string;
  contracts: MissionContracts;
  onConfirm: (contracts: MissionContracts) => void;
  onCancel: () => void;
}

const COMPLEXITY_LABEL = {
  starter: 'Première étape',
  standard: 'Mission structurée',
  advanced: 'Mission ambitieuse',
} as const;

export function MissionBriefPanel({ way, prompt, contracts, onConfirm, onCancel }: MissionBriefPanelProps) {
  const [audience, setAudience] = useState(contracts.brief.audience);
  const [outcome, setOutcome] = useState(contracts.brief.primaryOutcome);
  const route = deriveMissionRoute(prompt, contracts, way);

  const confirm = () => {
    onConfirm({
      ...contracts,
      brief: {
        ...contracts.brief,
        audience: audience.trim() || contracts.brief.audience,
        primaryOutcome: outcome.trim() || contracts.brief.primaryOutcome,
        clarificationQuestions: [],
      },
    });
  };

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-ink-900/70 p-5 shadow-2xl" aria-labelledby="mission-brief-title">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${way.primaryClass}`}>
          <CircleHelp size={18} className="text-ink-950" />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${way.textClass}`}>Dépôt de {way.vocab.task.toLowerCase()}</p>
          <h3 id="mission-brief-title" className="mt-1 text-lg font-semibold text-white">Votre idée entre au {route.commandCenter}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">{prompt}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-300">Qui utilisera principalement l’application ?</span>
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-ink-600 focus:border-electric-400/60"
            placeholder="Ex. clients d’un studio indépendant"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-300">Quelle action doit absolument fonctionner ?</span>
          <input
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-ink-600 focus:border-electric-400/60"
            placeholder="Ex. réserver un créneau"
          />
        </label>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-ink-950/60"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Network size={15} className={way.textClass} />
            <div>
              <p className="text-xs font-semibold text-white">Routage de mission</p>
              <p className="mt-0.5 text-[11px] text-ink-400">{route.handoffLabel}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border border-current/20 px-2 py-1 text-[10px] font-semibold ${way.textClass}`}>
            {COMPLEXITY_LABEL[route.complexity]}
          </span>
        </div>

        <div className="grid gap-3 p-3.5 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-ink-300">
              <ShieldCheck size={14} className={way.textClass} />
              Équipe proposée · {route.rank}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {route.assignedAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: index * 0.06 }}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.035] px-2.5 py-2"
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs ${way.primaryClass} text-ink-950`} aria-hidden="true">
                    {agent.emoji}
                  </span>
                  <span className="text-[11px] font-medium text-ink-200">{agent.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/5 pt-3 md:border-l md:border-t-0 md:pl-3 md:pt-0">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-300">
              <Users size={14} className={way.textClass} />
              Pourquoi cette équipe ?
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-ink-400">
              {route.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-3.5 py-2.5">
          <p className="text-[11px] leading-5 text-ink-400">{route.summary} Ce classement organise la première version ; il ne bloque pas la génération et n’est pas un devis.</p>
          <span className={`flex shrink-0 items-center gap-1.5 rounded-full border border-current/20 px-2 py-1 text-[10px] font-semibold ${way.textClass}`} title="Estimation d’énergie de mission, pas un prix">
            <Zap size={11} /> {route.estimatedEnergy} {way.energyUnit.toLowerCase()} estimés
          </span>
        </div>
      </motion.div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {contracts.brief.mustHave.slice(0, 4).map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-ink-300">
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
        <button onClick={onCancel} className="flex items-center gap-2 text-xs text-ink-400 transition hover:text-white">
          <RotateCcw size={14} /> Modifier l’idée
        </button>
        <button onClick={confirm} className="btn-primary px-4">
          Confier à l’équipe <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
