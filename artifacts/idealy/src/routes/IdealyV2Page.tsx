import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Database,
  Download,
  FileCode2,
  ExternalLink,
  EyeOff,
  FolderOpen,
  History,
  Heart,
  Globe2,
  Menu,
  MoreHorizontal,
  Mic,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  Plug,
  Puzzle,
  Settings,
  Settings2,
  Share2,
  Star,
  Upload,
  PanelRight,
  RefreshCw,
  Plus,
  Rocket,
  Sparkles,
  TerminalSquare,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [promptHelperOpen, setPromptHelperOpen] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [workspaceTab, setWorkspaceTab] = useState<'preview' | 'code' | 'data'>('preview');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'logs' | 'terminal'>('terminal');
  const [canvasWidth, setCanvasWidth] = useState(54);
  const [resizing, setResizing] = useState(false);
  const timers = useRef<number[]>([]);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const promptHelperRef = useRef<HTMLDivElement>(null);
  const conversationMenuRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!attachmentRef.current?.contains(target)) setAttachmentOpen(false);
      if (!promptHelperRef.current?.contains(target)) setPromptHelperOpen(false);
      if (!conversationMenuRef.current?.contains(target)) setConversationMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAttachmentOpen(false);
        setPromptHelperOpen(false);
        setConsoleOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (event: PointerEvent) => {
      const railWidth = sidebarCollapsed ? 68 : 248;
      const available = Math.max(640, window.innerWidth - railWidth);
      const next = ((window.innerWidth - event.clientX) / available) * 100;
      setCanvasWidth(Math.min(66, Math.max(34, next)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizing, sidebarCollapsed]);

  const submitMission = () => {
    const value = prompt.trim();
    if (!value) return;

    clearTimers();
    if (mission && mission !== value) {
      setHistory((items) => [mission, ...items.filter((item) => item !== mission)].slice(0, 6));
    }
    setMission(value);
    setSidebarCollapsed(true);
    setWorkspaceTab('preview');
    setConsoleOpen(false);
    setPhase('thinking');
    timers.current.push(window.setTimeout(() => setPhase('building'), 900));
    timers.current.push(window.setTimeout(() => setPhase('ready'), 2400));
    setPrompt('');
  };

  const selectStarter = (value: string) => {
    setPrompt(value);
    window.setTimeout(() => document.getElementById('idealy-v2-composer')?.focus(), 0);
  };

  const toggleSidebar = () => {
    const opening = sidebarCollapsed;
    setSidebarCollapsed(!opening);
    setSidebarOpen(opening);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const hasMission = phase !== 'idle';
  const activeWay = WAY_META[way];

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0d0c12] text-[#f4f4f5] selection:bg-[#f6b2d4]/30"
      onPointerMove={(event) => {
        document.documentElement.style.setProperty('--idealy-pointer-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--idealy-pointer-y', `${event.clientY}px`);
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 opacity-80" style={{ background: 'radial-gradient(420px circle at var(--idealy-pointer-x, 50%) var(--idealy-pointer-y, 35%), rgba(246,178,212,0.12), transparent 68%)' }} />
      <div className="pointer-events-none fixed left-[24%] top-[18%] z-0 h-1 w-1 rounded-full bg-[#8edee2]/60 shadow-[0_0_22px_8px_rgba(142,222,226,0.12)] motion-safe:animate-pulse" />
      <div className="pointer-events-none fixed bottom-[24%] right-[28%] z-0 h-1 w-1 rounded-full bg-[#f3d27a]/50 shadow-[0_0_18px_7px_rgba(243,210,122,0.1)] motion-safe:animate-pulse" />
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
          className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#1f1f2a] bg-[#0d0d14] transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${sidebarCollapsed ? 'w-0 border-r-0' : 'w-[248px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden`}
        >
          <div className="flex h-14 items-center justify-between border-b border-[#1f1f2a] px-4">
                          <a href="/" aria-label="Retour à Idealy" className="overflow-hidden transition-opacity">
                <Logo size={26} markOnly />

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
                if (mission) setHistory((items) => [mission, ...items.filter((item) => item !== mission)].slice(0, 6));
                setPhase('idle');
                setMission('');
                setPrompt('');
                setSidebarCollapsed(true);
                setWorkspaceTab('preview');
                setConsoleOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg border border-[#292938] px-3 py-2.5 text-left text-sm text-[#f4f4f5] transition-colors hover:border-[#8b5cf6]/60 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6] ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
              title={sidebarCollapsed ? 'Nouvelle mission' : undefined}
            >
              <Plus className="h-4 w-4 shrink-0 text-[#a78bfa]" />
              <span className={sidebarCollapsed ? 'sr-only' : ''}>Nouvelle mission</span>
            </button>
          </div>

          <div className={`px-4 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#71717a] ${sidebarCollapsed ? 'sr-only' : ''}`}>
            Historique
          </div>
          <div className={`px-3 ${sidebarCollapsed ? 'sr-only' : ''}`}>
            {hasMission || history.length > 0 ? (
              <div className="space-y-1">
                {[mission, ...history].filter(Boolean).map((item, index) => (
                  <button key={`${item}-${index}`} type="button" className="flex w-full items-start gap-2 rounded-lg bg-white/[0.04] px-3 py-2.5 text-left text-xs text-[#d4d4d8]">
                    <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a78bfa]" />
                    <span className="line-clamp-2">{item}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-xs leading-5 text-[#71717a]">Tes missions apparaîtront ici.</p>
            )}
          </div>

          <div className="mt-auto border-t border-[#1f1f2a] p-3">
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f6b2d4] to-[#f3d27a] text-[10px] font-semibold text-[#1a1219]" title="Profil local">I</div>
              <div className={sidebarCollapsed ? 'sr-only' : ''}>
                <p className="text-xs text-[#d4d4d8]">Profil local</p>
                <p className="text-[10px] text-[#71717a]">Aperçu V2</p>
              </div>
              <button type="button" onClick={() => showNotice('Les paramètres seront activés après validation de la coque.')} aria-label="Ouvrir les paramètres" title="Paramètres" className={`ml-auto rounded-md p-1.5 text-[#71717a] hover:bg-white/5 hover:text-white ${sidebarCollapsed ? 'sr-only' : ''}`}><Settings className="h-3.5 w-3.5" /></button>
            </div>
            <p className={sidebarCollapsed ? 'sr-only' : 'mt-2 text-[10px] leading-4 text-[#52525b]'}>Connexion et connecteurs après validation visuelle.</p>
          </div>
        </aside>

        <main className="relative flex min-h-screen min-w-0 flex-1 flex-col">
          {hasMission && <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-[#2b2733] bg-[#111018]/95 px-2 backdrop-blur sm:px-3">
            <div className="flex min-w-0 items-center gap-1">
              <button type="button" onClick={toggleSidebar} className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-white/5 hover:text-white" aria-label={sidebarCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'} title={sidebarCollapsed ? 'Afficher la sidebar' : 'Masquer la sidebar'}
>
                <PanelLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => showNotice('Ajoute cette conversation à tes favoris depuis son menu.')} className="hidden rounded-md p-1.5 text-[#71717a] hover:bg-white/5 hover:text-amber-300 sm:inline-flex" aria-label="Ajouter aux favoris" title="Ajouter aux favoris"><Star className="h-3.5 w-3.5" /></button>
              <div ref={conversationMenuRef} className="relative min-w-0">
                <button type="button" onClick={() => setConversationMenuOpen((value) => !value)} aria-expanded={conversationMenuOpen} className="flex max-w-[210px] items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#d4d4d8] hover:bg-white/5 hover:text-white sm:max-w-[280px]">
                  <span className="truncate">{hasMission ? (mission.length > 30 ? `${mission.slice(0, 30)}…` : mission) : 'Nouvelle conversation'}</span><ChevronDown className="h-3 w-3 shrink-0 text-[#71717a]" />
                </button>
                <AnimatePresence>
                  {conversationMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.97 }} className="absolute left-0 top-10 z-50 w-60 rounded-xl border border-[#2a2a38] bg-[#171722] p-1.5 shadow-2xl">
                      <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.14em] text-[#71717a]">Conversation</p>
                      {[
                        { label: 'Renommer', icon: WandSparkles },
                        { label: 'Ajouter aux favoris', icon: Heart },
                        { label: 'Dupliquer', icon: Copy },
                        { label: 'Télécharger en ZIP', icon: Download },
                      ].map((item) => (
                        <button key={item.label} type="button" onClick={() => { setConversationMenuOpen(false); showNotice(`${item.label} sera activé après validation de la coque.`); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d4d4d8] hover:bg-white/5"><item.icon className="h-3.5 w-3.5 text-[#a78bfa]" />{item.label}</button>
                      ))}
                      <div className="my-1 border-t border-[#2a2a38]" />
                      {[
                        { label: 'Réglages', icon: Settings2 },
                        { label: 'Transférer', icon: Share2 },
                        { label: 'Supprimer la conversation', icon: Trash2 },
                      ].map((item) => (
                        <button key={item.label} type="button" onClick={() => { setConversationMenuOpen(false); showNotice(`${item.label} sera activé après validation de la coque.`); }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/5 ${item.label.startsWith('Supprimer') ? 'text-red-300' : 'text-[#d4d4d8]'}`}><item.icon className="h-3.5 w-3.5" />{item.label}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5 text-[#71717a]">
              <div className="hidden min-w-0 items-center gap-0.5 border-r border-[#2b2733] pr-2 md:flex">
                <button type="button" onClick={() => showNotice('Le mode Design sera activé après validation visuelle.')} aria-label="Design" title="Design" className="rounded-md p-1.5 text-[#f6b2d4] hover:bg-white/5 hover:text-white"><WandSparkles className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setWorkspaceTab('preview')} aria-label="Preview" title="Preview" className={`rounded-md p-1.5 hover:bg-white/5 ${workspaceTab === 'preview' ? 'text-white' : 'text-[#8edee2]'}`}><PanelRight className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setWorkspaceTab('code')} aria-label="Code" title="Code" className={`rounded-md p-1.5 hover:bg-white/5 ${workspaceTab === 'code' ? 'text-white' : 'text-[#8a8a9f]'}`}><Code2 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setWorkspaceTab('data')} aria-label="Data" title="Data" className={`rounded-md p-1.5 hover:bg-white/5 ${workspaceTab === 'data' ? 'text-white' : 'text-[#f3d27a]'}`}><Database className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => { setConsoleTab('terminal'); setConsoleOpen(true); }} aria-label="Console" title="Console" className={`rounded-md p-1.5 hover:bg-white/5 ${consoleOpen ? 'text-white' : 'text-[#8a8a9f]'}`}><TerminalSquare className="h-3.5 w-3.5" /></button>
              </div>
              <button type="button" onClick={() => showNotice('Ouvre la preview dans un nouvel onglet quand elle sera connectée.')} aria-label="Ouvrir la preview dans un nouvel onglet" title="Ouvrir dans un nouvel onglet" className="hidden rounded-md p-1.5 hover:bg-white/5 hover:text-white sm:inline-flex"><ArrowUpRight className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Preview précédente" title="Preview précédente" className="hidden rounded-md p-1.5 hover:bg-white/5 hover:text-white sm:inline-flex"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Preview suivante" title="Preview suivante" className="hidden rounded-md p-1.5 hover:bg-white/5 hover:text-white sm:inline-flex"><ChevronRight className="h-3.5 w-3.5" /></button>
              <div className="hidden items-center gap-1 rounded-md border border-[#2b2733] bg-[#18151e] px-2 py-1 text-[10px] sm:flex"><Globe2 className="h-3 w-3 text-[#8edee2]" /> preview.local</div>
              <button type="button" aria-label="Version actuelle" title="Version actuelle" className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#a1a1aa] hover:bg-white/5 hover:text-white sm:flex">Latest <ChevronDown className="h-3 w-3" /></button>
              <button type="button" onClick={() => showNotice('Les actions du projet apparaîtront ici.')} aria-label="Plus d’actions" title="Plus d’actions" className="rounded-md p-1.5 hover:bg-white/5 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
              <button type="button" onClick={() => showNotice('Le partage sera activé après validation de la coque.')} aria-label="Partager" title="Partager" className="hidden rounded-md p-1.5 hover:bg-white/5 hover:text-white sm:inline-flex"><Share2 className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => showNotice('La publication sera activée après validation de la coque.')} className="hidden rounded-md bg-gradient-to-r from-[#f06a9b] to-[#f6a86d] px-2.5 py-1.5 text-[10px] font-semibold text-[#191219] shadow-[0_0_18px_rgba(240,106,155,0.2)] hover:brightness-110 sm:inline-flex">Publier</button>
              <button type="button" onClick={() => showNotice('Les espaces d’équipe seront activés après la validation de la coque.')} className="hidden rounded-md border border-[#2f6d70] bg-[#143237] px-2.5 py-1.5 text-[10px] font-medium text-[#9ce6e5] hover:bg-[#19464a] sm:inline-flex">Équipe</button>
            </div>
          </header>}

          {hasMission && <AnimatePresence initial={false}>
            {consoleOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-3 top-12 z-40 h-60 w-[min(92vw,420px)] overflow-hidden rounded-xl border border-[#2a2a38] bg-[#0b0b10] shadow-2xl">
                <ConsolePanel phase={phase} consoleTab={consoleTab} setConsoleTab={setConsoleTab} onClose={() => setConsoleOpen(false)} showNotice={showNotice} />
              </motion.div>
            )}
          </AnimatePresence>}

          <div className={`flex min-h-0 flex-1 flex-col ${hasMission ? 'lg:flex-row' : ''}`}>
            <section className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${hasMission ? 'lg:w-[46%] lg:border-r lg:border-[#1f1f2a]' : ''}`}>
              <div tabIndex={hasMission ? 0 : undefined} className={`flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 sm:px-8 ${hasMission ? 'pb-36 pt-8' : 'pb-40'}`}>
                <div className={`mx-auto flex w-full flex-col ${hasMission ? 'max-w-2xl' : 'max-w-3xl'}`}>
                  {!hasMission ? (
                    <motion.div
                      className="flex min-h-[calc(100vh-13rem)] flex-col items-center justify-center text-center"
                      initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
                      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3341] bg-[#18151e] text-[#f6b2d4] shadow-[0_0_24px_rgba(246,178,212,0.12)]">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-[#fff8fc] sm:text-4xl">Qu’allons-nous construire&nbsp;?</h1>
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
                      <div className="flex items-start gap-3 pb-5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-[10px] font-semibold text-[#0a0a0f]">Toi</div>
                        <p className="pt-1 text-sm leading-6 text-[#e4e4e7]">{mission}</p>
                      </div>
                      <AgentTimeline phase={phase} way={activeWay} reducedMotion={Boolean(reducedMotion)} />
                      {phase === 'ready' && (
                        <motion.div
                          initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                          className="flex items-center gap-3 pt-2 text-xs text-[#a1a1aa]"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8edee2]/10 text-[#8edee2]"><Check className="h-3.5 w-3.5" /></div>
                          <span>Une première version est prête à être explorée.</span>
                          <button type="button" onClick={() => showNotice('Les actions de publication seront branchées après validation de cette coque.')} className="ml-auto text-[#f6b2d4] hover:text-white">Continuer</button>
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

                                      <div className={`rounded-2xl p-px ${phase === 'thinking' ? 'bg-gradient-to-r from-[#f6b2d4] via-[#f3d27a] to-[#8edee2]' : 'bg-[#3a3341]'}`}>
                      <div className="rounded-[calc(1rem-1px)] bg-[#17141c] p-3">

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
                          <div ref={attachmentRef} className="relative">
                            <button type="button" onClick={() => setAttachmentOpen((value) => !value)} title="Joindre, importer ou connecter" aria-label="Joindre, importer ou connecter" aria-expanded={attachmentOpen} className={`rounded-md p-2 text-[#71717a] hover:bg-white/5 hover:text-[#f4f4f5] ${attachmentOpen ? 'bg-white/5 text-white' : ''}`}><Paperclip className="h-4 w-4" /></button>
                            <AnimatePresence>
                              {attachmentOpen && (
                                <motion.div initial={{ opacity: 0, y: 5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.97 }} className="absolute bottom-11 left-0 z-30 w-56 rounded-xl border border-[#2a2a38] bg-[#171722] p-1.5 shadow-2xl">
                                  <button type="button" onClick={() => { setAttachmentOpen(false); showNotice('Import de fichiers : prêt pour la prochaine connexion.'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d4d4d8] hover:bg-white/5"><Upload className="h-3.5 w-3.5 text-[#a78bfa]" />Importer depuis l’ordinateur</button>
                                  <button type="button" onClick={() => { setAttachmentOpen(false); showNotice('Le registre des connecteurs sera branché ici.'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d4d4d8] hover:bg-white/5"><Plug className="h-3.5 w-3.5 text-[#60a5fa]" />Connecter un service</button>
                                  <button type="button" onClick={() => { setAttachmentOpen(false); showNotice('Les plugins seront disponibles depuis ce menu.'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d4d4d8] hover:bg-white/5"><Puzzle className="h-3.5 w-3.5 text-[#fbbf24]" />Ajouter un plugin</button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <div ref={promptHelperRef} className="relative">
                            <button type="button" onClick={() => setPromptHelperOpen((value) => !value)} title="Améliorer l’idée" aria-label="Améliorer l’idée" aria-expanded={promptHelperOpen} className={`rounded-md p-2 text-[#71717a] hover:bg-white/5 hover:text-[#f4f4f5] ${promptHelperOpen ? 'bg-white/5 text-white' : ''}`}><Sparkles className="h-4 w-4" /></button>
                            <AnimatePresence>
                              {promptHelperOpen && (
                                <motion.div initial={{ opacity: 0, y: 5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.97 }} className="absolute bottom-11 left-0 z-30 w-64 rounded-xl border border-[#2a2a38] bg-[#171722] p-1.5 shadow-2xl">
                                  <p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.14em] text-[#71717a]">Améliorer l’idée</p>
                                  {[
                                    ['Préciser le résultat', 'Ajoute le résultat attendu et les utilisateurs visés.'],
                                    ['Structurer les écrans', 'Propose les pages principales et leur navigation.'],
                                    ['Définir le style', 'Suggère une direction visuelle cohérente et accessible.'],
                                    ['Réduire le périmètre', 'Transforme cette idée en première version réalisable.'],
                                  ].map(([label, addition]) => (
                                    <button key={label} type="button" onClick={() => { setPrompt((value) => `${value.trim()}${value.trim() ? '\\n\\n' : ''}${addition}`); setPromptHelperOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d4d4d8] hover:bg-white/5"><Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />{label}</button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => showNotice('La dictée sera activée dans la prochaine passe.')} title="Dicter" aria-label="Dicter" className="rounded-md p-2 text-[#71717a] hover:bg-white/5 hover:text-[#f4f4f5]"><Mic className="h-4 w-4" /></button>
                          <button type="button" onClick={submitMission} disabled={!prompt.trim() || phase === 'thinking' || phase === 'building'} aria-label="Envoyer la mission" className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #f97316)' }}>
                            <ArrowUp className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-[#52525b]">Aperçu local · aucune donnée n’est envoyée</p>
                </div>
              </div>
            </section>

            {hasMission && (
              <div
                role="separator"
                aria-label="Redimensionner l’espace de travail"
                aria-valuemin={34}
                aria-valuemax={66}
                aria-valuenow={canvasWidth}
                tabIndex={0}
                onPointerDown={() => setResizing(true)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') setCanvasWidth((value) => Math.min(66, value + 3));
                  if (event.key === 'ArrowRight') setCanvasWidth((value) => Math.max(34, value - 3));
                }}
                className={`group hidden w-1 cursor-col-resize items-center justify-center bg-[#1f1f2a] outline-none transition-colors hover:bg-violet-400/40 focus-visible:bg-violet-400/50 lg:flex ${resizing ? 'bg-violet-400/60' : ''}`}
              >
                <span className="h-12 w-0.5 rounded-full bg-[#52525b] transition-colors group-hover:bg-violet-300" />
              </div>
            )}
            <AnimatePresence initial={false}>
              {hasMission && (
                <motion.aside
                  key="canvas"
                  initial={reducedMotion ? undefined : { opacity: 0, x: 18 }}
                  animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, x: 18 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className="min-h-[420px] w-full flex-none bg-[#0d0d14] lg:min-h-0 lg:w-[var(--idealy-canvas-width)]"
                  style={{ '--idealy-canvas-width': `${canvasWidth}%` } as CSSProperties}
                >
                  <PreviewSurface phase={phase} workspaceTab={workspaceTab} setWorkspaceTab={setWorkspaceTab} showNotice={showNotice} />
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
  const [expanded, setExpanded] = useState(false);
  const steps = [
    { label: 'Intention comprise', detail: `${way.label} reformule le résultat attendu`, done: phase !== 'thinking' },
    { label: 'Structure préparée', detail: 'Les écrans et les fichiers principaux prennent forme', done: phase === 'ready' },
    { label: 'Preview construite', detail: 'Une première version est prête à être explorée', done: phase === 'ready' },
  ];
  const headline = phase === 'thinking' ? 'Réflexion en cours' : phase === 'building' ? 'Construction en cours' : 'Première version prête';
  const detail = phase === 'thinking' ? 'Je mets ton idée en structure…' : phase === 'building' ? 'Les premiers fichiers sont en préparation…' : 'Tu peux maintenant explorer le résultat.';

  return (
    <div aria-live="polite" className="space-y-2">
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-1 py-2 text-left text-[#d4d4d8] transition-colors hover:text-white">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#3a3158] bg-[#171326] text-[10px] font-semibold" style={{ color: way.accent }}>I</div>
        <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-xs font-medium text-[#f4f4f5]">{headline}<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a78bfa]" /></span><span className="mt-0.5 block truncate text-[11px] text-[#71717a]">{detail}</span></span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#71717a] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={reducedMotion ? undefined : { opacity: 0, height: 0 }} animate={reducedMotion ? undefined : { opacity: 1, height: 'auto' }} exit={reducedMotion ? undefined : { opacity: 0, height: 0 }} className="overflow-hidden border-l border-[#292938] pl-4">
            <div className="space-y-1 py-1">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-start gap-2.5 px-2 py-2">
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${step.done ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300' : 'border-[#3a3158] bg-[#171326] text-[#a78bfa]'}`}>{step.done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>
                  <span className="min-w-0"><span className="block text-[11px] font-medium text-[#d4d4d8]">{step.label}</span><span className="mt-0.5 block text-[11px] leading-5 text-[#71717a]">{step.detail}</span></span>
                  {index === 0 && phase === 'thinking' && <span className="ml-auto mt-1 text-[10px] text-[#a78bfa]">en cours</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewSurface({ phase, workspaceTab, setWorkspaceTab, showNotice }: { phase: Phase; workspaceTab: 'preview' | 'code' | 'data'; setWorkspaceTab: (tab: 'preview' | 'code' | 'data') => void; showNotice: (message: string) => void }) {
  const [previewHidden, setPreviewHidden] = useState(false);

  return (
    <div className="relative flex h-full min-h-[420px] flex-col bg-[#0d0d14]">
      <div className="min-h-0 flex-1 p-3 sm:p-4">
        {previewHidden ? (
          <CanvasPlaceholder icon={<PanelRight className="h-4 w-4" />} label="Preview masquée. Utilise l’icône en haut pour l’afficher." />
        ) : workspaceTab === 'preview' && (phase === 'building' || phase === 'thinking') ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#1f1f2a] bg-[#11111a] text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#3a3158] bg-[#171326] text-[#a78bfa]"><Sparkles className="h-4 w-4 animate-pulse" /></div>
            <p className="text-sm text-[#d4d4d8]">Préparation de la preview</p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[#71717a]">La première version prend forme dans cet espace.</p>
            <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-[#242432]"><motion.div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-orange-400" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.25, ease: 'easeInOut' }} /></div>
          </div>
        ) : workspaceTab === 'preview' ? (
          <PreviewCard />
        ) : workspaceTab === 'code' ? (
          <CodeSurface phase={phase} />
        ) : (
          <DataSurface phase={phase} />
        )}
      </div>

    </div>
  );
}

function ConsolePanel({ phase, consoleTab, setConsoleTab, onClose, showNotice }: { phase: Phase; consoleTab: 'logs' | 'terminal'; setConsoleTab: (tab: 'logs' | 'terminal') => void; onClose: () => void; showNotice: (message: string) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#1f1f2a] px-2 text-[11px] text-[#a1a1aa]">
        <div className="flex items-center gap-1">
          {(['logs', 'terminal'] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setConsoleTab(tab)} className={`rounded-md px-2 py-1 ${consoleTab === tab ? 'bg-white/[0.08] text-white' : 'text-[#71717a] hover:text-[#d4d4d8]'}`}>{tab === 'logs' ? 'Logs' : 'Terminal'}</button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => showNotice('Les logs sont prêts à être copiés dans la prochaine passe.')} aria-label="Copier les logs" title="Copier les logs" className="rounded-md p-1.5 hover:bg-white/5 hover:text-white"><Copy className="h-3 w-3" /></button>
          <button type="button" onClick={() => showNotice('Les logs seront effaçables lorsque la console réelle sera branchée.')} aria-label="Effacer les logs" title="Effacer les logs" className="rounded-md p-1.5 hover:bg-white/5 hover:text-white"><Trash2 className="h-3 w-3" /></button>
          <button type="button" onClick={onClose} aria-label="Fermer la console" title="Fermer la console" className="rounded-md p-1.5 hover:bg-white/5 hover:text-white"><X className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-2">
        {consoleTab === 'logs' ? (
          <div className="h-full overflow-auto rounded-lg bg-[#101017] p-3 font-mono text-[10px] leading-5 text-[#a1a1aa]"><p className="text-[#71717a]">[idealy] mission reçue</p><p className="text-[#a78bfa]">[orchestrateur] structure préparée</p><p className="text-emerald-300">[preview] environnement prêt</p></div>
        ) : (
          <TerminalSurface phase={phase} />
        )}
      </div>
    </div>
  );
}

function PreviewCard() {
  return (
    <motion.div initial={{ opacity: 0.8 }} animate={{ opacity: 1 }} className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-[#2a2a38] bg-[#f8fafc] text-slate-900 shadow-2xl">
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-3"><span className="h-2 w-2 rounded-full bg-slate-200" /><span className="h-2 w-2 rounded-full bg-slate-200" /><span className="h-2 w-2 rounded-full bg-slate-200" /><span className="ml-2 flex items-center gap-1 text-[9px] text-slate-400"><FolderOpen className="h-3 w-3" /> preview.local</span></div>
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">Forno · pizzeria artisanale</p><h2 className="mt-3 max-w-md text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">La pâte, le feu, le moment.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Une expérience simple pour découvrir les pizzas qui sortent du four ce soir.</p><div className="mt-6 flex gap-2"><span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white">Commander</span><span className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600">Voir le menu</span></div></div><div className="mt-10 grid grid-cols-3 gap-2"><div className="h-20 rounded-lg bg-gradient-to-br from-orange-200 to-rose-300" /><div className="h-20 rounded-lg bg-gradient-to-br from-amber-100 to-orange-300" /><div className="h-20 rounded-lg bg-gradient-to-br from-red-100 to-orange-200" /></div></div>
    </motion.div>
  );
}

function DataSurface({ phase }: { phase: Phase }) {
  if (phase !== 'ready') return <CanvasPlaceholder icon={<Database className="h-4 w-4" />} label="Les données apparaîtront après la construction." />;
  return <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#2a2a38] bg-[#101017] p-4 text-xs text-[#d4d4d8]"><div className="flex items-center justify-between border-b border-[#1f1f2a] pb-3"><span className="font-medium text-[#f4f4f5]">Sources du projet</span><span className="text-[10px] text-[#71717a]">0 connectée</span></div><div className="space-y-2 py-3"><div className="flex items-center justify-between rounded-lg border border-[#1f1f2a] px-3 py-2.5"><span className="flex items-center gap-2"><Database className="h-3.5 w-3.5 text-[#60a5fa]" /> Supabase</span><span className="text-[10px] text-[#71717a]">À connecter</span></div><div className="flex items-center justify-between rounded-lg border border-[#1f1f2a] px-3 py-2.5"><span className="flex items-center gap-2"><Plug className="h-3.5 w-3.5 text-[#a78bfa]" /> Autre service</span><span className="text-[10px] text-[#71717a]">À connecter</span></div></div></div>;
}

function CodeSurface({ phase }: { phase: Phase }) {
  if (phase !== 'ready') {
    return <CanvasPlaceholder icon={<Code2 className="h-4 w-4" />} label="Le code apparaîtra après la construction." />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#2a2a38] bg-[#101017] text-xs shadow-2xl">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#1f1f2a] px-3 text-[#a1a1aa]"><FileCode2 className="h-3.5 w-3.5 text-[#a78bfa]" /> src/App.tsx <span className="ml-auto text-[10px] text-emerald-300">synchronisé</span></div>
      <pre className="m-0 flex-1 overflow-auto p-4 font-mono leading-6 text-[#c4b5fd]"><code>{`export default function Forno() {\n  return (\n    <main className="forno-page">\n      <p>FORNO · PIZZERIA ARTISANALE</p>\n      <h1>La pâte, le feu, le moment.</h1>\n      <button>Commander</button>\n    </main>\n  );\n}`}</code></pre>
    </div>
  );
}

function TerminalSurface({ phase }: { phase: Phase }) {
  if (phase !== 'ready') {
    return <CanvasPlaceholder icon={<TerminalSquare className="h-4 w-4" />} label="Le terminal s’ouvrira quand la mission sera lancée." />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#2a2a38] bg-[#0b0b10] font-mono text-xs shadow-2xl">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#1f1f2a] px-3 text-[#a1a1aa]"><TerminalSquare className="h-3.5 w-3.5 text-emerald-300" /> Terminal <span className="ml-auto text-[10px] text-[#71717a]">local</span></div>
      <div className="space-y-2 overflow-auto p-4 leading-5"><p className="text-[#71717a]">$ npm run build</p><p className="text-emerald-300">✓ TypeScript vérifié</p><p className="text-emerald-300">✓ Preview prête</p><p className="text-[#a1a1aa]">Idealy &gt; Mission terminée avec succès.</p><span className="inline-block h-3 w-1.5 animate-pulse bg-[#a78bfa]" /></div>
    </div>
  );
}

function CanvasPlaceholder({ icon, label }: { icon: ReactNode; label: string }) {
  return <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-[#1f1f2a] bg-[#11111a] text-center text-[#71717a]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#3a3158] bg-[#171326] text-[#a78bfa]">{icon}</div><p className="text-xs">{label}</p></div>;
}
