import type {
  Artifact,
  Message,
  MissionRun,
  MissionWorkspaceFile,
} from "../types";
import { isAllowedWorkspacePath } from "./runtime/security";

export function getLatestMissionForConversation(
  messages: readonly Message[],
  conversationId: string | null | undefined,
): MissionRun | null {
  if (!conversationId) return null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.conversationId === conversationId && message.mission) {
      return message.mission;
    }
  }
  return null;
}

/**
 * A workbench belongs to a conversation only when that conversation has an
 * actual mission or code deliverable. Plain chats must not reserve the canvas.
 */
export function hasConversationWorkspace(
  messages: readonly Message[],
  artifacts: readonly Artifact[],
  conversationId: string | null | undefined,
): boolean {
  if (!conversationId) return false;

  return (
    Boolean(getLatestMissionForConversation(messages, conversationId)) ||
    artifacts.some(
      (artifact) =>
        artifact.conversationId === conversationId && artifact.type === "code",
    )
  );
}

function keepLatestFile(
  files: readonly MissionWorkspaceFile[],
): MissionWorkspaceFile[] {
  const byPath = new Map<string, MissionWorkspaceFile>();
  for (const file of files) {
    const safe = isAllowedWorkspacePath(file.path);
    if (!safe.allowed) continue;
    if (file.status && !["saved", "validated"].includes(file.status)) continue;
    const normalized = file.path.replaceAll("\\", "/").replace(/^\/+/, "");
    const current = byPath.get(normalized);
    if (!current || (file.version ?? 0) >= (current.version ?? 0)) {
      byPath.set(normalized, { ...file, path: normalized });
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function getConversationWorkspaceFiles(
  messages: readonly Message[],
  artifacts: readonly Artifact[],
  conversationId: string | null | undefined,
): MissionWorkspaceFile[] {
  if (!conversationId) return [];

  const mission = getLatestMissionForConversation(messages, conversationId);
  const missionFiles = mission?.files?.length
    ? keepLatestFile(mission.files)
    : [];

  const artifactFiles = artifacts
    .filter((artifact) => {
      if (artifact.conversationId !== conversationId || artifact.type !== "code") {
        return false;
      }
      // An artifact title represents a source path only when it has a filename
      // extension. Avoid mounting arbitrary document titles as filesystem paths.
      return /(?:^|\/)[^/]+\.[a-z0-9]{1,12}$/i.test(artifact.title);
    })
    .map((artifact) => ({
      content: artifact.content,
      language: artifact.language ?? artifact.title.split(".").pop() ?? "text",
      path: artifact.title,
      status: "saved" as const,
      version: artifact.createdAt,
    }));
  if (!missionFiles.length) return keepLatestFile(artifactFiles);

  // The mission snapshot keeps the backend optimistic-lock version. Locally
  // saved artifact content overlays it so reopening a chat shows the latest edit.
  const merged = new Map(missionFiles.map((file) => [file.path, file]));
  for (const artifact of keepLatestFile(artifactFiles)) {
    const previous = merged.get(artifact.path);
    merged.set(artifact.path, {
      ...artifact,
      version: previous?.version ?? artifact.version,
    });
  }
  return [...merged.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

export function getPreviewRoutes(files: readonly MissionWorkspaceFile[]) {
  const routes = new Map<string, string>([["/", "Accueil"]]);
  for (const file of files) {
    const normalized = file.path.replaceAll("\\", "/");
    const appMatch = normalized.match(/^(?:src\/)?app\/(.+)\/page\.(?:tsx?|jsx?)$/);
    const pagesMatch = normalized.match(/^(?:src\/)?pages\/(.+)\.(?:tsx?|jsx?)$/);
    const match = appMatch ?? pagesMatch;
    if (!match) continue;
    const route = match[1]
      .split("/")
      .filter((part) => part && !/^\([^)]*\)$/.test(part))
      .map((part) => part.replace(/^\[|\]$/g, ""))
      .join("/");
    if (!route) continue;
    routes.set(
      `/${route}`,
      route.split("/").at(-1)?.replace(/[-_]/g, " ") || "Page",
    );
  }
  return [...routes.entries()].map(([path, label]) => ({ path, label }));
}
