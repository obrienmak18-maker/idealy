import type { ChangeCapsule, MissionContracts, MissionPassport, PreflightProof, ValidationReport } from '@/core/mission/contracts';

export type IUPSFileType = 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'scss' | 'html' | 'json' | 'md' | 'py' | 'asset' | 'other';

export interface IUPSFileEntry {
  path: string;
  content: string;
  type: IUPSFileType;
}

export interface IdealyUniversalProjectSchema {
  project: {
    name: string;
    description?: string;
    stack?: 'react-vite-typescript' | 'expo-react-native' | string;
    /** Compatibility map consumed by the editor, preview and ZIP exporter. */
    files: Record<string, string>;
    /** Canonical ordered file tree emitted by the builder. */
    fileTree?: IUPSFileEntry[];
  };
  /** Versioned mission intent and implementation contracts used to generate this project. */
  contracts?: MissionContracts;
  /** Latest deterministic validation report for this exact schema. */
  validation?: ValidationReport;
  /** Restorable snapshot associated with the schema. */
  snapshotId?: string;
  /** Human-readable proof and change metadata carried with the mission version. */
  preflight?: PreflightProof[];
  capsules?: ChangeCapsule[];
  passport?: MissionPassport;
}
