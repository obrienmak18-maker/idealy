import { describe, expect, it } from "vitest";
import type { Artifact, Message, MissionWorkspaceFile } from "../types";
import {
  getConversationWorkspaceFiles,
  getLatestMissionForConversation,
  getPreviewRoutes,
} from "../services/conversationWorkspace";

const artifacts: Artifact[] = [
  {
    content: "{\"name\":\"demo\",\"scripts\":{\"dev\":\"vite\"}}",
    conversationId: "chat-a",
    createdAt: 1,
    id: "package",
    language: "json",
    title: "package.json",
    type: "code",
  },
  {
    content: "<div>Bonjour</div>",
    conversationId: "chat-a",
    createdAt: 2,
    id: "index",
    language: "html",
    title: "index.html",
    type: "code",
  },
  {
    content: "secret",
    conversationId: "chat-b",
    createdAt: 3,
    id: "other",
    language: "env",
    title: ".env.local",
    type: "code",
  },
  {
    content: "old",
    conversationId: "chat-a",
    createdAt: 4,
    id: "readme",
    language: "markdown",
    title: "Notes",
    type: "document",
  },
];

describe("conversation workspace files", () => {
  it("uses only source artifacts owned by the active conversation", () => {
    const files = getConversationWorkspaceFiles([], artifacts, "chat-a");
    expect(files.map((file) => file.path)).toEqual(["index.html", "package.json"]);
  });

  it("never returns files for a missing conversation", () => {
    expect(getConversationWorkspaceFiles([], artifacts, null)).toEqual([]);
  });

  it("prefers persisted mission files and their latest versions", () => {
    const missionFiles: MissionWorkspaceFile[] = [
      { content: "old", path: "src/App.tsx", status: "saved", version: 1 },
      { content: "new", path: "src/App.tsx", status: "saved", version: 2 },
      { content: "blocked", path: ".env.local", status: "saved", version: 1 },
    ];
    const messages = [{
      conversationId: "chat-a",
      createdAt: 10,
      id: "m1",
      content: "",
      mode: "produce",
      role: "assistant",
      mission: {
        id: "mission-a",
        plan: { agents: [], intention: "", nextStep: "", projectKind: "", v1Scope: "" },
        status: "ready",
        files: missionFiles,
      },
    }] as Message[];
    expect(getConversationWorkspaceFiles(messages, artifacts, "chat-a")).toEqual([
      {
        content: "<div>Bonjour</div>",
        language: "html",
        path: "index.html",
        status: "saved",
        version: 2,
      },
      {
        content: "{\\"name\\":\\"demo\\",\\"scripts\\":{\\"dev\\":\\"vite\\"}}",
        language: "json",
        path: "package.json",
        status: "saved",
        version: 1,
      },
      { content: "new", path: "src/App.tsx", status: "saved", version: 2 },
    ]);
  });

  it("derives routes from real Next.js and pages-router source files", () => {
    const files: MissionWorkspaceFile[] = [
      { path: "src/app/page.tsx", content: "" },
      { path: "src/app/dashboard/page.tsx", content: "" },
      { path: "src/pages/settings.tsx", content: "" },
    ];
    expect(getPreviewRoutes(files).map((route) => route.path)).toEqual([
      "/",
      "/dashboard",
      "/settings",
    ]);
  });

  it("overlays a saved source artifact on top of the original mission snapshot", () => {
    const messages = [{
      conversationId: "chat-a",
      createdAt: 10,
      id: "m1",
      content: "",
      mode: "produce",
      role: "assistant",
      mission: {
        id: "mission-a",
        plan: { agents: [], intention: "", nextStep: "", projectKind: "", v1Scope: "" },
        status: "ready",
        files: [{ content: "old source", path: "src/App.tsx", status: "saved", version: 7 }],
      },
    }] as Message[];
    const editedArtifacts: Artifact[] = [{
      content: "edited source",
      conversationId: "chat-a",
      createdAt: 200,
      id: "edited-app",
      language: "tsx",
      title: "src/App.tsx",
      type: "code",
    }];
    const files = getConversationWorkspaceFiles(messages, editedArtifacts, "chat-a");
    expect(files).toEqual([
      { content: "edited source", path: "src/App.tsx", status: "saved", version: 7, language: "tsx" },
    ]);
  });

  it("returns the latest mission in the requested conversation only", () => {
    const messages = [
      {
        conversationId: "chat-a",
        createdAt: 1,
        id: "old",
        content: "",
        mode: "produce",
        role: "assistant",
        mission: { id: "mission-old", plan: { agents: [], intention: "", nextStep: "", projectKind: "", v1Scope: "" }, status: "planned" },
      },
      {
        conversationId: "chat-b",
        createdAt: 2,
        id: "other",
        content: "",
        mode: "produce",
        role: "assistant",
        mission: { id: "mission-other", plan: { agents: [], intention: "", nextStep: "", projectKind: "", v1Scope: "" }, status: "planned" },
      },
    ] as Message[];
    expect(getLatestMissionForConversation(messages, "chat-a")?.id).toBe("mission-old");
    expect(getLatestMissionForConversation(messages, "chat-missing")).toBeNull();
  });
});
