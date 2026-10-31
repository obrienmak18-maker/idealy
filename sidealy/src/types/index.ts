export type Theme = "light" | "dark" | "system";

export type IntentionMode = "chat" | "explore" | "produce";

export type GenerationStatus =
  | "idle"
  | "sending"
  | "receiving"
  | "completed"
  | "aborted"
  | "error";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  /** Kept in memory until the message is uploaded; never serialized to localStorage. */
  file?: File;
  url?: string;
}

export interface Artifact {
  content: string;
  conversationId: string;
  createdAt: number;
  id: string;
  language?: string;
  title: string;
  type: "document" | "code" | "table" | "specification";
}

export interface MissionPlanAgent {
  name: string;
  responsibility: string;
  result: string;
}

export interface MissionPlan {
  agents: MissionPlanAgent[];
  intention: string;
  nextStep: string;
  projectKind: string;
  v1Scope: string;
}

export interface MissionWorkspaceFile {
  checksum?: string | null;
  content: string;
  language?: string | null;
  path: string;
  status?: "pending" | "writing" | "saved" | "validated" | "error" | string;
  version?: number;
}

export interface MissionBuildVerification {
  command?: string;
  durationMs?: number;
  error?: string;
  status: "passed" | "failed" | "not-configured";
  stderr?: string;
  stdout?: string;
}

export interface MissionRun {
  buildVerification?: MissionBuildVerification;
  error?: string;
  files?: MissionWorkspaceFile[];
  id: string;
  idempotencyKey?: string;
  plan: MissionPlan;
  status: "planned" | "building" | "ready" | "needs-fix";
}

export interface Message {
  artifactIds?: string[];
  attachments?: Attachment[];
  content: string;
  conversationId: string;
  createdAt: number;
  id: string;
  isPartial?: boolean;
  mission?: MissionRun;
  mode: IntentionMode;
  reasoning?: string;
  reasoningDuration?: number;
  role: "user" | "assistant";
  status?: "delivered" | "interrupted" | "error";
}

export interface Conversation {
  createdAt: number;
  draft: string;
  id: string;
  isArchived: boolean;
  isPinned: boolean;
  selectedMode: IntentionMode;
  spaceId: string;
  title: string;
  updatedAt: number;
}

export interface Space {
  createdAt: number;
  description: string;
  id: string;
  instructions: string;
  name: string;
}

export interface Activity {
  conversationId?: string;
  createdAt: number;
  description: string;
  id: string;
  status:
    | "preparing"
    | "running"
    | "approval_needed"
    | "completed"
    | "aborted"
    | "failed";
  title: string;
}
