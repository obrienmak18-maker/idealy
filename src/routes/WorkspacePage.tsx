import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { analyzeIntent, buildIUPS, streamAgentMessage } from '@/agents/orchestrator';
import { iupsToCode } from '@/core/iups/exporter';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import { MessageBubble, type ChatMessage } from '@/components/chat/MessageBubble';
import { SettingsModal } from '@/components/SettingsModal';
import { ConnectorsPanel } from '@/components/workspace/ConnectorsPanel';
import { PaywallModal } from '@/components/workspace/PaywallModal';
import { DeployPanel } from '@/components/workspace/DeployPanel';
import { WebContainerPreview } from '@/components/workspace/WebContainerPreview';
import { FileExplorer } from '@/components/workspace/FileExplorer';
import { ComposerPanel } from '@/components/workspace/ComposerPanel';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { Terminal as TerminalComponent } from '@/components/workspace/Terminal';
import { downloadProjectZip } from '@/services/projectDownloader';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Github,
  Figma,
  Eye,
  Code2,
  FolderTree,
  Plug,
  Rocket,
  ScrollText,
  Sparkles,
  ChevronDown,
  Settings,
  LogOut,
  Zap,
  Crown,
  Bell,
  Terminal,
  FileCode2,
  Copy,
  CheckCircle2,
  Loader2,
  Download,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/Brand';
import { WAYS, type WayId } from '@/lore/ways';
import { useIdealyStore } from '@/stores/idealyStore';
import { getSupabaseClient } from '@/supabaseClient';
import { useStripe } from '@/hooks/useStripe';
import { MissionBriefPanel } from '@/components/workspace/MissionBriefPanel';
import { MissionStatusPanel } from '@/components/workspace/MissionStatusPanel';
import { buildMissionContracts } from '@/core/mission/missionContract';
import { appendSnapshot, createMissionDNA, createMissionSnapshot } from '@/core/mission/missionDNA';
import { validateGeneratedProject } from '@/core/mission/validateMission';
import type { MissionContracts } from '@/core/mission/contracts';

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

