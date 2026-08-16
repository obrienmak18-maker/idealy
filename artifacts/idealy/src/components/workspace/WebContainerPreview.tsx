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

const LOCAL_DEMO_PREVIEW_HTML = `<!doctype html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Forno — Pizza & partage</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#27201c;background:#f7f1e8}*{box-sizing:border-box}body{margin:0}.page{max-width:1080px;margin:auto;padding:24px 44px}.nav{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d9cdbc;padding-bottom:20px}.brand{font-weight:900;letter-spacing:.18em}.brand span{color:#c25532}.nav a{color:#766b61;text-decoration:none;font-size:.85rem}.hero{display:grid;grid-template-columns:1fr .8fr;gap:54px;align-items:center;padding:72px 0}.eyebrow{color:#c25532;font-size:.7rem;font-weight:900;letter-spacing:.18em}.hero h1{font-size:clamp(3rem,6vw,6rem);line-height:.94;letter-spacing:-.07em;margin:16px 0}.hero em{color:#c25532;font-style:normal}.lead{color:#766b61;line-height:1.7}.hero img{width:100%;height:430px;object-fit:cover;border-radius:200px 200px 12px 12px}.button{display:inline-block;margin-top:20px;border-radius:999px;background:#c25532;color:white;padding:13px 18px;font-weight:800;text-decoration:none}.section{border-top:1px solid #d9cdbc;padding:60px 0}.section h2{font-size:clamp(2rem,4vw,4rem);line-height:1;letter-spacing:-.06em}.menu{display:grid;grid-template-columns:.7fr 1.3fr;gap:60px}.item{display:flex;justify-content:space-between;border-top:1px solid #d9cdbc;padding:18px 0}.item p{color:#766b61;margin:6px 0}.item strong{color:#c25532}@media(max-width:700px){.page{padding:18px 20px}.hero,.menu{grid-template-columns:1fr}.hero{padding:48px 0}.hero img{height:300px}}
</style></head>
<body><main class="page"><nav class="nav"><span class="brand">FORNO<span>•</span></span><div><a href="#menu">Le menu</a> &nbsp; <a href="#contact">Contact</a></div></nav><section class="hero"><div><p class="eyebrow">PIZZA · FEU · PARTAGE</p><h1>La pâte prend son temps. <em>Vous aussi.</em></h1><p class="lead">Des pizzas au feu de bois, des produits simples et une salle où l’on vient comme on est.</p><a class="button" href="#menu">Découvrir le menu ↗</a></div><img src="https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85" alt="Pizza fraîche sortie du four" /></section><section class="section" id="menu"><p class="eyebrow">À LA CARTE</p><h2>Les classiques du four.</h2><div class="item"><div><strong>Margherita</strong><p>Tomate, fior di latte, basilic frais</p></div><strong>9,50 €</strong></div><div class="item"><div><strong>Diavola</strong><p>Tomate, mozzarella, salami piquant, miel</p></div><strong>12,00 €</strong></div><div class="item"><div><strong>Verdure</strong><p>Courgette grillée, poivron, olives, roquette</p></div><strong>11,50 €</strong></div></section><section class="section" id="contact"><p class="eyebrow">ON SE RETROUVE ?</p><h2>Votre table est à deux clics.</h2><p class="lead">18 rue des Oliviers · Ouvert du mardi au dimanche, 18h30—23h.</p><a class="button" href="mailto:bonjour@forno.demo">Nous contacter</a></section></main></body></html>`;

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
  const [demoFallback, setDemoFallback] = useState(false);
  const crashHandledRef = useRef(false);
  const logsRef = useRef<string[]>([]);
  const prevFiles = useRef<Record<string, string>>({});
  const hasBooted = useRef(false);
  const statusRef = useRef<Status>('idle');

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

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(() => {
    hasBooted.current = false;
    setDemoFallback(false);
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

  const isLocalDemo = schema?.project.name.startsWith('Forno') ?? false;
  useEffect(() => {
    if (!enabled || !isLocalDemo || demoFallback) return;
    const timeoutId = window.setTimeout(() => {
      if (statusRef.current === 'running') return;
      setDemoFallback(true);
      setStatus('error');
      addLog('ℹ️ WebContainer reste indisponible dans ce navigateur. Fallback visuel local activé pour la démo.');
    }, 10000);
    return () => window.clearTimeout(timeoutId);
  }, [enabled, isLocalDemo, demoFallback]);

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
        error={status === 'error' && !demoFallback}
        onDeviceChange={setDevice}
        onRefresh={refresh}
      >
        <div className="relative h-full min-h-0">
        {demoFallback ? (
          <iframe srcDoc={LOCAL_DEMO_PREVIEW_HTML} className="h-full w-full border-0 bg-[#f7f1e8]" title="Preview locale Forno" />
        ) : status === 'error' ? (
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
