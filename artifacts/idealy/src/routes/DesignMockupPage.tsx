/**
 * IDEALY — DESIGN MOCKUP AUTONOME
 *
 * Ce fichier regroupe toute la maquette React : accueil, onboarding, workspace,
 * mission, timeline, preview, code, data, terminal, logs et dictée simulée.
 * Il ne contient aucun appel Supabase, Stripe, OAuth ou fournisseur IA.
 *
 * Bibliothèques utilisées :
 * - React : état local, rendu des écrans et interactions utilisateur.
 * - framer-motion : transitions d’écran, timeline, drawers et micro-animations.
 * - lucide-react : icônes vectorielles cohérentes et accessibles.
 * - Tailwind CSS : tokens visuels, responsive layout, couleurs et états hover/focus.
 *
 * Le backend réel sera branché plus tard autour des handlers déjà nommés
 * (onMission, onListening, onSetWorkspaceTab, onSetConsoleOpen, etc.).
 * L’agent design doit conserver la hiérarchie produit et ne modifier le sens
 * des quatre voies qu’après discussion.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { requestMissionPlan, type MissionPlan } from '@/agents/provider';
import { useSpeechRecognition, type SpeechRecognitionUpdate } from '@/hooks/useSpeechRecognition';
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
  Globe,
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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Contexte prêt à transmettre à un agent design ou produit.
 * Il est volontairement dans ce fichier pour que le livrable React reste autonome.
 */
export const IDEALY_DESIGN_AGENT_CONTEXT = `
Idealy est un studio IA no-code/low-code qui transforme une idée en application explorable,
avec une interface soignée, une preview visible et, à terme, du code et des données réelles.
Cette maquette est une démonstration frontend : elle ne doit appeler aucun backend et ne doit
pas inventer de fonctionnalités déjà branchées.

Parcours inclus : accueil, idée, starters, onboarding gamifié en 3 étapes, quatre voies narratives
(Ninja, Mage, Hunter, Pro), nom, équipe, rôle, source de découverte, workspace, sidebar, historique,
conversation, timeline de réflexion, preview, Code, Data, Terminal/Logs, dictée et micro-interactions.
Les quatre voies sont des identités de création, jamais des niveaux tarifaires ou de compétence.
La sidebar reste visible dans la workspace. La top bar apparaît après une mission. Le centre est
la preview. Le code est secondaire, les données sont lisibles, le terminal reste un tiroir indépendant.

Bibliothèques : React porte l’état et les composants ; framer-motion porte les transitions, la
progression, les drawers et les micro-animations ; lucide-react porte les icônes vectorielles ;
Tailwind CSS porte le système visuel responsive. Ces bibliothèques sont déjà présentes dans le
projet et doivent être conservées plutôt que remplacées par des dépendances inventées.

Ne pas transformer Idealy en dashboard complexe, en clone WhatsApp ou en interface remplie de
boutons. Ne pas supprimer la simplicité inspirée de ChatGPT, Gemini, Claude et v0. Ne pas modifier
le sens des voies, le parcours, la hiérarchie preview/chat/sidebar ou le backend existant sans
proposition explicite et validation humaine préalable.
`;

type Screen = 'welcome' | 'onboarding' | 'workspace';
type OnboardingStep = 'way' | 'profile' | 'context';
type WorkspaceTab = 'preview' | 'code' | 'data';
type Phase = 'idle' | 'thinking' | 'planning' | 'building' | 'ready';
type WayId = 'ninja' | 'mage' | 'hunter' | 'pro';
type DictationLanguage = 'fr-FR' | 'en-US' | 'es-ES';
type DictationTarget = 'welcome' | 'workspace';

const DICTATION_LANGUAGES: Array<{ code: DictationLanguage; label: string; short: string }> = [
  { code: 'fr-FR', label: 'Français', short: 'FR' },
  { code: 'en-US', label: 'English', short: 'EN' },
  { code: 'es-ES', label: 'Español', short: 'ES' },
];

const DICTATION_DEMOS: Record<DictationLanguage, string> = {
  'fr-FR': 'Une interface simple, élégante et publiable.',
  'en-US': 'A simple, elegant, and publishable interface.',
  'es-ES': 'Una interfaz simple, elegante y publicable.',
};

const DICTATION_COPY: Record<DictationLanguage, { listen: string; active: string; unsupported: string; error: string; placeholder: string }> = {
  'fr-FR': { listen: 'Dicter', active: 'Écoute active…', unsupported: 'La dictée simulée est utilisée dans ce navigateur.', error: 'La reconnaissance vocale a rencontré un problème.' , placeholder: 'Décris ce que tu veux créer…' },
  'en-US': { listen: 'Dictate', active: 'Listening…', unsupported: 'Mock dictation is used in this browser.', error: 'Speech recognition encountered a problem.', placeholder: 'Describe what you want to create…' },
  'es-ES': { listen: 'Dictar', active: 'Escuchando…', unsupported: 'La dictée simulée se usa en este navegador.', error: 'La reconnaissance vocale a rencontré un problème.', placeholder: 'Describe lo que quieres crear…' },
};

type Way = {
  id: WayId;
  name: string;
  short: string;
  description: string;
  accent: string;
  background: string;
};

type AgentRole = {
  name: string;
  responsibility: string;
  result: string;
  accent: string;
};

function Logo({ size = 28, markOnly = false }: { size?: number; markOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-label="Idealy">
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-[9px] border border-white/[0.16] bg-gradient-to-br from-[#f2b1d1]/20 to-[#8edee2]/15 text-[#f2b1d1] shadow-[0_0_24px_rgba(242,177,209,0.12)]"
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.48) }}
      >
        ✦
      </span>
      {!markOnly && <span className="text-sm font-semibold tracking-[-0.03em] text-[#eee7ee]">Idealy</span>}
    </div>
  );
}

