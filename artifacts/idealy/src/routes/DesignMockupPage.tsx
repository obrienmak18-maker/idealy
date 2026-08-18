import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Circle,
  CircleDot,
  Code2,
  Command,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  Figma,
  Github,
  Heart,
  History,
  Image as ImageIcon,
  Layers3,
  Menu,
  Mic,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Paperclip,
  Play,
  Plus,
  Plug,
  Puzzle,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Star,
  TerminalSquare,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Logo } from '@/components/Brand';

type Screen = 'welcome' | 'onboarding' | 'workspace';
type OnboardingStep = 'way' | 'profile' | 'context';
type WorkspaceTab = 'preview' | 'code' | 'data';
type Phase = 'idle' | 'thinking' | 'building' | 'ready';
type WayId = 'ninja' | 'mage' | 'hunter' | 'pro';

type Way = {
  id: WayId;
  name: string;
  short: string;
  description: string;
  accent: string;
  background: string;
};

const WAYS: Way[] = [
  { id: 'ninja', name: 'Ninja', short: 'Rapide et direct', description: 'Pour aller droit vers une première version claire.', accent: '#d7d9e2', background: 'from-slate-700/45 via-zinc-950 to-zinc-950' },
  { id: 'mage', name: 'Mage', short: 'Créatif et exploratoire', description: 'Pour donner une forme neuve aux idées ouvertes.', accent: '#c6a5ff', background: 'from-violet-700/45 via-zinc-950 to-zinc-950' },
  { id: 'hunter', name: 'Hunter', short: 'Orienté résultat', description: 'Pour viser une action concrète et mesurable.', accent: '#f4cb76', background: 'from-amber-700/45 via-zinc-950 to-zinc-950' },
  { id: 'pro', name: 'Pro', short: 'Précis et technique', description: 'Pour garder une structure détaillée et contrôlable.', accent: '#8edee2', background: 'from-cyan-700/40 via-zinc-950 to-zinc-950' },
];

const STARTERS = [
  'Une landing page élégante pour une pizzeria artisanale',
  'Un tableau de bord simple pour suivre mes dépenses',
  'Une page de réservation pour un salon de coiffure',
  'Une application pour organiser mes cours',
];

const TEAM_SIZES = ['Moi seul', '2 à 10 personnes', '11 à 50 personnes', '51 personnes ou plus'];
const ROLES = ['Fondateur ou dirigeant', 'Indépendant ou freelance', 'Produit ou design', 'Développement ou technique', 'Étudiant ou curieux'];
const SOURCES = ['Une recommandation', 'Une recherche sur internet', 'Une vidéo ou une démonstration', 'Une communauté ou un événement', 'Autre'];

const CODE_LINES = [
  ['1', "import { useState } from 'react';"],
  ['2', "import { ArrowRight, MapPin } from 'lucide-react';"],
  ['3', ''],
  ['4', 'export function PizzaHome() {'],
  ['5', "  const [menuOpen, setMenuOpen] = useState(false);"],
  ['6', ''],
  ['7', '  return ('],
  ['8', '    <main className="pizza-page">'],
  ['9', '      <nav className="topbar">'],
  ['10', '        <span className="wordmark">LUMA PIZZA</span>'],
  ['11', '        <button onClick={() => setMenuOpen(!menuOpen)}>Menu</button>'],
  ['12', '      </nav>'],
  ['13', '      <section className="hero">'],
  ['14', '        <p className="eyebrow">Fermentée lentement · cuite vite</p>'],
  ['15', '        <h1>La pizza comme un moment.</h1>'],
  ['16', '        <button>Réserver une table <ArrowRight /></button>'],
  ['17', '      </section>'],
  ['18', '    </main>'],
  ['19', '  );'],
  ['20', '}'],
];

