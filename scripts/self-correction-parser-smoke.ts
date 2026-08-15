import { parseTerminalIssues, selectValidationCommand } from '../src/core/webcontainer/terminalDiagnostics';

const typeScriptOutput = [
  'src/App.tsx(12,4): error TS2322: Type string is not assignable to type number.',
  'src/App.tsx(12,4): error TS2322: Type string is not assignable to type number.',
  'src/lib/api.ts(4,1): error TS2307: Cannot find module ./missing.',
].join('\n');

const issues = parseTerminalIssues(typeScriptOutput);
if (issues.length !== 2) throw new Error(`Expected 2 unique issues, got ${issues.length}`);
if (issues[0]?.file !== 'src/App.tsx' || issues[0]?.line !== 12 || issues[0]?.column !== 4) {
  throw new Error('TypeScript location parsing failed');
}

const bundlerIssues = parseTerminalIssues('[src/main.tsx:8:3] - Unexpected token');
if (bundlerIssues.length !== 1 || bundlerIssues[0]?.file !== 'src/main.tsx') {
  throw new Error('Bundler location parsing failed');
}

if (selectValidationCommand({ 'package.json': JSON.stringify({ scripts: { build: 'vite build' } }) }).label !== 'npm run build') {
  throw new Error('Build command selection failed');
}
if (selectValidationCommand({ 'package.json': JSON.stringify({ scripts: { typecheck: 'tsc --noEmit' } }) }).label !== 'npm run typecheck') {
  throw new Error('Typecheck command selection failed');
}
if (selectValidationCommand({ 'package.json': '{invalid' }).label !== 'tsc --noEmit') {
  throw new Error('Fallback command selection failed');
}

console.log('self-correction-parser-smoke: PASS');
