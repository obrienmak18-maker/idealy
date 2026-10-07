"use client";

import {
  Check,
  ChevronRight,
  GitBranch,
  GitCommit,
  GitFork,
  Github,
  History,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { CheckpointSnapshot } from "@/lib/idealy/checkpoints";

export type CheckpointModalProps = {
  isOpen: boolean;
  onClose: () => void;
  missionId: string | null;
  onRollback?: () => void;
};

export function CheckpointModal({
  isOpen,
  onClose,
  missionId,
  onRollback,
}: CheckpointModalProps) {
  const [activeTab, setActiveTab] = useState<"checkpoints" | "github">("checkpoints");
  const [checkpoints, setCheckpoints] = useState<CheckpointSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  // New Checkpoint Form
  const [checkpointName, setCheckpointName] = useState("");
  const [checkpointDesc, setCheckpointDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // GitHub Form
  const [ghOwner, setGhOwner] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghToken, setGhToken] = useState("");
  const [syncingGh, setSyncingGh] = useState(false);
  const [ghResultUrl, setGhResultUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !missionId) return;
    setLoading(true);
    fetch(`/api/idealy/missions/${missionId}/checkpoints`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.checkpoints)) {
          setCheckpoints(data.checkpoints);
        }
      })
      .catch((err) => console.error("Could not fetch checkpoints", err))
      .finally(() => setLoading(false));
  }, [isOpen, missionId]);

  if (!isOpen) return null;

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionId) {
      toast.error("Aucune mission active.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/idealy/missions/${missionId}/checkpoints`, {
        body: JSON.stringify({
          description: checkpointDesc.trim() || undefined,
          name: checkpointName.trim() || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de création du checkpoint");
      setCheckpoints((prev) => [data.checkpoint, ...prev]);
      setCheckpointName("");
      setCheckpointDesc("");
      toast.success("Checkpoint enregistré avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (checkpoint: CheckpointSnapshot) => {
    if (!missionId) return;
    if (!confirm(`Confirmer la restauration du workspace au checkpoint "${checkpoint.name}" ?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/idealy/missions/${missionId}/rollback`, {
        body: JSON.stringify({ checkpointId: checkpoint.id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec du rollback");
      toast.success(`Workspace restauré à "${checkpoint.name}"`);
      onRollback?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du rollback");
    }
  };

  const handleSyncGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missionId) {
      toast.error("Aucune mission active.");
      return;
    }
    if (!ghOwner || !ghRepo) {
      toast.error("Veuillez renseigner le propriétaire et le dépôt.");
      return;
    }
    setSyncingGh(true);
    setGhResultUrl(null);
    try {
      const res = await fetch(`/api/idealy/missions/${missionId}/github`, {
        body: JSON.stringify({
          branch: ghBranch.trim() || undefined,
          owner: ghOwner.trim(),
          repo: ghRepo.trim(),
          token: ghToken.trim() || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la synchronisation GitHub");
      setGhResultUrl(data.htmlUrl);
      toast.success(`Poussé avec succès vers ${data.branch} (${data.filesCount} fichiers) !`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur GitHub");
    } finally {
      setSyncingGh(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
              <History className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Checkpoints & Synchronisation GitHub</h2>
              <p className="text-[11px] text-muted-foreground">Historique versionné et export vers dépôt distant</p>
            </div>
          </div>
          <button
            aria-label="Fermer la boîte de dialogue"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-sidebar-border/40 px-5 pt-2">
          <button
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "checkpoints"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-muted-foreground hover:text-sidebar-foreground"
            }`}
            onClick={() => setActiveTab("checkpoints")}
            type="button"
          >
            Checkpoints & Rollback
          </button>
          <button
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === "github"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-muted-foreground hover:text-sidebar-foreground"
            }`}
            onClick={() => setActiveTab("github")}
            type="button"
          >
            <Github className="size-3.5" />
            <span>Export GitHub Réel</span>
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === "checkpoints" ? (
            <div className="space-y-6">
              {/* Create Checkpoint Form */}
              <form
                className="rounded-xl border border-sidebar-border/60 bg-background/30 p-4"
                onSubmit={handleCreateCheckpoint}
              >
                <div className="mb-2 text-xs font-semibold">Créer un nouveau Checkpoint</div>
                <div className="space-y-2.5">
                  <input
                    aria-label="Nom du checkpoint"
                    className="w-full rounded-lg border border-sidebar-border/70 bg-background/50 px-3 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
                    onChange={(e) => setCheckpointName(e.target.value)}
                    placeholder="Ex: Avant intégration du header"
                    value={checkpointName}
                  />
                  <input
                    aria-label="Description optionnelle"
                    className="w-full rounded-lg border border-sidebar-border/70 bg-background/50 px-3 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
                    onChange={(e) => setCheckpointDesc(e.target.value)}
                    placeholder="Description optionnelle…"
                    value={checkpointDesc}
                  />
                  <button
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:opacity-50"
                    disabled={creating}
                    type="submit"
                  >
                    <GitCommit className="size-3" />
                    <span>{creating ? "Sauvegarde…" : "Enregistrer Checkpoint"}</span>
                  </button>
                </div>
              </form>

              {/* Checkpoints Timeline */}
              <div>
                <div className="mb-2.5 text-xs font-semibold text-muted-foreground">
                  Points de restauration ({checkpoints.length})
                </div>
                {loading ? (
                  <p className="text-xs text-muted-foreground">Chargement des checkpoints…</p>
                ) : checkpoints.length > 0 ? (
                  <div className="space-y-2">
                    {checkpoints.map((chk) => (
                      <div
                        className="flex items-center justify-between rounded-xl border border-sidebar-border/60 bg-background/20 p-3"
                        key={chk.id}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{chk.name}</span>
                            <span className="rounded bg-sky-400/10 px-1.5 py-0.5 font-mono text-[9px] text-sky-300">
                              {chk.fileCount} fichiers
                            </span>
                          </div>
                          {chk.description && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{chk.description}</p>
                          )}
                          <span className="mt-1 block text-[10px] text-muted-foreground/70">
                            {new Date(chk.createdAt).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <button
                          className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-2.5 text-[11px] font-semibold text-sidebar-foreground transition hover:bg-sidebar-accent"
                          onClick={() => handleRollback(chk)}
                          type="button"
                        >
                          <RotateCcw className="size-3 text-amber-300" />
                          <span>Restaurer</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-sidebar-border/60 p-6 text-center text-xs text-muted-foreground">
                    Aucun checkpoint enregistré. Créez-en un pour pouvoir restaurer votre travail à tout instant.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSyncGitHub}>
              <div className="rounded-xl border border-sidebar-border/60 bg-background/25 p-4 text-xs leading-relaxed text-muted-foreground">
                Cette action synchronise directement tous les fichiers de votre mission vers un dépôt GitHub réel via l'API REST officielle GitHub.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-sidebar-foreground" htmlFor="gh-owner">
                    Propriétaire / Organisation
                  </label>
                  <input
                    aria-label="GitHub Owner"
                    className="w-full rounded-lg border border-sidebar-border/70 bg-background/50 px-3 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
                    id="gh-owner"
                    onChange={(e) => setGhOwner(e.target.value)}
                    placeholder="ex: obrienmak18-maker"
                    required
                    value={ghOwner}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-sidebar-foreground" htmlFor="gh-repo">
                    Nom du Dépôt (Repository)
                  </label>
                  <input
                    aria-label="GitHub Repo"
                    className="w-full rounded-lg border border-sidebar-border/70 bg-background/50 px-3 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
                    id="gh-repo"
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="ex: mon-projet"
                    required
                    value={ghRepo}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-sidebar-foreground" htmlFor="gh-branch">
                  Branche Cible
                </label>
                <input
                  aria-label="GitHub Branch"
                  className="w-full rounded-lg border border-sidebar-border/70 bg-background/50 px-3 py-1.5 text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
                  id="gh-branch"
                  onChange={(e) => setGhBranch(e.target.value)}
                  placeholder="main"
                  value={ghBranch}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-sidebar-foreground" htmlFor="gh-token">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  aria-label="GitHub Token"
                  className="w-full rounded-lg border border-sidebar-border/70 bg-background/50 px-3 py-1.5 font-mono text-xs text-sidebar-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
                  id="gh-token"
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx ou variable d'env"
                  type="password"
                  value={ghToken}
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  Nécessite le scope <code className="font-mono text-sky-300">repo</code>.
                </span>
              </div>

              <button
                className="flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:opacity-50"
                disabled={syncingGh}
                type="submit"
              >
                <GitBranch className="size-3.5" />
                <span>{syncingGh ? "Synchronisation en cours…" : "Pousser vers GitHub"}</span>
              </button>

              {ghResultUrl && (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check className="size-3.5 text-emerald-400" strokeWidth={1.5} />
                    <span>Synchronisation réussie !</span>
                  </div>
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-[11px] underline"
                    href={ghResultUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Voir la branche sur GitHub</span>
                    <ChevronRight className="size-3" />
                  </a>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
