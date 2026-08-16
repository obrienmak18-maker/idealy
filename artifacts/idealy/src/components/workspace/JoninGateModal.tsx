import { Crown, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { MissionComplexity } from '@/core/mission/missionRouting';

interface JoninGateModalProps {
  open: boolean;
  rank: string;
  complexity: MissionComplexity;
  onContinue: () => void;
  onUnlock: () => void;
  onClose: () => void;
}

export function JoninGateModal({ open, rank, complexity, onContinue, onUnlock, onClose }: JoninGateModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="jonin-gate-title">
      <button type="button" aria-label="Fermer la modale Jonin" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-300/30 bg-[#111722] p-6 text-white shadow-[0_0_80px_rgba(245,158,11,0.16)]">
        <button type="button" aria-label="Fermer" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-ink-400 hover:bg-white/8 hover:text-white">
          <X size={16} />
        </button>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200"><Crown size={21} /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Passage de rang</p><h2 id="jonin-gate-title" className="text-xl font-semibold">Débloquer les agents Jonin</h2></div>
        </div>
        <p className="text-sm leading-6 text-ink-200">Cette mission est classée <strong className="text-amber-200">{rank}</strong> ({complexity}). Avec vos agents gratuits Genin, le résultat peut rester incomplet sur les parties les plus complexes.</p>
        <div className="mt-5 space-y-3 border-y border-white/8 py-4 text-sm text-ink-300">
          <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> Continuer en gratuit conserve votre mission et son contexte.</div>
          <div className="flex items-center gap-2"><Sparkles size={15} className="text-amber-200" /> Les agents Jonin s’activent via votre offre Pro ou Business existante.</div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onContinue} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-ink-200 hover:bg-white/6 hover:text-white">Continuer en gratuit</button>
          <button type="button" onClick={onUnlock} className="rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-semibold text-[#211506] hover:bg-amber-200">Débloquer les Jonin →</button>
        </div>
      </div>
    </div>
  );
}
