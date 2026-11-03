import {
  ChevronRight,
  Clock3,
  CloudUpload,
  Database,
  FileCode2,
  Github,
  LoaderCircle,
  ExternalLink,
  Eye,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Square,
  Terminal,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MissionBuildVerification,
  MissionWorkspaceFile,
} from "../../types";
import type { ProjectRuntimeState } from "../../services/projectRuntime";

type WorkspaceTab =
  | "files"
  | "preview"
  | "activity"
  | "checkpoints"
  | "data"
  | "build"
  | "github"
  | "deploy";
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
type GitHubExport = {
  branch: string;
  owner: string;
  repo: string;
  url?: string;
};
type VercelDeployment = {
  deploymentUrl: string | null;
  projectName: string;
  status: string;
  target: "preview" | "production";
};
type WorkspaceProps = {
  missionId: string;
  projectName: string;
  initialFiles: MissionWorkspaceFile[];
  buildVerification?: MissionBuildVerification;
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

async function githubPayloadDigest(
  project: string,
  branch: string,
  sourceFiles: MissionWorkspaceFile[],
) {
  const files = await Promise.all(
    sourceFiles
      .map((file) => ({ path: file.path, content: file.content }))
      .sort((left, right) => left.path.localeCompare(right.path))
      .map(async ({ path, content }) => {
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(content),
        );
        const checksum = Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        return { path, checksum };
      }),
  );
  const serialized = JSON.stringify({ branch, files, project });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function deploymentPayloadDigest(
  missionId: string,
  projectName: string,
  target: "preview" | "production",
  sourceFiles: MissionWorkspaceFile[],
) {
  const seenPaths = new Set<string>();
  const files = sourceFiles
    .filter((file) => {
      if (file.status !== "saved" || seenPaths.has(file.path)) return false;
      seenPaths.add(file.path);
      return true;
    })
    .map((file) => ({
      path: file.path,
      checksum: file.checksum ?? null,
      version: file.version,
    }));
  const serialized = JSON.stringify({ missionId, projectName, target, files });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createConfirmationToken() {
  const random = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(random)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const MissionWorkspace: React.FC<WorkspaceProps> = ({
  missionId,
  projectName,
  initialFiles,
  buildVerification,
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
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubBranch, setGithubBranch] = useState(
    `idealy/mission-${missionId.slice(0, 8)}`,
  );
  const [githubReviewOpen, setGithubReviewOpen] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubResult, setGithubResult] = useState<GitHubExport | null>(null);
  const [vercelProjectName, setVercelProjectName] = useState(() =>
    projectName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100),
  );
  const [vercelTarget, setVercelTarget] = useState<"preview" | "production">(
    "preview",
  );
  const [vercelReviewOpen, setVercelReviewOpen] = useState(false);
  const [vercelBusy, setVercelBusy] = useState(false);
  const [vercelResult, setVercelResult] = useState<VercelDeployment | null>(
    null,
  );
  const [runtimeState, setRuntimeState] = useState<ProjectRuntimeState>("stopped");
  const [runtimeUrl, setRuntimeUrl] = useState("");
  const [runtimeError, setRuntimeError] = useState("");
  const [runtimeOutput, setRuntimeOutput] = useState("");
  const runtimeModuleRef = useRef<typeof import("../../services/projectRuntime") | null>(null);
  const previewGenerationRef = useRef(0);
  const workspaceRef = useRef<HTMLElement>(null);
  const confirmationDialogRef = useRef<HTMLElement>(null);
  const confirmationButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath),
    [files, selectedPath],
  );
  const hasProjectManifest = files.some(
    (file) => file.path.replaceAll("\\", "/").replace(/^\/+/, "") === "package.json",
  );
  const runtimeBusy = ["booting", "installing", "starting"].includes(runtimeState);

  useEffect(() => {
    previewGenerationRef.current += 1;
    runtimeModuleRef.current?.stopProjectPreview();
    setRuntimeState("stopped");
    setRuntimeUrl("");
    setRuntimeError("");
    setRuntimeOutput("");
    return () => {
      previewGenerationRef.current += 1;
      runtimeModuleRef.current?.stopProjectPreview();
    };
  }, [missionId]);

  const startPreview = async () => {
    if (!hasProjectManifest || runtimeBusy) return;
    setRuntimeError("");
    setRuntimeOutput("");
    setRuntimeUrl("");
    setRuntimeState("booting");
    const generation = ++previewGenerationRef.current;
    try {
      const runtime = await import("../../services/projectRuntime");
      runtimeModuleRef.current = runtime;
      if (generation !== previewGenerationRef.current) {
        runtime.stopProjectPreview();
        return;
      }
      const url = await runtime.startProjectPreview(files, {
        onOutput: (text) =>
          setRuntimeOutput((current) => (current + text).slice(-18_000)),
        onState: setRuntimeState,
      });
      setRuntimeUrl(url);
    } catch (cause) {
      setRuntimeState("error");
      setRuntimeError(
        cause instanceof Error
          ? cause.message
          : "L’aperçu interactif n’a pas pu démarrer.",
      );
    }
  };

  const stopPreview = () => {
    previewGenerationRef.current += 1;
    runtimeModuleRef.current?.stopProjectPreview();
    setRuntimeUrl("");
    setRuntimeState("stopped");
    setRuntimeOutput((current) => `${current}\nProjet arrêté.\n`.slice(-18_000));
  };

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
      if (event.key === "Escape") {
        if (restoreTarget) {
          setRestoreTarget(null);
          event.preventDefault();
          return;
        }
        if (githubReviewOpen) {
          setGithubReviewOpen(false);
          event.preventDefault();
          return;
        }
        if (vercelReviewOpen) {
          setVercelReviewOpen(false);
          event.preventDefault();
          return;
        }
        onClose();
        return;
      }
      if (event.key !== "Tab" || !workspaceRef.current) return;
      const focusable = Array.from(
        (
          confirmationDialogRef.current ?? workspaceRef.current
        ).querySelectorAll<HTMLElement>(
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
  }, [githubReviewOpen, onClose, restoreTarget, vercelReviewOpen]);

  useEffect(() => {
    if (githubReviewOpen || restoreTarget || vercelReviewOpen)
      confirmationButtonRef.current?.focus();
  }, [githubReviewOpen, restoreTarget, vercelReviewOpen]);

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
      let savedNotice = "Fichier enregistré dans l’espace de mission.";
      if (runtimeState === "ready" && runtimeModuleRef.current) {
        try {
          const updated = await runtimeModuleRef.current.updateProjectPreviewFile(
            savedFile.path,
            savedFile.content,
          );
          if (updated) {
            const normalizedPath = savedFile.path
              .replaceAll("\\", "/")
              .replace(/^\/+/, "");
            if (normalizedPath === "package.json") {
              stopPreview();
              savedNotice =
                "Fichier enregistré. Relancez l’aperçu pour appliquer les dépendances.";
            } else {
              savedNotice = "Fichier enregistré et aperçu actualisé.";
            }
          }
        } catch {
          savedNotice =
            "Fichier enregistré. Relancez l’aperçu pour charger la dernière version.";
        }
      }
      setNotice(savedNotice);
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

  const exportToGitHub = async () => {
    const owner = githubOwner.trim();
    const repo = githubRepo.trim();
    const branch = githubBranch.trim();
    if (!owner || !repo || !branch || files.length === 0) {
      setError(
        "Renseignez le propriétaire, le dépôt et une branche ; la mission doit contenir des fichiers.",
      );
      return;
    }
    if (branch === "main" || branch === "master") {
      setError(
        "Choisissez une branche dédiée : l’export direct vers main ou master est bloqué.",
      );
      return;
    }
    if (selectedFile && draft !== selectedFile.content) {
      setError("Enregistrez d’abord le fichier modifié avant l’export GitHub.");
      return;
    }

    setGithubBusy(true);
    setError("");
    setNotice("");
    try {
      const confirmationToken = createConfirmationToken();
      const payloadDigest = await githubPayloadDigest(repo, branch, files);
      const confirmationUrl = `/api/idealy/missions/${encodeURIComponent(missionId)}/confirmation`;
      const preparedResponse = await fetch(confirmationUrl, {
        body: JSON.stringify({
          confirmationToken,
          operation: "github:export",
          payloadDigest,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const prepared = await readPayload<{ status?: string }>(preparedResponse);
      if (prepared.status !== "pending")
        throw new Error("La confirmation GitHub n’a pas été préparée.");

      const approvedResponse = await fetch(confirmationUrl, {
        body: JSON.stringify({ confirmationToken, operation: "github:export" }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const approved = await readPayload<{ status?: string }>(approvedResponse);
      if (approved.status !== "approved")
        throw new Error("La confirmation GitHub n’a pas été validée.");

      const exportResponse = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/github`,
        {
          body: JSON.stringify({ branch, confirmationToken, owner, repo }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const exported = await readPayload<{
        branch?: string;
        branchUrl?: string;
        error?: string;
        repoUrl?: string;
        repository?: string;
        success?: boolean;
      }>(exportResponse);
      if (!exported.success || !exported.branchUrl)
        throw new Error(exported.error || "GitHub n’a pas confirmé l’export.");
      const result = {
        branch: exported.branch ?? branch,
        owner,
        repo: exported.repository ?? `${owner}/${repo}`,
        url: exported.branchUrl,
      };
      setGithubResult(result);
      setGithubReviewOpen(false);
      setNotice(`Export confirmé sur ${result.repo} · ${result.branch}.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "L’export GitHub a échoué.",
      );
    } finally {
      setGithubBusy(false);
    }
  };

  const deployToVercel = async () => {
    const name = vercelProjectName.trim();
    if (!/^[a-z0-9-]{1,100}$/i.test(name)) {
      setError(
        "Le nom du projet Vercel doit contenir uniquement des lettres, chiffres et tirets.",
      );
      return;
    }
    if (selectedFile && draft !== selectedFile.content) {
      setError("Enregistrez d’abord le fichier modifié avant le déploiement.");
      return;
    }
    if (
      vercelTarget === "production" &&
      buildVerification?.status !== "passed"
    ) {
      setError("La production est disponible après la réussite du build.");
      return;
    }

    setVercelBusy(true);
    setError("");
    setNotice("");
    try {
      const filesResponse = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/files`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const filesPayload = await readPayload<{
        files?: MissionWorkspaceFile[];
      }>(filesResponse);
      const seenPaths = new Set<string>();
      const deployableFiles = (filesPayload.files ?? []).filter((file) => {
        if (file.status !== "saved" || seenPaths.has(file.path)) return false;
        seenPaths.add(file.path);
        return true;
      });
      if (!deployableFiles.length)
        throw new Error("Aucun fichier enregistré n’est prêt au déploiement.");

      const confirmationToken = createConfirmationToken();
      const payloadDigest = await deploymentPayloadDigest(
        missionId,
        name,
        vercelTarget,
        deployableFiles,
      );
      const confirmationUrl = `/api/idealy/missions/${encodeURIComponent(missionId)}/confirmation`;
      const preparedResponse = await fetch(confirmationUrl, {
        body: JSON.stringify({
          confirmationToken,
          operation: "vercel:deploy",
          payloadDigest,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const prepared = await readPayload<{ status?: string }>(preparedResponse);
      if (prepared.status !== "pending")
        throw new Error("La confirmation du déploiement n’a pas été préparée.");

      const approvedResponse = await fetch(confirmationUrl, {
        body: JSON.stringify({
          confirmationToken,
          operation: "vercel:deploy",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const approved = await readPayload<{ status?: string }>(approvedResponse);
      if (approved.status !== "approved")
        throw new Error("La confirmation du déploiement n’a pas été validée.");

      const deployResponse = await fetch(
        `/api/idealy/missions/${encodeURIComponent(missionId)}/vercel`,
        {
          body: JSON.stringify({
            confirmationToken,
            projectName: name,
            target: vercelTarget,
          }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const deployed = await readPayload<{
        deploymentUrl?: string | null;
        projectName?: string;
        status?: string;
        target?: "preview" | "production";
      }>(deployResponse);
      if (!deployed.status)
        throw new Error("Vercel n’a pas confirmé la création du déploiement.");
      const result: VercelDeployment = {
        deploymentUrl: deployed.deploymentUrl ?? null,
        projectName: deployed.projectName ?? name,
        status: deployed.status,
        target: deployed.target ?? vercelTarget,
      };
      setVercelResult(result);
      setVercelReviewOpen(false);
      setNotice(
        `Déploiement ${result.target === "production" ? "de production" : "preview"} transmis à Vercel · ${result.status}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Le déploiement Vercel a échoué.",
      );
    } finally {
      setVercelBusy(false);
    }
  };

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: "files", label: `Fichiers (${files.length})` },
    { id: "preview", label: "Aperçu" },
    { id: "activity", label: "Activité" },
    { id: "checkpoints", label: `Versions (${checkpoints.length})` },
    { id: "data", label: "Données" },
    { id: "build", label: "Build" },
    { id: "github", label: "GitHub" },
    { id: "deploy", label: "Déployer" },
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

        {tab === "preview" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border-subtle px-4">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                {runtimeState === "ready" ? (
                  <span className="text-emerald-500">Application en cours</span>
                ) : (
                  <span>Exécution interactive du projet</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {runtimeUrl && (
                  <a
                    aria-label="Ouvrir l’aperçu dans un nouvel onglet"
                    className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-bg-subtle hover:text-text-main focus-ring"
                    href={runtimeUrl}
                    rel="noreferrer"
                    target="_blank"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                )}
                {runtimeBusy ? (
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 text-[11px] font-medium text-text-main hover:bg-bg-subtle focus-ring"
                    onClick={stopPreview}
                    type="button"
                  >
                    <Square aria-hidden="true" className="h-3 w-3 fill-current" />
                    Arrêter
                  </button>
                ) : (
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-primary px-2.5 text-[11px] font-medium text-brand-onPrimary hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!hasProjectManifest}
                    onClick={() => void startPreview()}
                    type="button"
                  >
                    <Play aria-hidden="true" className="h-3 w-3 fill-current" />
                    {runtimeState === "ready" ? "Relancer" : "Lancer"}
                  </button>
                )}
              </div>
            </div>
            {runtimeUrl ? (
              <iframe
                allow="cross-origin-isolated"
                className="min-h-0 flex-1 border-0 bg-white"
                referrerPolicy="no-referrer"
                src={runtimeUrl}
                title="Aperçu interactif de l’application générée"
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border-subtle bg-bg-surface text-brand-primary shadow-subtle">
                  {runtimeBusy ? (
                    <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
                  ) : (
                    <Terminal aria-hidden="true" className="h-5 w-5" />
                  )}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-text-main">
                  {runtimeBusy ? "Préparation du projet" : "Aperçu interactif"}
                </h3>
                <p className="mt-1.5 max-w-sm text-[12px] leading-5 text-text-muted">
                  {hasProjectManifest
                    ? "Idealy installe les dépendances et lance le projet dans un runtime isolé de ce navigateur."
                    : "Le projet doit contenir un package.json à sa racine pour démarrer son application."}
                </p>
                {!hasProjectManifest && (
                  <button
                    className="mt-3 text-xs font-medium text-brand-primary hover:underline focus-ring"
                    onClick={() => setTab("files")}
                    type="button"
                  >
                    Voir les fichiers du projet
                  </button>
                )}
                {runtimeError && (
                  <div
                    className="mt-4 max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-left text-[11px] leading-5 text-amber-500"
                    role="alert"
                  >
                    {runtimeError}
                  </div>
                )}
              </div>
            )}
            {(runtimeOutput || runtimeBusy) && (
              <div className="max-h-48 shrink-0 border-t border-border-subtle bg-[#111318]">
                <div className="flex h-8 items-center gap-2 border-b border-white/[0.06] px-3 text-[10px] font-medium text-white/65">
                  <Terminal aria-hidden="true" className="h-3 w-3" />
                  Terminal du projet
                  <span className="ml-auto text-white/40">
                    {runtimeBusy ? "En cours" : runtimeState === "error" ? "Erreur" : "Sortie"}
                  </span>
                </div>
                <pre
                  aria-live="polite"
                  className="max-h-40 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[10px] leading-4 text-white/75"
                >
                  {runtimeOutput || "Préparation du terminal…"}
                </pre>
              </div>
            )}
            <p className="border-t border-border-subtle px-4 py-2 text-[10px] leading-4 text-text-muted">
              Le lancement commence après votre clic. Les dépendances du projet sont téléchargées depuis npm.
            </p>
          </div>
        )}

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
                  className="mt-3 min-h-0 flex-1 resize-none rounded-xl border border-border-subtle bg-bg-base p-4 font-mono text-xs leading-6 text-text-main outline-none focus:border-brand-primary/40"
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

        {tab === "github" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-text-main">
                  <Github aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-main">
                    Exporter cette mission vers GitHub
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Les fichiers enregistrés seront publiés dans une branche
                    dédiée du dépôt connecté. L’export ne modifie pas main ou
                    master.
                  </p>
                </div>
              </div>
              <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-text-muted">
                    Propriétaire GitHub
                    <input
                      autoComplete="off"
                      className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                      maxLength={100}
                      onChange={(event) => setGithubOwner(event.target.value)}
                      placeholder="organisation ou compte"
                      value={githubOwner}
                    />
                  </label>
                  <label className="block text-xs font-medium text-text-muted">
                    Nom du dépôt
                    <input
                      autoComplete="off"
                      className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                      maxLength={100}
                      onChange={(event) => setGithubRepo(event.target.value)}
                      placeholder="mon-projet"
                      value={githubRepo}
                    />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-medium text-text-muted">
                  Branche cible
                  <input
                    autoComplete="off"
                    className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 font-mono text-xs text-text-main focus-ring"
                    maxLength={120}
                    onChange={(event) => setGithubBranch(event.target.value)}
                    value={githubBranch}
                  />
                </label>
                <p className="mt-3 text-[11px] leading-5 text-text-muted">
                  {files.length} fichier(s) · Les brouillons doivent être
                  enregistrés. Une confirmation à usage unique lie l’accord au
                  contenu exact exporté.
                </p>
                {githubResult?.url && (
                  <a
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-bg-subtle px-3 text-xs font-medium text-brand-primary hover:underline focus-ring"
                    href={githubResult.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Github aria-hidden="true" className="h-3.5 w-3.5" />
                    Ouvrir {githubResult.repo} · {githubResult.branch}
                  </a>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-text-main px-4 text-sm font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-50"
                    disabled={
                      files.length === 0 ||
                      !githubOwner.trim() ||
                      !githubRepo.trim() ||
                      githubBusy
                    }
                    onClick={() => {
                      setError("");
                      setGithubReviewOpen(true);
                    }}
                    type="button"
                  >
                    <Github aria-hidden="true" className="h-4 w-4" />
                    Examiner l’export
                  </button>
                  <a
                    className="text-xs text-text-muted underline-offset-4 hover:text-text-main hover:underline focus-ring"
                    href="/connectors"
                  >
                    Gérer les connecteurs
                  </a>
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "deploy" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-text-main">
                  <CloudUpload aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-main">
                    Déployer sur Vercel
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Envoie les fichiers enregistrés à votre compte Vercel.
                    Chaque déploiement nécessite une confirmation liée à son
                    contenu exact.
                  </p>
                </div>
              </div>
              <section className="rounded-xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
                <label className="block text-xs font-medium text-text-muted">
                  Nom du projet Vercel
                  <input
                    autoComplete="off"
                    className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 font-mono text-sm text-text-main focus-ring"
                    maxLength={100}
                    onChange={(event) =>
                      setVercelProjectName(event.target.value)
                    }
                    placeholder="mon-projet"
                    value={vercelProjectName}
                  />
                </label>
                <label className="mt-4 block text-xs font-medium text-text-muted">
                  Cible
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                    onChange={(event) =>
                      setVercelTarget(
                        event.target.value as "preview" | "production",
                      )
                    }
                    value={vercelTarget}
                  >
                    <option value="preview">Preview</option>
                    <option
                      disabled={buildVerification?.status !== "passed"}
                      value="production"
                    >
                      Production — build vérifié requis
                    </option>
                  </select>
                </label>
                <p className="mt-3 text-[11px] leading-5 text-text-muted">
                  Le build E2B{" "}
                  {buildVerification?.status === "passed"
                    ? "a réussi"
                    : "n’est pas encore confirmé comme réussi"}
                  . La production reste désactivée jusqu’à la réussite du build.
                  Le compte Vercel doit être connecté.
                </p>
                {vercelResult && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-bg-subtle px-3 py-2.5">
                    <span className="text-xs text-text-main">
                      {vercelResult.target === "production"
                        ? "Production"
                        : "Preview"}{" "}
                      · {vercelResult.projectName} · {vercelResult.status}
                    </span>
                    {vercelResult.deploymentUrl && (
                      <a
                        className="min-h-8 text-xs font-medium text-brand-primary underline-offset-4 hover:underline focus-ring"
                        href={vercelResult.deploymentUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ouvrir le déploiement
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-text-main px-4 text-sm font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-50"
                    disabled={
                      vercelBusy ||
                      !vercelProjectName.trim() ||
                      (vercelTarget === "production" &&
                        buildVerification?.status !== "passed")
                    }
                    onClick={() => {
                      setError("");
                      setVercelReviewOpen(true);
                    }}
                    type="button"
                  >
                    <CloudUpload aria-hidden="true" className="h-4 w-4" />
                    Examiner le déploiement
                  </button>
                  <a
                    className="text-xs text-text-muted underline-offset-4 hover:text-text-main hover:underline focus-ring"
                    href="/connectors"
                  >
                    Gérer les connecteurs
                  </a>
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "build" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-brand-primary">
                  <Terminal aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-main">
                    Vérification du build
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    Résultat du build isolé exécuté par le backend après la
                    génération. Ce rapport ne représente pas un terminal
                    interactif.
                  </p>
                </div>
                {buildVerification && (
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${buildVerification.status === "passed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}
                  >
                    {buildVerification.status === "passed"
                      ? "Réussi"
                      : buildVerification.status === "failed"
                        ? "À corriger"
                        : "Non configuré"}
                  </span>
                )}
              </div>
              {buildVerification ? (
                <>
                  <section className="rounded-xl border border-border-subtle bg-bg-surface p-4">
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] text-text-muted">
                          Commande
                        </dt>
                        <dd className="mt-1 font-mono text-xs text-text-main">
                          {buildVerification.command ||
                            "npm install · npm run build"}
                        </dd>
                      </div>
                      {typeof buildVerification.durationMs === "number" && (
                        <div>
                          <dt className="text-[10px] text-text-muted">Durée</dt>
                          <dd className="mt-1 text-xs text-text-main">
                            {(buildVerification.durationMs / 1000).toFixed(1)} s
                          </dd>
                        </div>
                      )}
                    </dl>
                    {buildVerification.error && (
                      <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-500">
                        {buildVerification.error}
                      </p>
                    )}
                  </section>
                  {buildVerification.stdout && (
                    <section className="overflow-hidden rounded-xl border border-border-subtle bg-bg-base">
                      <h4 className="border-b border-border-subtle px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Sortie standard
                      </h4>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-5 text-text-main">
                        {buildVerification.stdout}
                      </pre>
                    </section>
                  )}
                  {buildVerification.stderr && (
                    <section className="overflow-hidden rounded-xl border border-amber-500/20 bg-bg-base">
                      <h4 className="border-b border-amber-500/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                        Erreurs et avertissements
                      </h4>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-5 text-text-main">
                        {buildVerification.stderr}
                      </pre>
                    </section>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-border-subtle bg-bg-surface px-4 py-8 text-center text-xs leading-5 text-text-muted">
                  Aucun rapport de build n’est enregistré pour cette mission.
                  Lancez la mission pour demander sa génération et sa
                  vérification.
                </p>
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
              ref={confirmationDialogRef}
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
                  ref={confirmationButtonRef}
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

        {githubReviewOpen && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
            <section
              aria-labelledby="github-export-title"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-elevated"
              ref={confirmationDialogRef}
              role="alertdialog"
            >
              <h2
                className="text-sm font-semibold text-text-main"
                id="github-export-title"
              >
                Confirmer l’export GitHub
              </h2>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Idealy va écrire {files.length} fichier(s) dans{" "}
                <strong className="font-medium text-text-main">
                  {githubOwner.trim()}/{githubRepo.trim()}
                </strong>
                , branche{" "}
                <strong className="font-medium text-text-main">
                  {githubBranch.trim()}
                </strong>
                . La branche distante sera créée ou mise à jour avec ces
                fichiers.
              </p>
              <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-5 text-amber-500">
                Cette action publie le contenu de la mission sur GitHub.
                Vérifiez qu’il ne contient aucun secret ni donnée privée.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="h-9 rounded-lg px-3 text-xs text-text-muted hover:bg-bg-subtle focus-ring"
                  disabled={githubBusy}
                  onClick={() => setGithubReviewOpen(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-text-main px-3 text-xs font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-60"
                  disabled={githubBusy}
                  onClick={() => void exportToGitHub()}
                  ref={confirmationButtonRef}
                  type="button"
                >
                  {githubBusy ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                  ) : (
                    <Github aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {githubBusy ? "Export en cours…" : "Confirmer et exporter"}
                </button>
              </div>
            </section>
          </div>
        )}

        {vercelReviewOpen && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
            <section
              aria-labelledby="vercel-deploy-title"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-elevated"
              ref={confirmationDialogRef}
              role="alertdialog"
            >
              <h2
                className="text-sm font-semibold text-text-main"
                id="vercel-deploy-title"
              >
                Confirmer le déploiement Vercel
              </h2>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Idealy va envoyer les fichiers enregistrés de cette mission vers
                le projet{" "}
                <strong className="font-medium text-text-main">
                  {vercelProjectName.trim()}
                </strong>{" "}
                en cible{" "}
                <strong className="font-medium text-text-main">
                  {vercelTarget === "production" ? "production" : "preview"}
                </strong>
                .
              </p>
              <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-5 text-amber-500">
                {vercelTarget === "production"
                  ? "Ce déploiement sera publié en production et peut remplacer le site actuellement en ligne."
                  : "Vercel créera un déploiement de preview distinct de la production."}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="h-9 rounded-lg px-3 text-xs text-text-muted hover:bg-bg-subtle focus-ring"
                  disabled={vercelBusy}
                  onClick={() => setVercelReviewOpen(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-text-main px-3 text-xs font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-60"
                  disabled={vercelBusy}
                  onClick={() => void deployToVercel()}
                  ref={confirmationButtonRef}
                  type="button"
                >
                  {vercelBusy ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                  ) : (
                    <CloudUpload aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {vercelBusy
                    ? "Déploiement en cours…"
                    : "Confirmer et déployer"}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
};
