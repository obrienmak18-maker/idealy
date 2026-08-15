import type { WebContainer } from '@webcontainer/api';
import { emitTerminalEvent } from './terminalEvents';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import {
  buildIUPS,
  type MissionContext,
  type TerminalCorrectionFeedback,
} from '@/agents/orchestrator';
import { parseTerminalIssues, selectValidationCommand, type TerminalIssue } from './terminalDiagnostics';
import {
  ARCHITECTURE_FILE,
  ensureArchitectureFile,
  generateArchitectureSummary,
  readArchitectureFile,
  selectRelevantFiles,
  writeArchitectureFile,
} from './architectureMemory';

export const MAX_SELF_CORRECTION_ITERATIONS = 3;

type FileSystemTree = Record<string, FileSystemEntry>;
type FileSystemEntry = { file: { contents: string | Uint8Array } } | { directory: FileSystemTree };

export interface TerminalValidationResult {
  command: string;
  exitCode: number;
  ok: boolean;
  output: string;
  issues: TerminalIssue[];
}

export interface SelfCorrectionAttempt {
  iteration: number;
  validation: TerminalValidationResult;
  feedback?: TerminalCorrectionFeedback;
}

export interface SelfCorrectionResult {
  schema: IdealyUniversalProjectSchema | null;
  attempts: SelfCorrectionAttempt[];
  status: 'passed' | 'needs-fix' | 'unavailable';
  terminalAvailable: boolean;
}

export interface SelfCorrectionOptions {
  onLog?: (line: string) => void;
  onProgress?: (tokens: number, partial: string) => void;
  onFileCreated?: (path: string) => void;
  signal?: AbortSignal;
}

async function runTerminalCommand(
  instance: WebContainer,
  command: { bin: string; args: string[]; label: string },
  onLog?: (line: string) => void,
  signal?: AbortSignal,
): Promise<TerminalValidationResult> {
  emitTerminalEvent('command', `$ ${command.label}\\r\\n`);
  if (signal?.aborted) throw new DOMException('Mission interrompue.', 'AbortError');
  const process = await instance.spawn(command.bin, command.args, {
    terminal: { cols: 120, rows: 30 },
  });
  const stopProcess = () => { process.kill(); };
  signal?.addEventListener('abort', stopProcess, { once: true });
  let output = '';
  const reader = process.output.getReader();

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (signal?.aborted) {
        process.kill();
        throw new DOMException('Mission interrompue.', 'AbortError');
      }
      const chunk = String(value);
      output += chunk;
      emitTerminalEvent('output', chunk);
      onLog?.(chunk);
    }
  } finally {
    signal?.removeEventListener('abort', stopProcess);
    reader.releaseLock();
  }

  const exitCode = await process.exit;
  return {
    command: command.label,
    exitCode,
    ok: exitCode === 0,
    output: output.slice(-16000),
    issues: parseTerminalIssues(output),
  };
}

async function ensureDependencies(
  instance: WebContainer,
  files: Record<string, string>,
  onLog?: (line: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!files['package.json']) return;

  try {
    await instance.fs.readdir('node_modules');
    return;
  } catch {
    emitTerminalEvent('status', '📦 Installation des dépendances avant le preflight...\\r\\n');
    onLog?.('📦 Installation des dépendances avant le preflight...\\n');
    const result = await runTerminalCommand(
      instance,
      { bin: 'npm', args: ['install', '--no-audit', '--no-fund'], label: 'npm install' },
      onLog,
      signal,
    );
    if (!result.ok) {
      throw new Error(`npm install a échoué : ${result.output.slice(-1200)}`);
    }
  }
}

async function mountAndValidate(
  schema: IdealyUniversalProjectSchema,
  onLog?: (line: string) => void,
  onFileCreated?: (path: string) => void,
  signal?: AbortSignal,
): Promise<TerminalValidationResult> {
  const { getWebContainerInstance } = await import('@/core/webcontainer/webcontainer');
  const instance = await getWebContainerInstance();
  const files = schema.project.files;

  emitTerminalEvent('status', '🧪 Montage de la version générée dans WebContainer...\\r\\n');
  onLog?.('🧪 Montage de la version générée dans WebContainer...\\n');
  for (const [path, contents] of Object.entries(files)) {
    if (signal?.aborted) throw new DOMException('Mission interrompue.', 'AbortError');
    const directory = path.split('/').slice(0, -1).join('/');
    if (directory) await instance.fs.mkdir(directory, { recursive: true });
    await instance.fs.writeFile(path, contents);
    onFileCreated?.(path);
  }
  await ensureDependencies(instance, files, onLog, signal);

  const command = selectValidationCommand(files);
  onLog?.(`$ ${command.label}\n`);
  return runTerminalCommand(instance, command, onLog);
}

