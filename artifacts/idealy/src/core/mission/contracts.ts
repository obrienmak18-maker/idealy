import type { WayId } from '@/lore/ways';

export type MissionStatus =
  | 'draft'
  | 'planned'
  | 'building'
  | 'ready'
  | 'needs-fix'
  | 'published';

export type ValidationStatus = 'not-run' | 'passed' | 'failed' | 'warning';

export interface MissionBrief {
  problem: string;
  audience: string;
  primaryOutcome: string;
  mustHave: string[];
  constraints: string[];
  clarificationQuestions: string[];
}

export interface DesignContract {
  version: 1;
  source: 'idealy' | 'stitch' | 'user-reference';
  direction: string;
  visualReferences: string[];
  screens: Array<{
    id: string;
    name: string;
    purpose: string;
    states: string[];
  }>;
  tokens: {
    colors: Record<string, string>;
    typography: Record<string, string>;
    spacing: Record<string, string>;
    radii: Record<string, string>;
  };
}

export interface DataContract {
  version: 1;
  entities: Array<{
    name: string;
    fields: Array<{ name: string; type: string; required?: boolean }>;
    relations?: string[];
  }>;
  provider: 'mock' | 'supabase' | 'custom';
  permissions: string[];
}

export interface ActionContract {
  version: 1;
  actions: Array<{
    id: string;
    name: string;
    description: string;
    destructive?: boolean;
    requiresAuth?: boolean;
    connector?: string;
  }>;
}

export interface TestContract {
  version: 1;
  acceptance: Array<{
    id: string;
    description: string;
    kind: 'route' | 'interaction' | 'data' | 'security' | 'responsive' | 'build';
  }>;
}

export interface DeployContract {
  version: 1;
  target: 'preview' | 'vercel' | 'netlify' | 'github' | 'custom';
  environment: 'local' | 'test' | 'production';
  requiredConnectors: string[];
  preflight: Array<'build' | 'tests' | 'secrets' | 'endpoint'>;
}

export interface MissionContracts {
  version: 1;
  brief: MissionBrief;
  design: DesignContract;
  data: DataContract;
  actions: ActionContract;
  tests: TestContract;
  deploy: DeployContract;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  path?: string;
}

export interface ValidationReport {
  status: ValidationStatus;
  checkedAt: number;
  issues: ValidationIssue[];
  checks: Array<{
    id: string;
    label: string;
    status: 'passed' | 'failed' | 'warning';
  }>;
}

export interface MissionSnapshot {
  id: string;
  createdAt: number;
  label: string;
  reason: 'generation' | 'manual' | 'repair' | 'restore-point';
  schema: unknown;
  validation?: ValidationReport;
}

export interface MissionDNA {
  version: 1;
  missionId: string;
  way: WayId;
  status: MissionStatus;
  createdAt: number;
  updatedAt: number;
  intention: MissionBrief;
  decisions: string[];
  agents: Array<{ id: string; name: string; role: string }>;
  contracts?: MissionContracts;
  validation?: ValidationReport;
  snapshots: MissionSnapshot[];
  connectors: Array<{ provider: string; environment: string; status: string }>;
  publication?: {
    status: 'not-published' | 'ready' | 'published' | 'failed';
    url?: string;
    environment?: string;
    updatedAt: number;
  };
}
