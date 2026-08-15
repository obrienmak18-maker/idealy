import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { analyzeIntent, streamAgentMessage, streamLiaMessage } from '@/agents/orchestrator';
import { refundMissionCredits, routeAIIntent, streamAgentUI, type IntentCategory } from '@/agents/provider';
import { iupsToCode } from '@/core/iups/exporter';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import type { ChatMessage } from '@/components/chat/MessageBubble';
import { SettingsModal } from '@/components/SettingsModal';
import { ConnectorsPanel } from '@/components/workspace/ConnectorsPanel';
import { PaywallModal } from '@/components/workspace/PaywallModal';
import { DeployPanel } from '@/components/workspace/DeployPanel';
import { WebContainerPreview } from '@/components/workspace/WebContainerPreview';
import { FileExplorer } from '@/components/workspace/FileExplorer';
import { ComposerPanel } from '@/components/workspace/ComposerPanel';
import { CodeEditor, type CodeActionIntent } from '@/components/workspace/CodeEditor';
import { Terminal as TerminalComponent } from '@/components/workspace/Terminal';
import { downloadProjectZip } from '@/services/projectDownloader';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  PanelRightClose,
  Maximize2,
  Minimize2,
  Plus,
  Send,
  Square,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Github,
  Figma,
  Eye,
  FolderTree,
  Plug,
  ScrollText,
  Sparkles,
  ChevronDown,
  Settings,
  LogOut,
  Zap,
  Crown,
  Bell,
  Terminal,
  Copy,
  CheckCircle2,
  Loader2,
  Download,
} from 'lucide-react';
import { Logo } from '@/components/Brand';
import { WAYS, type WayId } from '@/lore/ways';
import { useIdealyStore } from '@/stores/idealyStore';
import { getSupabaseClient } from '@/supabaseClient';
import { useStripe } from '@/hooks/useStripe';
import { MissionBriefPanel } from '@/components/workspace/MissionBriefPanel';
import { MissionStatusPanel } from '@/components/workspace/MissionStatusPanel';
import { type MissionExecutionStage } from '@/components/workspace/MissionActivityPanel';
import { MissionFlow, type MissionFlowStep } from '@/components/workspace/MissionFlow';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { buildMissionContracts } from '@/core/mission/missionContract';
import { appendSnapshot, createMissionDNA, createMissionSnapshot } from '@/core/mission/missionDNA';
import { validateGeneratedProject } from '@/core/mission/validateMission';
import { buildPreflightProofs } from '@/core/mission/preflight';
import { createDemoMission } from '@/core/mission/demoMission';
import { buildWithSelfCorrection } from '@/core/webcontainer/selfCorrection';
import { createArchitectureContext } from '@/core/webcontainer/architectureMemory';
import { selectMissionTeam } from '@/core/mission/missionTeam';
import type { ChangeCapsule, MissionContracts, MissionDNA, ValidationReport } from '@/core/mission/contracts';

type RightTab = 'mission' | 'preview' | 'code' | 'files' | 'composer' | 'connectors' | 'deploy' | 'logs';

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
};

type BrowserSpeechRecognitionFactory = new () => BrowserSpeechRecognition;

// Slash commands available in the chat input
const SLASH_COMMANDS = [
  { cmd: '/deploy', label: '/deploy', desc: 'Déployer le projet sur Vercel' },
  { cmd: '/fix', label: '/fix', desc: 'Corriger les erreurs du projet actuel' },
  { cmd: '/explain', label: '/explain', desc: 'Expliquer le code généré' },
  { cmd: '/add-file', label: '/add-file', desc: 'Ajouter un nouveau fichier au projet' },
  { cmd: '/style', label: '/style', desc: 'Améliorer le style du projet' },
];

const DICTATION_THEME: Record<WayId, { active: string; wave: string; ring: string; label: string }> = {
  ninja: {
    active: 'bg-ember-500/15 text-ember-200',
    wave: 'bg-ember-300',
    ring: 'border-ember-300/70',
    label: 'Canal de mission ouvert',
  },
  mage: {
    active: 'bg-electric-500/15 text-electric-200',
    wave: 'bg-electric-300',
    ring: 'border-electric-300/70',
    label: 'Canal arcanique ouvert',
  },
  hunter: {
    active: 'bg-success-500/15 text-success-200',
    wave: 'bg-success-300',
    ring: 'border-success-300/70',
    label: 'Canal de traque ouvert',
  },
  pro: {
    active: 'bg-white/15 text-white',
    wave: 'bg-white',
    ring: 'border-white/70',
    label: 'Dictée professionnelle active',
  },
};

