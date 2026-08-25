export type MissionFileStatus =
  | "pending"
  | "writing"
  | "saved"
  | "validated"
  | "error";

export type MissionFile = {
  checksum?: string;
  content?: string;
  id?: string;
  language?: string;
  missionId: string;
  path: string;
  status: MissionFileStatus;
  updatedAt?: string;
  version: number;
};

export type MissionFileEventType =
  | "mission_started"
  | "agent_started"
  | "file_started"
  | "file_content"
  | "file_saved"
  | "build_log"
  | "validation_result"
  | "mission_completed"
  | "mission_error";

export type MissionFileEvent = {
  eventType: MissionFileEventType;
  file?: MissionFile;
  missionId: string;
  path?: string;
  payload?: Record<string, unknown>;
  sequence: number;
};

export function normalizeMissionFilePath(path: string) {
  const normalized = path.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("..") ||
    normalized.length > 240
  ) {
    throw new Error("Invalid mission file path.");
  }
  return normalized;
}

export function languageFromMissionFilePath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    css: "css",
    html: "html",
    js: "javascript",
    json: "json",
    md: "markdown",
    scss: "scss",
    ts: "typescript",
    tsx: "tsx",
  };
  return extension ? languages[extension] ?? extension : undefined;
}

export function mergeMissionFileEvent(
  state: { files: MissionFile[]; lastSequence: number },
  event: MissionFileEvent
) {
  if (event.sequence <= state.lastSequence) return state;
  const files = [...state.files];
  if (event.file) {
    const existingIndex = files.findIndex(
      (file) =>
        file.missionId === event.file?.missionId &&
        file.path === event.file.path &&
        file.version === event.file.version
    );
    if (existingIndex >= 0) {
      files[existingIndex] = { ...files[existingIndex], ...event.file };
    } else {
      files.push(event.file);
    }
  }
  return { files, lastSequence: event.sequence };
}
