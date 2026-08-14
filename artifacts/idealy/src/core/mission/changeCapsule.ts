import type { ChangeCapsule } from './contracts';

export function estimateChangeRisk(scope: ChangeCapsule['scope'], selectedLineCount = 0): ChangeCapsule['risk'] {
  if (scope === 'selection' && selectedLineCount <= 30) return 'low';
  if (scope === 'file' && selectedLineCount <= 120) return 'medium';
  return 'high';
}

export function createChangeCapsule(input: {
  scope: ChangeCapsule['scope'];
  filePath?: string;
  summary: string;
  reason: string;
  selectedLineCount?: number;
  expectedTest?: string;
}): ChangeCapsule {
  const risk = estimateChangeRisk(input.scope, input.selectedLineCount);
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    scope: input.scope,
    filePath: input.filePath,
    summary: input.summary,
    reason: input.reason,
    risk,
    expectedTest: input.expectedTest ?? 'Relire le diff et relancer la validation de mission.',
    energyEstimate: risk === 'low' ? 5 : risk === 'medium' ? 10 : 15,
    status: 'proposed',
  };
}
