/**
 * Tolerant parsing of model output. Pure functions only (no Deno APIs) so the
 * same code is unit-tested under Node.
 *
 * Why: complex prompts make models add prose, markdown fences, blank lines or
 * raw newlines inside JSON strings. The strict parsers used to abort the whole
 * mission on the first such line, so simple prompts worked and real ones failed.
 */

/** Returns the first balanced JSON object found in free text, or null. */
export function extractJsonObject(text: string): unknown | null {
  if (typeof text !== 'string') return null;
  const stripped = text.replace(/```(?:json)?/gi, '').trim();

  try {
    const direct = JSON.parse(stripped);
    if (direct && typeof direct === 'object') return direct;
  } catch {
    // fall through to the balanced scan
  }

  for (let start = stripped.indexOf('{'); start !== -1; start = stripped.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < stripped.length; index += 1) {
      const char = stripped[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            const value = JSON.parse(stripped.slice(start, index + 1));
            if (value && typeof value === 'object') return value;
          } catch {
            // not valid JSON from this start: try the next '{'
          }
          break;
        }
      }
    }
  }
  return null;
}

export type RawWorkspaceFrame = {
  content?: unknown;
  language?: unknown;
  message?: unknown;
  path?: unknown;
  type?: unknown;
};

const KNOWN_TYPES = new Set(['build_log', 'file_started', 'file_content']);
const MAX_CANDIDATE_CHARS = 600_000;

/**
 * Incremental NDJSON frame parser that survives imperfect model output:
 * - blank lines, markdown fences and prose lines are ignored;
 * - a JSON line broken by raw newlines inside a string is re-assembled;
 * - a broken frame is dropped when the next frame starts, never aborting the run;
 * - unknown frame types (e.g. file_saved) are ignored.
 */
export class WorkspaceFrameParser {
  private buffer = '';
  private candidate: string | null = null;
  ignoredLines = 0;
  droppedFrames = 0;

  feed(chunk: string): RawWorkspaceFrame[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    const frames: RawWorkspaceFrame[] = [];
    for (const line of lines) this.consume(line, frames);
    return frames;
  }

  /** Call once the provider stream has ended. */
  flush(): RawWorkspaceFrame[] {
    const frames: RawWorkspaceFrame[] = [];
    if (this.buffer.length > 0) {
      this.consume(this.buffer, frames);
      this.buffer = '';
    }
    if (this.candidate !== null) {
      // Truncated frame (token limit or connection cut): cannot be trusted.
      this.droppedFrames += 1;
      this.candidate = null;
    }
    return frames;
  }

  private accept(parsed: unknown, frames: RawWorkspaceFrame[]) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      this.ignoredLines += 1;
      return;
    }
    const frame = parsed as RawWorkspaceFrame;
    if (typeof frame.type === 'string' && KNOWN_TYPES.has(frame.type)) frames.push(frame);
    else this.ignoredLines += 1;
  }

  private consume(rawLine: string, frames: RawWorkspaceFrame[]) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (this.candidate !== null) {
      // A new frame starting while the previous one is incomplete means the
      // previous one was broken: drop it and start over.
      if (/^\{\s*"type"\s*:/.test(trimmed)) {
        this.droppedFrames += 1;
        this.candidate = null;
      } else {
        const joined = `${this.candidate}\\n${line}`;
        this.candidate = joined;
        try {
          this.accept(JSON.parse(joined), frames);
          this.candidate = null;
        } catch {
          if (joined.length > MAX_CANDIDATE_CHARS) {
            this.droppedFrames += 1;
            this.candidate = null;
          }
        }
        return;
      }
    }

    if (!trimmed || trimmed.startsWith('```')) return;
    if (!trimmed.startsWith('{')) {
      this.ignoredLines += 1;
      return;
    }
    try {
      this.accept(JSON.parse(trimmed), frames);
    } catch {
      this.candidate = trimmed;
    }
  }
}
