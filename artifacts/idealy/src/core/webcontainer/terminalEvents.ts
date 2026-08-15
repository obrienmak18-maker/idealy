export type TerminalEventKind = 'command' | 'output' | 'status' | 'error';

export interface TerminalEvent {
  kind: TerminalEventKind;
  text: string;
  createdAt: number;
}

type Listener = (event: TerminalEvent) => void;

const listeners = new Set<Listener>();
const history: TerminalEvent[] = [];
const MAX_HISTORY = 120;

export function emitTerminalEvent(kind: TerminalEventKind, text: string): void {
  const event: TerminalEvent = { kind, text, createdAt: Date.now() };
  history.push(event);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  for (const listener of listeners) listener(event);
}

export function subscribeTerminalEvents(listener: Listener): () => void {
  for (const event of history) listener(event);
  listeners.add(listener);
  return () => listeners.delete(listener);
}
