import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import type { MissionSnapshot, PreflightProof, ValidationReport } from './contracts';

function now(): number {
  return Date.now();
}

function validationCheck(validation: ValidationReport | undefined, id: string) {
  return validation?.checks.find((check) => check.id === id)?.status;
}

export function buildPreflightProofs(
  schema: IdealyUniversalProjectSchema | null,
  validation: ValidationReport | undefined,
  snapshots: MissionSnapshot[],
): PreflightProof[] {
  const checkedAt = now();
  const hasSchema = Boolean(schema?.project);
  const secretStatus = validationCheck(validation, 'secrets');
  const structuralStatus = validationCheck(validation, 'schema');

  return [
    {
      id: 'schema',
      label: 'Structure IUPS',
      status: structuralStatus ?? (hasSchema ? 'passed' : 'failed'),
      detail: hasSchema ? 'Le projet possède une structure IUPS exploitable.' : 'Aucun projet IUPS exploitable n’a été produit.',
      checkedAt,
    },
    {
      id: 'secrets',
      label: 'Secrets serveur',
      status: secretStatus ?? 'not-run',
      detail: secretStatus === 'passed'
        ? 'Aucun motif de secret serveur détecté dans les fichiers générés.'
        : secretStatus === 'failed'
          ? 'Un motif ressemblant à un secret a été détecté ; la publication est bloquée.'
          : 'Contrôle des secrets non disponible pour cette version.',
      checkedAt,
    },
    {
      id: 'build',
      label: 'Build réel',
      status: 'not-run',
      detail: 'Le build du projet généré n’est pas encore exécuté dans une sandbox isolée.',
      checkedAt,
      evidence: 'non-exécuté',
    },
    {
      id: 'restore',
      label: 'Version restaurable',
      status: snapshots.length > 0 ? 'passed' : 'not-run',
      detail: snapshots.length > 0
        ? `${snapshots.length} version(s) restaurable(s) conservée(s).`
        : 'Un snapshot sera créé avant la prochaine génération ou correction.',
      checkedAt,
    },
    {
      id: 'validation',
      label: 'Validation déterministe',
      status: validation?.status === 'passed'
        ? 'passed'
        : validation?.status === 'failed'
          ? 'failed'
          : validation?.status === 'warning'
            ? 'warning'
            : 'not-run',
      detail: validation
        ? `${validation.checks.length} contrôle(s) structurel(s), ${validation.issues.length} issue(s).`
        : 'La validation sera exécutée après la génération.',
      checkedAt: validation?.checkedAt ?? checkedAt,
    },
  ];
}
