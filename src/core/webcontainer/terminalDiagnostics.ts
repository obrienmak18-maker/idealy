export interface TerminalIssue {
  file: string | null;
  line: number | null;
  column: number | null;
  message: string;
  raw: string;
}

export function selectValidationCommand(files: Record<string, string>): { bin: string; args: string[]; label: string } {
  try {
    const packageJson = files['package.json'];
    const packageData = packageJson ? JSON.parse(packageJson) as { scripts?: Record<string, string> } : null;
    const scripts = packageData?.scripts ?? {};

    if (typeof scripts.build === 'string') {
      return { bin: 'npm', args: ['run', 'build'], label: 'npm run build' };
    }
    if (typeof scripts.typecheck === 'string') {
      return { bin: 'npm', args: ['run', 'typecheck'], label: 'npm run typecheck' };
    }
  } catch {
    // A malformed package.json is itself a useful terminal diagnostic.
  }

  return { bin: 'npx', args: ['tsc', '--noEmit'], label: 'tsc --noEmit' };
}

function parseIssueLine(line: string): TerminalIssue | null {
  const normalized = line.trim();
  if (!normalized) return null;

  // TypeScript: src/App.tsx(12,4): error TS2322: ...
  const typescript = normalized.match(/^(.*?)(?:\((\d+),(\d+)\)|:(\d+):(\d+)):\s*(?:error|warning)?\s*(?:TS\d+)?\s*:??\s*(.+)$/i);
  if (typescript) {
    const lineNumber = Number(typescript[2] ?? typescript[4]);
    const columnNumber = Number(typescript[3] ?? typescript[5]);
    return {
      file: typescript[1]?.trim() || null,
      line: Number.isFinite(lineNumber) ? lineNumber : null,
      column: Number.isFinite(columnNumber) ? columnNumber : null,
      message: typescript[6]?.trim() || normalized,
      raw: normalized,
    };
  }

  // Vite/esbuild/npm: [file:line:column] or file:line:column
  const bundler = normalized.match(/^(?:\[)?(.+?):(\d+)(?::(\d+))?(?:\])?\s*[-:]\s*(.+)$/);
  if (bundler && /error|failed|cannot|unexpected|module/i.test(normalized)) {
    return {
      file: bundler[1]?.trim() || null,
      line: Number(bundler[2]) || null,
      column: bundler[3] ? Number(bundler[3]) : null,
      message: bundler[4]?.trim() || normalized,
      raw: normalized,
    };
  }

  if (/error|failed|cannot find module|syntaxerror|typeerror|unexpected token/i.test(normalized)) {
    return { file: null, line: null, column: null, message: normalized, raw: normalized };
  }

  return null;
}

export function parseTerminalIssues(output: string): TerminalIssue[] {
  const issues: TerminalIssue[] = [];
  const seen = new Set<string>();

  for (const line of output.split(/\r?\n/)) {
    const issue = parseIssueLine(line);
    if (!issue) continue;
    const key = `${issue.file}:${issue.line}:${issue.column}:${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(issue);
  }

  return issues.slice(0, 12);
}
