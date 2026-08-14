/**
 * WebContainerPreview.tsx
 * Exécute un vrai serveur Node/Vite dans le navigateur via l'API WebContainers de StackBlitz.
 * Affiche le résultat dans un iframe live.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import { getWebContainerInstance } from '@/core/webcontainer/webcontainer';
import {
  ARCHITECTURE_FILE,
  getArchitectureMemory,
  writeArchitectureFile,
} from '@/core/webcontainer/architectureMemory';

interface WebContainerPreviewProps {
  schema: IdealyUniversalProjectSchema | null;
  className?: string;
}

type Status = 'idle' | 'booting' | 'installing' | 'running' | 'error';

/**
 * Convertit un Record<string, string> (chemins de fichiers -> contenu) 
 * en un FileSystemTree compatible avec WebContainer.
 */
type FileSystemTree = Record<string, FileSystemEntry>;
type FileSystemEntry = { file: { contents: string | Uint8Array } } | { directory: FileSystemTree };

function recordToTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};
  
  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split('/');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // C'est un fichier
        current[part] = { file: { contents } };
      } else {
        // C'est un dossier
        if (!current[part] || !('directory' in current[part])) {
          current[part] = { directory: {} };
        }
        const entry = current[part];
        if ('directory' in entry) current = entry.directory;
      }
    }
  }
  return tree;
}

