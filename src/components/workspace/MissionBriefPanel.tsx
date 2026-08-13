import { useState } from 'react';
import { ArrowRight, Check, CircleHelp, RotateCcw } from 'lucide-react';
import type { Way } from '@/lore/ways';
import type { MissionContracts } from '@/core/mission/contracts';

interface MissionBriefPanelProps {
  way: Way;
  prompt: string;
  contracts: MissionContracts;
  onConfirm: (contracts: MissionContracts) => void;
  onCancel: () => void;
}

export function MissionBriefPanel({ way, prompt, contracts, onConfirm, onCancel }: MissionBriefPanelProps) {
  const [audience, setAudience] = useState(contracts.brief.audience);
  const [outcome, setOutcome] = useState(contracts.brief.primaryOutcome);

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
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${way.textClass}`}>Brief de mission</p>
          <h3 id="mission-brief-title" className="mt-1 text-lg font-semibold text-white">Avant de lancer l’escouade</h3>
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
          Lancer la mission <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