export function DesignMockupPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [step, setStep] = useState<OnboardingStep>('way');
  const [way, setWay] = useState<WayId>('pro');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState('');
  const [pulse, setPulse] = useState(0);
  const [welcomePrompt, setWelcomePrompt] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mission, setMission] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [history, setHistory] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('preview');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'logs' | 'terminal'>('terminal');
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(55);
  const [resizing, setResizing] = useState(false);
  const timers = useRef<number[]>([]);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const helperRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const activeWay = WAYS.find((item) => item.id === way) ?? WAYS[3];
  const hasMission = phase !== 'idle';

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!attachmentRef.current?.contains(target)) setAttachmentOpen(false);
      if (!helperRef.current?.contains(target)) setHelperOpen(false);
      if (!conversationRef.current?.contains(target)) setConversationOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAttachmentOpen(false);
      setHelperOpen(false);
      setConversationOpen(false);
      setConsoleOpen(false);
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
      const railWidth = sidebarCollapsed ? 68 : 244;
      const available = Math.max(680, window.innerWidth - railWidth);
      const next = ((window.innerWidth - event.clientX) / available) * 100;
      setCanvasWidth(Math.min(66, Math.max(35, next)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizing, sidebarCollapsed]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const chooseWay = (nextWay: WayId) => {
    setWay(nextWay);
    setPulse((value) => value + 1);
  };

  const startWorkspace = (initialPrompt = '') => {
    setScreen('workspace');
    if (initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
      window.setTimeout(() => document.getElementById('design-mockup-composer')?.focus(), 0);
    }
  };

  const submitMission = () => {
    const value = prompt.trim();
    if (!value || phase === 'thinking' || phase === 'building') return;
    clearTimers();
    if (mission && mission !== value) setHistory((items) => [mission, ...items.filter((item) => item !== mission)].slice(0, 8));
    setMission(value);
    setPrompt('');
    setWorkspaceTab('preview');
    setConsoleOpen(false);
    setPhase('thinking');
    timers.current.push(window.setTimeout(() => setPhase('building'), 950));
    timers.current.push(window.setTimeout(() => setPhase('ready'), 2650));
  };

  const newMission = () => {
    clearTimers();
    if (mission) setHistory((items) => [mission, ...items.filter((item) => item !== mission)].slice(0, 8));
    setMission('');
    setPrompt('');
    setPhase('idle');
    setWorkspaceTab('preview');
    setConsoleOpen(false);
  };

  const toggleSidebar = () => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setSidebarOpen(true);
    } else {
      setSidebarCollapsed(true);
    }
  };

  const startDictation = () => {
    if (listening) {
      setListening(false);
      return;
    }
    setListening(true);
    showNotice('Mode voix simulé : parle comme si Idealy t’écoutait.');
    window.setTimeout(() => {
      setListening(false);
      setPrompt((value) => `${value}${value ? ' ' : ''}Une interface simple, élégante et publiable.`);
    }, 1600);
  };

  const onboardingStepIndex = step === 'way' ? 1 : step === 'profile' ? 2 : 3;
  const canContinue = step === 'way' ? Boolean(way) : step === 'profile' ? Boolean(name.trim()) : Boolean(team && role && source);

  const continueOnboarding = () => {
    if (!canContinue) return;
    setPulse((value) => value + 1);
    if (step === 'way') setStep('profile');
    else if (step === 'profile') setStep('context');
    else startWorkspace();
  };

  const goBackOnboarding = () => {
    if (step === 'profile') setStep('way');
    if (step === 'context') setStep('profile');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0b10] text-[#f6f3f6] selection:bg-[#f2b1d1]/25">
      <AmbientBackground />
      <AnimatePresence mode="wait" initial={false}>
        {screen === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <WelcomeScreen
              prompt={welcomePrompt}
              setPrompt={setWelcomePrompt}
              listening={listening}
              onDictate={startDictation}
              onStart={() => startWorkspace(welcomePrompt)}
              onOnboarding={() => setScreen('onboarding')}
              onNotice={showNotice}
            />
          </motion.div>
        )}
        {screen === 'onboarding' && (
          <motion.div key="onboarding" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.24 }}>
            <OnboardingMockup
              step={step}
              stepIndex={onboardingStepIndex}
              way={way}
              name={name}
              team={team}
              role={role}
              source={source}
              pulse={pulse}
              reducedMotion={Boolean(reducedMotion)}
              setName={setName}
              setTeam={setTeam}
              setRole={setRole}
              setSource={setSource}
              onWay={chooseWay}
              onContinue={continueOnboarding}
              onBack={goBackOnboarding}
              onExit={() => setScreen('welcome')}
            />
          </motion.div>
        )}
        {screen === 'workspace' && (
          <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="min-h-screen">
            <WorkspaceShell
              activeWay={activeWay}
              history={history}
              mission={mission}
              phase={phase}
              prompt={prompt}
              setPrompt={setPrompt}
              sidebarOpen={sidebarOpen}
              sidebarCollapsed={sidebarCollapsed}
              workspaceTab={workspaceTab}
              consoleOpen={consoleOpen}
              consoleTab={consoleTab}
              attachmentOpen={attachmentOpen}
              helperOpen={helperOpen}
              conversationOpen={conversationOpen}
              listening={listening}
              canvasWidth={canvasWidth}
              attachmentRef={attachmentRef}
              helperRef={helperRef}
              conversationRef={conversationRef}
              onToggleSidebar={toggleSidebar}
              onCloseMobileSidebar={() => setSidebarOpen(false)}
              onNewMission={newMission}
              onMission={submitMission}
              onSetWorkspaceTab={setWorkspaceTab}
              onSetConsoleOpen={setConsoleOpen}
              onSetConsoleTab={setConsoleTab}
              onSetAttachmentOpen={setAttachmentOpen}
              onSetHelperOpen={setHelperOpen}
              onSetConversationOpen={setConversationOpen}
              onListening={startDictation}
              onShowNotice={showNotice}
              onResizeStart={() => setResizing(true)}
              onCanvasWidth={setCanvasWidth}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notice && (
          <motion.div role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-white/10 bg-[#1b1821] px-3 py-2 text-xs text-[#ded8df] shadow-2xl">
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -left-40 -top-56 h-[38rem] w-[38rem] rounded-full bg-[#e89abb]/[0.07] blur-[130px]" />
      <div className="absolute -bottom-60 -right-40 h-[34rem] w-[34rem] rounded-full bg-[#77d3da]/[0.06] blur-[130px]" />
      <div className="absolute left-[42%] top-[28%] h-1 w-1 rounded-full bg-[#f3d27a]/60 shadow-[0_0_24px_10px_rgba(243,210,122,0.12)] motion-safe:animate-pulse" />
      <div className="absolute right-[20%] top-[18%] h-1 w-1 rounded-full bg-[#8edee2]/50 shadow-[0_0_20px_8px_rgba(142,222,226,0.10)] motion-safe:animate-pulse" />
    </div>
  );
}

function WelcomeScreen({
  prompt,
  setPrompt,
  listening,
  onDictate,
  onStart,
  onOnboarding,
  onNotice,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  listening: boolean;
  onDictate: () => void;
  onStart: () => void;
  onOnboarding: () => void;
  onNotice: (message: string) => void;
}) {
  const [attached, setAttached] = useState(false);
  return (
    <div className="relative z-10 min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 pb-3 pt-5 sm:px-8">
        <Logo size={28} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNotice('Le mode connexion sera branché après validation du design.')} className="rounded-lg px-3 py-2 text-xs text-[#a9a1ab] transition hover:bg-white/[0.04] hover:text-white">Se connecter</button>
          <button type="button" onClick={onOnboarding} className="rounded-lg bg-[#f2b1d1] px-3.5 py-2 text-xs font-semibold text-[#24151e] transition hover:brightness-105">Commencer</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-1.5 text-[11px] text-[#bdb5be]"><Sparkles className="h-3.5 w-3.5 text-[#f2b1d1]" />Studio de création IA</div>
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] text-[#fff9fc] sm:text-7xl">Qu’allons-nous <span className="bg-gradient-to-r from-[#f2b1d1] via-[#f3d27a] to-[#8edee2] bg-clip-text text-transparent">construire</span> ?</h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-[#9f98a3] sm:text-lg">Décris une idée. Idealy l’aide à prendre forme, puis te montre une première application à explorer.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.45 }} className="mx-auto mt-11 max-w-2xl">
          <div className={`rounded-2xl p-px transition ${listening ? 'bg-gradient-to-r from-[#f2b1d1] via-[#f3d27a] to-[#8edee2]' : 'bg-white/[0.11]'}`}>
            <div className="rounded-[15px] bg-[#141219]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder="Ex. Une application de réservation simple pour un petit restaurant…" className="w-full resize-none bg-transparent text-sm leading-6 text-[#f5eff4] outline-none placeholder:text-[#69616d]" />
              {attached && <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-[#c8c0c8]"><Paperclip className="h-3 w-3" /> brief-idee.pdf <button type="button" onClick={() => setAttached(false)} aria-label="Retirer la pièce jointe"><X className="h-3 w-3" /></button></div>}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setAttached(true)} aria-label="Joindre un fichier" title="Joindre un fichier" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><Paperclip className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onNotice('Import d’image simulé pour cette maquette.')} aria-label="Importer une image" title="Importer une image" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><ImageIcon className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onNotice('Le connecteur Figma sera branché plus tard.')} aria-label="Importer depuis Figma" title="Figma" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><Figma className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onNotice('Le connecteur GitHub sera branché plus tard.')} aria-label="Importer depuis GitHub" title="GitHub" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><Github className="h-4 w-4" /></button>
                  <button type="button" onClick={onDictate} aria-pressed={listening} aria-label="Dicter une idée" title="Dicter" className={`relative rounded-lg p-2 transition ${listening ? 'bg-[#8edee2]/10 text-[#8edee2]' : 'text-[#77707b] hover:bg-white/[0.06] hover:text-white'}`}><Mic className="h-4 w-4" />{listening && <span className="absolute -right-1 -top-1 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8edee2] opacity-35" /><span className="relative inline-flex h-3 w-3 rounded-full bg-[#8edee2]" /></span>}</button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onOnboarding} className="hidden rounded-lg border border-white/[0.10] px-3 py-2 text-xs text-[#bdb5be] transition hover:border-white/20 hover:text-white sm:inline-flex">Voir le parcours</button>
                  <button type="button" onClick={onStart} disabled={!prompt.trim()} className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#f2b1d1] to-[#f3d27a] px-3.5 text-xs font-semibold text-[#24151e] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35">Commencer <ArrowUp className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#625b65]">Maquette locale · les actions sont simulées · aucune donnée n’est envoyée</p>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-2 sm:grid-cols-2">
          {STARTERS.map((starter, index) => (
            <motion.button key={starter} type="button" onClick={() => setPrompt(starter)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 + index * 0.05 }} className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] px-4 py-3 text-left text-xs leading-5 text-[#918a95] transition hover:border-[#8a6c7e]/50 hover:bg-white/[0.035] hover:text-[#e7e0e7]"><span>{starter}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#5f5862] transition group-hover:translate-x-0.5 group-hover:text-[#f2b1d1]" /></motion.button>
          ))}
        </div>

        <div className="mt-24 grid gap-4 border-t border-white/[0.07] pt-8 text-center sm:grid-cols-3 sm:text-left">
          <SmallFeature icon={<Sparkles className="h-4 w-4" />} title="Une idée suffit" detail="Pas besoin de connaître la bonne syntaxe pour commencer." />
          <SmallFeature icon={<Layers3 className="h-4 w-4" />} title="Une vraie preview" detail="Le résultat reste visible pendant que la mission avance." />
          <SmallFeature icon={<Rocket className="h-4 w-4" />} title="Prêt à explorer" detail="Le code et les données restent accessibles quand tu en as besoin." />
        </div>
      </main>
    </div>
  );
}

function SmallFeature({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="flex items-start justify-center gap-3 sm:justify-start"><div className="mt-0.5 text-[#f2b1d1]">{icon}</div><div><p className="text-xs font-medium text-[#e7e0e7]">{title}</p><p className="mt-1 text-xs leading-5 text-[#77707b]">{detail}</p></div></div>;
}

function OnboardingMockup({
  step,
  stepIndex,
  way,
  name,
  team,
  role,
  source,
  pulse,
  reducedMotion,
  setName,
  setTeam,
  setRole,
  setSource,
  onWay,
  onContinue,
  onBack,
  onExit,
}: {
  step: OnboardingStep;
  stepIndex: number;
  way: WayId;
  name: string;
  team: string;
  role: string;
  source: string;
  pulse: number;
  reducedMotion: boolean;
  setName: (value: string) => void;
  setTeam: (value: string) => void;
  setRole: (value: string) => void;
  setSource: (value: string) => void;
  onWay: (way: WayId) => void;
  onContinue: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const selectedWay = WAYS.find((item) => item.id === way) ?? WAYS[3];
  return (
    <div className="relative z-10 min-h-screen px-5 pb-12 sm:px-8">
      <header className="mx-auto max-w-7xl pt-6"><div className="flex items-center justify-between"><button type="button" onClick={onExit} aria-label="Quitter le parcours" className="rounded-lg p-1.5 text-[#98909b] transition hover:bg-white/[0.05] hover:text-white"><Logo size={27} markOnly /></button><div className="flex items-center gap-3 text-xs text-[#918a95]"><motion.div key={pulse} animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }} transition={{ duration: 0.44 }} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#5b4050] bg-[#211720] text-[#f2b1d1]"><Heart className="h-3.5 w-3.5 fill-current" /></motion.div><span className="hidden sm:inline">Ton espace prend forme</span><span className="tabular-nums text-[#d0c7d0]">{stepIndex} / 3</span></div></div><div className="mt-5 h-px bg-white/[0.08]"><motion.div initial={false} animate={{ width: `${(stepIndex / 3) * 100}%` }} transition={{ duration: 0.28 }} className="h-px bg-gradient-to-r from-[#f2b1d1] via-[#f3d27a] to-[#8edee2]" /></div></header>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'way' && <motion.section key="way" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mx-auto max-w-6xl py-14"><div className="mb-10 text-center"><p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#f2b1d1]">Première rencontre</p><h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#fff9fc] sm:text-5xl">Choisis ta voie</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#aaa1ab]">Pas un niveau de prix. Une manière de créer, un vocabulaire et une énergie qui te ressemblent.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{WAYS.map((item, index) => <WayCard key={item.id} item={item} selected={way === item.id} index={index} reducedMotion={reducedMotion} onClick={() => onWay(item.id)} />)}</div><div className="mt-9 flex items-center justify-between gap-4"><p className="text-xs text-[#827a86]">Voie sélectionnée : <span style={{ color: selectedWay.accent }}>{selectedWay.name}</span></p><ContinueButton label="Continuer" onClick={onContinue} /></div></motion.section>}
        {step === 'profile' && <motion.section key="profile" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mx-auto max-w-xl py-16"><div className="mb-8 text-center"><div className="mx-auto mb-4 h-1 w-12 rounded-full" style={{ background: selectedWay.accent }} /><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#fff9fc]">Comment allons-nous t’appeler ?</h1><p className="mt-3 text-sm leading-6 text-[#aaa1ab]">Ton nom apparaîtra dans les messages de tes agents.</p></div><div className="rounded-2xl border border-white/[0.10] bg-[#151219]/90 p-6 shadow-2xl"><label htmlFor="mockup-name" className="mb-2 block text-sm text-[#eee7ee]">Nom de spécialiste</label><input id="mockup-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Amina, Naruto, Chris…" className="w-full rounded-xl border border-white/[0.12] bg-[#0e0c12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6872] focus:border-[#f2b1d1]" /><div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0e0c12] p-4"><p className="text-xs text-[#7e7681]">Aperçu de la première conversation</p><p className="mt-2 text-sm leading-6 text-[#eee7ee]"><span style={{ color: selectedWay.accent }}>{selectedWay.name}</span> — « {name || 'Apprenti'}, que voulons-nous construire aujourd’hui ? »</p></div></div><div className="mt-6 flex items-center justify-between"><BackButton onClick={onBack} /><ContinueButton label="Continuer" onClick={onContinue} /></div></motion.section>}
        {step === 'context' && <motion.section key="context" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mx-auto max-w-4xl py-12"><div className="mb-8 text-center"><Sparkles className="mx-auto mb-4 h-5 w-5 text-[#8edee2]" /><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#fff9fc]">Pour mieux t’accompagner</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#aaa1ab]">Trois réponses suffisent. Elles servent à personnaliser ton premier espace, sans te faire perdre du temps.</p></div><div className="grid gap-3 lg:grid-cols-3"><ChoiceGroup title="Combien êtes-vous ?" value={team} choices={TEAM_SIZES} onChange={setTeam} /><ChoiceGroup title="Quel est ton rôle ?" value={role} choices={ROLES} onChange={setRole} /><ChoiceGroup title="Comment nous as-tu connus ?" value={source} choices={SOURCES} onChange={setSource} /></div><div className="mt-8 flex items-center justify-between"><BackButton onClick={onBack} /><ContinueButton label="Entrer dans Idealy" onClick={onContinue} /></div><p className="mt-4 text-center text-[11px] text-[#6f6872]">Parcours de démonstration · l’authentification réelle sera branchée séparément.</p></motion.section>}
      </AnimatePresence>
    </div>
  );
}

function WayCard({ item, selected, index, reducedMotion, onClick }: { item: Way; selected: boolean; index: number; reducedMotion: boolean; onClick: () => void }) {
  return <motion.button type="button" onClick={onClick} initial={reducedMotion ? undefined : { opacity: 0, y: 15 }} animate={reducedMotion ? undefined : { opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : index * 0.05 }} whileHover={reducedMotion ? undefined : { y: -4 }} whileTap={reducedMotion ? undefined : { scale: 0.985 }} className={`group relative min-h-64 overflow-hidden rounded-2xl border bg-gradient-to-b text-left transition ${item.background} ${selected ? 'border-white/35 shadow-[0_0_28px_rgba(242,177,209,0.12)]' : 'border-white/[0.09] hover:border-white/20'}`}><div className="absolute inset-x-0 top-0 h-24 bg-white/[0.025]" /><div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] text-[10px]" style={{ color: item.accent }}>{selected ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}</div><div className="absolute bottom-0 left-0 right-0 p-5"><div className="mb-3 h-1 w-9 rounded-full" style={{ backgroundColor: item.accent }} /><h2 className="text-lg font-semibold text-white">{item.name}</h2><p className="mt-1 text-xs font-medium" style={{ color: item.accent }}>{item.short}</p><p className="mt-3 text-xs leading-5 text-[#9d95a0]">{item.description}</p></div></motion.button>;
}

function ChoiceGroup({ title, value, choices, onChange }: { title: string; value: string; choices: string[]; onChange: (value: string) => void }) {
  return <div className="rounded-2xl border border-white/[0.10] bg-[#151219]/90 p-4"><h2 className="mb-3 text-sm font-medium text-[#eee7ee]">{title}</h2><div className="space-y-2">{choices.map((choice) => <button key={choice} type="button" onClick={() => onChange(choice)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition ${value === choice ? 'border-[#8edee2]/70 bg-[#143237] text-[#c2f3f1]' : 'border-white/[0.08] bg-[#0e0c12] text-[#9f97a2] hover:border-white/20 hover:text-white'}`}>{value === choice ? <CircleDot className="h-3 w-3 text-[#8edee2]" /> : <Circle className="h-3 w-3 text-[#5e5662]" />}{choice}</button>)}</div></div>;
}

function ContinueButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f2b1d1] to-[#f3d27a] px-4 py-2.5 text-xs font-semibold text-[#24151e] transition hover:brightness-105">{label}<ArrowRight className="h-3.5 w-3.5" /></button>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg px-3 py-2 text-xs text-[#928a96] transition hover:bg-white/[0.05] hover:text-white">Retour</button>;
}

function WorkspaceShell({
  activeWay,
  history,
  mission,
  phase,
  prompt,
  setPrompt,
  sidebarOpen,
  sidebarCollapsed,
  workspaceTab,
  consoleOpen,
  consoleTab,
  attachmentOpen,
  helperOpen,
  conversationOpen,
  listening,
  canvasWidth,
  attachmentRef,
  helperRef,
  conversationRef,
  onToggleSidebar,
  onCloseMobileSidebar,
  onNewMission,
  onMission,
  onSetWorkspaceTab,
  onSetConsoleOpen,
  onSetConsoleTab,
  onSetAttachmentOpen,
  onSetHelperOpen,
  onSetConversationOpen,
  onListening,
  onShowNotice,
  onResizeStart,
  onCanvasWidth,
}: {
  activeWay: Way;
  history: string[];
  mission: string;
  phase: Phase;
  prompt: string;
  setPrompt: (value: string) => void;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  workspaceTab: WorkspaceTab;
  consoleOpen: boolean;
  consoleTab: 'logs' | 'terminal';
  attachmentOpen: boolean;
  helperOpen: boolean;
  conversationOpen: boolean;
  listening: boolean;
  canvasWidth: number;
  attachmentRef: React.RefObject<HTMLDivElement | null>;
  helperRef: React.RefObject<HTMLDivElement | null>;
  conversationRef: React.RefObject<HTMLDivElement | null>;
  onToggleSidebar: () => void;
  onCloseMobileSidebar: () => void;
  onNewMission: () => void;
  onMission: () => void;
  onSetWorkspaceTab: (value: WorkspaceTab) => void;
  onSetConsoleOpen: (value: boolean) => void;
  onSetConsoleTab: (value: 'logs' | 'terminal') => void;
  onSetAttachmentOpen: (value: boolean) => void;
  onSetHelperOpen: (value: boolean) => void;
  onSetConversationOpen: (value: boolean) => void;
  onListening: () => void;
  onShowNotice: (message: string) => void;
  onResizeStart: () => void;
  onCanvasWidth: (value: number) => void;
}) {
  const hasMission = phase !== 'idle';
  return <div className="relative z-10 flex min-h-screen"><AnimatePresence>{sidebarOpen && <motion.button type="button" aria-label="Fermer la sidebar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCloseMobileSidebar} className="fixed inset-0 z-30 bg-black/55 lg:hidden" />}</AnimatePresence><aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.08] bg-[#111016]/95 backdrop-blur transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${sidebarCollapsed ? 'w-0 border-r-0' : 'w-[244px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden`}><div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4"><Logo size={25} markOnly /><button type="button" onClick={onCloseMobileSidebar} aria-label="Fermer la sidebar" className="rounded-md p-1.5 text-[#77707b] hover:bg-white/[0.05] hover:text-white lg:hidden"><X className="h-4 w-4" /></button></div><div className="p-3"><button type="button" onClick={onNewMission} className="flex w-full items-center gap-2 rounded-lg border border-white/[0.10] px-3 py-2.5 text-left text-xs text-[#eee7ee] transition hover:border-[#8a6c7e]/60 hover:bg-white/[0.035]"><Plus className="h-4 w-4 text-[#f2b1d1]" />Nouvelle mission</button></div><p className="px-4 pb-2 pt-3 text-[10px] uppercase tracking-[0.18em] text-[#655e69]">Historique</p><div className="space-y-1 px-3">{hasMission && <HistoryItem text={mission} active />}{history.map((item, index) => <HistoryItem key={`${item}-${index}`} text={item} />)}{!hasMission && history.length === 0 && <p className="px-3 py-2 text-xs leading-5 text-[#6d6671]">Tes missions apparaîtront ici.</p>}</div><div className="mt-auto border-t border-white/[0.07] p-3"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#f2b1d1] to-[#f3d27a] text-[10px] font-semibold text-[#24151e]">{activeWay.name[0]}</div><div><p className="text-xs text-[#d9d2da]">{activeWay.name}</p><p className="text-[10px] text-[#6d6671]">Maquette locale</p></div><button type="button" onClick={() => onShowNotice('Les paramètres seront branchés après validation.')} aria-label="Paramètres" className="ml-auto rounded-md p-1.5 text-[#6d6671] hover:bg-white/[0.05] hover:text-white"><Settings2 className="h-3.5 w-3.5" /></button></div><p className="mt-2 text-[10px] leading-4 text-[#58515c]">Les connecteurs et l’authentification arrivent après la validation visuelle.</p></div></aside><main className="relative flex min-w-0 flex-1 flex-col">{hasMission && <TopBar mission={mission} activeWay={activeWay} sidebarCollapsed={sidebarCollapsed} workspaceTab={workspaceTab} consoleOpen={consoleOpen} conversationOpen={conversationOpen} conversationRef={conversationRef} onToggleSidebar={onToggleSidebar} onSetWorkspaceTab={onSetWorkspaceTab} onSetConsoleOpen={onSetConsoleOpen} onSetConsoleTab={onSetConsoleTab} onSetConversationOpen={onSetConversationOpen} onShowNotice={onShowNotice} />}{hasMission && <AnimatePresence initial={false}>{consoleOpen && <ConsoleDrawer tab={consoleTab} onTab={onSetConsoleTab} onClose={() => onSetConsoleOpen(false)} />}</AnimatePresence>}<div className={`flex min-h-0 flex-1 flex-col ${hasMission ? 'lg:flex-row' : ''}`}><section className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${hasMission ? 'lg:w-[45%] lg:border-r lg:border-white/[0.07]' : ''}`}><div className={`flex-1 overflow-y-auto px-5 sm:px-9 ${hasMission ? 'pb-36 pt-9' : 'pb-40 pt-12'}`}><div className={`mx-auto w-full ${hasMission ? 'max-w-xl' : 'max-w-2xl'}`}>{hasMission ? <MissionConversation mission={mission} phase={phase} activeWay={activeWay} /> : <EmptyWorkspace activeWay={activeWay} onStarter={(value) => setPrompt(value)} />}</div></div><div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c0b10] via-[#0c0b10]/95 to-transparent" /><Composer prompt={prompt} setPrompt={setPrompt} phase={phase} activeWay={activeWay} listening={listening} attachmentOpen={attachmentOpen} helperOpen={helperOpen} attachmentRef={attachmentRef} helperRef={helperRef} onMission={onMission} onListening={onListening} onSetAttachmentOpen={onSetAttachmentOpen} onSetHelperOpen={onSetHelperOpen} onShowNotice={onShowNotice} /></section>{hasMission && <div role="separator" aria-label="Redimensionner la preview" tabIndex={0} onPointerDown={onResizeStart} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onCanvasWidth(Math.min(66, canvasWidth + 3)); if (event.key === 'ArrowRight') onCanvasWidth(Math.max(35, canvasWidth - 3)); }} className="group hidden w-1 cursor-col-resize items-center justify-center bg-white/[0.07] outline-none hover:bg-[#8edee2]/40 focus-visible:bg-[#8edee2]/40 lg:flex"><span className="h-12 w-0.5 rounded-full bg-[#5d5662] group-hover:bg-[#8edee2]" /></div>}{hasMission && <motion.aside initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="min-h-[430px] w-full flex-none bg-[#0d0c12] lg:min-h-0 lg:w-[var(--mockup-canvas-width)]" style={{ '--mockup-canvas-width': `${canvasWidth}%` } as React.CSSProperties}><PreviewCanvas phase={phase} tab={workspaceTab} onShowNotice={onShowNotice} /></motion.aside>}</div></main></div>;
}

function HistoryItem({ text, active = false }: { text: string; active?: boolean }) {
  return <button type="button" className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition ${active ? 'bg-white/[0.055] text-[#e9e2ea]' : 'text-[#827a86] hover:bg-white/[0.035] hover:text-[#cfc6d0]'}`}><History className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${active ? 'text-[#f2b1d1]' : 'text-[#625b66]'}`} /><span className="line-clamp-2">{text}</span></button>;
}

function TopBar({ mission, activeWay, sidebarCollapsed, workspaceTab, consoleOpen, conversationOpen, conversationRef, onToggleSidebar, onSetWorkspaceTab, onSetConsoleOpen, onSetConsoleTab, onSetConversationOpen, onShowNotice }: { mission: string; activeWay: Way; sidebarCollapsed: boolean; workspaceTab: WorkspaceTab; consoleOpen: boolean; conversationOpen: boolean; conversationRef: React.RefObject<HTMLDivElement | null>; onToggleSidebar: () => void; onSetWorkspaceTab: (value: WorkspaceTab) => void; onSetConsoleOpen: (value: boolean) => void; onSetConsoleTab: (value: 'logs' | 'terminal') => void; onSetConversationOpen: (value: boolean) => void; onShowNotice: (message: string) => void }) {
  return <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#111016]/90 px-2 backdrop-blur sm:px-3"><div className="flex min-w-0 items-center gap-1"><button type="button" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Afficher la sidebar' : 'Réduire la sidebar'} className="rounded-md p-1.5 text-[#9f97a2] hover:bg-white/[0.05] hover:text-white"><PanelLeft className="h-4 w-4" /></button><div ref={conversationRef} className="relative min-w-0"><button type="button" onClick={() => onSetConversationOpen(!conversationOpen)} className="flex max-w-[260px] items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#d9d2da] hover:bg-white/[0.05] hover:text-white"><span className="truncate">{mission.length > 34 ? `${mission.slice(0, 34)}…` : mission}</span><ChevronDown className="h-3 w-3 text-[#6f6872]" /></button><AnimatePresence>{conversationOpen && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute left-0 top-10 z-40 w-60 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl"><p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.15em] text-[#6f6872]">Conversation</p>{['Renommer', 'Ajouter aux favoris', 'Dupliquer', 'Télécharger en ZIP', 'Réglages'].map((item) => <button key={item} type="button" onClick={() => { onSetConversationOpen(false); onShowNotice(`${item} est simulé dans le mockup.`); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d9d2da] hover:bg-white/[0.05]"><Sparkles className="h-3.5 w-3.5 text-[#f2b1d1]" />{item}</button>)}</motion.div>}</AnimatePresence></div></div><div className="flex shrink-0 items-center gap-0.5 text-[#77707b]"><div className="hidden items-center gap-0.5 border-r border-white/[0.08] pr-2 sm:flex"><button type="button" onClick={() => onShowNotice('Le mode design sera branché après validation.')} aria-label="Mode design" className="rounded-md p-1.5 text-[#f2b1d1] hover:bg-white/[0.05]"><Sparkles className="h-3.5 w-3.5" /></button><IconTab icon={<PanelRight className="h-3.5 w-3.5" />} label="Preview" active={workspaceTab === 'preview'} color="#8edee2" onClick={() => onSetWorkspaceTab('preview')} /><IconTab icon={<Code2 className="h-3.5 w-3.5" />} label="Code" active={workspaceTab === 'code'} color="#c6a5ff" onClick={() => onSetWorkspaceTab('code')} /><IconTab icon={<Database className="h-3.5 w-3.5" />} label="Data" active={workspaceTab === 'data'} color="#f3d27a" onClick={() => onSetWorkspaceTab('data')} /><button type="button" onClick={() => { onSetConsoleTab('terminal'); onSetConsoleOpen(!consoleOpen); }} aria-label="Terminal" className={`rounded-md p-1.5 hover:bg-white/[0.05] ${consoleOpen ? 'text-white' : 'text-[#77707b]'}`}><TerminalSquare className="h-3.5 w-3.5" /></button></div><button type="button" onClick={() => onShowNotice('Ouverture de la preview simulée.')} aria-label="Ouvrir la preview" className="hidden rounded-md p-1.5 hover:bg-white/[0.05] hover:text-white sm:inline-flex"><ExternalLink className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onShowNotice(`La voie ${activeWay.name} garde ce vocabulaire dans l’expérience.`)} aria-label="Voir la voie active" className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-[10px] sm:flex" style={{ color: activeWay.accent }}>{activeWay.name}<ChevronDown className="h-3 w-3" /></button><button type="button" onClick={() => onShowNotice('Les actions de publication sont simulées.')} className="hidden rounded-md bg-gradient-to-r from-[#f2b1d1] to-[#f3d27a] px-2.5 py-1.5 text-[10px] font-semibold text-[#24151e] sm:inline-flex">Publier</button><button type="button" onClick={() => onShowNotice('Menu projet simulé.')} aria-label="Plus d’actions" className="rounded-md p-1.5 hover:bg-white/[0.05] hover:text-white"><MoreHorizontal className="h-4 w-4" /></button></div></header>;
}

function IconTab({ icon, label, active, color, onClick }: { icon: ReactNode; label: string; active: boolean; color: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`rounded-md p-1.5 hover:bg-white/[0.05] ${active ? 'text-white' : 'text-[#77707b]'}`} style={active ? { color } : undefined}>{icon}</button>;
}

function EmptyWorkspace({ activeWay, onStarter }: { activeWay: Way; onStarter: (value: string) => void }) {
  return <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center text-center"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-[#f2b1d1]"><Sparkles className="h-4 w-4" /></div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#fff9fc] sm:text-4xl">Qu’allons-nous construire ?</h1><p className="mt-3 max-w-md text-sm leading-6 text-[#918a95]">Décris ton idée. La maquette simule la réflexion, la construction et la preview sans appeler de backend.</p><div className="mt-8 grid w-full gap-2 sm:grid-cols-2">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => onStarter(starter)} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] px-4 py-3 text-left text-xs leading-5 text-[#8f8792] transition hover:border-white/20 hover:bg-white/[0.035] hover:text-[#e9e2ea]"><span>{starter}</span><ArrowRight className="h-3.5 w-3.5 text-[#625b66]" /></button>)}</div><p className="mt-8 text-[11px]" style={{ color: activeWay.accent }}>Voie active · {activeWay.name}</p></div>;
}

function MissionConversation({ mission, phase, activeWay }: { mission: string; phase: Phase; activeWay: Way }) {
  return <div className="space-y-8"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eee9ee] text-[10px] font-semibold text-[#1c171d]">Toi</div><p className="pt-1 text-sm leading-6 text-[#e7e0e7]">{mission}</p></div><AgentTimeline phase={phase} activeWay={activeWay} /><AnimatePresence mode="wait"><motion.div key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-l border-white/[0.08] pl-4 text-sm leading-7 text-[#b9b1bb]">{phase === 'thinking' && 'Je transforme ton idée en intention claire, sans ouvrir encore le canvas.'}{phase === 'building' && 'La structure prend forme. Les premiers écrans deviennent explorables dans la preview.'}{phase === 'ready' && 'La première version est prête. Tu peux maintenant regarder, modifier ou continuer la mission.'}</motion.div></AnimatePresence></div>;
}

function AgentTimeline({ phase, activeWay }: { phase: Phase; activeWay: Way }) {
  const [expanded, setExpanded] = useState(false);
  const steps = [{ label: 'Intention comprise', detail: `${activeWay.name} reformule le résultat attendu`, done: phase !== 'thinking' }, { label: 'Structure préparée', detail: 'Les écrans et les fichiers principaux prennent forme', done: phase === 'ready' }, { label: 'Preview construite', detail: 'Une première version est prête à être explorée', done: phase === 'ready' }];
  const headline = phase === 'thinking' ? 'Réflexion en cours' : phase === 'building' ? 'Construction en cours' : 'Première version prête';
  return <div><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-1 py-2 text-left"><div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-[10px] font-semibold" style={{ color: activeWay.accent }}>I</div><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-xs font-medium text-[#eee7ee]">{headline}<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f2b1d1]" /></span><span className="mt-0.5 block text-[11px] text-[#77707b]">Escouade {activeWay.name} · étapes visibles, détails discrets</span></span><ChevronDown className={`h-3.5 w-3.5 text-[#77707b] transition-transform ${expanded ? 'rotate-180' : ''}`} /></button><AnimatePresence initial={false}>{expanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-l border-white/[0.08] pl-4"><div className="space-y-1 py-2">{steps.map((stepItem) => <div key={stepItem.label} className="flex items-start gap-2.5 px-2 py-2"><span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${stepItem.done ? 'border-[#8edee2]/70 bg-[#8edee2]/10 text-[#8edee2]' : 'border-[#5c3e54] bg-[#281a25] text-[#f2b1d1]'}`}>{stepItem.done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span><span><span className="block text-[11px] font-medium text-[#d8d0d9]">{stepItem.label}</span><span className="mt-0.5 block text-[11px] leading-5 text-[#77707b]">{stepItem.detail}</span></span></div>)}</div></motion.div>}</AnimatePresence></div>;
}

function Composer({ prompt, setPrompt, phase, activeWay, listening, attachmentOpen, helperOpen, attachmentRef, helperRef, onMission, onListening, onSetAttachmentOpen, onSetHelperOpen, onShowNotice }: { prompt: string; setPrompt: (value: string) => void; phase: Phase; activeWay: Way; listening: boolean; attachmentOpen: boolean; helperOpen: boolean; attachmentRef: React.RefObject<HTMLDivElement | null>; helperRef: React.RefObject<HTMLDivElement | null>; onMission: () => void; onListening: () => void; onSetAttachmentOpen: (value: boolean) => void; onSetHelperOpen: (value: boolean) => void; onShowNotice: (message: string) => void }) {
  const busy = phase === 'thinking' || phase === 'building';
  return <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 sm:px-9"><div className="mx-auto max-w-2xl"><div className="mb-2 flex items-center justify-between px-1 text-[10px] text-[#6f6872]"><div className="flex items-center gap-2"><span style={{ color: activeWay.accent }}>Voie {activeWay.name}</span><span className="h-1 w-1 rounded-full bg-white/20" /><span>Entrée pour envoyer</span></div><span className="hidden sm:inline">Maj + Entrée pour une nouvelle ligne</span></div><div className={`rounded-2xl p-px ${busy ? 'bg-gradient-to-r from-[#f2b1d1] via-[#f3d27a] to-[#8edee2]' : 'bg-white/[0.12]'}`}><div className="rounded-[15px] bg-[#151219] p-3"><textarea id="design-mockup-composer" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onMission(); } }} rows={2} placeholder="Décris ce que tu veux créer…" className="w-full resize-none bg-transparent px-1 text-sm leading-6 text-[#eee7ee] outline-none placeholder:text-[#6f6872]" /><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-0.5"><div ref={attachmentRef} className="relative"><button type="button" onClick={() => onSetAttachmentOpen(!attachmentOpen)} aria-label="Joindre ou connecter" className={`rounded-lg p-2 text-[#706873] hover:bg-white/[0.05] hover:text-white ${attachmentOpen ? 'bg-white/[0.05] text-white' : ''}`}><Paperclip className="h-4 w-4" /></button><AnimatePresence>{attachmentOpen && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute bottom-11 left-0 z-30 w-56 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl"><MenuItem icon={<Upload className="h-3.5 w-3.5" />} label="Importer depuis l’ordinateur" onClick={() => { onSetAttachmentOpen(false); onShowNotice('Import simulé dans cette maquette.'); }} /><MenuItem icon={<Plug className="h-3.5 w-3.5" />} label="Connecter un service" onClick={() => { onSetAttachmentOpen(false); onShowNotice('Le registre des connecteurs sera branché plus tard.'); }} /><MenuItem icon={<Puzzle className="h-3.5 w-3.5" />} label="Ajouter un plugin" onClick={() => { onSetAttachmentOpen(false); onShowNotice('Les plugins restent hors backend dans ce mockup.'); }} /></motion.div>}</AnimatePresence></div><div ref={helperRef} className="relative"><button type="button" onClick={() => onSetHelperOpen(!helperOpen)} aria-label="Améliorer l’idée" className={`rounded-lg p-2 text-[#706873] hover:bg-white/[0.05] hover:text-white ${helperOpen ? 'bg-white/[0.05] text-white' : ''}`}><Sparkles className="h-4 w-4" /></button><AnimatePresence>{helperOpen && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute bottom-11 left-0 z-30 w-64 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl"><p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.15em] text-[#6f6872]">Améliorer l’idée</p>{[['Préciser le résultat', 'Ajoute le résultat attendu et les personnes visées.'], ['Structurer les écrans', 'Propose les pages principales et leur navigation.'], ['Définir le style', 'Suggère une direction visuelle cohérente.']].map(([label, addition]) => <MenuItem key={label} icon={<Sparkles className="h-3.5 w-3.5" />} label={label} onClick={() => { setPrompt(`${prompt.trim()}${prompt.trim() ? '\n\n' : ''}${addition}`); onSetHelperOpen(false); }} />)}</motion.div>}</AnimatePresence></div></div><div className="flex items-center gap-1"><button type="button" onClick={onListening} aria-pressed={listening} aria-label="Dicter" className={`relative rounded-lg p-2 ${listening ? 'bg-[#8edee2]/10 text-[#8edee2]' : 'text-[#706873] hover:bg-white/[0.05] hover:text-white'}`}><Mic className="h-4 w-4" />{listening && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-[#8edee2]" />}</button><button type="button" onClick={onMission} disabled={!prompt.trim() || busy} aria-label="Envoyer la mission" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f2b1d1] to-[#f3d27a] text-[#24151e] transition disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button></div></div></div></div><p className="mt-2 text-center text-[10px] text-[#514a56]">Aperçu local · aucune donnée n’est envoyée</p></div></div>;
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d9d2da] hover:bg-white/[0.05]">{icon}{label}</button>;
}

function ConsoleDrawer({ tab, onTab, onClose }: { tab: 'logs' | 'terminal'; onTab: (value: 'logs' | 'terminal') => void; onClose: () => void }) {
  return <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-3 top-14 z-30 h-64 w-[min(92vw,430px)] overflow-hidden rounded-xl border border-white/[0.10] bg-[#0b0a0f] shadow-2xl"><div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2"><div className="flex items-center gap-1">{(['logs', 'terminal'] as const).map((item) => <button key={item} type="button" onClick={() => onTab(item)} className={`rounded-md px-2 py-1 text-[10px] ${tab === item ? 'bg-white/[0.08] text-white' : 'text-[#6f6872]'}`}>{item === 'logs' ? 'Logs' : 'Terminal'}</button>)}</div><button type="button" onClick={onClose} aria-label="Fermer le terminal" className="rounded-md p-1 text-[#6f6872] hover:bg-white/[0.06] hover:text-white"><X className="h-3.5 w-3.5" /></button></div>{tab === 'logs' ? <div className="space-y-2 p-3 font-mono text-[10px] text-[#9c95a0]"><p><span className="text-[#8edee2]">info</span> intention-router: CONSTRUCTION</p><p><span className="text-[#f3d27a]">wait</span> webcontainer: preview locale</p><p><span className="text-[#f2b1d1]">mock</span> aucune requête réseau</p></div> : <div className="h-full bg-[#08080b] p-3 font-mono text-[10px] leading-5 text-[#aaa2ad]"><p><span className="text-[#8edee2]">$</span> npm run build</p><p className="text-[#8edee2]">✓ preview compiled in 1.8s</p><p><span className="text-[#8edee2]">$</span> _</p></div>}</motion.div>;
}

function PreviewCanvas({ phase, tab, onShowNotice }: { phase: Phase; tab: WorkspaceTab; onShowNotice: (message: string) => void }) {
  return <div className="flex h-full min-h-[430px] flex-col bg-[#0d0c12] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] text-[#77707b]"><div className="flex gap-1"><span className="h-2 w-2 rounded-full bg-[#ed8f9b]/80" /><span className="h-2 w-2 rounded-full bg-[#f3d27a]/80" /><span className="h-2 w-2 rounded-full bg-[#8edee2]/80" /></div><span>preview.local</span></div><div className="flex items-center gap-0.5"><button type="button" onClick={() => onShowNotice('Preview rafraîchie dans le mockup.')} aria-label="Rafraîchir" className="rounded-md p-1.5 text-[#77707b] hover:bg-white/[0.05] hover:text-white"><RefreshCw className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onShowNotice('Ouverture externe simulée.')} aria-label="Ouvrir dans un nouvel onglet" className="rounded-md p-1.5 text-[#77707b] hover:bg-white/[0.05] hover:text-white"><ExternalLink className="h-3.5 w-3.5" /></button></div></div>{phase !== 'ready' ? <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111016] text-center"><div><div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full border border-[#f2b1d1]/60 bg-[#f2b1d1]/10" /><p className="text-sm text-[#d9d2da]">{phase === 'thinking' ? 'Préparation de la structure…' : 'Construction de la preview…'}</p><p className="mt-2 text-xs text-[#706873]">La maquette montre l’attente, sans lancer de WebContainer.</p></div></div> : tab === 'preview' ? <FakeGeneratedApp /> : tab === 'code' ? <FakeCodeView /> : <FakeDataView />}</div>;
}

function FakeGeneratedApp() {
  return <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-[#f8f2ea] text-[#29211f]"><div className="flex items-center justify-between border-b border-[#d9cdc0] px-5 py-4"><div className="flex items-center gap-2"><div className="h-5 w-5 rounded-full bg-[#d96b4f]" /><span className="text-[11px] font-semibold tracking-[0.18em]">LUMA PIZZA</span></div><div className="hidden items-center gap-4 text-[10px] text-[#74645c] sm:flex"><span>Menu</span><span>Notre histoire</span><span>Réserver</span></div><button type="button" className="rounded-full bg-[#29211f] px-3 py-1.5 text-[10px] text-white">Commander</button></div><div className="grid gap-8 px-5 py-12 sm:grid-cols-[1.1fr_0.9fr] sm:px-10 sm:py-16"><div><p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#d96b4f]">Fermentée lentement · cuite vite</p><h2 className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl">La pizza comme un moment.</h2><p className="mt-5 max-w-xs text-sm leading-6 text-[#74645c]">Des ingrédients simples, une pâte vivante et une table où l’on a envie de rester.</p><button type="button" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#d96b4f] px-4 py-2.5 text-[11px] font-semibold text-white">Réserver une table <ArrowRight className="h-3.5 w-3.5" /></button></div><div className="flex min-h-48 items-end rounded-[2rem] bg-gradient-to-br from-[#d96b4f] via-[#e6a25c] to-[#f2d8a8] p-5"><div className="rounded-full bg-[#fff5dc]/75 px-3 py-1.5 text-[10px] text-[#754437]">Four à bois · depuis 2018</div></div></div></div>;
}

function FakeCodeView() {
  return <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-[#101016] p-3 font-mono text-[10px] leading-5 sm:text-[11px]"><div className="mb-3 flex items-center justify-between border-b border-white/[0.07] pb-3 text-[10px] text-[#8c8490]"><span className="flex items-center gap-2"><FileCode2 className="h-3.5 w-3.5 text-[#c6a5ff]" />src/PizzaHome.tsx</span><button type="button" className="rounded-md p-1.5 text-[#77707b] hover:bg-white/[0.06] hover:text-white"><Copy className="h-3.5 w-3.5" /></button></div>{CODE_LINES.map(([line, code]) => <div key={line} className="flex gap-4"><span className="w-5 shrink-0 text-right text-[#4e4853]">{line}</span><span className={code.includes('return') || code.includes('export') ? 'text-[#c6a5ff]' : code.includes('className') ? 'text-[#8edee2]' : 'text-[#b9b1bb]'}>{code || ' '}</span></div>)}</div>;
}

function FakeDataView() {
  const rows = useMemo(() => [{ name: 'reservations', count: '24 lignes', color: '#8edee2' }, { name: 'menu_items', count: '12 lignes', color: '#f3d27a' }, { name: 'opening_hours', count: '7 lignes', color: '#f2b1d1' }], []);
  return <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-[#101016] p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-[#eee7ee]">Données du projet</p><p className="mt-1 text-[11px] text-[#77707b]">Une vue calme des structures utiles à la preview.</p></div><Database className="h-4 w-4 text-[#f3d27a]" /></div><div className="mt-6 space-y-2">{rows.map((row) => <div key={row.name} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} /><span className="font-mono text-xs text-[#d9d2da]">{row.name}</span></div><span className="text-[10px] text-[#77707b]">{row.count}</span></div>)}</div></div>;
}
