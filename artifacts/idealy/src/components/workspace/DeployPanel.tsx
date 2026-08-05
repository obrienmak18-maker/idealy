/**
 * DeployPanel.tsx
 * Panneau de déploiement réel vers Vercel + gestion de la collaboration Yjs.
 */
import { useState, useEffect } from 'react';
import {
  Rocket, Users, Copy, ExternalLink, Loader2,
  CheckCircle2, XCircle, Share2, UserPlus, Zap,
} from 'lucide-react';
import { useIdealyStore } from '@/stores/idealyStore';
import { deployToVercel, getDeploymentStatus, type DeploymentResult } from '@/services/vercelDeployer';
import { joinCollabRoom, leaveCollabRoom, getActiveCollab, type CollabUser } from '@/services/collabService';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';

interface DeployPanelProps {
  schema: IdealyUniversalProjectSchema | null;
  missionId: string | null;
}

type DeployState = 'idle' | 'deploying' | 'polling' | 'ready' | 'error';

const AVATAR_COLORS = [
  '#4cd7f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ec4899',
];

export function DeployPanel({ schema, missionId }: DeployPanelProps) {
  const { connectors, profile } = useIdealyStore();
  const vercelToken = connectors?.vercelToken || '';

  // --- Deployment State ---
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [deployment, setDeployment] = useState<DeploymentResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // --- Collaboration State ---
  const [collabActive, setCollabActive] = useState(false);
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([]);
  const [roomId, setRoomId] = useState<string>('');

  const addLog = (msg: string) => setLogs((prev) => [...prev.slice(-30), msg]);

  // ── DEPLOIEMENT ──────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!schema) {
      addLog('❌ Aucun projet à déployer. Créez d\'abord une mission.');
      return;
    }
    const confirmed = window.confirm(`Publier « ${schema.project.name || 'ce projet'} » sur Vercel en production ?`);
    if (!confirmed) {
      addLog('Publication annulée par l\'utilisateur.');
      return;
    }
    if (!vercelToken) {
      addLog('❌ Token Vercel manquant. Ajoutez-le dans l\'onglet Connecteurs.');
      return;
    }

    setDeployState('deploying');
    setLogs([]);

    try {
      const result = await deployToVercel(schema, vercelToken, addLog);
      setDeployment(result);

      if (result.readyState === 'READY') {
        setDeployState('ready');
        addLog('🎉 Déploiement réussi !');
      } else {
        setDeployState('polling');
        addLog('⏳ Build en cours, vérification du statut...');
        pollDeploymentStatus(result.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Erreur : ${msg}`);
      setDeployState('error');
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    const poll = async () => {
      if (attempts >= maxAttempts) {
        addLog('⏰ Timeout: vérifiez manuellement sur vercel.com');
        setDeployState('error');
        return;
      }
      attempts++;

      try {
        const status = await getDeploymentStatus(deploymentId, vercelToken);
        addLog(`📡 Statut: ${status.readyState} (tentative ${attempts}/${maxAttempts})`);

        if (status.readyState === 'READY') {
          setDeployment((prev) => prev ? { ...prev, url: status.url, readyState: 'READY' } : prev);
          setDeployState('ready');
          addLog(`🎉 En ligne ! ${status.url}`);
        } else if (status.readyState === 'ERROR' || status.readyState === 'CANCELED') {
          setDeployState('error');
          addLog('❌ Build échoué sur Vercel');
        } else {
          setTimeout(poll, 10000); // Retry in 10s
        }
      } catch {
        setTimeout(poll, 15000);
      }
    };

    poll();
  };

  const copyUrl = () => {
    if (deployment?.url) {
      navigator.clipboard.writeText(deployment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── COLLABORATION ─────────────────────────────────────────────────────────

  const startCollab = () => {
    const id = missionId || `room-${Math.random().toString(36).slice(2, 9)}`;
    setRoomId(id);

    const userColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const userName = profile?.displayName || 'Ninja Anonyme';

    joinCollabRoom(id, { name: userName, color: userColor });
    setCollabActive(true);
    addLog(`🤝 Room de collaboration créée : idealy-${id}`);

    // Rafraîchir la liste des utilisateurs
    const interval = setInterval(() => {
      const collab = getActiveCollab();
      if (collab) {
        setCollabUsers(Array.from(collab.users.values()));
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const stopCollab = () => {
    leaveCollabRoom();
    setCollabActive(false);
    setCollabUsers([]);
    addLog('👋 Session de collaboration terminée.');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rejoindre la room si l'URL contient un paramètre ?room=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && !collabActive) {
      setRoomId(room);
      const userColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      joinCollabRoom(room, { name: profile?.displayName || 'Invité', color: userColor });
      setCollabActive(true);
      addLog(`🔗 Rejoint la room : ${room}`);
    }

    return () => { leaveCollabRoom(); };
  }, [collabActive, profile?.displayName]);

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── DÉPLOIEMENT ── */}
      <section className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-ink-100">Déploiement Vercel</h3>
        </div>

        {!vercelToken && (
          <div className="mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
            ⚠️ Token Vercel manquant. Ajoutez-le dans l'onglet <strong>Connecteurs</strong>.
          </div>
        )}

        {/* Status Badge */}
        {deployment && (
          <div className={`mb-3 rounded-xl p-3 border flex items-center gap-3 ${
            deployState === 'ready'
              ? 'bg-green-500/10 border-green-500/20'
              : deployState === 'error'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-primary/10 border-primary/20'
          }`}>
            {deployState === 'ready' && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />}
            {deployState === 'error' && <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
            {(deployState === 'deploying' || deployState === 'polling') && (
              <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-100 truncate">
                {deployState === 'ready' ? 'En production' :
                 deployState === 'error' ? 'Échec du déploiement' :
                 'Build en cours...'}
              </p>
              {deployment.url && (
                <p className="text-xs text-ink-400 truncate mt-0.5">{deployment.url}</p>
              )}
            </div>
            {deployState === 'ready' && deployment.url && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={copyUrl}
                  className="rounded p-1.5 text-ink-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Copier l'URL"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <a
                  href={deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-ink-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Ouvrir"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleDeploy}
          disabled={deployState === 'deploying' || deployState === 'polling' || !schema}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-on-primary py-2.5 text-sm font-bold shadow-[0_0_15px_rgba(76,215,246,0.25)] hover:shadow-[0_0_25px_rgba(76,215,246,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {deployState === 'deploying' || deployState === 'polling' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Déploiement en cours...</>
          ) : (
            <><Zap className="h-4 w-4" /> Déployer sur Vercel</>
          )}
        </button>

        {/* Logs Terminal */}
        {logs.length > 0 && (
          <div className="mt-3 rounded-lg bg-surface-dim border border-white/5 p-2 max-h-32 overflow-y-auto font-mono text-[11px] text-ink-400">
            {logs.map((line, i) => (
              <div key={i} className="leading-relaxed">{line}</div>
            ))}
          </div>
        )}
      </section>

      {/* ── COLLABORATION ── */}
      <section className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold text-ink-100">Collaboration en temps réel</h3>
          {collabActive && (
            <span className="ml-auto text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {!collabActive ? (
          <div className="space-y-3">
            <p className="text-xs text-ink-400">
              Invitez votre équipe à collaborer en temps réel sur ce projet. Basé sur Yjs (peer-to-peer, chiffré).
            </p>
            <button
              onClick={startCollab}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-secondary/40 text-secondary py-2.5 text-sm font-semibold hover:bg-secondary/10 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Démarrer une session collaborative
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Room Link */}
            <div className="rounded-xl bg-surface-dim border border-white/5 p-3">
              <p className="text-xs text-ink-400 mb-2">Lien d'invitation :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-primary bg-primary/10 rounded px-2 py-1 truncate font-mono">
                  {`${window.location.origin}?room=${roomId}`}
                </code>
                <button
                  onClick={copyRoomLink}
                  className="rounded p-1.5 text-ink-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Connected Users */}
            <div>
              <p className="text-xs text-ink-400 mb-2">
                Membres connectés ({collabUsers.length + 1}) :
              </p>
              <div className="space-y-2">
                {/* Local user */}
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="h-6 w-6 rounded-full border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-ink-950"
                    style={{ background: AVATAR_COLORS[0] }}
                  >
                    {(profile?.displayName || 'M')[0].toUpperCase()}
                  </div>
                  <span className="text-ink-200">{profile?.displayName || 'Moi'}</span>
                  <span className="text-ink-500 ml-auto">Vous</span>
                </div>
                {/* Remote users */}
                {collabUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-6 w-6 rounded-full border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-ink-950"
                      style={{ background: u.color }}
                    >
                      {u.name[0].toUpperCase()}
                    </div>
                    <span className="text-ink-200">{u.name}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 ml-auto animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={stopCollab}
              className="w-full text-xs text-ink-400 hover:text-red-400 py-2 transition-colors"
            >
              Quitter la session
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
