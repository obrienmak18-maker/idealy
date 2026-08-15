import { readFileSync } from 'node:fs';

const flow = readFileSync('../src/components/workspace/MissionFlow.tsx', 'utf8');
const workspace = readFileSync('../src/routes/WorkspacePage.tsx', 'utf8');
const orchestrator = readFileSync('../src/agents/orchestrator.ts', 'utf8');

for (const marker of [
  "export type MissionFlowStatus = 'appearing' | 'active' | 'completed'",
  'Voir le détail',
  'height: 0',
  'h-10 w-10',
]) {
  if (!flow.includes(marker)) throw new Error(`Missing MissionFlow marker: ${marker}`);
}

for (const marker of ['MissionFlow', 'Lia', 'Barre de commande persistante']) {
  if (!workspace.includes(marker)) throw new Error(`Missing Workspace MissionFlow marker: ${marker}`);
}
if (/<MessageBubble/.test(workspace)) throw new Error('MessageBubble is still rendered by WorkspacePage.');
if (!workspace.includes('sticky bottom-0')) throw new Error('Composer is not anchored at the bottom.');
if (!orchestrator.includes('streamLiaMessage')) throw new Error('Lia streamer is not present.');

console.log('mission-flow-contract-smoke: PASS');
