import { CheckCircle2, CircleAlert, Cloud, GitBranch, History, RotateCcw, ShieldCheck } from 'lucide-react';
import type { MissionDNA, MissionSnapshot } from '@/core/mission/contracts';

interface MissionStatusPanelProps {
  dna: MissionDNA | null;
  onRestore: (snapshot: MissionSnapshot) => void;
  onFix: () => void;
}

const statusLabel: Record<MissionDNA['status'], string> = {
  draft: 'Brouillon',
  planned: 'Planifiée',
  building: 'Construction',
  ready: 'Version prête',
  'needs-fix': 'Correction nécessaire',
  published: 'Publiée',
};

export function MissionStatusPanel({ dna, onRestore, onFix }: MissionStatusPanelProps) {
  if (!dna) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <ShieldCheck size={28} className="text-ink-600" />
        <h3 className="mt-3 text-sm font-semibold text-white">État de la mission</h3>
        <p className="mt-2 max-w-xs text-xs leading-5 text-ink-400">Lancez une mission pour voir son brief, ses contrats, ses tests et ses versions stables.</p>
      </div>
    );
  }

  const validation = dna.validation;
  const latestSnapshot = dna.snapshots[dna.snapshots.length - 1];

  return (
    <div className="h-full overflow-y-auto p-4 scrollbar-thin">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-electric-300">ADN de Mission</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{statusLabel[dna.status]}</h3>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-ink-400">v{dna.version}</div>
      </div>

      <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Intention</p>
        <p className="mt-2 text-sm leading-5 text-ink-200">{dna.intention.problem}</p>
        <div className="mt-3 grid gap-2 text-xs text-ink-400">
          <p><span className="text-ink-500">Public :</span> {dna.intention.audience}</p>
          <p><span className="text-ink-500">Résultat :</span> {dna.intention.primaryOutcome}</p>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Contrats de mission</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            ['Design', dna.contracts?.design.screens.length ?? 0],
            ['Données', dna.contracts?.data.entities.length ?? 0],
            ['Actions', dna.contracts?.actions.actions.length ?? 0],
            ['Tests', dna.contracts?.tests.acceptance.length ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-ink-950/70 px-2.5 py-2">
              <p className="text-[10px] text-ink-500">{label}</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Validation</p>
          {validation?.status === 'passed' ? <CheckCircle2 size={15} className="text-emerald-400" /> : <CircleAlert size={15} className="text-amber-300" />}
        </div>
        {validation ? (
          <>
            <div className="mt-2 space-y-1.5">
              {validation.checks.map((check) => (
                <div key={check.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-300">{check.label}</span>
                  <span className={check.status === 'passed' ? 'text-emerald-400' : check.status === 'failed' ? 'text-red-300' : 'text-amber-300'}>{check.status}</span>
                </div>
              ))}
            </div>
            {validation.issues.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="rounded-lg bg-amber-400/10 px-2.5 py-2 text-xs leading-5 text-amber-200">
                  {validation.issues.map((issue) => (
                    <p key={`${issue.code}-${issue.path ?? 'project'}`}>[{issue.code}] {issue.message}{issue.path ? ` · ${issue.path}` : ''}</p>
                  ))}
                </div>
                {validation.status === 'failed' && (
                  <button onClick={onFix} className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20">
                    <RotateCcw size={13} /> Corriger avec ces issues
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-ink-400">La validation sera exécutée après la génération.</p>
        )}
      </section>

      <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-electric-300" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Décisions de mission</p>
        </div>
        <div className="mt-2 space-y-1.5">
          {dna.decisions.length === 0 ? <p className="text-xs text-ink-400">Aucune décision enregistrée.</p> : dna.decisions.map((decision) => <p key={decision} className="text-xs leading-5 text-ink-300">{decision}</p>)}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-electric-300" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Connecteurs utilisés</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dna.connectors.length === 0 ? <span className="text-xs text-ink-400">Aucun connecteur requis.</span> : dna.connectors.map((connector) => <span key={`${connector.provider}-${connector.environment}`} className="rounded-md bg-ink-950/70 px-2 py-1 text-[10px] text-ink-300">{connector.provider} · {connector.environment} · {connector.status}</span>)}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <History size={14} className="text-electric-300" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Versions stables</p>
        </div>
        <div className="mt-2 space-y-2">
          {dna.snapshots.length === 0 ? (
            <p className="text-xs text-ink-400">Aucun snapshot pour le moment.</p>
          ) : dna.snapshots.slice().reverse().map((snapshot) => (
            <div key={snapshot.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-950/70 px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs text-ink-200">{snapshot.label}</p>
                <p className="mt-0.5 text-[10px] text-ink-500">{new Date(snapshot.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <button onClick={() => onRestore(snapshot)} className="shrink-0 rounded-md p-1.5 text-ink-400 transition hover:bg-white/10 hover:text-white" title="Restaurer cette version">
                <RotateCcw size={13} />
              </button>
            </div>
          ))}
        </div>
        {latestSnapshot && <p className="mt-3 text-[10px] leading-4 text-ink-500">La dernière version stable reste restaurable même après une correction ratée.</p>}
      </section>

      <section className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Publication</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm text-ink-200">{dna.publication?.status ?? 'not-published'}</span>
          {dna.publication?.environment && <span className="text-[10px] text-ink-500">{dna.publication.environment}</span>}
        </div>
        {dna.publication?.url && <a className="mt-2 block truncate text-xs text-electric-300 hover:text-electric-200" href={dna.publication.url} target="_blank" rel="noopener noreferrer">{dna.publication.url}</a>}
      </section>
    </div>
  );
}
