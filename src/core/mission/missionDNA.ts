import type { Way } from '@/lore/ways';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import { buildPreflightProofs } from './preflight';
import type {
  MissionContracts,
  MissionDNA,
  MissionSnapshot,
  ValidationReport,
} from './contracts';

export function createMissionDNA(
  missionId: string,
  prompt: string,
  way: Way,
  contracts: MissionContracts,
): MissionDNA {
  const now = Date.now();
  return {
    version: 1,
    missionId,
    way: way.id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    intention: contracts.brief,
    decisions: [
      `Univers sélectionné : ${way.name}`,
      'Les secrets serveur restent hors des fichiers générés.',
      'La publication dépend d’un build et de tests réussis.',
    ],
    agents: way.agents.map((agent) => ({ id: agent.id, name: agent.name, role: agent.role })),
    contracts,
    passport: {
      codename: `${way.name} · Mission ${missionId.slice(0, 4).toUpperCase()}`,
      rank: 'Genin',
      wayName: way.name,
      objective: contracts.brief.primaryOutcome,
      nextAction: 'Examiner le briefing puis lancer la construction.',
      generatedAt: now,
    },
    preflight: [
      { id: 'schema', label: 'Structure IUPS', status: 'not-run', detail: 'La génération n’a pas encore fourni de projet.', checkedAt: now },
      { id: 'secrets', label: 'Secrets serveur', status: 'not-run', detail: 'Le contrôle sera exécuté après génération.', checkedAt: now },
      { id: 'build', label: 'Build réel', status: 'not-run', detail: 'Le projet généré n’est pas encore exécuté dans une sandbox.', checkedAt: now },
      { id: 'restore', label: 'Version restaurable', status: 'not-run', detail: 'Un snapshot sera créé au premier changement.', checkedAt: now },
    ],
    capsules: [],
    snapshots: [],
    connectors: contracts.deploy.requiredConnectors.map((provider) => ({
      provider,
      environment: contracts.deploy.environment,
      status: 'planned',
    })),
  };
}

export function createMissionSnapshot(
  schema: IdealyUniversalProjectSchema | null,
  label: string,
  reason: MissionSnapshot['reason'],
  validation?: ValidationReport,
): MissionSnapshot {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    label,
    reason,
    schema,
    validation,
  };
}

export function appendSnapshot(
  dna: MissionDNA,
  snapshot: MissionSnapshot,
  status: MissionDNA['status'],
  validation?: ValidationReport,
): MissionDNA {
  return {
    ...dna,
    status,
    updatedAt: Date.now(),
    validation: validation ?? dna.validation,
    preflight: buildPreflightProofs(
      snapshot.schema as IdealyUniversalProjectSchema | null,
      validation ?? dna.validation,
      [...dna.snapshots, snapshot].slice(-10),
    ),
    snapshots: [...dna.snapshots, snapshot].slice(-10),
  };
}

export function restoreLatestSnapshot(dna: MissionDNA): MissionSnapshot | null {
  return dna.snapshots.length ? dna.snapshots[dna.snapshots.length - 1] : null;
}
