/**
 * Exécute un vrai serveur Node/Vite dans le navigateur via WebContainers.
 * La surface de rendu est encapsulée dans PreviewBrowser pour éviter une iframe brute.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import type { Way } from '@/lore/ways';
import { getWebContainerInstance } from '@/core/webcontainer/webcontainer';
import {
  ARCHITECTURE_FILE,
  getArchitectureMemory,
  writeArchitectureFile,
} from '@/core/webcontainer/architectureMemory';
import { PreviewBrowser, type PreviewDevice } from './PreviewBrowser';
import { CrashOverlay } from './CrashOverlay';
import { appendCrashLog, isFatalWebContainerLog, summarizeCrashLogs } from '@/core/webcontainer/crashDiagnostics';

interface WebContainerPreviewProps {
  enabled?: boolean;
  schema: IdealyUniversalProjectSchema | null;
  way: Way;
  className?: string;
  onCrashFix?: (logs: string) => void | Promise<void>;
}

type Status = 'idle' | 'booting' | 'installing' | 'running' | 'error';
type FileSystemTree = Record<string, FileSystemEntry>;
type FileSystemEntry = { file: { contents: string | Uint8Array } } | { directory: FileSystemTree };

function recordToTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};
  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split('/');
    let current = tree;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (index === parts.length - 1) {
        current[part] = { file: { contents } };
        continue;
      }
      if (!current[part] || !('directory' in current[part])) current[part] = { directory: {} };
      const entry = current[part];
      if ('directory' in entry) current = entry.directory;
    }
  }
  return tree;
}

export function WebContainerPreview({ enabled = false, schema, way, className, onCrashFix }: WebContainerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [crashOpen, setCrashOpen] = useState(false);
  const [crashResolving, setCrashResolving] = useState(false);
  const crashHandledRef = useRef(false);
  const logsRef = useRef<string[]>([]);
  const prevFiles = useRef<Record<string, string>>({});
  const hasBooted = useRef(false);

  const addLog = (line: string) => {
    const nextLogs = appendCrashLog(logsRef.current, line);
    logsRef.current = nextLogs;
    setLogs(nextLogs);
    if (isFatalWebContainerLog(line)) {
      setCrashOpen(true);
      if (!crashHandledRef.current) {
        crashHandledRef.current = true;
        setCrashResolving(true);
        Promise.resolve(onCrashFix?.(summarizeCrashLogs(nextLogs))).finally(() => setCrashResolving(false));
      }
    }
  };

  const boot = useCallback(async () => {
    if (!enabled || !schema?.project.files || hasBooted.current) return;
    hasBooted.current = true;
    setStatus('booting');
    setUrl(null);
    setLogs([]);
    logsRef.current = [];
    setCrashOpen(false);
    setCrashResolving(false);
    crashHandledRef.current = false;
    addLog('⚡ Démarrage de WebContainer...');

    try {
      const instance = await getWebContainerInstance();
      addLog('📦 Montage des fichiers du projet...');
      setStatus('installing');

      const architecture = getArchitectureMemory(schema.project.files);
      const filesWithArchitecture = { ...schema.project.files, [ARCHITECTURE_FILE]: architecture };
      prevFiles.current = { ...filesWithArchitecture };
      await instance.mount(recordToTree(filesWithArchitecture));
      await writeArchitectureFile(instance, architecture);
      addLog('🧠 Mémoire architecture persistée dans .idealy/architecture.md');

      addLog('📥 Installation des dépendances (npm install)...');
      const installProcess = await instance.spawn('npm', ['install']);
      void installProcess.output.pipeTo(new WritableStream({ write(data) { addLog(data); } }));
      const installCode = await installProcess.exit;
      if (installCode !== 0) throw new Error('npm install échoué');

      addLog('🚀 Démarrage du serveur Vite...');
      setStatus('running');
      const devProcess = await instance.spawn('npm', ['run', 'dev']);
      void devProcess.output.pipeTo(new WritableStream({ write(data) { addLog(data); } }));

      instance.on('server-ready', (_port: number, serverUrl: string) => {
        addLog(`✅ Serveur prêt : ${serverUrl}`);
        setUrl(serverUrl);
        if (iframeRef.current) iframeRef.current.src = serverUrl;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      addLog(`❌ Erreur: ${message}`);
      setStatus('error');
      hasBooted.current = false;
    }
  }, [enabled, schema]);

  const refresh = useCallback(() => {
    hasBooted.current = false;
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (status !== 'running' || !schema?.project.files) return;
    const currentFiles = schema.project.files;
    const previousFiles = prevFiles.current;
    const changedPaths = Object.entries(currentFiles)
      .filter(([path, content]) => previousFiles[path] !== content)
      .map(([path]) => path);

    if (changedPaths.length > 0) {
      void getWebContainerInstance().then(async (instance) => {
        try {
          for (const path of changedPaths) {
            const content = currentFiles[path];
            addLog(`📝 HMR: Mise à jour de ${path}`);
            const directory = path.split('/').slice(0, -1).join('/');
            if (directory) await instance.fs.mkdir(directory, { recursive: true }).catch(() => undefined);
            await instance.fs.writeFile(path, content);
          }
          if (changedPaths.some((path) => path !== ARCHITECTURE_FILE)) {
            await writeArchitectureFile(instance, getArchitectureMemory(currentFiles));
            addLog('🧠 HMR significatif : architecture.md synchronisé');
          }
        } catch (error) {
          console.error('Failed to write files to WebContainer:', error);
        }
      });
    }
    prevFiles.current = { ...currentFiles };
  }, [schema?.project.files, status]);

  useEffect(() => {
    if (enabled && schema && status === 'idle' && !hasBooted.current) void boot();
  }, [enabled, schema, status, boot]);

  const loading = !enabled || (status !== 'running' && status !== 'error');
  const crashLogs = summarizeCrashLogs(logs);
  const handleCrashAnalyze = () => {
    if (crashHandledRef.current) return;
    crashHandledRef.current = true;
    setCrashResolving(true);
    Promise.resolve(onCrashFix?.(crashLogs)).finally(() => setCrashResolving(false));
  };

  return (
    <div className={`h-full min-h-0 ${className ?? ''}`}>
      <PreviewBrowser
        way={way}
        url={url}
        device={device}
        loading={loading}
        error={status === 'error'}
        onDeviceChange={setDevice}
        onRefresh={refresh}
      >
        <div className="relative h-full min-h-0">
        {status === 'error' ? (
          <div className="flex h-full flex-col bg-[#0d1117]">
            <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm font-semibold text-red-300">Erreur de démarrage</p>
              <button onClick={refresh} className="btn-outline ml-auto text-xs"><RefreshCw className="h-3 w-3" /> Réessayer</button>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto p-3 font-mono text-[11px]">
              {logs.map((line, index) => (
                <div key={`${line}-${index}`} className={`break-all whitespace-pre-wrap leading-relaxed ${line.includes('❌') || line.toLowerCase().includes('error') ? 'text-red-400' : line.includes('✅') ? 'text-green-400' : 'text-ink-300'}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : status === 'running' && url ? (
          <div className="relative h-full w-full">
            <iframe ref={iframeRef} src={url} className="h-full w-full border-0" allow="cross-origin-isolated" title="WebContainer Preview" onError={() => setCrashOpen(true)} />

          </div>
        ) : null}
        <CrashOverlay
          way={way}
          open={crashOpen}
          logs={logs}
          resolving={crashResolving}
          onAnalyze={handleCrashAnalyze}
          onDismiss={() => { setCrashOpen(false); setCrashResolving(false); crashHandledRef.current = false; }}
        />
        </div>
      </PreviewBrowser>
    </div>
  );
}
