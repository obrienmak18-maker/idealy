import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Command,
  FileCode2,
  FolderOpen,
  History,
  Menu,
  Mic,
  Paperclip,
  PanelRight,
  Plus,
  Rocket,
  Sparkles,
  TerminalSquare,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Brand';

type Way = 'ninja' | 'mage' | 'hunter' | 'pro';
type Phase = 'idle' | 'thinking' | 'building' | 'ready';

const WAY_META: Record<Way, { label: string; accent: string; description: string }> = {
  ninja: { label: 'Ninja', accent: '#94a3b8', description: 'Rapide et direct' },
  mage: { label: 'Mage', accent: '#a78bfa', description: 'Exploration créative' },
  hunter: { label: 'Hunter', accent: '#fbbf24', description: 'Orienté résultat' },
  pro: { label: 'Pro', accent: '#60a5fa', description: 'Précis et technique' },
};

const STARTERS = [
  'Une landing page élégante pour une pizzeria artisanale',
  'Un tableau de bord simple pour suivre mes dépenses',
  'Une page de réservation pour un salon de coiffure',
  'Une application mobile pour organiser mes cours',
];

const FILES = ['src/App.tsx', 'src/styles.css', 'package.json'];

export function IdealyV2Page() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [prompt, setPrompt] = useState('');
  const [mission, setMission] = useState('');
  const [way, setWay] = useState<Way>('pro');
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const reducedMotion = useReducedMotion();

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const submitMission = () => {
    const value = prompt.trim();
    if (!value) return;

    clearTimers();
    setMission(value);
    setPhase('thinking');
    timers.current.push(window.setTimeout(() => setPhase('building'), 900));
    timers.current.push(window.setTimeout(() => setPhase('ready'), 2400));
    setPrompt('');
  };

  const selectStarter = (value: string) => {
    setPrompt(value);
    window.setTimeout(() => document.getElementById('idealy-v2-composer')?.focus(), 0);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const hasMission = phase !== 'idle';
  const activeWay = WAY_META[way];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f4f4f5] selection:bg-violet-500/30">
      <div className="flex min-h-screen">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.button
              type="button"
              aria-label="Fermer le panneau historique"
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-[#1f1f2a] bg-[#0d0d14] transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex h-14 items-center justify-between border-b border-[#1f1f2a] px-4">
            <a href="/" aria-label="Retour à Idealy" className="flex items-center gap-2">
              <Logo size={26} />
              <span className="text-sm font-semibold tracking-tight">Idealy</span>
            </a>
            <button
              type="button"
              className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Fermer l’historique"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3">
            <button
              type="button"
              onClick={() => {
                clearTimers();
                setPhase('idle');
                setMission('');
                setPrompt('');
                setSidebarOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-[#292938] px-3 py-2.5 text-left text-sm text-[#f4f4f5] transition-colors hover:border-[#8b5cf6]/60 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              <Plus className="h-4 w-4 text-[#a78bfa]" />
              Nouvelle mission
            </button>
          </div>

          <div className="px-4 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#71717a]">
            Historique
          </div>
          <div className="px-3">
            {hasMission ? (
              <button type="button" className="flex w-full items-start gap-2 rounded-lg bg-white/[0.04] px-3 py-2.5 text-left text-xs text-[#d4d4d8]">
                <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a78bfa]" />
                <span className="line-clamp-2">{mission}</span>
              </button>
            ) : (
              <p className="px-3 py-2 text-xs leading-5 text-[#71717a]">Tes missions apparaîtront ici.</p>
            )}
          </div>

          <div className="mt-auto border-t border-[#1f1f2a] p-4">
            <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Aperçu V2 · local</span>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[#52525b]">L’authentification et les connecteurs seront branchés après validation visuelle.</p>
          </div>
        </aside>

        <main className="relative flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1f1f2a] px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-2 text-[#a1a1aa] hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Ouvrir l’historique"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="text-xs text-[#71717a]">Nouvelle mission</span>
              {hasMission && (
                <>
                  <span className="text-[#3f3f46]">/</span>
                  <span className="max-w-[220px] truncate text-xs text-[#a1a1aa]">{mission}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-[#71717a] sm:inline">Aperçu sans connexion</span>
              <button
                type="button"
                onClick={() => showNotice('La connexion sera activée après validation de la nouvelle interface.')}
                className="rounded-md px-2.5 py-1.5 text-xs text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
              >
                Se connecter
              </button>
            </div>
          </header>

          <div className={`flex min-h-0 flex-1 flex-col ${hasMission ? 'lg:flex-row' : ''}`}>
            <section className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${hasMission ? 'lg:w-[46%] lg:border-r lg:border-[#1f1f2a]' : ''}`}>
              <div className={`flex-1 overflow-y-auto px-4 sm:px-8 ${hasMission ? 'pb-36 pt-8' : 'pb-40'}`}>
                <div className={`mx-auto flex w-full flex-col ${hasMission ? 'max-w-2xl' : 'max-w-3xl'}`}>
                  {!hasMission ? (
                    <motion.div
                      className="flex min-h-[calc(100vh-13rem)] flex-col items-center justify-center text-center"
                      initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
                      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#2b2b3a] bg-[#12121a] text-[#a78bfa]">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Qu’allons-nous construire&nbsp;?</h1>
                      <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-[#a1a1aa]">Décris ton idée. Idealy la transforme en mission, puis te montre ce qui se construit.</p>

                      <div className="mt-9 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                        {STARTERS.map((starter, index) => (
                          <button
                            key={starter}
                            type="button"
                            onClick={() => selectStarter(starter)}
                            className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#1f1f2a] bg-[#101017]/70 px-4 py-3 text-left text-xs leading-5 text-[#a1a1aa] transition-colors hover:border-[#3a3158] hover:bg-[#15131f] hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                          >
                            <span>{starter}</span>
                            <ArrowUp className="h-3.5 w-3.5 rotate-45 shrink-0 text-[#52525b] transition-colors group-hover:text-[#a78bfa]" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-8">
                      <div className="flex items-start gap-3 border-b border-[#1f1f2a] pb-7">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[10px] font-semibold text-[#0a0a0f]">Toi</div>
                        <p className="pt-1 text-sm leading-6 text-[#e4e4e7]">{mission}</p>
                      </div>
                      <AgentTimeline phase={phase} way={activeWay} reducedMotion={Boolean(reducedMotion)} />
                      {phase === 'ready' && (
                        <motion.div
                          initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                          className="flex items-center gap-3 border-t border-[#1f1f2a] pt-5 text-xs text-[#a1a1aa]"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-3.5 w-3.5" /></div>
                          <span>Une première version est prête à être explorée.</span>
                          <button type="button" onClick={() => showNotice('Les actions de publication seront branchées après validation de cette coque.')} className="ml-auto text-[#a78bfa] hover:text-white">Continuer</button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/95 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-5 sm:px-8">
                <div className="mx-auto max-w-3xl">
                  <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-[#71717a]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#a1a1aa]">Voie</span>
                      <div className="flex items-center gap-1 rounded-md border border-[#292938] bg-[#101017] p-0.5">
                        {(Object.keys(WAY_META) as Way[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setWay(item)}
                            className={`rounded px-2 py-1 text-[10px] transition-colors ${way === item ? 'bg-white/[0.08] text-white' : 'text-[#71717a] hover:text-[#d4d4d8]'}`}
                            style={way === item ? { color: WAY_META[item].accent } : undefined}
                          >
                            {WAY_META[item].label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="hidden sm:inline">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span>
                  </div>

                  <div className={`rounded-2xl p-px ${phase === 'thinking' ? 'bg-gradient-to-r from-violet-500 via-amber-400 to-blue-500' : 'bg-[#2a2a38]'}`}>
                    <div className="rounded-[calc(1rem-1px)] bg-[#12121a] p-3">
                      <textarea
                        id="idealy-v2-composer"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            submitMission();
                          }
                        }}
                        rows={2}
                        placeholder="Décris ce que tu veux créer…"
                        aria-label="Décris ce que tu veux créer"
                        className="w-full resize-none bg-transparent px-1 text-sm leading-6 text-[#f4f4f5] placeholder:text-[#71717a] focus:outline-none"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => showNotice('Les pièces jointes seront activées avec les connecteurs.')} title="Joindre un fichier" aria-label="Joindre un fichier" className="rounded-md p-2 text-[#71717a] hover:bg-white/5 hover:text-[#f4f4f5]"><Paperclip className="h-4 w-4" /></button>
                          <button type="button" onClick={() => showNotice('La dictée sera activée dans la prochaine passe.')} title="Dicter" aria-label="Dicter" className="rounded-md p-2 text-[#71717a] hover:bg-white/5 hover:text-[#f4f4f5]"><Mic className="h-4 w-4" /></button>
                          <button type="button" onClick={() => showNotice('Commandes rapides : bientôt dans cette coque.')} title="Commandes rapides" aria-label="Commandes rapides" className="rounded-md p-2 text-[#71717a] hover:bg-white/5 hover:text-[#f4f4f5]"><Command className="h-4 w-4" /></button>
                        </div>
                        <button type="button" onClick={submitMission} disabled={!prompt.trim() || phase === 'thinking' || phase === 'building'} aria-label="Envoyer la mission" className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #f97316)' }}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-[#52525b]">Aperçu local · aucune donnée n’est envoyée</p>
                </div>
              </div>
            </section>

            <AnimatePresence initial={false}>
              {hasMission && (
                <motion.aside
                  key="canvas"
                  initial={reducedMotion ? undefined : { opacity: 0, x: 18 }}
                  animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: 18 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="min-h-[420px] flex-1 bg-[#0d0d14] lg:min-h-0"
                >
                  <PreviewSurface phase={phase} mission={mission} />
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#2a2a38] bg-[#171722] px-3 py-2 text-xs text-[#d4d4d8] shadow-2xl">
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AgentTimeline({ phase, way, reducedMotion }: { phase: Phase; way: { label: string; accent: string; description: string }; reducedMotion: boolean }) {
  const steps = [
    { label: 'Comprendre', detail: `${way.label} reformule ton intention`, done: phase !== 'thinking' },
    { label: 'Planifier', detail: 'Une première structure prend forme', done: phase === 'ready' },
    { label: 'Construire', detail: 'Le Bâtisseur prépare les fichiers', done: phase === 'ready' },
  ];

  return (
    <div aria-live="polite" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3a3158] bg-[#171326] text-[10px] font-semibold" style={{ color: way.accent }}>I</div>
        <div>
          <p className="text-sm font-medium text-[#f4f4f5]">Idealy travaille avec toi</p>
          <p className="mt-0.5 text-xs text-[#71717a]">{phase === 'thinking' ? 'Lecture de ton idée…' : phase === 'building' ? 'La mission se construit…' : 'La mission est prête.'}</p>
        </div>
      </div>
      <div className="ml-3 border-l border-[#292938] pl-7">
        {steps.map((step, index) => (
          <motion.div key={step.label} initial={reducedMotion ? undefined : { opacity: 0.4 }} animate={reducedMotion ? undefined : { opacity: step.done || (phase === 'thinking' && index === 0) ? 1 : 0.55 }} className="relative pb-5 last:pb-0">
            <span className={`absolute -left-[34px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${step.done ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300' : 'border-[#3a3158] bg-[#171326] text-[#a78bfa]'}`}>
              {step.done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <p className="text-xs font-medium text-[#d4d4d8]">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-[#71717a]">{step.detail}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PreviewSurface({ phase, mission }: { phase: Phase; mission: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1f1f2a] px-4">
        <div className="flex items-center gap-2 text-xs text-[#a1a1aa]"><PanelRight className="h-3.5 w-3.5" /> Canvas</div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#71717a]"><span className={`h-1.5 w-1.5 rounded-full ${phase === 'ready' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />{phase === 'ready' ? 'Preview prête' : 'Construction en cours'}</div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between text-[11px] text-[#71717a]">
          <div className="flex items-center gap-3"><span className="flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> Code</span><span className="flex items-center gap-1.5 text-[#d4d4d8]"><PanelRight className="h-3.5 w-3.5" /> Preview</span><span className="flex items-center gap-1.5"><TerminalSquare className="h-3.5 w-3.5" /> Terminal</span></div>
          <span className="hidden sm:inline">{FILES.length} fichiers</span>
        </div>

        {phase === 'building' || phase === 'thinking' ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-[#1f1f2a] bg-[#11111a] text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#3a3158] bg-[#171326] text-[#a78bfa]"><Sparkles className="h-4 w-4 animate-pulse" /></div>
            <p className="text-sm text-[#d4d4d8]">Préparation de la preview</p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[#71717a]">Le canvas apparaît dès que la structure de ton idée est prête.</p>
            <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-[#242432]"><motion.div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-orange-400" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.25, ease: 'easeInOut' }} /></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0.8 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#2a2a38] bg-[#f8fafc] text-slate-900 shadow-2xl">
            <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-3"><span className="h-2 w-2 rounded-full bg-slate-200" /><span className="h-2 w-2 rounded-full bg-slate-200" /><span className="h-2 w-2 rounded-full bg-slate-200" /><span className="ml-2 flex items-center gap-1 text-[9px] text-slate-400"><FolderOpen className="h-3 w-3" /> preview.local</span></div>
            <div className="flex flex-1 flex-col justify-between p-6 sm:p-10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Forno · pizzeria artisanale</p>
                <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">La pâte, le feu, le moment.</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Une expérience simple pour découvrir les pizzas qui sortent du four ce soir.</p>
                <div className="mt-6 flex gap-2"><span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white">Commander</span><span className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600">Voir le menu</span></div>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-2"><div className="h-20 rounded-lg bg-gradient-to-br from-orange-200 to-rose-300" /><div className="h-20 rounded-lg bg-gradient-to-br from-amber-100 to-orange-300" /><div className="h-20 rounded-lg bg-gradient-to-br from-red-100 to-orange-200" /></div>
            </div>
          </motion.div>
        )}

        <div className="mt-4 flex items-center justify-between text-[10px] text-[#52525b]"><div className="flex items-center gap-3"><span className="flex items-center gap-1"><FileCode2 className="h-3 w-3" /> {mission.length > 42 ? `${mission.slice(0, 42)}…` : mission}</span></div><span className="flex items-center gap-1"><Rocket className="h-3 w-3" /> Local</span></div>
      </div>
    </div>
  );
}