export function WorkspacePage({ demoMode: initialDemoMode = false }: { demoMode?: boolean } = {}) {
  const storedWayId = useIdealyStore((s) => s.way) as WayId | null;
  const wayId = storedWayId ?? (initialDemoMode ? 'pro' : 'ninja');
  const profile = useIdealyStore((s) => s.profile);
  const energy = useIdealyStore((s) => s.energy);
  const setMissions = useIdealyStore((s) => s.setMissions);
  const missions = useIdealyStore((s) => s.missions);
  const addMission = useIdealyStore((s) => s.addMission);
  const updateStoreMission = useIdealyStore((s) => s.updateMission);
  const setActiveMissionId = useIdealyStore((s) => s.setActiveMissionId);
  const setMissionDNA = useIdealyStore((s) => s.setMissionDNA);
  const updateMissionDNA = useIdealyStore((s) => s.updateMissionDNA);
  const missionDNA = useIdealyStore((s) => s.missionDNA);
  const signOut = useIdealyStore((s) => s.signOut);

  const way = WAYS[wayId];
  const missionTeam = selectMissionTeam(way);
  const dictationTheme = DICTATION_THEME[wayId];
  const shouldReduceMotion = useReducedMotion();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<RightTab>('preview');
  const [showPreview, setShowPreview] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flowSteps, setFlowSteps] = useState<MissionFlowStep[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isBillingPortalOpen, setIsBillingPortalOpen] = useState(false);
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  const [pendingBrief, setPendingBrief] = useState<{ prompt: string; contracts: MissionContracts } | null>(null);
  const [queuedInterruptions, setQueuedInterruptions] = useState<string[]>([]);
  const queuedInterruptionsRef = useRef<string[]>([]);
  const [stopRequested, setStopRequested] = useState(false);
  const missionAbortRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);
  const activeMissionIdRef = useRef<string | null>(null);
  const consumedMissionEnergyRef = useRef(0);

  const { subscription, checkSubscription } = useStripe();

  const [projectSchema, setProjectSchema] = useState<IdealyUniversalProjectSchema | null>(null);
  const [reviewSchema, setReviewSchema] = useState<IdealyUniversalProjectSchema | null>(null);
  const [previousSchema, setPreviousSchema] = useState<IdealyUniversalProjectSchema | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [missionActivity, setMissionActivity] = useState<{ missionId: string; stage: MissionExecutionStage } | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [activeIntent, setActiveIntent] = useState<IntentCategory>('CONVERSATION');
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [demoMode, setDemoMode] = useState(initialDemoMode);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const dictationRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const summarizeFlowText = (raw: string, fallback: string) => {
    const visible = raw.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').replace(/<\/think>/gi, '').trim();
    if (!visible) return fallback;
    const firstLine = visible.split('\n').map((line) => line.trim()).find(Boolean) ?? fallback;
    return firstLine.length > 180 ? `${firstLine.slice(0, 177)}…` : firstLine;
  };

  const upsertFlowStep = (step: MissionFlowStep) => {
    setFlowSteps((current) => {
      const existing = current.findIndex((candidate) => candidate.id === step.id);
      if (existing === -1) return [...current, step];
      return current.map((candidate, index) => index === existing ? { ...candidate, ...step } : candidate);
    });
  };

  const clearMissionFlow = () => setFlowSteps([]);

  const takeQueuedInterruption = (): string | null => {
    const next = queuedInterruptionsRef.current.shift() ?? null;
    setQueuedInterruptions([...queuedInterruptionsRef.current]);
    return next;
  };

  const stopMission = async () => {
    if (!busy) return;
    setStopRequested(true);
    missionAbortRef.current?.abort();
    const missionId = activeMissionIdRef.current ?? currentMissionId;
    const localRefund = consumedMissionEnergyRef.current;
    if (localRefund > 0) {
      const state = useIdealyStore.getState();
      const energyState = state.energy;
      state.setEnergy({ ...energyState, current: Math.min(energyState.max, energyState.current + localRefund) });
    }
    setBusy(false);
    setToolMessage('Arrêt demandé. Le fichier en cours est conservé dans la version stable.');
    if (missionId) {
      upsertFlowStep({ id: `${missionId}:stop`, kind: 'system', agentName: 'Mission', role: 'Arrêt contrôlé', shortText: 'Mission interrompue au prochain point sûr. Le chakra local non consommé est restitué.', status: 'completed', summary: 'Aucun secret ni fichier partiellement validé n’est publié.' });
      try {
        await refundMissionCredits({ missionId, debitIdempotencyKey: `${missionId}:strategy`, amount: Math.min(10, Math.max(1, localRefund)) });
        setToolMessage('Mission arrêtée. Le remboursement serveur a été enregistré dans le ledger.');
      } catch {
        setToolMessage('Mission arrêtée. Le chakra local a été restitué ; le débit serveur n’était pas remboursable ou n’était pas encore enregistré.');
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, flowSteps]);

  useEffect(() => {
    return () => {
      dictationRecognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && (event.key === '`' || event.key === '~')) {
        event.preventDefault();
        setTerminalOpen((open) => !open);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && showPreview) {
        event.preventDefault();
        setFocusMode((open) => !open);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [showPreview]);

  useEffect(() => {
    if (initialDemoMode && messages.length === 0) startDemoMode();
  }, [initialDemoMode]);

  // Load missions from Supabase on mount
  useEffect(() => {
    if (profile) {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      supabase.from('missions').select('*').order('created_at', { ascending: false }).then(({ data }: { data: Array<{ id: string; title: string; created_at: number; way: string; preview_ready: boolean }> | null }) => {
        if (data) {
          setMissions(data.map((d) => ({
            id: d.id,
            title: d.title,
            createdAt: d.created_at,
            way: d.way as WayId,
            previewReady: d.preview_ready
          })));
        }
      });
    }
  }, [profile, setMissions]);

  // Load selected mission schema
  useEffect(() => {
    if (currentMissionId) {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      supabase.from('missions').select('schema, dna, validation, status, preview_ready').eq('id', currentMissionId).single().then(({ data }: { data: { schema?: unknown; dna?: MissionDNA; validation?: ValidationReport; status?: 'draft' | 'planned' | 'building' | 'ready' | 'needs-fix' | 'published'; preview_ready?: boolean } | null }) => {
        if (data?.schema) {
          setProjectSchema(data.schema as IdealyUniversalProjectSchema);
        } else {
          setProjectSchema(null);
        }
        if (data?.dna) setMissionDNA(currentMissionId, data.dna);
        if (data?.status) updateStoreMission(currentMissionId, { status: data.status, previewReady: Boolean(data.preview_ready), validation: data.validation ?? undefined });
      });
    }
  }, [currentMissionId]);

  const updateProjectSchema = (newSchema: IdealyUniversalProjectSchema | null) => {
    setProjectSchema(newSchema);
    if (currentMissionId && newSchema) {
      getSupabaseClient()?.from('missions').update({ schema: newSchema, updated_at: new Date().toISOString() }).eq('id', currentMissionId).then();
    }
  };

  const restoreMissionSnapshot = (snapshot: import('@/core/mission/contracts').MissionSnapshot) => {
    if (!currentMissionId || !snapshot.schema) return;
    setPreviousSchema(projectSchema);
    updateProjectSchema(snapshot.schema as IdealyUniversalProjectSchema);
    updateStoreMission(currentMissionId, { previewReady: true, status: 'ready', validation: snapshot.validation });
    updateMissionDNA(currentMissionId, (dna) => ({
      ...dna,
      status: 'ready',
      updatedAt: Date.now(),
      validation: snapshot.validation ?? dna.validation,
    }));
    const restoredDNA = useIdealyStore.getState().missionDNA[currentMissionId];
    getSupabaseClient()?.from('missions').update({
      schema: snapshot.schema,
      status: 'ready',
      validation: snapshot.validation ?? null,
      dna: restoredDNA,
      updated_at: new Date().toISOString(),
      preview_ready: true,
    }).eq('id', currentMissionId).then();
    setShowPreview(true);
    setTab('preview');
    setToolMessage(`Version restaurée : ${snapshot.label}`);
  };

  function repairMission() {
    const activeDNA = currentMissionId ? missionDNA[currentMissionId] : null;
    const issues = activeDNA?.validation?.issues ?? [];
    if (!activeDNA || issues.length === 0) {
      setToolMessage('Aucune issue déterministe à corriger pour cette mission.');
      return;
    }
    const issueLines = issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ''}`).join('\\n');
    const repairPrompt = `RÉPARATION CIBLÉE DE LA MISSION\\n\\nCorrige le projet existant sans changer son intention ni sa voie. Traite chaque issue réelle ci-dessous, puis vérifie les contrats et les états loading/error avant de retourner une version complète.\\n\\nIssues du validateur :\\n${issueLines}`;
    setMessages((messages) => [...messages, {
      id: crypto.randomUUID(),
      author: profile?.displayName ?? 'Vous',
      role: 'Vous',
      text: 'Corriger la mission à partir du diagnostic de validation',
      kind: 'user',
      ts: Date.now(),
    }]);
    setToolMessage(`Réparation ciblée lancée pour ${issues.length} issue(s).`);
    void runMission(repairPrompt, activeDNA.contracts);
  }

  async function routePrompt(finalPrompt: string, forcedCategory?: CodeActionIntent) {
    setBusy(true);
    setPendingBrief(null);
    setToolMessage('Analyse de l’intention…');
    let route: Awaited<ReturnType<typeof routeAIIntent>> = { category: 'CONVERSATION', confidence: 0, reason: 'Repli conversationnel.' };
    try {
      route = forcedCategory
        ? { category: forcedCategory, confidence: 1, reason: 'Action contextuelle du CodeEditor.' }
        : await routeAIIntent(finalPrompt);
    } catch (error) {
      console.warn('Intent router unavailable; using conversation fallback.', error);
    }

    setActiveIntent(route.category);
    const userFlowId = crypto.randomUUID();
    const liaId = crypto.randomUUID();
    upsertFlowStep({
      id: userFlowId,
      kind: 'user',
      agentName: profile?.displayName ?? 'Vous',
      role: 'Mission',
      shortText: finalPrompt,
      status: 'completed',
      summary: 'Demande reçue.',
    });
    upsertFlowStep({
      id: liaId,
      kind: 'lia',
      agentName: 'Lia',
      role: 'Messagère',
      shortText: '... reçoit votre demande et prépare la transmission ...',
      status: 'active',
    });
    let liaResponse = '';
    try {
      const liaStream = await streamLiaMessage(way, finalPrompt, `${userFlowId}:lia`);
      for await (const delta of liaStream.textStream) {
        liaResponse += delta;
        upsertFlowStep({ id: liaId, kind: 'lia', agentName: 'Lia', role: 'Messagère', shortText: summarizeFlowText(liaResponse, 'Je prépare la transmission à l’Orchestrateur.'), detailText: liaResponse, status: 'active' });
      }
    } catch {
      liaResponse = `Bien reçu. Je transmets votre demande à ${missionTeam.strategist.name} pour planification.`;
    }
    upsertFlowStep({
      id: liaId,
      kind: 'lia',
      agentName: 'Lia',
      role: 'Messagère',
      shortText: `Transmis à ${missionTeam.strategist.name}.`,
      summary: summarizeFlowText(liaResponse, `Transmis à ${missionTeam.strategist.name}.`),
      detailText: liaResponse,
      status: 'completed',
    });

    if (route.category === 'EXECUTION') {
      setBusy(false);
      setPendingBrief({ prompt: finalPrompt, contracts: buildMissionContracts(finalPrompt, way) });
      setToolMessage('Mission détectée. Le Canvas sera ouvert après votre validation du brief.');
      return;
    }

    setShowPreview(false);
    setTerminalOpen(false);
    setToolMessage(route.category === 'IDEATION' ? 'Mode idéation : aucun fichier ne sera modifié.' : null);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      author: profile?.displayName ?? 'Vous',
      role: 'Vous',
      text: finalPrompt,
      kind: 'user',
      channel: 'conversation',
      ts: Date.now(),
    };
    const agent = missionTeam.strategist;
    const agentId = crypto.randomUUID();
    setMessages((current) => [...current, userMessage, {
      id: agentId,
      agentId: agent.id,
      author: agent.name,
      role: agent.role,
      text: '',
      kind: 'agent',
      channel: 'conversation',
      ts: Date.now(),
      status: 'writing',
    }]);
    upsertFlowStep({ id: agentId, kind: 'agent', agent, agentName: agent.name, role: agent.role, shortText: 'Réflexion en cours.', indicator: { kind: 'thinking' }, status: 'active' });
    setBusy(true);
    try {
      const stream = await streamAgentMessage(
        agent,
        way,
        route.category === 'IDEATION' ? 'Mode idéation : explore sans écrire sur le projet.' : 'Mode conversation : réponds dans le flux central.',
        finalPrompt,
        route.category === 'IDEATION'
          ? 'Propose des pistes concrètes, mais ne demande aucune validation et ne prétends pas avoir modifié le Canvas.'
          : 'Réponds directement et naturellement dans le flux central. Ne transforme pas une question en mission et ne demande aucune validation.',
        '',
        [],
        agentId,
        route.category,
      );
      let response = '';
      for await (const delta of stream.textStream) {
        response += delta;
        setMessages((current) => current.map((message) => message.id === agentId ? { ...message, text: response, status: 'writing' } : message));
        upsertFlowStep({ id: agentId, kind: 'agent', agent, agentName: agent.name, role: agent.role, shortText: summarizeFlowText(response, 'Réflexion en cours.'), indicator: { kind: 'thinking' }, detailText: response, status: 'active' });
      }
      setMessages((current) => current.map((message) => message.id === agentId ? { ...message, text: response, status: 'done' } : message));
      upsertFlowStep({ id: agentId, kind: 'agent', agent, agentName: agent.name, role: agent.role, shortText: summarizeFlowText(response, 'Réponse terminée.'), summary: summarizeFlowText(response, 'Réponse terminée.'), detailText: response, status: 'completed' });
    } catch {
      const fallback = 'Je n’ai pas pu répondre pour le moment. Aucun fichier n’a été modifié.';
      setMessages((current) => current.map((message) => message.id === agentId ? { ...message, text: fallback, status: 'done' } : message));
      upsertFlowStep({ id: agentId, kind: 'agent', agent, agentName: agent.name, role: agent.role, shortText: fallback, summary: 'Aucun fichier n’a été modifié.', detailText: fallback, status: 'completed' });
    } finally {
      setBusy(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    if (busy) {
      setInput('');
      queuedInterruptionsRef.current.push(text);
      setQueuedInterruptions([...queuedInterruptionsRef.current]);
      upsertFlowStep({ id: crypto.randomUUID(), kind: 'user', agentName: profile?.displayName ?? 'Vous', role: 'Relais en attente', shortText: text, summary: 'Votre demande sera injectée entre deux agents.', status: 'appearing' });
      setToolMessage('Message mis en file : il sera transmis au prochain point de relais.');
      return;
    }

    setInput('');
    setShowSlashMenu(false);

    // Interception des slash commands
    if (text.startsWith('/deploy')) {
      setTab('deploy');
      setMessages((m) => [...m, { id: crypto.randomUUID(), author: 'Système', role: 'Système', text: 'Déploiement initialisé. Vérifiez l\'onglet Déploiement.', kind: 'agent', ts: Date.now(), status: 'done' }]);
      return;
    }
    if (text.startsWith('/fix')) {
      setTab('composer');
      const fixPrompt = text.replace('/fix', '').trim() || 'Trouve les erreurs dans mon code et corrige-les.';
      const userMsg: ChatMessage = { id: crypto.randomUUID(), author: profile?.displayName ?? 'Vous', role: 'Vous', text: text, kind: 'user', ts: Date.now() };
      setMessages((m) => [...m, userMsg]);
      runMission("RÉPARATION REQUISE : " + fixPrompt);
      return;
    }

    void routePrompt(text);
  }

  async function uploadAttachments(files: FileList | null) {
    if (!files?.length) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setToolMessage('Supabase n’est pas configuré pour l’import.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setToolMessage('Connectez-vous avant d’importer un fichier.');
      return;
    }
    const selected = Array.from(files).filter((file) => file.size <= 10 * 1024 * 1024);
    if (!selected.length) {
      setToolMessage('Chaque fichier doit faire moins de 10 Mo.');
      return;
    }
    setIsUploading(true);
    try {
      await Promise.all(selected.map(async (file) => {
        const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from('project-assets').upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
      }));
      const names = selected.map((file) => file.name).join(', ');
      setInput((current) => `${current}${current ? '\n\n' : ''}Fichiers joints : ${names}`);
      setToolMessage(`${selected.length} fichier(s) ajouté(s) à la mission.`);
    } catch {
      setToolMessage('Import impossible. Vérifiez votre session et réessayez.');
    } finally {
      setIsUploading(false);
    }
  }

  async function connectGitHub() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setToolMessage('Supabase n’est pas configuré.');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('integration-connect', { body: { provider: 'github' } });
      if (error || !data?.url) throw error ?? new Error('OAuth unavailable');
      window.location.assign(data.url);
    } catch {
      setToolMessage('La connexion GitHub nécessite une session active et les secrets OAuth configurés.');
    }
  }

  function startDictation() {
    if (listening) {
      dictationRecognitionRef.current?.stop();
      return;
    }

    const browserWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionFactory;
      webkitSpeechRecognition?: BrowserSpeechRecognitionFactory;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setToolMessage('La dictée n’est pas prise en charge par ce navigateur. Essayez Chrome ou Edge.');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim();
      setInput((current) => [current, transcript].filter(Boolean).join(current ? ' ' : ''));
    };
    recognition.onend = () => {
      dictationRecognitionRef.current = null;
      setListening(false);
    };
    recognition.onerror = () => {
      dictationRecognitionRef.current = null;
      setListening(false);
      setToolMessage('La dictée a été interrompue. Vérifiez l’autorisation du microphone.');
    };

    try {
      dictationRecognitionRef.current = recognition;
      setToolMessage(null);
      setListening(true);
      recognition.start();
    } catch {
      dictationRecognitionRef.current = null;
      setListening(false);
      setToolMessage('La dictée ne peut pas démarrer. Vérifiez l’autorisation du microphone.');
    }
  }

  function startDemoMode() {
    const demo = createDemoMission(way);
    const missionId = demo.dna.missionId;
    setDemoMode(true);
    setCurrentMissionId(missionId);
    setActiveMissionId(missionId);
    setMissionDNA(missionId, demo.dna);
    setProjectSchema(demo.schema);
    setPreviousSchema(null);
    setMessages([]);
    setFlowSteps([
      { id: `${missionId}:user`, kind: 'user', agentName: 'Idealy Démo', role: 'Mission', shortText: 'Explorer le studio avec une mission locale sans compte.', summary: 'Demande de démonstration reçue.', status: 'completed' },
      { id: `${missionId}:lia`, kind: 'lia', agentName: 'Lia', role: 'Messagère', shortText: `Transmis à ${way.agents[0].name}.`, summary: 'Aucune connexion externe utilisée.', detailText: 'Mode démo activé : aucune session, clé IA ou connexion externe n’est utilisée.', status: 'completed' },
      { id: `${missionId}:orchestrator`, kind: 'agent', agent: way.agents[0], agentName: way.agents[0].name, role: way.agents[0].role, shortText: 'Le brief local est prêt.', summary: 'Passeport de Mission et preuves disponibles.', detailText: 'Le Passeport de Mission et les preuves sont consultables dans l’espace Mission.', status: 'completed' },
      { id: `${missionId}:result`, kind: 'result', agentName: 'Mission', role: 'Résultat', shortText: 'Mission accomplie.', summary: 'Preview locale prête à explorer.', status: 'completed' },
    ]);
    const demoHistory = { id: missionId, title: 'Mission démo sans compte', createdAt: Date.now(), way: wayId, previewReady: true, status: 'ready' as const, validation: demo.dna.validation };
    setMissions([...useIdealyStore.getState().missions.filter((mission) => !mission.id.startsWith('demo-') && mission.title !== 'Mission démo sans compte'), demoHistory]);
    setMissionActivity({ missionId, stage: 'completed' });
    setShowPreview(true);
    setTab('mission');
    setToolMessage('Mode démo local activé. Les données sont fictives et clairement marquées.');
  }

  function proposeChangeCapsule(capsule: ChangeCapsule) {
    if (!currentMissionId) return;
    updateMissionDNA(currentMissionId, (dna) => ({
      ...dna,
      updatedAt: Date.now(),
      capsules: [...(dna.capsules ?? []), capsule].slice(-10),
      passport: dna.passport ? { ...dna.passport, nextAction: 'Examiner la capsule et la validation après la réponse de l’IA.' } : dna.passport,
    }));
    const nextDNA = useIdealyStore.getState().missionDNA[currentMissionId];
    if (projectSchema && nextDNA) {
      updateProjectSchema({
        ...projectSchema,
        capsules: nextDNA.capsules ?? [],
        passport: nextDNA.passport,
        preflight: nextDNA.preflight,
      });
    }
    setToolMessage(`Capsule proposée : ${capsule.summary}`);
  }

  function acceptReviewSchema(nextSchema: IdealyUniversalProjectSchema) {
    setPreviousSchema(projectSchema);
    updateProjectSchema(nextSchema);
    setReviewSchema(null);
    setShowPreview(true);
    setTab('preview');
    if (currentMissionId) {
      updateStoreMission(currentMissionId, { previewReady: true, status: 'ready', validation: nextSchema.validation });
      updateMissionDNA(currentMissionId, (dna) => ({
        ...dna,
        status: 'ready',
        validation: nextSchema.validation ?? dna.validation,
        updatedAt: Date.now(),
        capsules: (dna.capsules ?? []).map((capsule, index, all) => index === all.length - 1 && capsule.status === 'proposed' ? { ...capsule, status: 'applied' as const } : capsule),
      }));
    }
    setToolMessage('Proposition acceptée : la nouvelle version est maintenant montée dans la preview.');
  }

  function rejectReviewSchema() {
    setReviewSchema(null);
    setToolMessage('Proposition rejetée : la version stable est conservée.');
  }

  async function handleSignOut() {
    try {
      await getSupabaseClient()?.auth.signOut();
    } finally {
      signOut();
    }
  }

  async function handleDownload() {
    if (!projectSchema) return;
    setIsDownloading(true);
    try {
      await downloadProjectZip(projectSchema);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  }

  async function runMission(prompt: string, overrideContracts?: MissionContracts, narrativeReady = false) {
    setActiveIntent('EXECUTION');
    stopRequestedRef.current = false;
    setStopRequested(false);
    consumedMissionEnergyRef.current = 0;
    const missionController = new AbortController();
    missionAbortRef.current = missionController;
    const flowRunId = crypto.randomUUID();
    if (!narrativeReady) {
      setFlowSteps((current) => [...current,
        { id: `${flowRunId}:user`, kind: 'user', agentName: profile?.displayName ?? 'Vous', role: 'Mission', shortText: prompt, summary: 'Demande reçue.', status: 'completed' },
        { id: `${flowRunId}:lia`, kind: 'lia', agentName: 'Lia', role: 'Messagère', shortText: `Transmis à ${missionTeam.strategist.name}.`, summary: `Transmis à ${missionTeam.strategist.name}.`, detailText: 'Transmission locale vers l’Orchestrateur de la voie active.', status: 'completed' },
      ]);
    }
    const initialContracts = overrideContracts ?? buildMissionContracts(prompt, way);
    const selectedMissionTeam = selectMissionTeam(way, prompt);
    let missionPrompt = prompt;
    let missionId = currentMissionId;
    if (!missionId) {
      missionId = crypto.randomUUID();
      setCurrentMissionId(missionId);
      const newMission = {
        id: missionId,
        title: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
        createdAt: Date.now(),
        way: wayId,
        previewReady: false,
        status: 'draft' as const,
      };
      const initialDNA = createMissionDNA(missionId, prompt, way, initialContracts);
      addMission(newMission);
      setActiveMissionId(missionId);
      setMissionDNA(missionId, initialDNA);
      getSupabaseClient()?.from('missions').insert([{
        id: newMission.id,
        user_id: (await getSupabaseClient()?.auth.getUser())?.data.user?.id,
        title: newMission.title,
        created_at: newMission.createdAt,
        way: newMission.way,
        preview_ready: newMission.previewReady,
        status: newMission.status,
        brief: initialContracts.brief,
        contracts: initialContracts,
        dna: initialDNA,
        snapshots: [],
      }]).then();
    }

    if (missionId && !missionDNA[missionId]) {
      setMissionDNA(missionId, createMissionDNA(missionId, prompt, way, initialContracts));
    }
    if (missionId && projectSchema) {
      updateMissionDNA(missionId, (dna) => appendSnapshot(
        dna,
        createMissionSnapshot(projectSchema, 'Dernière version stable', 'restore-point'),
        dna.status,
        dna.validation,
      ));
    }
    if (missionId) {
      updateStoreMission(missionId, { status: 'building' });
      updateMissionDNA(missionId, (dna) => ({ ...dna, status: 'building', updatedAt: Date.now() }));
    }

    // Save current schema as "previous" before generating a new one (for Composer diff)
    setPreviousSchema(projectSchema);
    setBusy(true);
    const orchestrator = selectedMissionTeam.strategist;
    const builder = selectedMissionTeam.builder;

    const addMessage = (agent: (typeof way.agents)[number], text: string, status: ChatMessage['status'] = 'done'): string => {
      const id = crypto.randomUUID();
      setMessages((m) => [
        ...m,
        {
          id,
          agentId: agent.id,
          author: agent.name,
          role: agent.role,
          text,
          kind: 'agent',
          channel: 'execution',
          ts: Date.now(),
          status,
        },
      ]);
      return id;
    };

    const updateMessage = (id: string, newText: string, status: ChatMessage['status']) => {
      setMessages((m) => m.map(msg => msg.id === id ? { ...msg, text: newText, status } : msg));
    };

    if (energy.current <= 0) {
      addMessage(orchestrator, `Désolé, nous sommes à court de ${way.energyUnit.toLowerCase()} pour aujourd'hui. L'équipe a besoin de se reposer. Passez au rang supérieur pour continuer la mission ou revenez demain !`, 'done');
      setBusy(false);
      return;
    }

    try {
      if (missionId) {
        setMissionActivity({ missionId, stage: 'planning' });
        void streamAgentUI({ missionId, phase: 'planning', progress: 8 }).catch(() => undefined);
      }
      // 1. Orchestrator Phase
      const msgId = addMessage(orchestrator, '', 'thinking');
      const orchestratorFlowId = `${flowRunId}:orchestrator`;
      upsertFlowStep({ id: orchestratorFlowId, kind: 'agent', agent: orchestrator, agentName: orchestrator.name, role: orchestrator.role, shortText: 'Analyse du plan de mission.', indicator: { kind: 'thinking' }, status: 'active' });
      const context = await analyzeIntent(prompt, way);
      const architectureContext = createArchitectureContext(projectSchema?.project.files, prompt);
      context.architecture = architectureContext.architecture;
      context.relevantFiles = architectureContext.relevantFiles;
      context.missionId = missionId ?? undefined;
      context.contracts = initialContracts;
      if (missionId) {
        updateMissionDNA(missionId, (dna) => ({
          ...dna,
          updatedAt: Date.now(),
          passport: dna.passport ? {
            ...dna.passport,
            rank: context.rank,
            objective: initialContracts.brief.primaryOutcome,
            nextAction: `Lancer l’escouade de rang ${context.rank}, puis examiner le preflight.`,
          } : dna.passport,
        }));
      }
      const rankIndex = Math.max(0, way.ranks.indexOf(context.rank));
      const requiredLevel = rankIndex >= 4 ? 'Jonin' : rankIndex >= 2 ? 'Chunin' : 'Genin';
      const kageAnnouncement = `Mission rang ${context.rank}. Niveau requis : ${requiredLevel}. Coût estimé : ${context.energyCost}% de ${way.energyUnit.toLowerCase()}. J'appelle l'équipe selon les compétences.`;
      upsertFlowStep({ id: orchestratorFlowId, kind: 'agent', agent: orchestrator, agentName: orchestrator.name, role: orchestrator.role, shortText: kageAnnouncement, summary: `Compétences requises : ${selectedMissionTeam.requiredSkills.join(', ')}.`, status: 'active' });
      if (rankIndex >= 1 && !subscription) {
        upsertFlowStep({
          id: `${flowRunId}:access`,
          kind: 'system',
          agentName: 'Accès mission',
          role: 'Choix utilisateur',
          shortText: `Cette mission mobilise des compétences de rang ${context.rank}. Vous pouvez continuer avec l'équipe gratuite ou débloquer les Jonin.`,
          status: 'active',
          action: { label: 'Débloquer les Jonin →', onClick: () => setIsPaywallOpen(true) },
        });
      }
      useIdealyStore.getState().consumeEnergy(context.energyCost);
      consumedMissionEnergyRef.current = context.energyCost;
      activeMissionIdRef.current = missionId;

      const summonedAgents = [selectedMissionTeam.strategist, selectedMissionTeam.builder, selectedMissionTeam.validator, selectedMissionTeam.optimizer, ...selectedMissionTeam.supporting].filter((agent): agent is (typeof way.agents)[number] => Boolean(agent));
      for (const agent of summonedAgents) {
        upsertFlowStep({ id: `${flowRunId}:summon:${agent.id}`, kind: 'agent', agent, agentName: agent.name, role: agent.role, shortText: 'Oui chef !', summary: 'Agent convoqué selon les compétences.', status: 'appearing', indent: true });
      }
      if (!shouldReduceMotion) await new Promise((resolve) => window.setTimeout(resolve, 320));
      for (const agent of summonedAgents) {
        upsertFlowStep({ id: `${flowRunId}:summon:${agent.id}`, kind: 'agent', agent, agentName: agent.name, role: agent.role, shortText: 'En relais séquentiel.', summary: 'L’agent attend son point de relais.', status: 'completed', indent: true });
      }

      const firstRelay = takeQueuedInterruption();
      if (firstRelay) {
        missionPrompt = `${prompt}\\n\\nRelais utilisateur à intégrer : ${firstRelay}`;
        context.prompt = missionPrompt;
        upsertFlowStep({ id: `${flowRunId}:relay:strategy`, kind: 'user', agentName: profile?.displayName ?? 'Vous', role: 'Relais transmis', shortText: firstRelay, summary: 'Injecté avant le relais vers le Bâtisseur.', status: 'completed' });
      }
      const orchestratorStream = await streamAgentMessage(
        orchestrator,
        way,
        `Mission: ${missionPrompt}\\nComplexité estimée: ${context.rank}`,
        missionPrompt,
        `Analyse le plan global. Appelle explicitement le développeur (${builder.name}) pour la suite.`,
        context.architecture,
        context.relevantFiles,
        missionId ? `${missionId}:strategy` : undefined,
        'EXECUTION',
        missionController.signal,
      );

      let orchestratorText = '';
      for await (const delta of orchestratorStream.textStream) {
        orchestratorText += delta;
        updateMessage(msgId, orchestratorText, 'writing');
      }
      updateMessage(msgId, orchestratorText, 'done');
      upsertFlowStep({ id: orchestratorFlowId, kind: 'agent', agent: orchestrator, agentName: orchestrator.name, role: orchestrator.role, shortText: summarizeFlowText(orchestratorText, 'Plan de mission établi.'), summary: 'Plan de mission établi.', detailText: orchestratorText, status: 'completed' });

      // 2. Builder Phase
      if (missionId) {
        setMissionActivity({ missionId, stage: 'building' });
        void streamAgentUI({ missionId, phase: 'building', progress: 18 }).catch(() => undefined);
      }
      const builderId = addMessage(builder, '', 'thinking');
      const builderFlowId = `${flowRunId}:builder`;
      upsertFlowStep({ id: builderFlowId, kind: 'agent', agent: builder, agentName: builder.name, role: builder.role, shortText: 'Préparation des fichiers.', indicator: { kind: 'thinking' }, status: 'active', indent: true });
      const secondRelay = takeQueuedInterruption();
      if (secondRelay) {
        missionPrompt = `${missionPrompt}\\n\\nRelais utilisateur à intégrer avant l’écriture : ${secondRelay}`;
        context.prompt = missionPrompt;
        upsertFlowStep({ id: `${flowRunId}:relay:builder`, kind: 'user', agentName: profile?.displayName ?? 'Vous', role: 'Relais transmis', shortText: secondRelay, summary: 'Injecté avant l’écriture des fichiers.', status: 'completed' });
      }
      const builderStream = await streamAgentMessage(
        builder,
        way,
        `Plan de l’architecte: ${orchestratorText}`,
        missionPrompt,
        'Tu construis les composants. Décris brièvement le chantier et retourne une version complète prête à être exécutée dans le terminal.',
        context.architecture,
        context.relevantFiles,
        missionId ? `${missionId}:builder` : undefined,
        'EXECUTION',
        missionController.signal,
      );

      let builderText = '';
      for await (const delta of builderStream.textStream) {
        builderText += delta;
        updateMessage(builderId, builderText, 'writing');
        upsertFlowStep({ id: builderFlowId, kind: 'agent', agent: builder, agentName: builder.name, role: builder.role, shortText: summarizeFlowText(builderText, 'Je génère les fichiers du projet…'), indicator: { kind: 'thinking' }, detailText: builderText, status: 'active', indent: true });
      }
      upsertFlowStep({ id: builderFlowId, kind: 'agent', agent: builder, agentName: builder.name, role: builder.role, shortText: summarizeFlowText(builderText, 'Fichiers du projet générés.'), summary: 'Première version du projet assemblée.', detailText: builderText, status: 'completed', indent: true });

      // Self-correction terminalisée : une génération, un build/typecheck, puis au plus deux corrections ciblées.
      setGenerationProgress(0);
      const terminalFlowId = `${flowRunId}:terminal`;
      upsertFlowStep({ id: terminalFlowId, kind: 'agent', agent: selectedMissionTeam.validator, agentName: selectedMissionTeam.validator.name, role: 'Validation terminalisée', shortText: 'Le terminal vérifie le projet…', indicator: { kind: 'thinking' }, status: 'active', indent: true });
      const terminalLog: string[] = [];
      const appendTerminalLog = (line: string) => {
        terminalLog.push(line);
        const visibleLog = terminalLog.slice(-40).join('');
        updateMessage(builderId, `${builderText}\n\n${visibleLog}`, 'writing');
      };
      const finalRelay = takeQueuedInterruption();
      if (finalRelay) {
        missionPrompt = `${missionPrompt}\\n\\nDernier relais utilisateur : ${finalRelay}`;
        context.prompt = missionPrompt;
        upsertFlowStep({ id: `${flowRunId}:relay:validation`, kind: 'user', agentName: profile?.displayName ?? 'Vous', role: 'Relais transmis', shortText: finalRelay, summary: 'Injecté avant la validation terminalisée.', status: 'completed' });
      }
      const selfCorrection = await buildWithSelfCorrection(
        context,
        {
          signal: missionController.signal,
          onFileCreated: (path) => upsertFlowStep({ id: builderFlowId, kind: 'agent', agent: builder, agentName: builder.name, role: builder.role, shortText: `Création de ${path}…`, indicator: { kind: 'file', path }, detailText: builderText, status: 'active', indent: true }),
          onProgress: (tokens) => {
            // ~8000 max tokens par tour, sans dépasser 95 % avant le preflight.
            setGenerationProgress(Math.min(95, Math.round((tokens / 8000) * 100)));
          },
          onLog: appendTerminalLog,
        },
      );
      const schema = selfCorrection.schema;
      setGenerationProgress(100);
      const terminalSummary = selfCorrection.status === 'passed'
        ? `✅ Self-Correction terminalisée réussie en ${selfCorrection.attempts.length} tour(s).`
        : selfCorrection.status === 'needs-fix'
          ? `⛔ Trois tours de self-correction atteints ; la validation déterministe reste la source de vérité.`
          : `⚠️ WebContainer indisponible ; validation déterministe exécutée sans prétendre qu’un build terminal a réussi.`;
      updateMessage(builderId, `${builderText}\n\n${terminalSummary}`, 'done');
      upsertFlowStep({ id: terminalFlowId, kind: 'agent', agent: selectedMissionTeam.validator, agentName: selectedMissionTeam.validator.name, role: 'Validation terminalisée', shortText: terminalSummary, summary: terminalSummary, detailText: terminalLog.slice(-12).join(''), status: 'completed', indent: true });

      const validation = validateGeneratedProject(schema, context.contracts);
      const status = validation.status === 'failed' ? 'needs-fix' : 'ready';
      const baseSnapshot = createMissionSnapshot(schema, validation.status === 'passed' ? 'Version validée' : 'Version à corriger', 'generation', validation);
      const currentDNA = missionId ? useIdealyStore.getState().missionDNA[missionId] : undefined;
      const terminalPreflight = {
        status: selfCorrection.status,
        attempts: selfCorrection.attempts.length,
        command: selfCorrection.attempts.at(-1)?.validation.command,
        output: selfCorrection.attempts.at(-1)?.validation.output,
      } as const;
      const preflight = buildPreflightProofs(schema, validation, currentDNA?.snapshots ?? [baseSnapshot], terminalPreflight);
      const enrichedSchema = schema ? {
        ...schema,
        contracts: context.contracts,
        validation,
        preflight,
        capsules: currentDNA?.capsules ?? [],
        passport: currentDNA?.passport,
        snapshotId: baseSnapshot.id,
      } : null;
      const snapshot = enrichedSchema ? { ...baseSnapshot, schema: enrichedSchema } : baseSnapshot;
      if (enrichedSchema) setReviewSchema(enrichedSchema);
      if (missionId) {
        updateStoreMission(missionId, {
          previewReady: Boolean(schema && validation.status !== 'failed'),
          status,
          validation,
        });
        updateMissionDNA(missionId, (dna) => {
          const capsules = (dna.capsules ?? []).map((capsule, index, all) => index === all.length - 1 && capsule.status === 'proposed' ? { ...capsule, status: 'applied' as const } : capsule);
          return appendSnapshot({ ...dna, capsules }, snapshot, status, validation);
        });
        const latestDNA = useIdealyStore.getState().missionDNA[missionId];
        getSupabaseClient()?.from('missions').update({
          status,
          validation,
          snapshots: latestDNA?.snapshots ?? [snapshot],
          dna: latestDNA,
          preview_ready: validation.status !== 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', missionId).then();
      }

      // 3. Validation déterministe finale — aucun appel LLM supplémentaire.
      if (missionId) {
        setMissionActivity({ missionId, stage: 'validating' });
        void streamAgentUI({ missionId, phase: 'validating', progress: 92 }).catch(() => undefined);
      }
      if (enrichedSchema) {
        setReviewSchema(enrichedSchema);
        setShowPreview(true);
        setCodePanelOpen(true);
        setTab('code');
        if (missionId) {
          updateStoreMission(missionId, { previewReady: validation.status !== 'failed' });
        }

        const issueSummary = validation.issues.length > 0
          ? validation.issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ''}`).join('\\n')
          : 'Aucune issue détectée.';
        updateMessage(builderId, validation.status === 'failed'
          ? `${builderText}\\n\\n${terminalSummary}\\n\\nIssues déterministes :\\n${issueSummary}\\n\\nUtilisez « Corriger avec ces issues » dans l’onglet Mission.`
          : `${builderText}\\n\\n${terminalSummary}\\n\\nRapport déterministe : ${validation.status}.\\n${issueSummary}`, 'done');
        setToolMessage(terminalSummary);
        if (missionId) {
          const finalStage = validation.status === 'failed' ? 'needs-fix' : 'completed';
          setMissionActivity({ missionId, stage: finalStage });
          void streamAgentUI({ missionId, phase: finalStage, progress: finalStage === 'completed' ? 100 : 92 }).catch(() => undefined);
          upsertFlowStep({ id: `${flowRunId}:result`, kind: 'result', agentName: 'Mission', role: 'Résultat', shortText: finalStage === 'completed' ? 'Mission accomplie.' : 'La mission nécessite une correction.', summary: validation.status === 'failed' ? `${validation.issues.length} issue(s) déterministe(s) à examiner.` : 'Preview, code et preuves prêts à examiner.', detailText: issueSummary, status: 'completed' });
        }
      } else {
        upsertFlowStep({ id: `${flowRunId}:result`, kind: 'result', agentName: 'Mission', role: 'Résultat', shortText: 'Aucun projet exploitable n’a été généré.', summary: 'La mission doit être relancée après correction.', status: 'completed' });
        if (missionId) {
          setMissionActivity({ missionId, stage: 'needs-fix' });
          void streamAgentUI({ missionId, phase: 'needs-fix', progress: 92 }).catch(() => undefined);
        }
        updateMessage(builderId, `${builderText}\\n\\n${terminalSummary}\\n\\nAucun projet exploitable n’a été généré.`, 'done');
      }

    } catch (error) {
      const interrupted = stopRequestedRef.current || (error instanceof DOMException && error.name === 'AbortError');
      if (interrupted) {
        setToolMessage('Mission arrêtée proprement. La dernière version stable est conservée.');
      } else {
        console.error(error);
      }
      if (!interrupted && missionId) {
        updateStoreMission(missionId, { status: 'needs-fix' });
        updateMissionDNA(missionId, (dna) => ({
          ...dna,
          status: 'needs-fix',
          updatedAt: Date.now(),
          capsules: (dna.capsules ?? []).map((capsule, index, all) => index === all.length - 1 && capsule.status === 'proposed' ? { ...capsule, status: 'failed' as const } : capsule),
          passport: dna.passport ? { ...dna.passport, nextAction: 'La version stable est conservée ; corriger la capsule puis relancer la validation.' } : dna.passport,
        }));
        setMissionActivity({ missionId, stage: 'needs-fix' });
        void streamAgentUI({ missionId, phase: 'needs-fix', progress: 0 }).catch(() => undefined);
      }
      if (!interrupted) {
        const failure = 'Erreur lors de la communication. La version stable précédente est conservée.';
        addMessage(orchestrator, failure, 'done');
        upsertFlowStep({ id: `${flowRunId}:result`, kind: 'result', agentName: 'Mission', role: 'Résultat', shortText: failure, summary: 'Aucun fichier n’a été modifié.', detailText: failure, status: 'completed' });
      }
    }

    if (missionAbortRef.current === missionController) missionAbortRef.current = null;
    if (activeMissionIdRef.current === missionId) activeMissionIdRef.current = null;
    consumedMissionEnergyRef.current = 0;
    setStopRequested(false);
    setBusy(false);
  }

  const energyPct = Math.round((energy.current / energy.max) * 100);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && !focusMode && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 overflow-hidden border-r border-white/5 bg-ink-900/40"
          >
            <div className="flex h-full w-[264px] flex-col">
              {/* Workspace switcher */}
              <div className="p-3">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex w-full items-center gap-2 rounded-xl glass-soft px-3 py-2.5 text-left transition hover:bg-white/5"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold text-ink-950"
                    style={{ background: `hsl(${profile?.avatarHue ?? 200} 70% 60%)` }}
                  >
                    {(profile?.displayName ?? 'I')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {profile?.displayName ?? 'Invité'}
                    </div>
                    <div className={`truncate text-xs ${way.textClass}`}>
                      {way.grades[0]} · {way.name}
                    </div>
                  </div>
                  <ChevronDown size={15} className="text-ink-400" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-2 rounded-xl glass p-1.5"
                    >
                      <MenuItem icon={Crown} label="Passer supérieur" accent onClick={() => { setIsPaywallOpen(true); setMenuOpen(false); }} />
                      <MenuItem icon={Settings} label="Paramètres" onClick={() => { setIsSettingsOpen(true); setMenuOpen(false); }} />
                      <MenuItem icon={LogOut} label="Se déconnecter" onClick={() => void handleSignOut()} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* New mission */}
              <div className="px-3">
                <button
                  className="btn-primary w-full justify-center"
                  onClick={() => {
                    setCurrentMissionId(null);
                    setActiveMissionId(null);
                    setPendingBrief(null);
                    setProjectSchema(null);
                    setReviewSchema(null);
                    setPreviousSchema(null);
                    setMessages([]);
                    clearMissionFlow();
                    setMissionActivity(null);
                    setShowPreview(false);
                    setInput('');
                  }}
                >
                  <Plus size={16} />
                  Nouvelle mission
                </button>
              </div>

              {/* Nav */}
              <nav className="mt-4 space-y-0.5 px-2 text-sm">
                <NavItem icon={Sparkles} label="Missions" active />
                <NavItem icon={Eye} label="Aperçus" />
                <NavItem icon={ScrollText} label="Activité" />
                <NavItem icon={Plug} label="Connecteurs" />
              </nav>

              <div className="mx-3 my-3 h-px bg-white/5" />

              {/* Gamification Area */}
              <div
                className="mt-6 space-y-4 cursor-pointer hover:opacity-90 transition-opacity px-3"
                onClick={() => setIsPaywallOpen(true)}
              >
                <div className="rounded-xl border border-white/5 bg-ink-950/50 p-4">
                  <div className="flex items-center gap-2 text-ember-400 mb-2">
                    <Crown size={16} />
                    <span className="text-xs font-semibold">Passer Pro</span>
                  </div>
                  <p className="text-[11px] text-ink-400">Accédez à des agents spécialisés et illimités.</p>
                </div>
              </div>

              {/* Recent missions */}
              <div className="px-3 mt-4">
                <div className="mb-2 px-1 text-xs font-medium text-ink-400">
                  Missions récentes
                </div>
                <div className="space-y-0.5 max-h-[150px] overflow-y-auto scrollbar-thin">
                  {missions.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-ink-500">Aucune mission</div>
                  ) : (
                    missions.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setCurrentMissionId(m.id); setActiveMissionId(m.id); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/5 ${currentMissionId === m.id ? 'bg-white/10 text-white' : 'text-ink-300 hover:text-white'}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${m.previewReady ? 'bg-emerald-500' : 'bg-ink-500'}`} />
                        <span className="truncate">{m.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Energy + upgrade */}
              <div className="mt-auto p-3">
                <div className="card p-3.5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-ink-300">{way.energy}</span>
                    <span className="text-ink-400">{energy.current}/{energy.max}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className={`h-full rounded-full ${way.primaryClass}`}
                      animate={{ width: `${energyPct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="mt-2.5 text-[11px] text-ink-400">
                    Se réinitialise chaque jour. Passez supérieur pour plus de {way.energyUnit}.
                  </p>
                  <button onClick={() => setIsPaywallOpen(true)} className="btn-outline mt-3 w-full justify-center text-xs">
                    <Crown size={13} />
                    Passer supérieur
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-lg p-2 text-ink-300 transition hover:bg-white/5 hover:text-white"
              title={sidebarOpen ? 'Réduire' : 'Agrandir'}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            {!sidebarOpen && <Logo size={24} />}
            <div className="hidden items-center gap-2 text-sm text-ink-400 md:flex">
              <span className={way.textClass}>{way.name}</span>
              <span className="text-ink-600">·</span>
              <span>{missions.find(m => m.id === currentMissionId)?.title ?? 'Mission sans titre'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showPreview && (
              <button
                onClick={() => setFocusMode((open) => !open)}
                aria-pressed={focusMode}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${focusMode ? `bg-white/10 ${way.textClass}` : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}
                title={focusMode ? 'Quitter le Focus Mode (Ctrl+B)' : 'Focus Mode (Ctrl+B)'}
              >
                {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="hidden lg:inline">{focusMode ? 'Quitter le focus' : 'Focus'}</span>
              </button>
            )}
            <button className="rounded-lg p-2 text-ink-300 transition hover:bg-white/5 hover:text-white" title="Notifications">
              <Bell size={17} />
            </button>
            <button className="btn-outline text-xs">
              <Zap size={13} />
              {way.energy} {energy.current}
            </button>
          </div>
        </header>

        {/* Body: MissionFlow narratif + Canvas */}
        <div className="flex min-h-0 flex-1">
          <main className={`relative flex min-w-0 flex-1 flex-col ${showPreview && !focusMode ? 'lg:w-[34%]' : 'w-full'}`}>
            {pendingBrief && (
              <div className="shrink-0 border-b border-white/5 bg-ink-950/40 p-4">
                <MissionBriefPanel
                  way={way}
                  prompt={pendingBrief.prompt}
                  contracts={pendingBrief.contracts}
                  onCancel={() => setPendingBrief(null)}
                  onConfirm={(contracts) => {
                    const brief = pendingBrief;
                    setPendingBrief(null);
                    void runMission(brief.prompt, contracts, true);
                  }}
                />
              </div>
            )}

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              <div className="mx-auto min-h-full w-full max-w-3xl px-5 py-4">
                <MissionFlow
                  steps={flowSteps}
                  way={way}
                  emptyState={(
                    <EmptyState
                      way={way}
                      name={profile?.displayName ?? 'apprenti'}
                      demoMode={demoMode}
                      onSelectDemo={startDemoMode}
                      onSelectSuggestion={(suggestion) => {
                        setInput(suggestion);
                        composerRef.current?.focus();
                      }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Barre de commande persistante : aucune conversation n’est rendue ici. */}
            <div className="sticky bottom-0 z-20 shrink-0 border-t border-white/5 bg-ink-900/90 p-4 backdrop-blur-xl">
              <div className="mx-auto max-w-3xl">
                <div className="relative rounded-2xl border border-white/8 bg-ink-950/80 p-3 shadow-2xl">
                  <AnimatePresence>
                    {showSlashMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-white/10 bg-ink-950/95 py-1.5 shadow-2xl backdrop-blur-xl"
                      >
                        <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Commandes</div>
                        {SLASH_COMMANDS.filter((command) => command.cmd.startsWith(input.toLowerCase()) || input === '/').map((command) => (
                          <button key={command.cmd} onClick={() => { setInput(`${command.cmd} `); setShowSlashMenu(false); }} className="flex w-full items-start gap-3 px-3 py-2 text-left transition hover:bg-white/5">
                            <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-electric-400">{command.label}</span>
                            <span className="text-xs text-ink-400">{command.desc}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <textarea
                    ref={composerRef}
                    value={input}
                    onChange={(event) => {
                      const value = event.target.value;
                      setInput(value);
                      setShowSlashMenu(value === '/' || (value.startsWith('/') && !value.includes(' ')));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') { setShowSlashMenu(false); return; }
                      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
                    }}
                    placeholder={`Décrivez votre ${way.vocab.task.toLowerCase()}... ou tapez / pour les commandes`}
                    rows={1}
                    className="max-h-40 min-h-[2.5rem] w-full resize-none bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none scrollbar-thin"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <IconBtn icon={Paperclip} title="Ajouter un fichier" onClick={() => attachmentRef.current?.click()} />
                      <IconBtn icon={ImageIcon} title="Ajouter une image" onClick={() => attachmentRef.current?.click()} />
                      <IconBtn icon={Figma} title="Figma" onClick={() => { setTab('connectors'); setToolMessage('La connexion Figma sera disponible après la configuration OAuth Figma.'); }} />
                      <IconBtn icon={Github} title="Connecter GitHub" onClick={connectGitHub} />
                      <button
                        type="button"
                        onClick={startDictation}
                        aria-pressed={listening}
                        aria-label={listening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
                        title={listening ? 'Arrêter la dictée' : 'Dicter votre mission'}
                        className={`relative inline-flex h-9 w-9 items-center justify-center overflow-visible rounded-lg p-2 transition focus:outline-none focus:ring-2 focus:ring-white/30 ${listening ? dictationTheme.active : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {listening && !shouldReduceMotion && <motion.span aria-hidden="true" className={`pointer-events-none absolute -inset-1 rounded-xl border ${dictationTheme.ring}`} initial={{ opacity: 0.75, scale: 0.82 }} animate={{ opacity: 0, scale: 1.35 }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }} />}
                        <span className={`absolute inset-0 flex items-center justify-center gap-[2px] transition-opacity ${listening ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
                          {[0, 1, 2, 3].map((bar) => <motion.span key={bar} className={`h-3 w-[2px] rounded-full ${dictationTheme.wave}`} style={{ transformOrigin: 'center' }} animate={listening && !shouldReduceMotion ? { scaleY: [0.45, 1, 0.55, 0.85, 0.45] } : { scaleY: 0.45 }} transition={{ duration: 0.72, delay: bar * 0.09, repeat: listening && !shouldReduceMotion ? Infinity : 0, ease: 'easeInOut' }} />)}
                        </span>
                        <Mic size={16} className={`transition-opacity ${listening ? 'opacity-0' : 'opacity-100'}`} />
                      </button>
                      <input ref={attachmentRef} type="file" multiple className="hidden" onChange={(event) => uploadAttachments(event.target.files)} />
                    </div>
                    {busy ? (
                      <button type="button" onClick={() => { void stopMission(); }} className="inline-flex items-center gap-2 rounded-xl border border-red-300/30 bg-red-400/10 px-3.5 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-400/20" title="Arrêter la mission">
                        <Square size={13} fill="currentColor" /> Stop
                      </button>
                    ) : (
                      <button onClick={send} disabled={!input.trim() || Boolean(pendingBrief)} className="btn-primary px-3.5"><Send size={15} /></button>
                    )}
                  </div>
                </div>
                {queuedInterruptions.length > 0 && <p role="status" className="mt-2 text-xs text-amber-200">{queuedInterruptions.length} message{queuedInterruptions.length > 1 ? 's' : ''} en attente du prochain relais.</p>}
                {listening && <p role="status" aria-live="polite" className={`mt-2 flex items-center gap-2 text-xs ${way.textClass}`}><span className={`h-1.5 w-1.5 rounded-full ${dictationTheme.wave} motion-safe:animate-pulse`} aria-hidden="true" />{dictationTheme.label} — parlez, puis appuyez à nouveau sur le micro pour arrêter.</p>}
                {toolMessage && <p role="status" className={`mt-2 text-xs ${way.textClass}`}>{isUploading ? 'Import en cours…' : toolMessage}</p>}
                <p className="mt-2 text-center text-[11px] text-ink-500">Idealy peut se tromper. Vérifiez le code généré.</p>
              </div>
            </div>
          </main>

          {/* Canvas central : l’aperçu est la surface principale, le code reste latéral. */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                layout
                layoutId="idealy-canvas"
                initial={{ width: 0, opacity: 0, scale: 0.98 }}
                animate={{ width: focusMode ? '100%' : '66%', opacity: 1, scale: 1 }}
                exit={{ width: 0, opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.8 }}
                className={`hidden min-w-0 shrink-0 border-l ${way.borderClass} bg-ink-900/30 md:block`}
                style={{ minWidth: focusMode ? 0 : 520 }}
              >
                <div className="flex h-full min-w-0 flex-col" data-focus-mode={focusMode ? 'true' : 'false'}>
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${way.bgClass} ${way.textClass}`}><Eye size={14} /></div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white">Canvas central</p>
                        <p className="text-[10px] text-ink-500">Prévisualisation live de l’application</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCodePanelOpen((open) => !open)}
                        aria-pressed={codePanelOpen}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${codePanelOpen ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        {codePanelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
                        Code
                      </button>
                      <button
                        onClick={() => setTerminalOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-ink-400 transition hover:bg-white/5 hover:text-white"
                      >
                        <Terminal size={13} />
                        Terminal
                        <kbd className="hidden rounded border border-white/10 px-1 text-[9px] text-ink-500 lg:inline">Ctrl+~</kbd>
                      </button>
                      {projectSchema && (
                        <button
                          onClick={handleDownload}
                          disabled={isDownloading}
                          title="Télécharger le projet (.zip)"
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-ink-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                        >
                          {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          <span className="hidden lg:block">ZIP</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <ResizablePanelGroup direction="horizontal">
                      {codePanelOpen && (
                        <>
                          <ResizablePanel defaultSize={31} minSize={20} maxSize={45} collapsible collapsedSize={0} className="min-w-0">
                            <RightPanelContent
                              tab="code"
                              way={way}
                              schema={reviewSchema ?? projectSchema}
                              baseSchema={projectSchema}
                              reviewMode={Boolean(reviewSchema)}
                              previousSchema={previousSchema}
                              missionId={currentMissionId}
                              dna={currentMissionId ? missionDNA[currentMissionId] ?? null : null}
                              onUpdateSchema={updateProjectSchema}
                              onRestore={restoreMissionSnapshot}
                              onFix={repairMission}
                              onAskAI={(prompt, intent) => void routePrompt(prompt, intent)}
                              onProposeChange={proposeChangeCapsule}
                              onAcceptReview={acceptReviewSchema}
                              onRejectReview={rejectReviewSchema}
                              onUpdateReview={setReviewSchema}
                              onCrashFix={(logs) => runMission(`RÉPARATION DE CRASH WEBContainer\n\nAnalyse cette anomalie réelle puis propose une correction complète. Ne modifie aucun fichier avant validation utilisateur.\n\nLogs bruts :\n${logs.slice(-6000)}`)}
                            />
                          </ResizablePanel>
                          <ResizableHandle withHandle />
                        </>
                      )}
                      <ResizablePanel defaultSize={codePanelOpen ? 69 : 100} minSize={55} className="min-w-0">
                        <RightPanelContent
                          tab="preview"
                          way={way}
                          schema={projectSchema}
                          baseSchema={projectSchema}
                          reviewMode={false}
                          previousSchema={previousSchema}
                          missionId={currentMissionId}
                          dna={currentMissionId ? missionDNA[currentMissionId] ?? null : null}
                          onUpdateSchema={updateProjectSchema}
                          onRestore={restoreMissionSnapshot}
                          onFix={repairMission}
                          onAskAI={(prompt, intent) => void routePrompt(prompt, intent)}
                          onProposeChange={proposeChangeCapsule}
                          onCrashFix={(logs) => runMission(`RÉPARATION DE CRASH WEBContainer\n\nAnalyse cette anomalie réelle puis propose une correction complète. Ne modifie aucun fichier avant validation utilisateur.\n\nLogs bruts :\n${logs.slice(-6000)}`)}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Drawer open={terminalOpen} onOpenChange={setTerminalOpen}>
        <DrawerContent className="h-[min(70vh,560px)] border-white/10 bg-ink-950 text-white">
          <DrawerHeader className="border-b border-white/5 px-5 py-3">
            <DrawerTitle className="flex items-center gap-2 text-sm text-white"><Terminal size={16} className="text-emerald-300" /> Terminal de mission</DrawerTitle>
            <DrawerDescription className="text-xs text-ink-400">Les commandes de validation et les diagnostics réels apparaissent ici. Raccourci : Ctrl+~.</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <TerminalComponent />
          </div>
        </DrawerContent>
      </Drawer>
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </div>
  );
}

function EmptyState({
  way,
  name,
  demoMode,
  onSelectDemo,
  onSelectSuggestion,
}: {
  way: (typeof WAYS)[WayId];
  name: string;
  demoMode?: boolean;
  onSelectDemo?: () => void;
  onSelectSuggestion?: (suggestion: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`mb-6 h-16 w-16 rounded-2xl ${way.primaryClass} flex items-center justify-center`}
      >
        <Sparkles size={28} className="text-ink-950" />
      </motion.div>
      <h2 className="text-2xl font-semibold text-white">
        {name}, que voulons-nous construire aujourd'hui ?
      </h2>
      <p className="mt-3 max-w-md text-ink-300">
        Décrivez votre idée. L'escouade {way.agents[0].name}, {way.agents[1].name} et{' '}
        {way.agents[2].name} se charge du reste.
      </p>
      {!demoMode && (
        <button onClick={onSelectDemo} className="mt-6 rounded-xl border border-electric-300/30 bg-electric-300/10 px-4 py-3 text-sm font-semibold text-electric-100 transition hover:bg-electric-300/20">
          Explorer la démo sans compte
        </button>
      )}
      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelectSuggestion?.(s)}
            className="rounded-xl glass-soft px-4 py-3 text-left text-sm text-ink-200 transition hover:bg-white/5 hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function RightPanelContent({
  tab,
  way,
  schema,
  baseSchema,
  reviewMode,
  previousSchema,
  missionId,
  dna,
  onUpdateSchema,
  onRestore,
  onFix,
  onAskAI,
  onProposeChange,
  onAcceptReview,
  onRejectReview,
  onUpdateReview,
  onCrashFix,
}: {
  tab: RightTab;
  way: (typeof WAYS)[WayId];
  schema: IdealyUniversalProjectSchema | null;
  baseSchema: IdealyUniversalProjectSchema | null;
  reviewMode: boolean;
  previousSchema: IdealyUniversalProjectSchema | null;
  missionId: string | null;
  dna: import('@/core/mission/contracts').MissionDNA | null;
  onUpdateSchema: (schema: IdealyUniversalProjectSchema | null) => void;
  onRestore: (snapshot: import('@/core/mission/contracts').MissionSnapshot) => void;
  onFix: () => void;
  onAskAI?: (prompt: string, intent?: CodeActionIntent) => void;
  onProposeChange?: (capsule: ChangeCapsule) => void;
  onAcceptReview?: (schema: IdealyUniversalProjectSchema) => void;
  onRejectReview?: () => void;
  onUpdateReview?: (schema: IdealyUniversalProjectSchema | null) => void;
  onCrashFix?: (logs: string) => void | Promise<void>;
}) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const files = schema?.project?.files ?? {};
  const hasFiles = Object.keys(files).length > 0;

  const selectedContent = selectedFilePath ? files[selectedFilePath] : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className={tab === 'preview' ? 'h-full flex flex-col' : 'hidden'}>
        {hasFiles ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5">
              <Terminal size={12} className="text-primary" />
              <span className="text-xs text-ink-300 ml-1">WebContainer</span>
              <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${way.bgClass} ${way.textClass}`}>Live</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <WebContainerPreview schema={schema} way={way} className="h-full" onCrashFix={onCrashFix} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className={`mb-4 h-12 w-12 rounded-xl ${way.primaryClass}/20 flex items-center justify-center`}>
              <Eye size={22} className={way.textClass} />
            </div>
            <h3 className="text-base font-semibold text-white">Aperçu en direct</h3>
            <p className="mt-2 text-sm text-ink-400">
              La prévisualisation WebContainer apparaîtra ici dès que la génération commencera.
            </p>
          </div>
        )}
      </div>

      <div className={tab === 'code' ? 'h-full' : 'hidden'}>
        {!hasFiles ? (
          <EmptyState way={way} name="Aucun code généré" />
        ) : (
          <CodeEditor
            files={files}
            baseFiles={baseSchema?.project?.files ?? {}}
            selectedPath={selectedFilePath}
            onSelectFile={(path) => setSelectedFilePath(path)}
            reviewMode={reviewMode}
            way={way}
            onAcceptGhost={(path, newContent) => {
              if (!schema || !onAcceptReview) return;
              onAcceptReview({ ...schema, project: { ...schema.project, files: { ...schema.project.files, [path]: newContent } } });
            }}
            onRejectGhost={onRejectReview}
            onSaveFile={(path, newContent) => {
              if (!schema) return;
              const updatedSchema = {
                ...schema,
                project: {
                  ...schema.project,
                  files: {
                    ...schema.project.files,
                    [path]: newContent
                  }
                }
              };
              if (reviewMode) onUpdateReview?.(updatedSchema);
              else onUpdateSchema(updatedSchema);
            }}
            onAskAI={onAskAI}
            onProposeChange={onProposeChange}
          />
        )}
      </div>

      <div className={tab === 'files' ? 'h-full' : 'hidden'}>
        {!hasFiles ? (
          <EmptyState way={way} name="Aucun fichier" />
        ) : (
          <div className="flex h-full">
            {/* File tree */}
            <div className="w-56 shrink-0 border-r border-white/5 bg-[#0d1117]">
              <FileExplorer
                files={files}
                selectedPath={selectedFilePath}
                projectName={schema?.project.name}
                onSelect={(path) => setSelectedFilePath(path)}
              />
            </div>
            {/* File content viewer */}
            <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
              {selectedFilePath && selectedContent !== null ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <span className="text-xs font-mono text-ink-300">{selectedFilePath}</span>
                    <button
                      onClick={() => copyToClipboard(selectedContent)}
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition"
                    >
                      {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-[#c9d1d9] scrollbar-thin leading-relaxed">
                    <code>{selectedContent}</code>
                  </pre>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
                  <FolderTree size={32} className="text-ink-600" />
                  <p className="text-sm text-ink-400">Sélectionnez un fichier pour voir son contenu</p>
                  <p className="text-xs text-ink-600">{Object.keys(files).length} fichier(s) dans le projet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={tab === 'composer' ? 'h-full' : 'hidden'}>
        <ComposerPanel
          currentSchema={schema ?? null}
          previousSchema={previousSchema ?? null}
          onAccept={(paths) => console.log('Accepted:', paths)}
          onReject={(paths) => console.log('Rejected:', paths)}
        />
      </div>

      <div className={tab === 'mission' ? 'h-full' : 'hidden'}>
        <MissionStatusPanel dna={dna} onRestore={onRestore} onFix={onFix} />
      </div>

      <div className={tab === 'connectors' ? 'h-full' : 'hidden'}>
        <ConnectorsPanel />
      </div>

      <div className={tab === 'deploy' ? 'h-full' : 'hidden'}>
        <DeployPanel schema={schema} missionId={missionId} />
      </div>

      <div className={tab === 'logs' ? 'h-full' : 'hidden'}>
        <TerminalComponent />
      </div>
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  accent,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/5 ${
        accent ? 'text-ember-400' : 'text-ink-200'
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
        active ? 'bg-white/10 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function IconBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick?: () => void }) {
  return (
    <button
      className="rounded-lg p-2 text-ink-400 transition hover:bg-white/5 hover:text-white"
      title={title}
      onClick={onClick}
    >
      <Icon size={17} />
    </button>
  );
}

const SUGGESTIONS = [
  'Une app de tâches avec auth et dark mode',
  'Un dashboard analytics avec graphiques',
  'Une landing page SaaS avec pricing',
  'Un blog avec CMS et recherche',
];
