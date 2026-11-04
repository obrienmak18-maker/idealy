import type {
  Artifact,
  AssistantToolActivity,
  Attachment,
  IntentionMode,
  MissionFileActivity,
  MissionPlan,
  MissionRoute,
  SubAgentProgress,
} from "../types";

export interface AssistantStreamCallbacks {
  onArtifact?: (artifact: Omit<Artifact, "id" | "createdAt">) => void;
  onChunk: (chunk: string) => void;
  onComplete?: (reasoningDuration?: number) => void;
  onError?: (error: Error) => void;
  onMissionPlan?: (missionId: string, plan: MissionPlan) => void;
  onMissionRoute?: (route: MissionRoute) => void;
  onMissionFileEvent?: (event: MissionFileActivity) => void;
  onReasoningChunk?: (chunk: string) => void;
  onSubAgentProgress?: (progress: SubAgentProgress) => void;
  onToolActivity?: (activity: AssistantToolActivity) => void;
}

export interface SendMessageOptions {
  callbacks: AssistantStreamCallbacks;
  content: string;
  attachments?: Attachment[];
  conversationId: string;
  conversationTitle?: string;
  deepThink?: boolean;
  mode: IntentionMode;
  signal?: AbortSignal;
  spaceInstructions?: string;
  webSearch?: boolean;
}

const CHAT_ID_MAP_KEY = "idealy_backend_chat_ids_v1";
const DEFAULT_MODEL_ID = "deepseek/deepseek-v3.2";

type UiStreamEvent = {
  type?: string;
  id?: string;
  delta?: unknown;
  data?: unknown;
  errorText?: unknown;
};

function createUuid(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getBackendChatId(conversationId: string): string {
  try {
    const saved = JSON.parse(
      localStorage.getItem(CHAT_ID_MAP_KEY) || "{}",
    ) as Record<string, string>;
    const existing = saved[conversationId];
    if (existing) {
      return existing;
    }
    const id = createUuid();
    localStorage.setItem(
      CHAT_ID_MAP_KEY,
      JSON.stringify({ ...saved, [conversationId]: id }),
    );
    return id;
  } catch {
    return createUuid();
  }
}

export function linkBackendChatId(
  conversationId: string,
  backendChatId: string,
): void {
  try {
    const saved = JSON.parse(
      localStorage.getItem(CHAT_ID_MAP_KEY) || "{}",
    ) as Record<string, string>;
    localStorage.setItem(
      CHAT_ID_MAP_KEY,
      JSON.stringify({ ...saved, [conversationId]: backendChatId }),
    );
  } catch {
    // The remote history can still be read for this session if storage is disabled.
  }
}

export function getLinkedBackendChatIds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CHAT_ID_MAP_KEY) || "{}") as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

async function getSelectedModel(): Promise<string> {
  const configured = import.meta.env.VITE_IDEALY_CHAT_MODEL?.trim();
  if (configured) {
    return configured;
  }

  try {
    const response = await fetch("/api/models", { credentials: "same-origin" });
    if (response.ok) {
      const payload = (await response.json()) as
        | {
            models?: Array<{ id?: unknown }>;
            capabilities?: Record<string, unknown>;
          }
        | Record<string, unknown>;
      const modelIds = Array.isArray(payload.models)
        ? payload.models
            .map((model) => model.id)
            .filter((id): id is string => typeof id === "string")
        : Object.keys(
            "capabilities" in payload &&
              payload.capabilities &&
              typeof payload.capabilities === "object"
              ? payload.capabilities
              : payload,
          );
      return (
        modelIds.find((id) => id.toLowerCase().includes("deepseek")) ??
        modelIds[0] ??
        DEFAULT_MODEL_ID
      );
    }
  } catch {
    // The chat endpoint will return the actionable connection error.
  }

  return DEFAULT_MODEL_ID;
}

async function responseError(response: Response): Promise<Error> {
  const payload = (await response.json().catch(() => null)) as {
    error?: unknown;
    message?: unknown;
  } | null;
  const serverMessage =
    typeof payload?.error === "string"
      ? payload.error
      : typeof payload?.message === "string"
        ? payload.message
        : "";

  if (response.status === 401 || response.status === 403) {
    return new Error(
      `${serverMessage || "Une session Idealy est nécessaire pour utiliser le moteur IA."} Connectez-vous, puis revenez au chat : /login?callbackUrl=%2F`,
    );
  }

  return new Error(
    serverMessage ||
      `Le backend Idealy a répondu avec le statut ${response.status}.`,
  );
}

