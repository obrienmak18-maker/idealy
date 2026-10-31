import {
  ChevronRight,
  Clock3,
  Database,
  FileCode2,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MissionWorkspaceFile } from "../../types";

type WorkspaceTab = "files" | "activity" | "checkpoints" | "data";
type Checkpoint = {
  createdAt: string;
  description?: string;
  fileCount: number;
  id: string;
  name: string;
};
type Task = {
  agent?: string;
  created_at?: string;
  event_type?: string;
  id?: string;
  name?: string;
  path?: string | null;
  sequence?: number;
  status?: string;
  title?: string;
  updatedAt?: string;
};
type MissionRecord = {
  created_at: string | null;
  id: string;
  status: string | null;
  title: string | null;
  way: string | null;
};
type AgentRun = {
  agent_key: string;
  completed_at: string | null;
  id: string;
  started_at: string | null;
  status: string;
  step_index: number;
};
type FileEvent = {
  created_at: string;
  event_type: string;
  id: string;
  path: string | null;
  sequence: number;
};
type WorkspaceProps = {
  missionId: string;
  projectName: string;
  initialFiles: MissionWorkspaceFile[];
  onClose: () => void;
};

async function readPayload<T>(
  response: Response,
): Promise<T & { error?: string }> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      payload.error || `Le backend a répondu ${response.status}.`,
    );
  return payload;
}

