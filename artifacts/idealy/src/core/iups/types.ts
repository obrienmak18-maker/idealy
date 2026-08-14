import type { ChangeCapsule, MissionContracts, MissionPassport, PreflightProof, ValidationReport } from '@/core/mission/contracts';

export interface IdealyUniversalProjectSchema {
  project: {
    name: string;
    description?: string;
    stack?: 'react-vite-typescript' | 'expo-react-native' | string;
    files: Record<string, string>; // Maps file paths (e.g. 'src/App.tsx') to file content
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
