const FATAL_PATTERNS = [
  /ERR_MODULE_NOT_FOUND/i,
  /EADDRINUSE/i,
  /uncaught exception/i,
  /unhandledrejection/i,
  /syntaxerror/i,
  /fatal error/i,
  /failed to resolve/i,
];

export function isFatalWebContainerLog(line: string): boolean {
  return FATAL_PATTERNS.some((pattern) => pattern.test(line));
}

export function appendCrashLog(logs: string[], line: string, maxLines = 50): string[] {
  return [...logs, line].slice(-maxLines);
}

export function summarizeCrashLogs(logs: string[], maxChars = 6000): string {
  return logs.join('').slice(-maxChars);
}
