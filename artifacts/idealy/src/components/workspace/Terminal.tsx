import { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { subscribeTerminalEvents } from '@/core/webcontainer/terminalEvents';
import type { WebContainerProcess } from '@webcontainer/api';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const processRef = useRef<WebContainerProcess | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    let disposed = false;
    let inputWriter: WritableStreamDefaultWriter<string> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let unsubscribeTerminalEvents = () => {};
    let term: import('@xterm/xterm').Terminal | null = null;

    async function mountTerminal() {
      const [{ Terminal: XTerm }, { FitAddon }, { getWebContainerInstance }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@/core/webcontainer/webcontainer'),
      ]);
      if (disposed || !terminalRef.current) return;

      term = new XTerm({
        cursorBlink: true,
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          selectionBackground: '#388bfd33',
          black: '#484f58',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#b1bac4',
          brightBlack: '#6e7681',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#ffffff',
        },
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 13,
        lineHeight: 1.2,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      resizeObserver = new ResizeObserver(() => fitAddon.fit());
      resizeObserver.observe(terminalRef.current);

      const ansi = String.fromCharCode(27);
      unsubscribeTerminalEvents = subscribeTerminalEvents((event) => {
        if (!term) return;
        if (event.kind === 'error') term.write(`${ansi}[31m${event.text}${ansi}[0m`);
        else if (event.kind === 'command') term.write(`${ansi}[36m${event.text}${ansi}[0m`);
        else if (event.kind === 'status') term.write(`${ansi}[33m${event.text}${ansi}[0m`);
        else term.write(event.text);
      });

      async function startShell() {
        try {
          term?.writeln('\x1b[1;34mIdealy Terminal\x1b[0m');
          term?.writeln('Connexion au WebContainer...\n');

          const instance = await getWebContainerInstance();
          if (disposed || !term) return;
          const process = await instance.spawn('jsh', {
            terminal: {
              cols: term.cols,
              rows: term.rows,
            },
          });
          if (disposed) {
            process.kill();
            return;
          }
          processRef.current = process;

          process.output.pipeTo(
            new WritableStream({
              write(data) {
                term?.write(data);
              },
            })
          );

          inputWriter = process.input.getWriter();
          term.onData((data) => {
            void inputWriter?.write(data);
          });

          term.onResize((size) => {
            process.resize({
              cols: size.cols,
              rows: size.rows,
            });
          });
        } catch (err) {
          term?.writeln(`\x1b[31mErreur de démarrage du terminal: ${err}\x1b[0m`);
        }
      }

      void startShell();
    }

    void mountTerminal();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      unsubscribeTerminalEvents();
      if (inputWriter) inputWriter.releaseLock();
      processRef.current?.kill();
      processRef.current = null;
      term?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full bg-[#0d1117] rounded-lg overflow-hidden border border-white/5 relative flex flex-col">
      <div className="w-full h-8 bg-[#161b22] border-b border-white/5 flex items-center px-4 shrink-0">
        <div className="flex gap-1.5 absolute left-4">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
        <div className="mx-auto text-[11px] font-mono text-ink-400">jsh (WebContainer)</div>
      </div>
      <div className="w-full flex-1 p-2 min-h-0" ref={terminalRef} />
    </div>
  );
}