export const MissionWorkspace: React.FC<WorkspaceProps> = ({
  missionId,
  projectName,
  initialFiles,
  onClose,
}) => {
  const [tab, setTab] = useState<WorkspaceTab>("files");
  const [files, setFiles] = useState<MissionWorkspaceFile[]>(initialFiles);
  const [selectedPath, setSelectedPath] = useState(initialFiles[0]?.path ?? "");
  const [draft, setDraft] = useState(initialFiles[0]?.content ?? "");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [databaseSnapshot, setDatabaseSnapshot] = useState<{
    mission: MissionRecord | null;
    agentRuns: AgentRun[];
    events: FileEvent[];
    errors: {
      mission?: string | null;
      agentRuns?: string | null;
      events?: string | null;
    };
  } | null>(null);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const databaseRequestedRef = useRef(false);
  const lastEventSequenceRef = useRef(0);
  const pollingRef = useRef(false);
  const [checkpointName, setCheckpointName] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<Checkpoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const workspaceRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath),
    [files, selectedPath],
  );

  useEffect(() => {
    setDraft(selectedFile?.content ?? "");
  }, [selectedFile?.content, selectedFile?.path]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !restoreTarget) onClose();
      if (event.key !== "Tab" || !workspaceRef.current) return;
      const focusable = Array.from(
        workspaceRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [onClose, restoreTarget]);

  const loadCheckpoints = async () => {
    const response = await fetch(
      `/api/idealy/missions/${encodeURIComponent(missionId)}/checkpoints`,
      { cache: "no-store", credentials: "same-origin" },
    );
    const payload = await readPayload<{ checkpoints?: Checkpoint[] }>(response);
    setCheckpoints(
      Array.isArray(payload.checkpoints) ? payload.checkpoints : [],
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/idealy/missions/${encodeURIComponent(missionId)}/tasks`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      }),
      fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/checkpoints`,
        {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        },
      ),
      fetch(`/api/idealy/missions/${encodeURIComponent(missionId)}/events`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      }),
    ])
      .then(async ([tasksResponse, checkpointsResponse, eventsResponse]) => {
        const tasksPayload = await readPayload<{ tasks?: Task[] }>(
          tasksResponse,
        );
        const checkpointPayload = await readPayload<{
          checkpoints?: Checkpoint[];
        }>(checkpointsResponse);
        const eventPayload = await readPayload<{
          events?: Task[];
          files?: MissionWorkspaceFile[];
          lastSequence?: number;
        }>(eventsResponse);
        lastEventSequenceRef.current = eventPayload.lastSequence ?? 0;
        setTasks([
          ...(tasksPayload.tasks ?? []),
          ...(eventPayload.events ?? []),
        ]);
        setCheckpoints(checkpointPayload.checkpoints ?? []);
        if (Array.isArray(eventPayload.files) && eventPayload.files.length) {
          setFiles(eventPayload.files);
          setSelectedPath(
            (current) => current || eventPayload.files?.[0]?.path || "",
          );
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "L’espace de mission n’a pas pu être chargé.",
          );
      });
    return () => controller.abort();
  }, [missionId]);

  useEffect(() => {
    if (tab !== "activity") return;
    const controller = new AbortController();
    const poll = async () => {
      if (pollingRef.current || controller.signal.aborted) return;
      pollingRef.current = true;
      try {
        const [tasksResponse, eventsResponse] = await Promise.all([
          fetch(`/api/idealy/missions/${encodeURIComponent(missionId)}/tasks`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }),
          fetch(
            `/api/idealy/missions/${encodeURIComponent(missionId)}/events?afterSequence=${lastEventSequenceRef.current}`,
            {
              cache: "no-store",
              credentials: "same-origin",
              signal: controller.signal,
            },
          ),
        ]);
        const [tasksPayload, eventsPayload] = await Promise.all([
          readPayload<{ tasks?: Task[] }>(tasksResponse),
          readPayload<{ events?: Task[]; lastSequence?: number }>(
            eventsResponse,
          ),
        ]);
        if (controller.signal.aborted) return;
        if (typeof eventsPayload.lastSequence === "number")
          lastEventSequenceRef.current = eventsPayload.lastSequence;
        setTasks((current) => {
          const merged = new Map<string, Task>();
          for (const item of current)
            merged.set(
              item.id ?? `sequence-${item.sequence ?? merged.size}`,
              item,
            );
          for (const item of tasksPayload.tasks ?? [])
            merged.set(item.id ?? `task-${item.title ?? merged.size}`, item);
          for (const item of eventsPayload.events ?? [])
            merged.set(
              item.id ?? `event-${item.sequence ?? merged.size}`,
              item,
            );
          return [...merged.values()];
        });
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "La mise à jour de l’activité a échoué.",
          );
      } finally {
        pollingRef.current = false;
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [missionId, tab]);

  useEffect(() => {
    if (tab !== "data" || databaseSnapshot || databaseRequestedRef.current)
      return;
    const controller = new AbortController();
    databaseRequestedRef.current = true;
    setDatabaseLoading(true);
    setDatabaseError("");
    fetch(`/api/idealy/missions/${encodeURIComponent(missionId)}/database`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) =>
        readPayload<{
          mission?: MissionRecord | null;
          agentRuns?: AgentRun[];
          events?: FileEvent[];
          errors?: {
            mission?: string | null;
            agentRuns?: string | null;
            events?: string | null;
          };
        }>(response),
      )
      .then((payload) => {
        const errors = payload.errors ?? {};
        setDatabaseSnapshot({
          mission: payload.mission ?? null,
          agentRuns: payload.agentRuns ?? [],
          events: payload.events ?? [],
          errors,
        });
        const unavailable = Object.entries(errors)
          .filter(([, value]) => value)
          .map(([key]) => key);
        if (unavailable.length)
          setDatabaseError(
            `Certaines données ne sont pas disponibles : ${unavailable.join(", ")}.`,
          );
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setDatabaseError(
            cause instanceof Error
              ? cause.message
              : "L’inspecteur de données n’a pas pu être chargé.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          databaseRequestedRef.current = false;
          setDatabaseLoading(false);
        }
      });
    return () => {
      controller.abort();
      databaseRequestedRef.current = false;
      setDatabaseLoading(false);
    };
  }, [databaseSnapshot, missionId, tab]);

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/files/edit`,
        {
          body: JSON.stringify({
            content: draft,
            expectedVersion: selectedFile.version,
            path: selectedFile.path,
          }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
      );
      const payload = await readPayload<{ file?: MissionWorkspaceFile }>(
        response,
      );
      const savedFile = payload.file;
      if (!savedFile)
        throw new Error(
          "Le backend n’a pas confirmé la nouvelle version du fichier.",
        );
      setFiles((current) =>
        current.map((file) =>
          file.path === savedFile.path ? savedFile : file,
        ),
      );
      setDraft(savedFile.content);
      setNotice("Fichier enregistré dans l’espace de mission.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "L’enregistrement a échoué.",
      );
    } finally {
      setSaving(false);
    }
  };

  const createCheckpoint = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/checkpoints`,
        {
          body: JSON.stringify({ name: checkpointName.trim() || undefined }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      await readPayload(response);
      setCheckpointName("");
      await loadCheckpoints();
      setNotice("Point de restauration créé.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Le checkpoint n’a pas pu être créé.",
      );
    } finally {
      setBusy(false);
    }
  };

  const restoreCheckpoint = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/rollback`,
        {
          body: JSON.stringify({ checkpointId: restoreTarget.id }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      await readPayload(response);
      const filesResponse = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/files`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const filesPayload = await readPayload<{
        files?: MissionWorkspaceFile[];
      }>(filesResponse);
      const restored = filesPayload.files ?? [];
      setFiles(restored);
      setSelectedPath(restored[0]?.path ?? "");
      setRestoreTarget(null);
      setNotice(
        `Version restaurée : ${restored.length} fichier(s) rechargé(s).`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "La restauration a échoué.",
      );
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: "files", label: `Fichiers (${files.length})` },
    { id: "activity", label: "Activité" },
    { id: "checkpoints", label: `Versions (${checkpoints.length})` },
    { id: "data", label: "Données" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 backdrop-blur-sm sm:p-5">
      <section
        aria-labelledby="mission-workspace-title"
        aria-modal="true"
        className="flex h-[min(780px,94dvh)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-base shadow-elevated"
        ref={workspaceRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border-subtle px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg-subtle text-brand-primary">
              <FileCode2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2
                className="truncate text-sm font-semibold text-text-main"
                id="mission-workspace-title"
              >
                {projectName}
              </h2>
              <p className="text-[10px] text-text-muted">
                Espace de mission · {missionId.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            aria-label="Fermer l’espace de mission"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text-main focus-ring"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        <nav
          aria-label="Sections de l’espace de mission"
          className="flex gap-1 overflow-x-auto border-b border-border-subtle px-3 py-2 sm:px-4"
        >
          {tabs.map((item) => (
            <button
              aria-current={tab === item.id ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium focus-ring ${tab === item.id ? "bg-bg-subtle text-text-main" : "text-text-muted hover:bg-bg-surface hover:text-text-main"}`}
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "files" && (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
            <nav
              aria-label="Fichiers de la mission"
              className="flex max-h-32 gap-1 overflow-x-auto border-b border-border-subtle p-2 md:max-h-none md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3"
            >
              {files.map((file) => (
                <button
                  aria-current={selectedPath === file.path ? "page" : undefined}
                  className={`flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-left text-xs focus-ring md:w-full ${selectedPath === file.path ? "bg-bg-subtle text-text-main" : "text-text-muted hover:bg-bg-surface hover:text-text-main"}`}
                  key={file.path}
                  onClick={() => setSelectedPath(file.path)}
                  type="button"
                >
                  <FileCode2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span className="max-w-48 truncate">{file.path}</span>
                </button>
              ))}
            </nav>
            {selectedFile ? (
              <div className="flex min-h-0 flex-col p-3 sm:p-4">
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs text-text-muted">
                    {selectedFile.path}
                    {selectedFile.version ? ` · v${selectedFile.version}` : ""}
                  </span>
                  <button
                    className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg bg-brand-primary px-3 text-xs font-medium text-brand-onPrimary hover:opacity-90 focus-ring disabled:opacity-60"
                    disabled={
                      saving ||
                      draft === selectedFile.content ||
                      !selectedFile.version
                    }
                    onClick={() => void saveFile()}
                    type="button"
                  >
                    {saving ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-3.5 w-3.5 animate-spin"
                      />
                    ) : (
                      <Save aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    Enregistrer
                  </button>
                </div>
                <textarea
                  aria-label={`Contenu du fichier ${selectedFile.path}`}
                  className="mt-3 min-h-0 flex-1 resize-none rounded-xl border border-border-subtle bg-[#101114] p-4 font-mono text-xs leading-6 text-text-main outline-none focus:border-brand-primary/40"
                  onChange={(event) => setDraft(event.target.value)}
                  spellCheck={false}
                  value={draft}
                />
              </div>
            ) : (
              <div className="grid min-h-0 place-items-center p-6 text-sm text-text-muted">
                Aucun fichier dans cette mission.
              </div>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {tasks.length ? (
              <ol className="mx-auto max-w-3xl space-y-2">
                {tasks.map((task, index) => (
                  <li
                    className="flex gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3"
                    key={task.id ?? `${task.title}-${index}`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg-subtle text-text-muted">
                      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-main">
                        {task.event_type ||
                          task.title ||
                          task.name ||
                          task.agent ||
                          "Événement de mission"}
                        {task.sequence ? ` · #${task.sequence}` : ""}
                      </p>
                      <p className="mt-1 text-[10px] text-text-muted">
                        {task.path || task.status || "Événement enregistré"}
                        {task.created_at || task.updatedAt
                          ? ` · ${new Date(task.created_at || task.updatedAt || "").toLocaleString("fr-FR")}`
                          : ""}
                      </p>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-1 h-3.5 w-3.5 shrink-0 text-text-muted"
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-12 text-center text-sm text-text-muted">
                Aucune tâche ou activité enregistrée.
              </p>
            )}
          </div>
        )}

        {tab === "checkpoints" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                <h3 className="text-sm font-semibold text-text-main">
                  Créer un point de restauration
                </h3>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  Enregistre les fichiers actuels avant d’appliquer d’autres
                  changements.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label="Nom du point de restauration"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-base px-3 text-xs text-text-main focus-ring"
                    maxLength={80}
                    onChange={(event) => setCheckpointName(event.target.value)}
                    placeholder="Nom facultatif"
                    value={checkpointName}
                  />
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border-subtle px-3 text-xs font-medium text-text-main hover:bg-bg-subtle focus-ring disabled:opacity-60"
                    disabled={busy || files.length === 0}
                    onClick={() => void createCheckpoint()}
                    type="button"
                  >
                    {busy ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-3.5 w-3.5 animate-spin"
                      />
                    ) : (
                      <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    Créer un checkpoint
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {checkpoints.map((checkpoint) => (
                  <article
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4"
                    key={checkpoint.id}
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-medium text-text-main">
                        {checkpoint.name}
                      </h3>
                      <p className="mt-1 text-[10px] text-text-muted">
                        {checkpoint.fileCount} fichier(s) ·{" "}
                        {new Date(checkpoint.createdAt).toLocaleString("fr-FR")}
                        {checkpoint.description
                          ? ` · ${checkpoint.description}`
                          : ""}
                      </p>
                    </div>
                    <button
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-border-subtle px-3 text-[11px] font-medium text-text-main hover:bg-bg-subtle focus-ring"
                      onClick={() => setRestoreTarget(checkpoint)}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                      Restaurer
                    </button>
                  </article>
                ))}
                {checkpoints.length === 0 && (
                  <p className="py-8 text-center text-xs text-text-muted">
                    Aucun checkpoint pour le moment.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "data" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-brand-primary">
                  <Database aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-main">
                    Données de la mission
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Vue en lecture seule des métadonnées, des exécutions
                    d’agents et du journal conservés par le backend.
                  </p>
                </div>
              </div>
              {databaseLoading && (
                <p
                  aria-live="polite"
                  className="py-8 text-center text-xs text-text-muted"
                >
                  Chargement des données…
                </p>
              )}
              {databaseError && (
                <p
                  aria-live="polite"
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500"
                >
                  {databaseError}
                </p>
              )}
              {databaseSnapshot && (
                <>
                  <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <h3 className="text-xs font-semibold text-text-main">
                      Enregistrement
                    </h3>
                    {databaseSnapshot.mission ? (
                      <dl className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                        {[
                          [
                            "Titre",
                            databaseSnapshot.mission.title || projectName,
                          ],
                          ["État", databaseSnapshot.mission.status || "—"],
                          ["Mode", databaseSnapshot.mission.way || "—"],
                          [
                            "Créée",
                            databaseSnapshot.mission.created_at
                              ? new Date(
                                  databaseSnapshot.mission.created_at,
                                ).toLocaleString("fr-FR")
                              : "—",
                          ],
                          ["Identifiant", databaseSnapshot.mission.id],
                        ].map(([label, value]) => (
                          <div className="min-w-0" key={label}>
                            <dt className="text-[10px] text-text-muted">
                              {label}
                            </dt>
                            <dd className="mt-1 break-all text-xs text-text-main">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-2 text-xs text-text-muted">
                        L’enregistrement de cette mission n’est pas disponible.
                      </p>
                    )}
                  </section>
                  <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold text-text-main">
                        Exécutions des agents
                      </h3>
                      <span className="text-[10px] text-text-muted">
                        {databaseSnapshot.agentRuns.length}
                      </span>
                    </div>
                    {databaseSnapshot.agentRuns.length ? (
                      <ul className="mt-3 space-y-2">
                        {databaseSnapshot.agentRuns.map((run) => (
                          <li
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-base px-3 py-2"
                            key={run.id}
                          >
                            <span className="text-xs font-medium text-text-main">
                              {run.agent_key} · étape {run.step_index + 1}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              {run.status}
                              {run.started_at
                                ? ` · ${new Date(run.started_at).toLocaleString("fr-FR")}`
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-text-muted">
                        Aucune exécution enregistrée.
                      </p>
                    )}
                  </section>
                  <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold text-text-main">
                        Journal des fichiers
                      </h3>
                      <span className="text-[10px] text-text-muted">
                        {databaseSnapshot.events.length}
                      </span>
                    </div>
                    {databaseSnapshot.events.length ? (
                      <ul className="mt-3 space-y-2">
                        {databaseSnapshot.events
                          .slice(-20)
                          .reverse()
                          .map((event) => (
                            <li
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-base px-3 py-2"
                              key={event.id}
                            >
                              <span className="text-xs font-medium text-text-main">
                                {event.event_type}
                                {event.path ? ` · ${event.path}` : ""}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                #{event.sequence} ·{" "}
                                {new Date(event.created_at).toLocaleString(
                                  "fr-FR",
                                )}
                              </span>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-text-muted">
                        Aucun événement de fichier enregistré.
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        )}

        {(error || notice) && (
          <p
            aria-live="polite"
            className={`border-t border-border-subtle px-4 py-2 text-xs ${error ? "text-amber-500" : "text-text-muted"}`}
          >
            {error || notice}
          </p>
        )}

        {restoreTarget && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
            <section
              aria-labelledby="restore-checkpoint-title"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-elevated"
              role="alertdialog"
            >
              <h2
                className="text-sm font-semibold text-text-main"
                id="restore-checkpoint-title"
              >
                Restaurer « {restoreTarget.name} » ?
              </h2>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Les fichiers actuels de cette mission seront remplacés par cette
                version enregistrée.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="h-9 rounded-lg px-3 text-xs text-text-muted hover:bg-bg-subtle focus-ring"
                  disabled={busy}
                  onClick={() => setRestoreTarget(null)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-medium text-white hover:opacity-90 focus-ring disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void restoreCheckpoint()}
                  type="button"
                >
                  {busy && (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                  )}
                  Restaurer la version
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
};
