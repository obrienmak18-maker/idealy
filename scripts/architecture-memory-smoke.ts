import {
  ARCHITECTURE_FILE,
  buildArchitectureContext,
  ensureArchitectureFile,
  generateArchitectureSummary,
  readArchitectureFile,
  selectRelevantFiles,
  writeArchitectureFile,
} from '../src/core/webcontainer/architectureMemory';

const files = {
  'package.json': '{"scripts":{"build":"vite build"}}',
  'src/App.tsx': 'export function App() { return null; }',
  'src/routes/Dashboard.tsx': 'export function Dashboard() { return null; }',
  'src/lib/api.ts': 'export async function loadData() { return []; }',
  'src/styles.css': 'body { color: black; }',
  [ARCHITECTURE_FILE]: '# Existing architecture\n\n## Routes\n- /dashboard',
};

const selected = selectRelevantFiles(files, 'Ajoute une route dashboard avec une API de données');
if (selected.length !== 3) throw new Error(`Expected exactly 3 selected files, got ${selected.length}`);
if (selected.some((file) => file.path === ARCHITECTURE_FILE)) throw new Error('architecture.md must be injected separately');
if (selected[0]?.path !== 'src/routes/Dashboard.tsx') throw new Error('Route relevance ranking failed');

const promptContext = buildArchitectureContext(files[ARCHITECTURE_FILE], selected);
if (!promptContext.includes('Existing architecture')) throw new Error('Architecture content was not injected');
if (!promptContext.includes('src/routes/Dashboard.tsx')) throw new Error('Relevant VFS file was not injected');

const summary = generateArchitectureSummary({
  project: {
    name: 'demo',
    description: 'secret=should-not-appear',
    stack: 'react-vite-typescript',
    files,
  },
}, {
  version: 1,
  brief: { problem: 'demo', audience: 'demo', primaryOutcome: 'demo', mustHave: [], constraints: [], clarificationQuestions: [] },
  design: { version: 1, source: 'idealy', direction: 'demo', visualReferences: [], screens: [], tokens: { colors: {}, typography: {}, spacing: {}, radii: {} } },
  data: { version: 1, provider: 'mock', permissions: [], entities: [{ name: 'User', fields: [{ name: 'apiKey', type: 'string' }, { name: 'name', type: 'string' }] }] },
  actions: { version: 1, actions: [] },
  tests: { version: 1, acceptance: [] },
  deploy: { version: 1, target: 'preview', environment: 'local', requiredConnectors: [], preflight: [] },
});
if (!summary.includes('## Schéma de données') || !summary.includes('name: string')) throw new Error('Architecture summary generation failed');
if (summary.includes('apiKey')) throw new Error('Sensitive field name leaked into architecture summary');
if (summary.includes('should-not-appear')) throw new Error('Sensitive value leaked into architecture summary');

const schema = ensureArchitectureFile({
  project: { name: 'demo', description: 'demo', stack: 'react-vite-typescript', files: { 'src/App.tsx': 'export {}' } },
} as never, '# New architecture');
if (schema.project.files[ARCHITECTURE_FILE] !== '# New architecture') throw new Error('Architecture file was not added to the schema');

const memory = new Map<string, string>();
const fakeInstance = {
  fs: {
    mkdir: async () => undefined,
    writeFile: async (path: string, content: string) => { memory.set(path, content); },
    readFile: async (path: string) => {
      const content = memory.get(path);
      if (!content) throw new Error('not found');
      return content;
    },
  },
};
await writeArchitectureFile(fakeInstance as never, '# Persisted architecture');
if (await readArchitectureFile(fakeInstance as never) !== '# Persisted architecture') {
  throw new Error('VFS architecture read/write failed');
}

console.log('architecture-memory-smoke: PASS');