export function WebContainerPreview({ schema, className }: WebContainerPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const prevFiles = useRef<Record<string, string>>({});
  const hasBooted = useRef(false);

  const addLog = (line: string) => setLogs((prev) => [...prev.slice(-50), line]);

  const boot = useCallback(async () => {
    if (!schema || !schema.project.files || hasBooted.current) return;
    hasBooted.current = true;
    setStatus('booting');
    setLogs([]);
    addLog('⚡ Démarrage de WebContainer...');

    try {
      const instance = await getWebContainerInstance();

      addLog('📦 Montage des fichiers du projet...');
      setStatus('installing');
      
      const architecture = getArchitectureMemory(schema.project.files);
      const filesWithArchitecture = {
        ...schema.project.files,
        [ARCHITECTURE_FILE]: architecture,
      };
      const tree = recordToTree(filesWithArchitecture);
      prevFiles.current = { ...filesWithArchitecture };
      
      // Monter les fichiers, y compris la mémoire cachée de contexte.
      await instance.mount(tree);
      await writeArchitectureFile(instance, architecture);
      addLog('🧠 Mémoire architecture persistée dans .idealy/architecture.md');

      addLog('📥 Installation des dépendances (npm install)...');
      const installProcess = await instance.spawn('npm', ['install']);
      installProcess.output.pipeTo(
        new WritableStream({ write(data) { addLog(data); } })
      );
      const installCode = await installProcess.exit;
      if (installCode !== 0) throw new Error('npm install échoué');

      addLog('🚀 Démarrage du serveur Vite...');
      setStatus('running');
      const devProcess = await instance.spawn('npm', ['run', 'dev']);
      devProcess.output.pipeTo(
        new WritableStream({ write(data) { addLog(data); } })
      );

      // Attendre que le serveur soit prêt
      instance.on('server-ready', (_port: number, serverUrl: string) => {
        addLog(`✅ Serveur prêt : ${serverUrl}`);
        setUrl(serverUrl);
        if (iframeRef.current) {
          iframeRef.current.src = serverUrl;
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`❌ Erreur: ${message}`);
      setStatus('error');
      hasBooted.current = false;
    }
  }, [schema]);

  // Handle Hot Module Replacement (HMR) when files change
  useEffect(() => {
    if (status !== 'running' || !schema?.project?.files) return;
    
    const currentFiles = schema.project.files;
    const prev = prevFiles.current;
    
    // Find changed or new files. Keep architecture.md out of the visible file list.
    const changedPaths = Object.entries(currentFiles)
      .filter(([path, content]) => prev[path] !== content)
      .map(([path]) => path);

    if (changedPaths.length > 0) {
      void getWebContainerInstance().then(async (instance) => {
        try {
          for (const path of changedPaths) {
            const content = currentFiles[path];
            addLog(`📝 HMR: Mise à jour de ${path}`);
            const dir = path.split('/').slice(0, -1).join('/');
            if (dir) await instance.fs.mkdir(dir, { recursive: true }).catch(() => {});
            await instance.fs.writeFile(path, content);
          }

          if (changedPaths.some((path) => path !== ARCHITECTURE_FILE)) {
            await writeArchitectureFile(instance, getArchitectureMemory(currentFiles));
            addLog('🧠 HMR significatif : architecture.md synchronisé');
          }
        } catch (e) {
          console.error('Failed to write files to WebContainer:', e);
        }
      });
    }

    prevFiles.current = { ...currentFiles };
  }, [schema?.project?.files, status]);

  // Initial boot
  useEffect(() => {
    if (schema && status === 'idle' && !hasBooted.current) {
      void boot();
    }
  }, [schema, status, boot]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-surface-dim">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 mx-2 text-xs font-mono text-ink-400 bg-surface-container rounded px-2 py-1 truncate">
          {url || (status === 'running' ? 'localhost:5173' : 'En attente...')}
        </div>
        <button
          onClick={() => {
            hasBooted.current = false;
            void boot();
          }}
          disabled={status === 'booting' || status === 'installing'}
          className="rounded p-1.5 text-ink-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          {status === 'booting' || status === 'installing'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
        </button>
        <div className={`text-xs font-mono px-2 py-0.5 rounded-full ${
          status === 'running' ? 'bg-green-500/15 text-green-400' :
          status === 'error' ? 'bg-red-500/15 text-red-400' :
          'bg-ink-500/15 text-ink-400'
        }`}>
          {status === 'booting' ? '⚡ Boot...' :
           status === 'installing' ? '📦 Install...' :
           status === 'running' ? '🟢 Live' :
           status === 'error' ? '🔴 Erreur' : '⬜ Idle'}
        </div>
      </div>

      {/* Preview or Loading */}
      <div className="flex-1 relative overflow-hidden">
        {(status === 'booting' || status === 'installing') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-dim gap-4 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-ink-300 font-mono">
              {status === 'booting' ? 'Démarrage du moteur WebContainer...' : 'Installation des dépendances...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col bg-[#0d1117] z-10">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-red-500/20 bg-red-500/5">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300 font-semibold">Erreur de démarrage</p>
              <button
                onClick={() => { hasBooted.current = false; void boot(); }}
                className="ml-auto btn-outline text-xs"
              >
                <RefreshCw className="h-3 w-3" /> Réessayer
              </button>
            </div>
            {/* Show actual build logs so the user can diagnose the problem */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-0.5">
              {logs.map((line, i) => (
                <div key={i} className={`leading-relaxed whitespace-pre-wrap break-all ${
                  line.includes('❌') || line.toLowerCase().includes('error') ? 'text-red-400' :
                  line.includes('✅') ? 'text-green-400' : 'text-ink-300'
                }`}>{line}</div>
              ))}
            </div>
            <p className="px-3 py-2 text-[10px] text-ink-500 border-t border-white/5">
              Conseil : vérifiez que le serveur envoie les headers COOP/COEP requis par WebContainer.
            </p>
          </div>
        )}

        {status === 'running' && url ? (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            allow="cross-origin-isolated"
            title="WebContainer Preview"
          />
        ) : null}
      </div>

      {/* Terminal Logs */}
      <div className="h-32 border-t border-white/5 bg-surface-dim overflow-y-auto font-mono text-[11px] text-green-400 p-2">
        <div className="flex items-center gap-1 mb-1 text-ink-500">
          <Terminal className="h-3 w-3" /> Terminal
        </div>
        {logs.map((line, i) => (
          <div key={i} className="leading-relaxed whitespace-pre-wrap break-all text-ink-300">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