const WAYS: Way[] = [
  { id: 'ninja', name: 'Ninja', short: 'Rapide et direct', description: 'Inspirée de Naruto, cette voie avance par itérations nettes et instinctives.', accent: '#d7d9e2', background: 'from-slate-700/45 via-zinc-950 to-zinc-950' },
  { id: 'mage', name: 'Mage', short: 'Créatif et exploratoire', description: 'Inspirée de Fairy Tail, elle transforme les idées ouvertes en possibilités.', accent: '#c6a5ff', background: 'from-violet-700/45 via-zinc-950 to-zinc-950' },
  { id: 'hunter', name: 'Hunter', short: 'Orienté résultat', description: 'Inspirée de Hunter x Hunter, elle cherche la bonne stratégie pour atteindre le but.', accent: '#f4cb76', background: 'from-amber-700/45 via-zinc-950 to-zinc-950' },
  { id: 'pro', name: 'Pro', short: 'Précis et technique', description: 'La voie normale : claire, structurée et sans vocabulaire otaku.', accent: '#8edee2', background: 'from-cyan-700/40 via-zinc-950 to-zinc-950' },
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
  const [way, setWay] = useState<WayId | null>(null);
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState('');
  const [pendingWelcomePrompt, setPendingWelcomePrompt] = useState('');
  const [pulse, setPulse] = useState(0);
  const [welcomePrompt, setWelcomePrompt] = useState('');
  const [prompt, setPrompt] = useState('');
  const [mission, setMission] = useState('');
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dictationMode, setDictationMode] = useState<'speech' | 'simulation' | null>(null);
  const [language, setLanguage] = useState<DictationLanguage>('fr-FR');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(55);
  const [resizing, setResizing] = useState(false);
  const timers = useRef<number[]>([]);
  const dictationBaseRef = useRef('');
  const dictationSimulationRef = useRef<number | null>(null);
  const dictationSilenceTimerRef = useRef<number | null>(null);
  const attachmentRef = useRef<HTMLDivElement>(null);
  const helperRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const activeWay = WAYS.find((item) => item.id === way) ?? WAYS[0];
  const hasMission = phase !== 'idle';
  const hasBuildStarted = phase === 'building' || phase === 'ready';
  const dictationTargetRef = useRef<DictationTarget>('workspace');

  const handleSpeechResult = useCallback(({ finalTranscript, interimTranscript: nextInterim }: SpeechRecognitionUpdate) => {
    const base = dictationBaseRef.current;
    const nextText = [base, finalTranscript, nextInterim].filter(Boolean).join(' ').trim();
    if (dictationTargetRef.current === 'welcome') setWelcomePrompt(nextText);
    else setPrompt(nextText);
    setInterimTranscript(nextInterim);
  }, []);

  const speech = useSpeechRecognition(handleSpeechResult, language);
  const listening = speech.listening || dictationMode === 'simulation';

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

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }, []);

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

  const startSignup = (initialPrompt = '') => {
    setPendingWelcomePrompt(initialPrompt.trim());
    setScreen('onboarding');
    setStep('way');
  };

  const submitMission = async (promptOverride?: string) => {
    const value = (promptOverride ?? prompt).trim();
    if (!value || phase === 'thinking' || phase === 'building' || planLoading) return;
    clearTimers();
    if (mission && mission !== value) setHistory((items) => [mission, ...items.filter((item) => item !== mission)].slice(0, 8));
    setMission(value);
    setPrompt('');
    setPlan(null);
    setPlanError(null);
    setWorkspaceTab('preview');
    setConsoleOpen(false);
    setPhase('thinking');
    setPlanLoading(true);
    try {
      const nextPlan = await requestMissionPlan({
        prompt: value,
        way: activeWay.name,
        profile: { name, team, role, source },
      });
      setPlan(nextPlan);
      setPhase('planning');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Plan IA indisponible.';
      setPlanError(message);
      setPhase('planning');
      showNotice('Mode aperçu local : connecte-toi pour activer l’équipe IA réelle.');
    } finally {
      setPlanLoading(false);
    }
  };

  const approvePlan = () => {
    if (phase !== 'planning') return;
    stopActiveDictation();
    clearTimers();
    setPhase('building');
    timers.current.push(window.setTimeout(() => setPhase('ready'), 1700));
  };

  const newMission = () => {
    stopActiveDictation();
    clearTimers();
    if (mission) setHistory((items) => [mission, ...items.filter((item) => item !== mission)].slice(0, 8));
    setMission('');
    setPrompt('');
    setPhase('idle');
    setWorkspaceTab('preview');
    setConsoleOpen(false);
  };

  const changeWay = (nextWay: WayId) => {
    setWay(nextWay);
    setSettingsOpen(false);
    showNotice(`La voie ${WAYS.find((item) => item.id === nextWay)?.name ?? ''} est maintenant active.`);
  };

  const toggleSidebar = () => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setSidebarOpen(true);
    } else {
      setSidebarCollapsed(true);
    }
  };

  const stopActiveDictation = useCallback(() => {
    if (dictationSimulationRef.current !== null) {
      window.clearInterval(dictationSimulationRef.current);
      dictationSimulationRef.current = null;
    }
    if (dictationSilenceTimerRef.current !== null) {
      window.clearTimeout(dictationSilenceTimerRef.current);
      dictationSilenceTimerRef.current = null;
    }
    speech.stopDictation();
    setDictationMode(null);
    setInterimTranscript('');
    const target = dictationTargetRef.current;
    window.setTimeout(() => document.getElementById(target === 'welcome' ? 'design-mockup-welcome-composer' : 'design-mockup-composer')?.focus(), 0);
    return (target === 'welcome' ? welcomePrompt : prompt).trim();
  }, [prompt, speech.stopDictation, welcomePrompt]);

  const startSimulation = useCallback((target: DictationTarget) => {
    setDictationMode('simulation');
    showNotice(DICTATION_COPY[language].unsupported);
    const words = DICTATION_DEMOS[language].split(' ');
    let wordIndex = 0;
    dictationSimulationRef.current = window.setInterval(() => {
      wordIndex += 1;
      const simulated = words.slice(0, wordIndex).join(' ');
      const nextText = [dictationBaseRef.current, simulated].filter(Boolean).join(' ');
      if (target === 'welcome') setWelcomePrompt(nextText);
      else setPrompt(nextText);
      setInterimTranscript(simulated);
      if (wordIndex >= words.length) stopActiveDictation();
    }, 300);
  }, [language, showNotice, stopActiveDictation]);

  const startDictation = useCallback((target: DictationTarget = 'workspace') => {
    if (target === 'workspace' && (phase === 'thinking' || phase === 'building')) return;
    if (listening) {
      stopActiveDictation();
      return;
    }
    dictationTargetRef.current = target;
    const current = target === 'welcome' ? welcomePrompt : prompt;
    dictationBaseRef.current = current.trim();
    setInterimTranscript('');
    const started = speech.startDictation();
    const focusId = target === 'welcome' ? 'design-mockup-welcome-composer' : 'design-mockup-composer';
    window.setTimeout(() => document.getElementById(focusId)?.focus(), 0);

    if (started) {
      setDictationMode('speech');
      showNotice(`Microphone ${DICTATION_COPY[language].active.toLowerCase()}`);
      dictationSilenceTimerRef.current = window.setTimeout(() => stopActiveDictation(), 5000);
      return;
    }

    startSimulation(target);
  }, [language, listening, phase, prompt, speech, startSimulation, stopActiveDictation, welcomePrompt]);

  useEffect(() => {
    if (!speech.error || dictationMode !== 'speech') return;
    speech.stopDictation();
    startSimulation(dictationTargetRef.current);
  }, [dictationMode, speech.error, speech.stopDictation, startSimulation]);

  useEffect(() => () => {
    if (dictationSimulationRef.current !== null) window.clearInterval(dictationSimulationRef.current);
    if (dictationSilenceTimerRef.current !== null) window.clearTimeout(dictationSilenceTimerRef.current);
    speech.stopDictation();
  }, [speech.stopDictation]);

  const onboardingStepIndex = step === 'way' ? 1 : step === 'profile' ? 2 : 3;
  const canContinue = step === 'way' ? Boolean(way) : step === 'profile' ? Boolean(name.trim()) : Boolean(team && role && source);

  const continueOnboarding = () => {
    if (!canContinue) return;
    setPulse((value) => value + 1);
    if (step === 'way') setStep('profile');
    else if (step === 'profile') setStep('context');
    else {
      const initialPrompt = pendingWelcomePrompt;
      setPendingWelcomePrompt('');
      startWorkspace(initialPrompt);
    }
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
              language={language}
              onSetLanguage={setLanguage}
              listening={listening}
              onDictate={() => startDictation('welcome')}
              onStart={() => { const dictatedPrompt = stopActiveDictation(); startSignup(dictatedPrompt || welcomePrompt); }}
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
              plan={plan}
              planLoading={planLoading}
              planError={planError}
              phase={phase}
              prompt={prompt}
              setPrompt={setPrompt}
              language={language}
              onSetLanguage={setLanguage}
              interimTranscript={interimTranscript}
              dictationMode={dictationMode}
              speechError={speech.error}
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
               settingsOpen={settingsOpen}
               onSetSettingsOpen={setSettingsOpen}
               onChangeWay={changeWay}
              onMission={(value) => { void submitMission(value); }}
               onApprovePlan={approvePlan}
              onSetWorkspaceTab={setWorkspaceTab}
              onSetConsoleOpen={setConsoleOpen}
              onSetConsoleTab={setConsoleTab}
              onSetAttachmentOpen={setAttachmentOpen}
              onSetHelperOpen={setHelperOpen}
              onSetConversationOpen={setConversationOpen}
              onListening={() => startDictation('workspace')}
              onStopListening={stopActiveDictation}
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
  language,
  onSetLanguage,
  listening,
  onDictate,
  onStart,
  onOnboarding,
  onNotice,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  language: DictationLanguage;
  onSetLanguage: (value: DictationLanguage) => void;
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
          <LanguagePicker language={language} onChange={onSetLanguage} />
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
              <textarea id="design-mockup-welcome-composer" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder={DICTATION_COPY[language].placeholder} className="w-full resize-none bg-transparent text-sm leading-6 text-[#f5eff4] outline-none placeholder:text-[#69616d]" />
              {listening && <VoiceFeedback language={language} interimTranscript="" mode="listening" />}
              {attached && <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-[#c8c0c8]"><Paperclip className="h-3 w-3" /> brief-idee.pdf <button type="button" onClick={() => setAttached(false)} aria-label="Retirer la pièce jointe"><X className="h-3 w-3" /></button></div>}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setAttached(true)} aria-label="Joindre un fichier" title="Joindre un fichier" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><Paperclip className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onNotice('Import d’image simulé pour cette maquette.')} aria-label="Importer une image" title="Importer une image" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><ImageIcon className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onNotice('Le connecteur Figma sera branché plus tard.')} aria-label="Importer depuis Figma" title="Figma" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><Figma className="h-4 w-4" /></button>
                  <button type="button" onClick={() => onNotice('Le connecteur GitHub sera branché plus tard.')} aria-label="Importer depuis GitHub" title="GitHub" className="rounded-lg p-2 text-[#77707b] transition hover:bg-white/[0.06] hover:text-white"><Github className="h-4 w-4" /></button>
                  <button type="button" onClick={onDictate} aria-pressed={listening} aria-label="Dicter une idée" title={DICTATION_COPY[language].listen} className={`relative rounded-lg p-2 transition ${listening ? 'bg-[#8edee2]/15 text-[#f87171]' : 'text-[#77707b] hover:bg-white/[0.06] hover:text-white'}`}><Mic className="h-4 w-4" />{listening && <><span className="absolute -right-1 -top-1 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f87171] opacity-35" /><span className="relative inline-flex h-3 w-3 rounded-full bg-[#f87171]" /></span><span className="pointer-events-none absolute inset-0 rounded-lg border border-[#8edee2]/60 motion-safe:animate-ping" /></>}</button>
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
  way: WayId | null;
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
  const selectedWay = WAYS.find((item) => item.id === way);
  return (
    <div className="relative z-10 min-h-screen px-5 pb-12 sm:px-8">
      <header className="mx-auto max-w-7xl pt-6"><div className="flex items-center justify-between"><button type="button" onClick={onExit} aria-label="Quitter le parcours" className="rounded-lg p-1.5 text-[#98909b] transition hover:bg-white/[0.05] hover:text-white"><Logo size={27} markOnly /></button><div className="flex items-center gap-3 text-xs text-[#918a95]"><motion.div key={pulse} animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }} transition={{ duration: 0.44 }} className="flex h-7 w-7 items-center justify-center rounded-full border border-[#5b4050] bg-[#211720] text-[#f2b1d1]"><Heart className="h-3.5 w-3.5 fill-current" /></motion.div><span className="hidden sm:inline">Ton espace prend forme</span><span className="tabular-nums text-[#d0c7d0]">{stepIndex} / 3</span></div></div><div className="mt-5 h-px bg-white/[0.08]"><motion.div initial={false} animate={{ width: `${(stepIndex / 3) * 100}%` }} transition={{ duration: 0.28 }} className="h-px bg-gradient-to-r from-[#f2b1d1] via-[#f3d27a] to-[#8edee2]" /></div></header>
      <AnimatePresence mode="wait" initial={false}>
         {step === 'way' && <motion.section key="way" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mx-auto max-w-6xl py-14"><div className="mb-10 text-center"><p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#f2b1d1]">Première rencontre</p><h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#fff9fc] sm:text-5xl">Choisis ta voie</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#aaa1ab]">Une identité de création qui guidera ton espace et tes agents. Tu pourras la changer plus tard dans les paramètres.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{WAYS.map((item, index) => <WayCard key={item.id} item={item} selected={way === item.id} index={index} reducedMotion={reducedMotion} onClick={() => onWay(item.id)} />)}</div><div className="mt-9 flex items-center justify-between gap-4"><p className="text-xs text-[#827a86]">{selectedWay ? <>Voie sélectionnée : <span style={{ color: selectedWay.accent }}>{selectedWay.name}</span></> : 'Choisis une voie pour continuer'}</p><ContinueButton label="Continuer" onClick={onContinue} /></div></motion.section>}
         {step === 'profile' && <motion.section key="profile" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mx-auto max-w-xl py-16"><div className="mb-8 text-center"><div className="mx-auto mb-4 h-1 w-12 rounded-full" style={{ background: selectedWay?.accent ?? '#f2b1d1' }} /><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#fff9fc]">Comment allons-nous t’appeler ?</h1><p className="mt-3 text-sm leading-6 text-[#aaa1ab]">Ton nom apparaîtra dans les messages de tes agents.</p></div><div className="rounded-2xl border border-white/[0.10] bg-[#151219]/90 p-6 shadow-2xl"><label htmlFor="mockup-name" className="mb-2 block text-sm text-[#eee7ee]">Nom de spécialiste</label><input id="mockup-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Amina, Naruto, Chris…" className="w-full rounded-xl border border-white/[0.12] bg-[#0e0c12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f6872] focus:border-[#f2b1d1]" /><div className="mt-5 rounded-xl border border-white/[0.08] bg-[#0e0c12] p-4"><p className="text-xs text-[#7e7681]">Aperçu de la première conversation</p><p className="mt-2 text-sm leading-6 text-[#eee7ee]"><span style={{ color: selectedWay?.accent ?? '#f2b1d1' }}>{selectedWay?.name}</span> — « {name || 'Apprenti'}, que voulons-nous construire aujourd’hui ? »</p></div></div><div className="mt-6 flex items-center justify-between"><BackButton onClick={onBack} /><ContinueButton label="Continuer" onClick={onContinue} /></div></motion.section>}
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
  plan,
  planLoading,
  planError,
  phase,
  prompt,
  setPrompt,
  language,
  onSetLanguage,
  interimTranscript,
  dictationMode,
  speechError,
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
  settingsOpen,
  onSetSettingsOpen,
  onChangeWay,
  onMission,
  onApprovePlan,
  onSetWorkspaceTab,
  onSetConsoleOpen,
  onSetConsoleTab,
  onSetAttachmentOpen,
  onSetHelperOpen,
  onSetConversationOpen,
  onListening,
  onStopListening,
  onShowNotice,
  onResizeStart,
  onCanvasWidth,
}: {
  activeWay: Way;
  history: string[];
  mission: string;
  plan: MissionPlan | null;
  planLoading: boolean;
  planError: string | null;
  phase: Phase;
  prompt: string;
  setPrompt: (value: string) => void;
  language: DictationLanguage;
  onSetLanguage: (value: DictationLanguage) => void;
  interimTranscript: string;
  dictationMode: 'speech' | 'simulation' | null;
  speechError: string | null;
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
  settingsOpen: boolean;
  onSetSettingsOpen: (value: boolean) => void;
  onChangeWay: (value: WayId) => void;
  onMission: (value?: string) => void;
  onApprovePlan: () => void;
  onSetWorkspaceTab: (value: WorkspaceTab) => void;
  onSetConsoleOpen: (value: boolean) => void;
  onSetConsoleTab: (value: 'logs' | 'terminal') => void;
  onSetAttachmentOpen: (value: boolean) => void;
  onSetHelperOpen: (value: boolean) => void;
  onSetConversationOpen: (value: boolean) => void;
  onListening: () => void;
  onStopListening: () => string;
  onShowNotice: (message: string) => void;
  onResizeStart: () => void;
  onCanvasWidth: (value: number) => void;
}) {
  const hasMission = phase !== 'idle';
  const hasBuildStarted = phase === 'building' || phase === 'ready';
  return <div className="relative z-10 flex min-h-screen"><AnimatePresence>{sidebarOpen && <motion.button type="button" aria-label="Fermer la sidebar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCloseMobileSidebar} className="fixed inset-0 z-30 bg-black/55 lg:hidden" />}</AnimatePresence><aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.08] bg-[#111016]/95 backdrop-blur transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${sidebarCollapsed ? 'w-0 border-r-0' : 'w-[244px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} overflow-hidden`}><div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4"><Logo size={25} markOnly /><button type="button" onClick={onCloseMobileSidebar} aria-label="Fermer la sidebar" className="rounded-md p-1.5 text-[#77707b] hover:bg-white/[0.05] hover:text-white lg:hidden"><X className="h-4 w-4" /></button></div><div className="p-3"><button type="button" onClick={onNewMission} className="flex w-full items-center gap-2 rounded-lg border border-white/[0.10] px-3 py-2.5 text-left text-xs text-[#eee7ee] transition hover:border-[#8a6c7e]/60 hover:bg-white/[0.035]"><Plus className="h-4 w-4 text-[#f2b1d1]" />Nouvelle mission</button></div><p className="px-4 pb-2 pt-3 text-[10px] uppercase tracking-[0.18em] text-[#655e69]">Historique</p><div className="space-y-1 px-3">{hasMission && <HistoryItem text={mission} active />}{history.map((item, index) => <HistoryItem key={`${item}-${index}`} text={item} />)}{!hasMission && history.length === 0 && <p className="px-3 py-2 text-xs leading-5 text-[#6d6671]">Tes missions apparaîtront ici.</p>}</div><div className="mt-auto border-t border-white/[0.07] p-3"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#f2b1d1] to-[#f3d27a] text-[10px] font-semibold text-[#24151e]">{activeWay.name[0]}</div><div><p className="text-xs text-[#d9d2da]">{activeWay.name}</p><p className="text-[10px] text-[#6d6671]">Maquette locale</p></div><button type="button" onClick={() => onSetSettingsOpen(true)} aria-label="Paramètres" className="ml-auto rounded-md p-1.5 text-[#6d6671] hover:bg-white/[0.05] hover:text-white"><Settings2 className="h-3.5 w-3.5" /></button></div><p className="mt-2 text-[10px] leading-4 text-[#58515c]">La voie guide le vocabulaire et la composition de l’équipe.</p></div></aside><main className="relative flex min-w-0 flex-1 flex-col">{hasMission && <TopBar mission={mission} activeWay={activeWay} language={language} onSetLanguage={onSetLanguage} sidebarCollapsed={sidebarCollapsed} workspaceTab={workspaceTab} consoleOpen={consoleOpen} conversationOpen={conversationOpen} conversationRef={conversationRef} onToggleSidebar={onToggleSidebar} onSetWorkspaceTab={onSetWorkspaceTab} onSetConsoleOpen={onSetConsoleOpen} onSetConsoleTab={onSetConsoleTab} onSetConversationOpen={onSetConversationOpen} onShowNotice={onShowNotice} />}{hasMission && <AnimatePresence initial={false}>{consoleOpen && <ConsoleDrawer tab={consoleTab} onTab={onSetConsoleTab} onClose={() => onSetConsoleOpen(false)} />}</AnimatePresence>}<div className={`flex min-h-0 flex-1 flex-col ${hasMission ? 'lg:flex-row' : ''}`}><section className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${hasMission ? 'lg:w-[45%] lg:border-r lg:border-white/[0.07]' : ''}`}><div className={`flex-1 overflow-y-auto px-5 sm:px-9 ${hasMission ? 'pb-36 pt-9' : 'pb-40 pt-12'}`}><div className={`mx-auto w-full ${hasMission ? 'max-w-xl' : 'max-w-2xl'}`}>{hasMission ? <MissionConversation mission={mission} plan={plan} planLoading={planLoading} planError={planError} phase={phase} activeWay={activeWay} onApprovePlan={onApprovePlan} /> : <EmptyWorkspace activeWay={activeWay} onStarter={(value) => setPrompt(value)} />}</div></div><div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c0b10] via-[#0c0b10]/95 to-transparent" /><Composer prompt={prompt} setPrompt={setPrompt} phase={phase} activeWay={activeWay} language={language} interimTranscript={interimTranscript} dictationMode={dictationMode} speechError={speechError} listening={listening} attachmentOpen={attachmentOpen} helperOpen={helperOpen} attachmentRef={attachmentRef} helperRef={helperRef} onMission={onMission} onListening={onListening} onStopListening={onStopListening} onSetAttachmentOpen={onSetAttachmentOpen} onSetHelperOpen={onSetHelperOpen} onShowNotice={onShowNotice} /></section>{hasBuildStarted && <div role="separator" aria-label="Redimensionner la preview" tabIndex={0} onPointerDown={onResizeStart} onKeyDown={(event) => { if (event.key === 'ArrowLeft') onCanvasWidth(Math.min(66, canvasWidth + 3)); if (event.key === 'ArrowRight') onCanvasWidth(Math.max(35, canvasWidth - 3)); }} className="group hidden w-1 cursor-col-resize items-center justify-center bg-white/[0.07] outline-none hover:bg-[#8edee2]/40 focus-visible:bg-[#8edee2]/40 lg:flex"><span className="h-12 w-0.5 rounded-full bg-[#5d5662] group-hover:bg-[#8edee2]" /></div>}{hasBuildStarted && <motion.aside initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="min-h-[430px] w-full flex-none bg-[#0d0c12] lg:min-h-0 lg:w-[var(--mockup-canvas-width)]" style={{ '--mockup-canvas-width': `${canvasWidth}%` } as React.CSSProperties}><PreviewCanvas phase={phase} tab={workspaceTab} onShowNotice={onShowNotice} /></motion.aside>}</div></main>{settingsOpen && <SettingsPanel activeWay={activeWay} onClose={() => onSetSettingsOpen(false)} onChangeWay={onChangeWay} />}</div>;
}

function HistoryItem({ text, active = false }: { text: string; active?: boolean }) {
  return <button type="button" className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition ${active ? 'bg-white/[0.055] text-[#e9e2ea]' : 'text-[#827a86] hover:bg-white/[0.035] hover:text-[#cfc6d0]'}`}><History className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${active ? 'text-[#f2b1d1]' : 'text-[#625b66]'}`} /><span className="line-clamp-2">{text}</span></button>;
}

function SettingsPanel({ activeWay, onClose, onChangeWay }: { activeWay: Way; onClose: () => void; onChangeWay: (way: WayId) => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center"><motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-xl rounded-2xl border border-white/[0.12] bg-[#17141c] p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-[#7b727f]">Paramètres de l’espace</p><h2 className="mt-2 text-lg font-semibold text-[#f4edf4]">Choisir une autre voie</h2><p className="mt-1 text-xs leading-5 text-[#918995]">Ce choix change le ton de l’interface et la façon dont l’équipe te guide.</p></div><button type="button" onClick={onClose} aria-label="Fermer les paramètres" className="rounded-lg p-1.5 text-[#77707b] hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{WAYS.map((way) => <button key={way.id} type="button" onClick={() => onChangeWay(way.id)} className={`rounded-xl border p-3 text-left transition ${activeWay.id === way.id ? 'border-[#f2b1d1]/60 bg-[#2a1d27]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'}`}><div className="flex items-center justify-between"><span className="text-sm font-medium text-[#eee7ee]">{way.name}</span>{activeWay.id === way.id && <Check className="h-3.5 w-3.5 text-[#f2b1d1]" />}</div><p className="mt-1 text-[11px]" style={{ color: way.accent }}>{way.short}</p><p className="mt-2 text-[11px] leading-5 text-[#817985]">{way.description}</p></button>)}</div><div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="rounded-lg bg-white/[0.08] px-3 py-2 text-xs text-[#ddd5de] hover:bg-white/[0.12]">Fermer</button></div></motion.div></motion.div>;
}

function TopBar({ mission, activeWay, language, onSetLanguage, sidebarCollapsed, workspaceTab, consoleOpen, conversationOpen, conversationRef, onToggleSidebar, onSetWorkspaceTab, onSetConsoleOpen, onSetConsoleTab, onSetConversationOpen, onShowNotice }: { mission: string; activeWay: Way; language: DictationLanguage; onSetLanguage: (value: DictationLanguage) => void; sidebarCollapsed: boolean; workspaceTab: WorkspaceTab; consoleOpen: boolean; conversationOpen: boolean; conversationRef: React.RefObject<HTMLDivElement | null>; onToggleSidebar: () => void; onSetWorkspaceTab: (value: WorkspaceTab) => void; onSetConsoleOpen: (value: boolean) => void; onSetConsoleTab: (value: 'logs' | 'terminal') => void; onSetConversationOpen: (value: boolean) => void; onShowNotice: (message: string) => void }) {
  return <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#111016]/90 px-2 backdrop-blur sm:px-3"><div className="flex min-w-0 items-center gap-1"><button type="button" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Afficher la sidebar' : 'Réduire la sidebar'} className="rounded-md p-1.5 text-[#9f97a2] hover:bg-white/[0.05] hover:text-white"><PanelLeft className="h-4 w-4" /></button><div ref={conversationRef} className="relative min-w-0"><button type="button" onClick={() => onSetConversationOpen(!conversationOpen)} className="flex max-w-[260px] items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#d9d2da] hover:bg-white/[0.05] hover:text-white"><span className="truncate">{mission.length > 34 ? `${mission.slice(0, 34)}…` : mission}</span><ChevronDown className="h-3 w-3 text-[#6f6872]" /></button><AnimatePresence>{conversationOpen && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute left-0 top-10 z-40 w-60 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl"><p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.15em] text-[#6f6872]">Conversation</p>{['Renommer', 'Ajouter aux favoris', 'Dupliquer', 'Télécharger en ZIP', 'Réglages'].map((item) => <button key={item} type="button" onClick={() => { onSetConversationOpen(false); onShowNotice(`${item} est simulé dans le mockup.`); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#d9d2da] hover:bg-white/[0.05]"><Sparkles className="h-3.5 w-3.5 text-[#f2b1d1]" />{item}</button>)}</motion.div>}</AnimatePresence></div></div><div className="flex shrink-0 items-center gap-0.5 text-[#77707b]"><div className="hidden items-center gap-0.5 border-r border-white/[0.08] pr-2 sm:flex"><button type="button" onClick={() => onShowNotice('Le mode design sera branché après validation.')} aria-label="Mode design" className="rounded-md p-1.5 text-[#f2b1d1] hover:bg-white/[0.05]"><Sparkles className="h-3.5 w-3.5" /></button><IconTab icon={<PanelRight className="h-3.5 w-3.5" />} label="Preview" active={workspaceTab === 'preview'} color="#8edee2" onClick={() => onSetWorkspaceTab('preview')} /><IconTab icon={<Code2 className="h-3.5 w-3.5" />} label="Code" active={workspaceTab === 'code'} color="#c6a5ff" onClick={() => onSetWorkspaceTab('code')} /><IconTab icon={<Database className="h-3.5 w-3.5" />} label="Data" active={workspaceTab === 'data'} color="#f3d27a" onClick={() => onSetWorkspaceTab('data')} /><button type="button" onClick={() => { onSetConsoleTab('terminal'); onSetConsoleOpen(!consoleOpen); }} aria-label="Terminal" className={`rounded-md p-1.5 hover:bg-white/[0.05] ${consoleOpen ? 'text-white' : 'text-[#77707b]'}`}><TerminalSquare className="h-3.5 w-3.5" /></button></div><LanguagePicker language={language} onChange={onSetLanguage} compact /><button type="button" onClick={() => onShowNotice('Ouverture de la preview simulée.')} aria-label="Ouvrir la preview" className="hidden rounded-md p-1.5 hover:bg-white/[0.05] hover:text-white sm:inline-flex"><ExternalLink className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onShowNotice(`La voie ${activeWay.name} garde ce vocabulaire dans l’expérience.`)} aria-label="Voir la voie active" className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-[10px] sm:flex" style={{ color: activeWay.accent }}>{activeWay.name}<ChevronDown className="h-3 w-3" /></button><button type="button" onClick={() => onShowNotice('Les actions de publication sont simulées.')} className="hidden rounded-md bg-gradient-to-r from-[#f2b1d1] to-[#f3d27a] px-2.5 py-1.5 text-[10px] font-semibold text-[#24151e] sm:inline-flex">Publier</button><button type="button" onClick={() => onShowNotice('Menu projet simulé.')} aria-label="Plus d’actions" className="rounded-md p-1.5 hover:bg-white/[0.05] hover:text-white"><MoreHorizontal className="h-4 w-4" /></button></div></header>;
}

function LanguagePicker({ language, onChange, compact = false }: { language: DictationLanguage; onChange: (value: DictationLanguage) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = DICTATION_LANGUAGES.find((item) => item.code === language) ?? DICTATION_LANGUAGES[0];
  return <div className="relative"><button type="button" onClick={() => setOpen((value) => !value)} aria-label="Choisir la langue de dictée" aria-expanded={open} title="Langue de dictée" className="flex items-center gap-1 rounded-md p-1.5 text-[#8c8490] hover:bg-white/[0.05] hover:text-white"><Globe className="h-3.5 w-3.5" /><span className={compact ? 'hidden text-[10px] sm:inline' : 'text-[10px]'}>{current.short}</span></button><AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute right-0 top-9 z-50 w-36 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl">{DICTATION_LANGUAGES.map((item) => <button key={item.code} type="button" onClick={() => { onChange(item.code); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${item.code === language ? 'bg-white/[0.08] text-white' : 'text-[#aaa1ab] hover:bg-white/[0.05] hover:text-white'}`}><span>{item.label}</span><span className="text-[10px] text-[#77707b]">{item.short}</span></button>)}</motion.div>}</AnimatePresence></div>;
}

function VoiceFeedback({ language, interimTranscript, mode }: { language: DictationLanguage; interimTranscript: string; mode: 'speech' | 'simulation' | 'listening' }) {
  const copy = DICTATION_COPY[language];
  const heights = [9, 15, 21, 13, 18];
  return <div data-dictation-mode={mode} className="mt-1 flex items-center gap-2 rounded-lg border border-[#8edee2]/20 bg-[#8edee2]/[0.045] px-2.5 py-1.5"><span className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#c2f3f1]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f87171]" />{copy.active}</span><span aria-live="polite" className="min-w-0 flex-1 truncate text-[10px] italic text-[#aaa1ab]">{interimTranscript || '…'}</span><span aria-hidden="true" className="flex h-5 items-end gap-0.5">{heights.map((height, index) => <motion.span key={height + index} animate={{ height: [height, Math.max(5, height - 7), height + 4, height] }} transition={{ duration: 0.72, repeat: Infinity, delay: index * 0.08 }} className="w-0.5 rounded-full bg-gradient-to-t from-[#f2b1d1] to-[#8edee2]" />)}</span></div>;
}

function IconTab({ icon, label, active, color, onClick }: { icon: ReactNode; label: string; active: boolean; color: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`rounded-md p-1.5 hover:bg-white/[0.05] ${active ? 'text-white' : 'text-[#77707b]'}`} style={active ? { color } : undefined}>{icon}</button>;
}

function EmptyWorkspace({ activeWay, onStarter }: { activeWay: Way; onStarter: (value: string) => void }) {
  return <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center text-center"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-[#f2b1d1]"><Sparkles className="h-4 w-4" /></div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#fff9fc] sm:text-4xl">Qu’allons-nous construire ?</h1><p className="mt-3 max-w-md text-sm leading-6 text-[#918a95]">Décris ton idée. La maquette simule la réflexion, la construction et la preview sans appeler de backend.</p><div className="mt-8 grid w-full gap-2 sm:grid-cols-2">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => onStarter(starter)} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] px-4 py-3 text-left text-xs leading-5 text-[#8f8792] transition hover:border-white/20 hover:bg-white/[0.035] hover:text-[#e9e2ea]"><span>{starter}</span><ArrowRight className="h-3.5 w-3.5 text-[#625b66]" /></button>)}</div><p className="mt-8 text-[11px]" style={{ color: activeWay.accent }}>Voie active · {activeWay.name}</p></div>;
}

function inferProject(mission: string) {
  const lower = mission.toLowerCase();
  if (lower.includes('réserv') || lower.includes('restaurant') || lower.includes('pizza')) return { kind: 'expérience de réservation', focus: 'parcours client et disponibilités' };
  if (lower.includes('tableau') || lower.includes('dépense') || lower.includes('dashboard')) return { kind: 'tableau de bord', focus: 'lecture rapide et actions utiles' };
  if (lower.includes('cours') || lower.includes('école') || lower.includes('formation')) return { kind: 'outil d’organisation', focus: 'contenu, progression et rappels' };
  return { kind: 'application web exploratoire', focus: 'première expérience claire et testable' };
}

function getProjectTeam(mission: string): AgentRole[] {
  const project = inferProject(mission);
  const common: AgentRole[] = [
    { name: 'Éclaireur', responsibility: 'Clarifie l’intention et les utilisateurs', result: 'brief de mission', accent: '#f2b1d1' },
    { name: 'Architecte', responsibility: `Dessine la structure de ${project.kind}`, result: 'écrans et navigation', accent: '#c6a5ff' },
  ];
  if (project.kind === 'tableau de bord') common.push({ name: 'Analyste', responsibility: 'Organise les indicateurs et états', result: 'hiérarchie des données', accent: '#f3d27a' });
  else common.push({ name: 'Designer', responsibility: 'Définit les composants et le rythme visuel', result: 'direction d’interface', accent: '#8edee2' });
  return common;
}

function PlanCard({ mission, plan, planLoading, planError, activeWay, onApprove }: { mission: string; plan: MissionPlan | null; planLoading: boolean; planError: string | null; activeWay: Way; onApprove: () => void }) {
  const project = inferProject(mission);
  const team = plan?.agents ?? getProjectTeam(mission);
  const projectKind = plan?.projectKind ?? project.kind;
  const intention = plan?.intention ?? project.focus;
  const v1Scope = plan?.v1Scope ?? 'Accueil, parcours principal et état de confirmation';
  return <div className="mt-1 rounded-2xl border border-[#c6a5ff]/25 bg-[#17131e] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.16)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#c6a5ff]">Plan de mission</p><h3 className="mt-2 text-sm font-medium text-[#eee7ee]">Une {projectKind}, guidée par la voie {activeWay.name}</h3></div><Sparkles className="h-4 w-4 shrink-0 text-[#c6a5ff]" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/[0.035] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[#6f6872]">Intention comprise</p><p className="mt-1 text-xs leading-5 text-[#cfc6d0]">{intention}</p></div><div className="rounded-xl bg-white/[0.035] p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-[#6f6872]">Périmètre V1</p><p className="mt-1 text-xs leading-5 text-[#cfc6d0]">{v1Scope}</p></div></div><p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#6f6872]">Équipe composée pour cette mission</p><div className="mt-2 space-y-2">{team.map((agent) => <div key={agent.name} className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-2.5 py-2"><span className="h-2 w-2 rounded-full" style={{ background: agent.accent }} /><span className="text-xs font-medium text-[#ddd5de]">{agent.name}</span><span className="truncate text-[11px] text-[#77707b]">· {agent.responsibility}</span></div>)}</div>{planLoading && <p className="mt-3 text-[11px] text-[#8edee2]">L’Orchestrateur compose l’équipe adaptée à ce projet…</p>}{planError && <p className="mt-3 text-[11px] text-[#f3d27a]">Aperçu local utilisé : le plan réel apparaîtra après connexion.</p>}<button type="button" onClick={onApprove} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f2b1d1] to-[#f3d27a] px-3.5 py-2.5 text-xs font-semibold text-[#24151e] hover:brightness-105">Valider et construire <ArrowRight className="h-3.5 w-3.5" /></button></div>;
}

function MissionConversation({ mission, plan, planLoading, planError, phase, activeWay, onApprovePlan }: { mission: string; plan: MissionPlan | null; planLoading: boolean; planError: string | null; phase: Phase; activeWay: Way; onApprovePlan: () => void }) {
  return <div className="space-y-8"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eee9ee] text-[10px] font-semibold text-[#1c171d]">Toi</div><p className="pt-1 text-sm leading-6 text-[#e7e0e7]">{mission}</p></div><AgentTimeline mission={mission} plan={plan} phase={phase} activeWay={activeWay} /><AnimatePresence mode="wait"><motion.div key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-l border-white/[0.08] pl-4 text-sm leading-7 text-[#b9b1bb]">{phase === 'thinking' && 'Je clarifie ton idée avant de choisir une direction.'}{phase === 'planning' && <PlanCard mission={mission} plan={plan} planLoading={planLoading} planError={planError} activeWay={activeWay} onApprove={onApprovePlan} />}{phase === 'building' && 'La structure prend forme. Les premiers écrans deviennent explorables dans la preview.'}{phase === 'ready' && 'La première version est prête. Tu peux maintenant regarder, modifier ou continuer la mission.'}</motion.div></AnimatePresence></div>;
}

function AgentTimeline({ mission, plan, phase, activeWay }: { mission: string; plan: MissionPlan | null; phase: Phase; activeWay: Way }) {
  const [expanded, setExpanded] = useState(false);
  const agentCount = plan?.agents.length ?? getProjectTeam(mission).length;
  const steps = [{ label: 'Intention comprise', detail: `${activeWay.name} reformule le résultat attendu`, done: phase !== 'thinking' }, { label: 'Équipe composée', detail: `${agentCount} agents spécialisés selon la mission`, done: phase === 'planning' || phase === 'building' || phase === 'ready' }, { label: 'Structure préparée', detail: 'Les écrans et les fichiers principaux prennent forme', done: phase === 'building' || phase === 'ready' }, { label: 'Preview construite', detail: 'Une première version est prête à être explorée', done: phase === 'ready' }];
  const headline = phase === 'thinking' ? 'Clarification en cours' : phase === 'planning' ? 'Plan prêt à valider' : phase === 'building' ? 'Construction en cours' : 'Première version prête';
  return <div><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-1 py-2 text-left"><div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-[10px] font-semibold" style={{ color: activeWay.accent }}>I</div><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-xs font-medium text-[#eee7ee]">{headline}<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f2b1d1]" /></span><span className="mt-0.5 block text-[11px] text-[#77707b]">Escouade {activeWay.name} · étapes visibles, détails discrets</span></span><ChevronDown className={`h-3.5 w-3.5 text-[#77707b] transition-transform ${expanded ? 'rotate-180' : ''}`} /></button><AnimatePresence initial={false}>{expanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-l border-white/[0.08] pl-4"><div className="space-y-1 py-2">{steps.map((stepItem) => <div key={stepItem.label} className="flex items-start gap-2.5 px-2 py-2"><span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${stepItem.done ? 'border-[#8edee2]/70 bg-[#8edee2]/10 text-[#8edee2]' : 'border-[#5c3e54] bg-[#281a25] text-[#f2b1d1]'}`}>{stepItem.done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span><span><span className="block text-[11px] font-medium text-[#d8d0d9]">{stepItem.label}</span><span className="mt-0.5 block text-[11px] leading-5 text-[#77707b]">{stepItem.detail}</span></span></div>)}</div></motion.div>}</AnimatePresence></div>;
}

function Composer({ prompt, setPrompt, phase, activeWay, language, interimTranscript, dictationMode, speechError, listening, attachmentOpen, helperOpen, attachmentRef, helperRef, onMission, onListening, onStopListening, onSetAttachmentOpen, onSetHelperOpen, onShowNotice }: { prompt: string; setPrompt: (value: string) => void; phase: Phase; activeWay: Way; language: DictationLanguage; interimTranscript: string; dictationMode: 'speech' | 'simulation' | null; speechError: string | null; listening: boolean; attachmentOpen: boolean; helperOpen: boolean; attachmentRef: React.RefObject<HTMLDivElement | null>; helperRef: React.RefObject<HTMLDivElement | null>; onMission: (value?: string) => void; onListening: () => void; onStopListening: () => string; onSetAttachmentOpen: (value: boolean) => void; onSetHelperOpen: (value: boolean) => void; onShowNotice: (message: string) => void }) {
  const busy = phase === 'thinking' || phase === 'building';
  const copy = DICTATION_COPY[language];
  const send = () => {
    const finalized = onStopListening();
    onMission(finalized || prompt.trim());
  };
  return <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 sm:px-9"><div className="mx-auto max-w-2xl"><div className="mb-2 flex items-center justify-between px-1 text-[10px] text-[#6f6872]"><div className="flex items-center gap-2"><span style={{ color: activeWay.accent }}>Voie {activeWay.name}</span><span className="h-1 w-1 rounded-full bg-white/20" /><span>Entrée pour envoyer</span></div><span className="hidden sm:inline">Maj + Entrée pour une nouvelle ligne</span></div><div className={`rounded-2xl p-px ${busy ? 'bg-gradient-to-r from-[#f2b1d1] via-[#f3d27a] to-[#8edee2]' : 'bg-white/[0.12]'}`}><div className="rounded-[15px] bg-[#151219] p-3"><textarea id="design-mockup-composer" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} rows={2} placeholder={copy.placeholder} className="w-full resize-none bg-transparent px-1 text-sm leading-6 text-[#eee7ee] outline-none placeholder:text-[#6f6872]" />{listening && <VoiceFeedback language={language} interimTranscript={interimTranscript} mode={dictationMode ?? 'speech'} />}{speechError && <p role="status" className="mt-1 px-1 text-[10px] text-[#fca5a5]">{copy.error}</p>}<div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-0.5"><div ref={attachmentRef} className="relative"><button type="button" onClick={() => onSetAttachmentOpen(!attachmentOpen)} aria-label="Joindre ou connecter" className={`rounded-lg p-2 text-[#706873] hover:bg-white/[0.05] hover:text-white ${attachmentOpen ? 'bg-white/[0.05] text-white' : ''}`}><Paperclip className="h-4 w-4" /></button><AnimatePresence>{attachmentOpen && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute bottom-11 left-0 z-30 w-56 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl"><MenuItem icon={<Upload className="h-3.5 w-3.5" />} label="Importer depuis l’ordinateur" onClick={() => { onSetAttachmentOpen(false); onShowNotice('Import simulé dans cette maquette.'); }} /><MenuItem icon={<Plug className="h-3.5 w-3.5" />} label="Connecter un service" onClick={() => { onSetAttachmentOpen(false); onShowNotice('Le registre des connecteurs sera branché plus tard.'); }} /><MenuItem icon={<Puzzle className="h-3.5 w-3.5" />} label="Ajouter un plugin" onClick={() => { onSetAttachmentOpen(false); onShowNotice('Les plugins restent hors backend dans ce mockup.'); }} /></motion.div>}</AnimatePresence></div><div ref={helperRef} className="relative"><button type="button" onClick={() => onSetHelperOpen(!helperOpen)} aria-label="Améliorer l’idée" className={`rounded-lg p-2 text-[#706873] hover:bg-white/[0.05] hover:text-white ${helperOpen ? 'bg-white/[0.05] text-white' : ''}`}><Sparkles className="h-4 w-4" /></button><AnimatePresence>{helperOpen && <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute bottom-11 left-0 z-30 w-64 rounded-xl border border-white/[0.10] bg-[#1a1720] p-1.5 shadow-2xl"><p className="px-2.5 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.15em] text-[#6f6872]">Améliorer l’idée</p>{[['Préciser le résultat', 'Ajoute le résultat attendu et les personnes visées.'], ['Structurer les écrans', 'Propose les pages principales et leur navigation.'], ['Définir le style', 'Suggère une direction visuelle cohérente.']].map(([label, addition]) => <MenuItem key={label} icon={<Sparkles className="h-3.5 w-3.5" />} label={label} onClick={() => { setPrompt(`${prompt.trim()}${prompt.trim() ? '\n\n' : ''}${addition}`); onSetHelperOpen(false); }} />)}</motion.div>}</AnimatePresence></div></div><div className="flex items-center gap-1"><button type="button" onClick={onListening} disabled={busy} aria-pressed={listening} aria-label="Dicter la mission" title="Dicter" className={`relative rounded-lg p-2 transition ${busy ? 'cursor-not-allowed text-[#4e4853]' : listening ? 'bg-[#8edee2]/15 text-[#f87171]' : 'text-[#706873] hover:bg-white/[0.05] hover:text-white'}`}><Mic className="h-4 w-4" />{listening && <><span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#f87171]" /><span className="pointer-events-none absolute inset-0 rounded-lg border border-[#8edee2]/70 motion-safe:animate-ping" /></>}</button><button type="button" onClick={send} disabled={!prompt.trim() || busy} aria-label="Envoyer la mission" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f2b1d1] to-[#f3d27a] text-[#24151e] transition disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button></div></div></div></div><p className="mt-2 text-center text-[10px] text-[#514a56]">Aperçu local · aucune donnée n’est envoyée</p></div></div>;
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
