export type Theme = "light" | "dark" | "system";

export type IntentionMode = "chat" | "explore" | "produce";

export type AgentState =
  | "idle"
  | "thinking"
  | "producing"
  | "completed"
  | "error"
  // Legacy French values kept for backward compatibility with persisted data
  | "attente"
  | "réflexion"
  | "production"
  | "terminé"
  | "erreur";

export interface StaticAgent {
  authority: string;
  avatar: string;
  id: string;
  name: string;
  role: string;
  specialty: string;
  tint: string;
  voice: string;
}

export interface RunArtifact {
  content?: string;
  kind: string;
  path: string;
  revealed?: boolean;
}

export interface RunHandoff {
  line: string;
  to: string;
}

export interface RunTurn {
  agentId: string;
  artifacts?: RunArtifact[];
  content: string;
  endedAt?: number;
  handoff?: RunHandoff;
  reasoning: string;
  startedAt: number;
  state: AgentState;
}

export interface Run {
  creditsSpent?: number;
  id: string;
  mode: "solo" | "team" | "équipe";
  reason: string;
  turns: RunTurn[];
}

export type GenerationStatus =
  | "idle"
  | "sending"
  | "receiving"
  | "completed"
  | "aborted"
  | "error";

export interface Attachment {
  /** Kept in memory until the message is uploaded; never serialized to localStorage. */
  file?: File;
  id: string;
  name: string;
  size: number;
  type: string;
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

export interface AssistantToolActivity {
  errorText?: string | null;
  input: Record<string, unknown>;
  kind:
    | "webSearch"
    | "searchImages"
    | "generateImage"
    | "dispatchSubAgents"
    | "generateVideo"
    | "renderWidget";
  output?: Record<string, unknown>;
  state: "input-available" | "output-available" | "output-error";
  toolCallId: string;
}

export interface MissionFileActivity {
  eventType: string;
  file?: {
    path?: string;
    status?: string;
  };
  missionId: string;
  path?: string;
  payload?: Record<string, unknown>;
  sequence: number;
}

export interface SubAgentProgress {
  agents: Array<{
    id: string;
    name: string;
    role: string;
    status: "queued" | "running" | "completed" | "failed";
    summary?: string;
    task: string;
  }>;
  objective: string;
  squad: string;
  timestamp: number;
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

export interface MissionRoute {
  agents: string[];
  depth: "direct" | "focused" | "squad";
  lane: "quick" | "build";
  powerPoints: 0 | 10 | 50;
  reasons: string[];
  score: number;
}

export interface MissionRun {
  buildVerification?: MissionBuildVerification;
  error?: string;
  files?: MissionWorkspaceFile[];
  id: string;
  idempotencyKey?: string;
  plan: MissionPlan;
  route?: MissionRoute;
  status: "planned" | "building" | "ready" | "needs-fix";
}

export interface Message {
  activities?: AssistantToolActivity[];
  artifactIds?: string[];
  attachments?: Attachment[];
  content: string;
  conversationId: string;
  createdAt: number;
  fileEvents?: MissionFileActivity[];
  id: string;
  isPartial?: boolean;
  mission?: MissionRun;
  mode: IntentionMode;
  reasoning?: string;
  reasoningDuration?: number;
  role: "user" | "assistant";
  run?: Run;
  status?: "delivered" | "interrupted" | "error";
  subagents?: SubAgentProgress[];
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
  way?: "ninja" | "mage" | "hunter" | "professional";
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
