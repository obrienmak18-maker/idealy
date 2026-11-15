import { describe, expect, it } from "vitest";
import type { Artifact } from "../types";
import { getConversationArtifactId } from "../services/conversationArtifacts";

const artifacts: Artifact[] = [
  {
    content: "<html>first project</html>",
    conversationId: "conversation-a",
    createdAt: 100,
    id: "artifact-a-1",
    language: "html",
    title: "First project",
    type: "code",
  },
  {
    content: "<html>other project</html>",
    conversationId: "conversation-b",
    createdAt: 300,
    id: "artifact-b-1",
    language: "html",
    title: "Other project",
    type: "code",
  },
  {
    content: "updated file",
    conversationId: "conversation-a",
    createdAt: 200,
    id: "artifact-a-2",
    language: "tsx",
    title: "Updated file",
    type: "code",
  },
];

describe("conversation-scoped artifacts", () => {
  it("returns no artifact for a new conversation", () => {
    expect(getConversationArtifactId(artifacts, "conversation-new")).toBeNull();
  });

  it("never selects an artifact owned by another conversation", () => {
    expect(getConversationArtifactId(artifacts, "conversation-a")).toBe("artifact-a-2");
  });

  it("restores the latest artifact when returning to its conversation", () => {
    expect(getConversationArtifactId(artifacts, "conversation-b")).toBe("artifact-b-1");
  });

  it("returns null when there is no active conversation", () => {
    expect(getConversationArtifactId(artifacts, null)).toBeNull();
  });
});
