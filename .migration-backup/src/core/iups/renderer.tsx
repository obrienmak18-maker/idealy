/**
 * renderer.tsx
 * Rendu "design" en mémoire du projet Idealy.
 * Avec la nouvelle architecture multi-fichiers (IUPS v2),
 * on affiche un aperçu de la structure du projet via un iframe srcdoc ou
 * un fallback visuel. Détecte automatiquement si le projet est mobile (Expo).
 */
import React from 'react';
import type { IdealyUniversalProjectSchema } from './types';
import { FolderOpen, FileCode2, Smartphone, Monitor } from 'lucide-react';

interface RendererProps {
  schema: IdealyUniversalProjectSchema;
  activeRoutePath?: string;
  onSelectElement?: (nodeId: string | null) => void;
  selectedElementId?: string | null;
}

function isMobileProject(schema: IdealyUniversalProjectSchema): boolean {
  const files = schema?.project?.files ?? {};
  return (
    schema.project?.stack === 'expo-react-native' ||
    'app.json' in files ||
    'app/(tabs)/index.tsx' in files
  );
}

/** Aperçu simulé pour les projets React Native / Expo */
function MobilePreview({ schema }: { schema: IdealyUniversalProjectSchema }) {
  const files = schema.project.files ?? {};
  const mainScreen = files['app/(tabs)/index.tsx'] ?? files['app/index.tsx'];
  const appName = schema.project.name ?? 'Mon App';

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0d1117] gap-6 p-8">
      {/* Phone frame */}
      <div className="relative w-56 rounded-[2.5rem] border-4 border-white/10 bg-[#1a1a2e] shadow-2xl overflow-hidden"
        style={{ height: 480 }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-medium text-white/60">9:41</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <div className="h-1.5 w-2 rounded-sm bg-white/40" />
            <div className="h-1.5 w-3 rounded-sm bg-white/40" />
          </div>
        </div>
        {/* Dynamic Island */}
        <div className="mx-auto mb-2 h-6 w-24 rounded-full bg-black" />
        {/* App content */}
        <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
          <div className="mb-3 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
            📱
          </div>
          <p className="text-sm font-semibold text-white">{appName}</p>
          <p className="mt-1 text-[10px] text-white/40">Expo · React Native</p>
          {mainScreen && (
            <div className="mt-4 w-full rounded-xl bg-white/5 p-2">
              <pre className="text-[8px] text-left text-white/40 overflow-hidden max-h-20 leading-tight">
                {mainScreen.slice(0, 200)}
              </pre>
            </div>
          )}
        </div>
        {/* Home bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-white/20" />
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <Smartphone size={13} />
        <span>Projet mobile Expo détecté</span>
      </div>
      <p className="text-[11px] text-ink-600 text-center max-w-48">
        Lancez <code className="text-electric-400">npx expo start</code> depuis le dossier téléchargé pour tester sur votre appareil.
      </p>
    </div>
  );
}

export function PreviewRenderer({ schema }: RendererProps) {
  const files = schema?.project?.files;

  if (!files || Object.keys(files).length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8 bg-[#0d1117]">
        <FolderOpen size={40} className="text-ink-600" />
        <p className="text-sm text-ink-400">Aucun fichier généré</p>
      </div>
    );
  }

  // Mobile project → show phone frame
  if (isMobileProject(schema)) {
    return <MobilePreview schema={schema} />;
  }

  // Try to extract a simple HTML-only preview from index.html if present
  const indexHtml = files['index.html'];

  if (indexHtml) {
    // Inject a <base> tag so relative paths work
    const html = indexHtml.replace('<head>', '<head><base href="/" />');
    return (
      <iframe
        srcDoc={html}
        title="Aperçu HTML"
        className="w-full h-full border-0"
        sandbox="allow-scripts"
      />
    );
  }

  // Fallback: file tree visual with browser chrome
  const fileList = Object.keys(files).sort();

  return (
    <div className="flex h-full flex-col bg-[#0d1117] text-ink-200 overflow-auto">
      {/* Browser chrome mockup */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5 bg-[#161b22]">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 mx-3 rounded-md bg-white/5 px-3 py-1 text-xs text-ink-400 flex items-center gap-2">
          <Monitor size={10} />
          <span>localhost:5173</span>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <FolderOpen size={18} className="text-electric-400" />
          <span className="font-semibold text-sm">{schema.project.name}</span>
          <span className="text-xs text-ink-500 ml-1">— {fileList.length} fichiers</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fileList.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-mono text-ink-300 hover:bg-white/8 transition"
            >
              <FileCode2 size={13} className="text-blue-400 shrink-0" />
              <span className="truncate">{path}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-ink-500 text-center">
          Utilisez l'onglet <strong className="text-ink-300">Aperçu Live</strong> → WebContainer pour voir l'app en action.
        </p>
      </div>
    </div>
  );
}
