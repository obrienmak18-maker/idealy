import { appendCrashLog, isFatalWebContainerLog, summarizeCrashLogs } from '../src/core/webcontainer/crashDiagnostics';

const fatalCases = [
  'Error [ERR_MODULE_NOT_FOUND]: Cannot find package',
  'listen EADDRINUSE: address already in use',
  'Uncaught exception in App.tsx',
  'SyntaxError: Unexpected token',
];

for (const line of fatalCases) {
  if (!isFatalWebContainerLog(line)) throw new Error(`Expected fatal log: ${line}`);
}

if (isFatalWebContainerLog('Vite server ready on localhost')) {
  throw new Error('Healthy server log was classified as fatal');
}

const bounded = appendCrashLog(['a', 'b', 'c'], 'd', 3);
if (bounded.join('') !== 'bcd') throw new Error(`Unexpected bounded log: ${bounded.join('')}`);

const summary = summarizeCrashLogs(['one', 'two', 'three'], 7);
if (summary !== 'wothree') throw new Error(`Unexpected summary: ${summary}`);

console.log('crash-diagnostics-smoke: PASS');