function artifactType(value: string): Artifact["type"] {
  if (value === "document" || value === "table" || value === "specification") {
    return value;
  }
  return "code";
}

export const AssistantRemoteService = {
  async streamResponse(options: SendMessageOptions): Promise<void> {
    const { content, conversationId, signal, callbacks } = options;
    if (signal?.aborted) {
      callbacks.onComplete?.();
      return;
    }

    const startedAt = Date.now();
    const remoteChatId = getBackendChatId(conversationId);
    const selectedChatModel = await getSelectedModel();

    const fileParts = await Promise.all(
      (options.attachments ?? []).map(async (attachment) => {
        if (!attachment.file) {
          if (attachment.url) {
            return {
              filename: attachment.name,
              mediaType: attachment.type || "application/octet-stream",
              type: "file" as const,
              url: attachment.url,
            };
          }
          throw new Error(
            `Le fichier « ${attachment.name} » n’est plus disponible. Ajoutez-le de nouveau avant l’envoi.`,
          );
        }
        const formData = new FormData();
        formData.set("file", attachment.file, attachment.name);
        const upload = await fetch("/api/files/upload", {
          body: formData,
          credentials: "same-origin",
          method: "POST",
          signal,
        });
        if (!upload.ok) {
          throw await responseError(upload);
        }
        const result = (await upload.json()) as {
          contentType?: string;
          url?: string;
        };
        if (!result.url || !result.url.startsWith("https://")) {
          throw new Error(
            "Le stockage des fichiers n’est pas configuré pour fournir une URL sécurisée. Configurez Supabase Storage, puis réessayez.",
          );
        }
        return {
          filename: attachment.name,
          mediaType:
            result.contentType || attachment.type || "application/octet-stream",
          type: "file" as const,
          url: result.url,
        };
      }),
    );
    const parts = [
      ...(content.trim()
        ? [{ text: content.trim(), type: "text" as const }]
        : options.attachments?.length
          ? [
              {
                text: "Veuillez examiner les fichiers joints à ce message.",
                type: "text" as const,
              },
            ]
          : []),
      ...fileParts,
    ];

    let response: Response;
    try {
      response = await fetch("/api/chat", {
        body: JSON.stringify({
          id: remoteChatId,
          message: {
            id: createUuid(),
            parts,
            role: "user",
          },
          selectedChatModel,
          selectedVisibilityType: "private",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal,
      });
    } catch (error) {
      if (signal?.aborted) {
        callbacks.onComplete?.();
        return;
      }
      const networkError =
        error instanceof Error
          ? error
          : new Error("Connexion au backend Idealy impossible.");
      callbacks.onError?.(networkError);
      throw networkError;
    }

    if (!response.ok) {
      const error = await responseError(response);
      callbacks.onError?.(error);
      throw error;
    }
    if (!response.body) {
      const error = new Error(
        "Le backend Idealy a répondu sans flux de génération.",
      );
      callbacks.onError?.(error);
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    let code = "";
    let kind = "code";
    let title = options.conversationTitle || "Production Idealy";
    let missionId = "";
    let frameError: Error | null = null;

    const handleFrame = (frame: string) => {
      const dataLines = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"));
      if (dataLines.length === 0) {
        return;
      }
      const raw = dataLines
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();
      if (!raw || raw === "[DONE]") {
        return;
      }

      let event: UiStreamEvent;
      try {
        event = JSON.parse(raw) as UiStreamEvent;
      } catch {
        return;
      }

      if (event.type === "text-delta" && typeof event.delta === "string") {
        callbacks.onChunk(event.delta);
      } else if (event.type === "data-kind" && typeof event.data === "string") {
        kind = event.data;
      } else if (
        event.type === "data-title" &&
        typeof event.data === "string"
      ) {
        title = event.data;
      } else if (
        event.type === "data-codeDelta" &&
        typeof event.data === "string"
      ) {
        code = event.data;
      } else if (
        event.type === "data-idealy-mission" &&
        typeof event.data === "string"
      ) {
        missionId = event.data;
      } else if (
        event.type === "data-idealy-plan" &&
        missionId &&
        event.data &&
        typeof event.data === "object"
      ) {
        callbacks.onMissionPlan?.(missionId, event.data as MissionPlan);
      } else if (
        event.type === "data-idealy-route" &&
        event.data &&
        typeof event.data === "object"
      ) {
        callbacks.onMissionRoute?.(event.data as MissionRoute);
      } else if (
        event.type === "data-idealy-tool-activity" &&
        event.data &&
        typeof event.data === "object"
      ) {
        const activity = event.data as AssistantToolActivity;
        if (
          typeof activity.toolCallId === "string" &&
          [
            "webSearch",
            "searchImages",
            "generateImage",
            "dispatchSubAgents",
            "generateVideo",
            "renderWidget",
          ].includes(activity.kind) &&
          ["input-available", "output-available", "output-error"].includes(
            activity.state,
          )
        ) {
          callbacks.onToolActivity?.({
            input: {},
            kind: activity.kind,
            state: activity.state,
            toolCallId: activity.toolCallId,
          });
        }
      } else if (
        event.type === "data-idealy-file-event" &&
        event.data &&
        typeof event.data === "object"
      ) {
        const fileEvent = event.data as MissionFileActivity;
        if (
          typeof fileEvent.missionId === "string" &&
          typeof fileEvent.eventType === "string" &&
          typeof fileEvent.sequence === "number"
        ) {
          callbacks.onMissionFileEvent?.({
            eventType: fileEvent.eventType,
            missionId: fileEvent.missionId,
            sequence: fileEvent.sequence,
            ...(typeof fileEvent.path === "string"
              ? { path: fileEvent.path }
              : {}),
            ...(fileEvent.file && typeof fileEvent.file === "object"
              ? {
                  file: {
                    ...(typeof fileEvent.file.path === "string"
                      ? { path: fileEvent.file.path }
                      : {}),
                    ...(typeof fileEvent.file.status === "string"
                      ? { status: fileEvent.file.status }
                      : {}),
                  },
                }
              : {}),
          });
        }
      } else if (
        event.type === "data-idealy-subagent" &&
        event.data &&
        typeof event.data === "object"
      ) {
        const candidate = event.data as SubAgentProgress;
        const validStatuses = ["queued", "running", "completed", "failed"];
        if (
          typeof candidate.objective === "string" &&
          typeof candidate.squad === "string" &&
          typeof candidate.timestamp === "number" &&
          Array.isArray(candidate.agents)
        ) {
          const agents = candidate.agents.flatMap((agent) =>
            agent &&
            typeof agent.id === "string" &&
            typeof agent.name === "string" &&
            typeof agent.role === "string" &&
            typeof agent.task === "string" &&
            validStatuses.includes(agent.status)
              ? [
                  {
                    id: agent.id.slice(0, 100),
                    name: agent.name.slice(0, 48),
                    role: agent.role.slice(0, 80),
                    status: agent.status,
                    task: agent.task.slice(0, 1200),
                    ...(typeof agent.summary === "string"
                      ? { summary: agent.summary.slice(0, 900) }
                      : {}),
                  },
                ]
              : [],
          );
          if (agents.length && agents.length <= 3) {
            callbacks.onSubAgentProgress?.({
              agents,
              objective: candidate.objective.slice(0, 1200),
              squad: candidate.squad.slice(0, 48),
              timestamp: candidate.timestamp,
            });
          }
        }
      } else if (event.type === "error") {
        frameError = new Error(
          typeof event.errorText === "string"
            ? event.errorText
            : "La génération a échoué côté backend.",
        );
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        pending += decoder.decode(value, { stream: true });
        const frames = pending.split(/\r?\n\r?\n/);
        pending = frames.pop() ?? "";
        frames.forEach(handleFrame);
        if (frameError) {
          throw frameError;
        }
      }
      pending += decoder.decode();
      if (pending.trim()) {
        handleFrame(pending);
      }
      if (frameError) {
        throw frameError;
      }

      if (!signal?.aborted && code.trim()) {
        callbacks.onArtifact?.({
          content: code,
          conversationId: "",
          language: "tsx",
          title,
          type: artifactType(kind),
        });
      }
      callbacks.onComplete?.(
        Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      );
    } catch (error) {
      if (signal?.aborted) {
        callbacks.onComplete?.();
        return;
      }
      const streamError =
        error instanceof Error
          ? error
          : new Error("Le flux de génération a été interrompu.");
      callbacks.onError?.(streamError);
      throw streamError;
    } finally {
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
      }
    }
  },
};