function buildCorrectionFeedback(result: TerminalValidationResult, iteration: number): TerminalCorrectionFeedback {
  const issues = result.issues.length > 0
    ? result.issues.map((issue) => ({
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
    }))
    : [{ file: null, line: null, column: null, message: result.output.slice(-3000) || 'Le processus a échoué sans message exploitable.' }];

  return {
    command: result.command,
    issues,
    iteration,
  };
}

export async function buildWithSelfCorrection(
  context: MissionContext,
  options: SelfCorrectionOptions = {},
): Promise<SelfCorrectionResult> {
  const attempts: SelfCorrectionAttempt[] = [];
  let correction: TerminalCorrectionFeedback | undefined;
  let schema: IdealyUniversalProjectSchema | null = null;

  for (let iteration = 1; iteration <= MAX_SELF_CORRECTION_ITERATIONS; iteration += 1) {
    if (options.signal?.aborted) throw new DOMException('Mission interrompue.', 'AbortError');
    emitTerminalEvent('status', `🤖 Bâtisseur — génération ${iteration}/${MAX_SELF_CORRECTION_ITERATIONS}\\r\\n`);
    options.onLog?.(`🤖 Bâtisseur — génération ${iteration}/${MAX_SELF_CORRECTION_ITERATIONS}\\n`);
    schema = await buildIUPS(context, correction, options.onProgress);
    if (!schema) {
      return { schema: null, attempts, status: 'unavailable', terminalAvailable: attempts.length > 0 };
    }

    try {
      const generatedArchitecture = generateArchitectureSummary(schema, context.contracts);
      const filesWithArchitecture = {
        ...schema.project.files,
        [ARCHITECTURE_FILE]: generatedArchitecture,
      };
      schema = {
        ...ensureArchitectureFile(schema, generatedArchitecture),
        project: {
          ...schema.project,
          files: filesWithArchitecture,
          fileTree: Object.entries(filesWithArchitecture).map(([path, content]) => ({
            path,
            content,
            type: path.endsWith('.md') ? 'md' as const : 'other' as const,
          })),
        },
      };
      const instance = await (async () => {
        const { getWebContainerInstance } = await import('@/core/webcontainer/webcontainer');
        return getWebContainerInstance();
      })();
      await writeArchitectureFile(instance, schema.project.files['.idealy/architecture.md'] ?? context.architecture ?? '');
      context.architecture = await readArchitectureFile(instance) ?? context.architecture;
      context.relevantFiles = selectRelevantFiles(
        schema.project.files,
        context.prompt,
        correction?.issues.map((issue) => issue.file).filter((file): file is string => Boolean(file)) ?? [],
      );
      options.onLog?.('🧠 Mémoire architecture chargée dans le VFS (.idealy/architecture.md).\n');
      const validation = await mountAndValidate(schema, options.onLog, options.onFileCreated, options.signal);
      const attempt: SelfCorrectionAttempt = { iteration, validation, feedback: correction };
      attempts.push(attempt);

      if (validation.ok) {
        emitTerminalEvent('status', `✅ ${validation.command} réussi — version prête.\\r\\n`);
        options.onLog?.(`✅ ${validation.command} réussi — version prête.\\n`);
        return { schema, attempts, status: 'passed', terminalAvailable: true };
      }

      correction = buildCorrectionFeedback(validation, iteration);
      emitTerminalEvent('error', `❌ ${validation.command} a trouvé ${correction.issues.length} problème(s).\\r\\n`);
      options.onLog?.(`❌ ${validation.command} a trouvé ${correction.issues.length} problème(s).\\n`);
      if (iteration < MAX_SELF_CORRECTION_ITERATIONS) {
        emitTerminalEvent('status', '↻ Injection ciblée des erreurs dans le prochain prompt système.\\r\\n');
        options.onLog?.('↻ Injection ciblée des erreurs dans le prochain prompt système.\\n');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitTerminalEvent('error', `⚠️ WebContainer indisponible : ${message}\\r\\n`);
      options.onLog?.(`⚠️ WebContainer indisponible : ${message}\\n`);
      return { schema, attempts, status: 'unavailable', terminalAvailable: false };
    }
  }

  emitTerminalEvent('error', `⛔ Limite de ${MAX_SELF_CORRECTION_ITERATIONS} corrections atteinte.\\r\\n`);
  options.onLog?.(`⛔ Limite de ${MAX_SELF_CORRECTION_ITERATIONS} corrections atteinte.\\n`);
  return { schema, attempts, status: 'needs-fix', terminalAvailable: true };
}
