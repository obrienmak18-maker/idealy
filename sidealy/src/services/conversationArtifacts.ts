import type { Artifact } from "../types";

/**
 * Returns the most recently created deliverable owned by a conversation.
 * Artifacts are global in storage, so every lookup must be scoped by conversation.
 */
export function getConversationArtifactId(
  artifacts: readonly Artifact[],
  conversationId: string | null | undefined,
): string | null {
  if (!conversationId) return null;

  let latest: Artifact | undefined;
  for (const artifact of artifacts) {
    if (artifact.conversationId !== conversationId) continue;
    if (!latest || artifact.createdAt > latest.createdAt) latest = artifact;
  }

  return latest?.id ?? null;
}