export function WorkspacePage() {
  const wayId = useIdealyStore((s) => s.way) as WayId;
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
  const dictationTheme = DICTATION_THEME[wayId];
  const shouldReduceMotion = useReducedMotion();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<RightTab>('preview');
  const [showPreview, setShowPreview] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isBillingPortalOpen, setIsBillingPortalOpen] = useState(false);
  const [currentMissionId, setCurrentMissionId] = useState<string | null>(null);
  const [pendingBrief, setPendingBrief] = useState<{ prompt: string; contracts: MissionContracts } | null>(null);

  const { subscription, checkSubscription } = useStripe();

  const [projectSchema, setProjectSchema] = useState<IdealyUniversalProjectSchema | null>(null);
  const [previousSchema, setPreviousSchema] = useState<IdealyUniversalProjectSchema | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const dictationRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      dictationRecognitionRef.current?.stop();
    };
  }, []);

  // Load missions from Supabase on mount
  useEffect(() => {
    if (profile) {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      supabase.from('missions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        if (data) {
          setMissions(data.map(d => ({
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
      supabase.from('missions').select('schema, dna, validation, status, preview_ready').eq('id', currentMissionId).single().then(({ data }) => {
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

  function send() {
    const text = input.trim();
    if (!text || busy) return;
    
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
    
    const finalPrompt = text;
    setPendingBrief({ prompt: finalPrompt, contracts: buildMissionContracts(finalPrompt, way) });
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

  async function runMission(prompt: string, overrideContracts?: MissionContracts) {
    const initialContracts = overrideContracts ?? buildMissionContracts(prompt, way);
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
    const orchestrator = way.agents[0];
    const builder = way.agents[1];
    const validator = way.agents[2];

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
      // 1. Orchestrator Phase
      const msgId = addMessage(orchestrator, '', 'thinking');
      const context = await analyzeIntent(prompt, way);
      context.contracts = initialContracts;
      useIdealyStore.getState().consumeEnergy(context.energyCost);
      
      const orchestratorStream = await streamAgentMessage(
        orchestrator,
        way,
        `Mission: ${prompt}\nComplexité estimée: ${context.rank}`,
        prompt,
        `Analyse le plan global. Appelle explicitement le développeur (${builder.name}) pour la suite.`
      );

      let orchestratorText = '';
      for await (const delta of orchestratorStream.textStream) {
        orchestratorText += delta;
        updateMessage(msgId, orchestratorText, 'writing');
      }
      updateMessage(msgId, orchestratorText, 'done');

      // 2. Builder Phase
      const builderId = addMessage(builder, '', 'thinking');
      const builderStream = await streamAgentMessage(
        builder,
        way,
        `Plan de l'architecte: ${orchestratorText}`,
        prompt,
        `Tu construis les composants. Parle de ce que tu fais, puis dis que c'est bon et appelle ${validator.name}.`
      );

      let builderText = '';
      for await (const delta of builderStream.textStream) {
        builderText += delta;
        updateMessage(builderId, builderText, 'writing');
      }
      
      // Building IUPS with real-time progress (Fix #13)
      setGenerationProgress(0);
      const schema = await buildIUPS({
        ...context,
        onProgress: (tokens) => {
          // ~8000 max tokens, show progress
          setGenerationProgress(Math.min(95, Math.round((tokens / 8000) * 100)));
          updateMessage(builderId, `${builderText}\n\n⚙️ Génération du code... (${Math.min(95, Math.round((tokens / 8000) * 100))}%)`, 'writing');
        },
      });
      setGenerationProgress(100);
      updateMessage(builderId, builderText, 'done');

      const validation = validateGeneratedProject(schema, context.contracts);
      const status = validation.status === 'failed' ? 'needs-fix' : 'ready';
      const baseSnapshot = createMissionSnapshot(schema, validation.status === 'passed' ? 'Version validée' : 'Version à corriger', 'generation', validation);
      const enrichedSchema = schema ? {
        ...schema,
        contracts: context.contracts,
        validation,
        snapshotId: baseSnapshot.id,
      } : null;
      const snapshot = enrichedSchema ? { ...baseSnapshot, schema: enrichedSchema } : baseSnapshot;
      if (enrichedSchema) setProjectSchema(enrichedSchema);
      if (missionId) {
        updateStoreMission(missionId, {
          previewReady: Boolean(schema && validation.status !== 'failed'),
          status,
          validation,
        });
        updateMissionDNA(missionId, (dna) => appendSnapshot(dna, snapshot, status, validation));
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

      // 3. Validator Phase
      const validatorId = addMessage(validator, '', 'thinking');
      if (enrichedSchema) {
        updateProjectSchema(enrichedSchema);
        setShowPreview(true);
        setTab('preview');
        if (missionId) {
          updateStoreMission(missionId, { previewReady: validation.status !== 'failed' });
        }
        
        const validatorStream = await streamAgentMessage(
          validator,
          way,
          `Le code a été construit.`,
          prompt,
          `Valide la version générée à partir des contrats. Le rapport déterministe ci-dessous est la source de vérité : ${validation.status}. ${validation.issues.map((issue) => `[${issue.code}] ${issue.message}${issue.path ? ` (${issue.path})` : ''}`).join(' ')}. Cite les issues concrètes dans ton compte rendu et indique clairement si une réparation est nécessaire.`
        );

        let validatorText = '';
        for await (const delta of validatorStream.textStream) {
          validatorText += delta;
          updateMessage(validatorId, validatorText, 'writing');
        }
        const issueSummary = validation.issues.length > 0
          ? validation.issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}${issue.path ? ` (${issue.path})` : ''}`).join('\\n')
          : 'Aucune issue détectée.';
        updateMessage(validatorId, validation.status === 'failed'
          ? `${validatorText || 'Validation terminée.'}\\n\\nIssues déterministes :\\n${issueSummary}\\n\\nUtilisez « Corriger avec ces issues » dans l’onglet Mission.`
          : `${validatorText || 'Validation terminée.'}\\n\\nRapport déterministe : ${validation.status}. ${issueSummary}`, 'done');
      } else {
        updateMessage(validatorId, `Attention ! J'ai détecté une anomalie.`, 'done');
      }

    } catch (error) {
      console.error(error);
      if (missionId) {
        updateStoreMission(missionId, { status: 'needs-fix' });
        updateMissionDNA(missionId, (dna) => ({ ...dna, status: 'needs-fix', updatedAt: Date.now() }));
      }
      addMessage(orchestrator, `Erreur lors de la communication. La version stable précédente est conservée.`, 'done');
    }

    setBusy(false);
  }

  const energyPct = Math.round((energy.current / energy.max) * 100);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
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
                    setPreviousSchema(null);
                    setMessages([]);
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
            <button className="rounded-lg p-2 text-ink-300 transition hover:bg-white/5 hover:text-white" title="Notifications">
              <Bell size={17} />
            </button>
            <button className="btn-outline text-xs">
              <Zap size={13} />
              {way.energy} {energy.current}
            </button>
          </div>
        </header>

        {/* Body: chat + right panel */}
        <div className="flex min-h-0 flex-1">
          {/* Chat */}
          <div className="flex min-w-0 flex-1 flex-col">
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
                    setMessages((current) => [...current, {
                      id: crypto.randomUUID(),
                      author: profile?.displayName ?? 'Vous',
                      role: 'Vous',
                      text: brief.prompt,
                      kind: 'user',
                      ts: Date.now(),
                    }]);
                    void runMission(brief.prompt, contracts);
                  }}
                />
              </div>
            )}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="mx-auto max-w-3xl px-5 py-8">
                {messages.length === 0 ? (
                  <EmptyState way={way} name={profile?.displayName ?? 'apprenti'} />
                ) : (
                  <div className="space-y-5">
                    {messages.map((m) => (
                      <MessageBubble key={m.id} msg={m} way={way} />
                    ))}
                    {busy && (
                      <div className="flex items-center gap-2 text-sm text-ink-400">
                        <span className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-electric-400"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </span>
                        L'escouade travaille...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Prompt input */}
            <div className="shrink-0 border-t border-white/5 bg-ink-900/40 p-4">
              <div className="mx-auto max-w-3xl">
                <div className="card p-3 relative">
                  {/* Slash command menu */}
                  <AnimatePresence>
                    {showSlashMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-full left-0 mb-2 w-72 rounded-xl glass border border-white/10 py-1.5 shadow-2xl z-50"
                      >
                        <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                          Commandes
                        </div>
                        {SLASH_COMMANDS.filter(c =>
                          c.cmd.startsWith(input.toLowerCase()) || input === '/'
                        ).map((c) => (
                          <button
                            key={c.cmd}
                            onClick={() => { setInput(c.cmd + ' '); setShowSlashMenu(false); }}
                            className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-white/5 transition"
                          >
                            <span className="font-mono text-xs font-semibold text-electric-400 mt-0.5 shrink-0">{c.label}</span>
                            <span className="text-xs text-ink-400">{c.desc}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <textarea
                    value={input}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInput(val);
                      setShowSlashMenu(val === '/' || (val.startsWith('/') && !val.includes(' ')));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setShowSlashMenu(false); return; }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={`Décrivez votre ${way.vocab.task.toLowerCase()}... ou tapez / pour les commandes`}
                    rows={1}
                    className="max-h-40 min-h-[2.5rem] w-full resize-none bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none scrollbar-thin"
                    style={{ height: 'auto' }}
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
                        className={`relative inline-flex h-9 w-9 items-center justify-center overflow-visible rounded-lg p-2 transition focus:outline-none focus:ring-2 focus:ring-white/30 ${
                          listening ? dictationTheme.active : 'text-ink-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {listening && !shouldReduceMotion && (
                          <motion.span
                            aria-hidden="true"
                            className={`pointer-events-none absolute -inset-1 rounded-xl border ${dictationTheme.ring}`}
                            initial={{ opacity: 0.75, scale: 0.82 }}
                            animate={{ opacity: 0, scale: 1.35 }}
                            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
                          />
                        )}
                        <span className={`absolute inset-0 flex items-center justify-center gap-[2px] transition-opacity ${listening ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
                          {[0, 1, 2, 3].map((bar) => (
                            <motion.span
                              key={bar}
                              className={`h-3 w-[2px] rounded-full ${dictationTheme.wave}`}
                              style={{ transformOrigin: 'center' }}
                              animate={listening && !shouldReduceMotion ? { scaleY: [0.45, 1, 0.55, 0.85, 0.45] } : { scaleY: 0.45 }}
                              transition={{ duration: 0.72, delay: bar * 0.09, repeat: listening && !shouldReduceMotion ? Infinity : 0, ease: 'easeInOut' }}
                            />
                          ))}
                        </span>
                        <Mic size={16} className={`transition-opacity ${listening ? 'opacity-0' : 'opacity-100'}`} />
                      </button>
                      <input ref={attachmentRef} type="file" multiple className="hidden" onChange={(event) => uploadAttachments(event.target.files)} />
                    </div>
                    <button
                      onClick={send}
                      disabled={!input.trim() || busy || Boolean(pendingBrief)}
                      className="btn-primary px-3.5"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
                {listening && (
                  <p role="status" aria-live="polite" className={`mt-2 flex items-center gap-2 text-xs ${way.textClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dictationTheme.wave} motion-safe:animate-pulse`} aria-hidden="true" />
                    {dictationTheme.label} — parlez, puis appuyez à nouveau sur le micro pour arrêter.
                  </p>
                )}
                {toolMessage && <p role="status" className="mt-2 text-xs text-electric-300">{isUploading ? 'Import en cours…' : toolMessage}</p>}
                <p className="mt-2 text-center text-[11px] text-ink-500">
                  Idealy peut se tromper. Vérifiez le code généré.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '42%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="hidden shrink-0 border-l border-white/5 bg-ink-900/30 md:block"
                style={{ minWidth: 360 }}
              >
                <div className="flex h-full flex-col">
                  <div className="flex shrink-0 items-center gap-1 border-b border-white/5 px-3 py-2">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          tab === t.id
                            ? 'bg-white/10 text-white'
                            : 'text-ink-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <t.icon size={14} />
                        {t.label}
                      </button>
                    ))}
                    {/* Download ZIP button */}
                    {projectSchema && (
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title="Télécharger le projet (.zip)"
                        className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-ink-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
                      >
                        {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                        <span className="hidden lg:block">ZIP</span>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <RightPanelContent 
                      tab={tab} 
                      way={way} 
                      schema={projectSchema}
                      previousSchema={previousSchema}
                      missionId={currentMissionId}
                      dna={currentMissionId ? missionDNA[currentMissionId] ?? null : null}
                      onUpdateSchema={updateProjectSchema}
          onRestore={restoreMissionSnapshot}
                      onFix={repairMission}
                          onAskAI={(prompt) => {
                        // Inject AI file-context prompt into the chat pipeline
                        void runMission(prompt);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </div>
  );
}

function EmptyState({ way, name }: { way: (typeof WAYS)[WayId]; name: string }) {
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
      <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setInput(s);
              composerRef.current?.focus();
            }}
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
  previousSchema,
  missionId,
  dna,
  onUpdateSchema,
  onRestore,
  onFix,
  onAskAI,
}: { 
  tab: RightTab; 
  way: (typeof WAYS)[WayId]; 
  schema: IdealyUniversalProjectSchema | null;
  previousSchema: IdealyUniversalProjectSchema | null;
  missionId: string | null;
  dna: import('@/core/mission/contracts').MissionDNA | null;
  onUpdateSchema: (schema: IdealyUniversalProjectSchema | null) => void;
  onRestore: (snapshot: import('@/core/mission/contracts').MissionSnapshot) => void;
  onFix: () => void;
  onAskAI?: (prompt: string) => void;
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
              <span className="ml-2 text-[10px] bg-electric-400/20 text-electric-400 px-1.5 py-0.5 rounded-full">Live</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <WebContainerPreview schema={schema} className="h-full" />
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
            selectedPath={selectedFilePath} 
            onSelectFile={(path) => setSelectedFilePath(path)} 
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
              onUpdateSchema(updatedSchema);
            }}
            onAskAI={onAskAI}
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

const TABS: { id: RightTab; label: string; icon: React.ElementType }[] = [
  { id: 'mission', label: 'Mission', icon: ShieldCheck },
  { id: 'preview', label: 'Aperçu', icon: Eye },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'files', label: 'Fichiers', icon: FolderTree },
  { id: 'composer', label: 'Composer', icon: GitBranch },
  { id: 'connectors', label: 'Connecteurs', icon: Plug },
  { id: 'deploy', label: 'Déploiement', icon: Rocket },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

const SUGGESTIONS = [
  'Une app de tâches avec auth et dark mode',
  'Un dashboard analytics avec graphiques',
  'Une landing page SaaS avec pricing',
  'Un blog avec CMS et recherche',
];
