import { readFileSync } from 'node:fs';

const edge = readFileSync('../supabase/functions/designer-tools/index.ts', 'utf8');
const client = readFileSync('../src/services/designerTools.ts', 'utf8');
const schema = readFileSync('../src/core/iups/types.ts', 'utf8');
const orchestrator = readFileSync('../src/agents/orchestrator.ts', 'utf8');

for (const marker of [
  "action: 'searchImages'",
  'https://api.pexels.com/v1/search',
  'Authorization: key',
  'PEXELS_API_KEY',
  'attributionUrl',
  'MAX_IMAGE_BYTES',
]) {
  if (!edge.includes(marker)) throw new Error(`Missing Designer Edge marker: ${marker}`);
}

for (const marker of [
  'export async function searchImages',
  'export async function generateImage',
  'getWebContainerInstance',
  'assets/generated-',
  'resolveDesignerImage',
]) {
  if (!client.includes(marker)) throw new Error(`Missing Designer client marker: ${marker}`);
}

if (client.includes('VITE_PEXELS_KEY') || edge.includes('VITE_PEXELS_KEY')) {
  throw new Error('Pexels key must never use a VITE_ browser variable.');
}

for (const marker of ['IUPSFileEntry', 'fileTree?: IUPSFileEntry[]', 'path: string', 'content: string', 'type: IUPSFileType']) {
  if (!schema.includes(marker)) throw new Error(`Missing IUPS fileTree marker: ${marker}`);
}
if (!orchestrator.includes('normalizeGeneratedProject') || !orchestrator.includes('fileTree')) {
  throw new Error('Builder does not normalize the fileTree contract.');
}

console.log('designer-tools-contract-smoke: PASS');
