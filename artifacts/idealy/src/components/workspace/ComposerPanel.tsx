/**
 * ComposerPanel.tsx
 * Mode "Composer" inspiré de Cursor / Atom.dev.
 * Affiche les fichiers avec leur diff depuis la dernière version,
 * permet d'accepter/rejeter les changements par fichier.
 */
import { lazy, Suspense, useState, type ComponentProps } from 'react';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, FileCode2, Sparkles } from 'lucide-react';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';

interface FileChange {
  path: string;
  oldContent?: string;
  newContent: string;
  status: 'added' | 'modified' | 'unchanged';
}

interface ComposerPanelProps {
  currentSchema: IdealyUniversalProjectSchema | null;
  previousSchema: IdealyUniversalProjectSchema | null;
  onAccept: (paths: string[]) => void;
  onReject: (paths: string[]) => void;
}

function computeChanges(
  current: Record<string, string>,
  previous: Record<string, string> | null
): FileChange[] {
  const changes: FileChange[] = [];
  const prev = previous ?? {};

  for (const [path, content] of Object.entries(current)) {
    if (!prev[path]) {
      changes.push({ path, newContent: content, status: 'added' });
    } else if (prev[path] !== content) {
      changes.push({ path, oldContent: prev[path], newContent: content, status: 'modified' });
    }
  }

  return changes;
}

const LazyReactDiffViewer = lazy(() => import('react-diff-viewer-continued').then((module) => {
  const DiffViewer = module.default;
  return {
    default: (props: Omit<ComponentProps<typeof DiffViewer>, 'compareMethod'>) => (
      <DiffViewer {...props} compareMethod={module.DiffMethod.WORDS} />
    ),
  };
}));

function DiffView({ oldContent, newContent }: { oldContent?: string; newContent: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 text-xs">
      <Suspense fallback={<div className="h-48 animate-pulse bg-white/5" aria-label="Chargement de la comparaison" />}>
        <LazyReactDiffViewer
          oldValue={oldContent ?? ''}
          newValue={newContent}
          splitView={false}
          useDarkTheme={true}
          hideLineNumbers={false}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: '#0d1117',
                addedBackground: 'rgba(46, 160, 67, 0.15)',
                addedColor: '#7ee787',
                removedBackground: 'rgba(248, 81, 73, 0.15)',
                removedColor: '#ff7b72',
                wordAddedBackground: 'rgba(46, 160, 67, 0.3)',
                wordRemovedBackground: 'rgba(248, 81, 73, 0.3)',
                addedGutterBackground: 'rgba(46, 160, 67, 0.15)',
                removedGutterBackground: 'rgba(248, 81, 73, 0.15)',
                gutterBackground: '#0d1117',
                gutterBackgroundDark: '#0d1117',
                highlightBackground: '#0d1117',
                highlightGutterBackground: '#0d1117',
                codeFoldGutterBackground: '#0d1117',
                codeFoldBackground: '#0d1117',
                emptyLineBackground: '#0d1117',
                gutterColor: '#8b949e',
                addedGutterColor: '#8b949e',
                removedGutterColor: '#8b949e',
                codeFoldContentColor: '#8b949e',
              }
            }
          }}
        />
      </Suspense>
    </div>
  );
}

function FileChangeCard({
  change,
  accepted,
  rejected,
  onAccept,
  onReject,
}: {
  change: FileChange;
  accepted: boolean;
  rejected: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [open, setOpen] = useState(false);

  const statusColor = change.status === 'added' ? 'text-green-400' : 'text-yellow-400';
  const statusLabel = change.status === 'added' ? 'Nouveau' : 'Modifié';
  const statusBg = change.status === 'added' ? 'bg-green-400/10' : 'bg-yellow-400/10';

  return (
    <div className={`rounded-xl border transition-all ${
      accepted ? 'border-green-500/40 bg-green-500/5' :
      rejected ? 'border-red-500/20 bg-red-500/5 opacity-50' :
      'border-white/5 bg-white/3'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
          {open ? <ChevronDown size={12} className="text-ink-500 shrink-0" /> : <ChevronRight size={12} className="text-ink-500 shrink-0" />}
          <FileCode2 size={13} className="text-blue-400 shrink-0" />
          <span className="text-xs font-mono text-ink-200 truncate">{change.path}</span>
        </button>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBg} ${statusColor}`}>
          {statusLabel}
        </span>
        {!accepted && !rejected && (
          <div className="flex items-center gap-1">
            <button
              onClick={onAccept}
              title="Accepter"
              className="rounded-md p-1 text-green-400 hover:bg-green-400/10 transition"
            >
              <CheckCircle2 size={15} />
            </button>
            <button
              onClick={onReject}
              title="Rejeter"
              className="rounded-md p-1 text-red-400 hover:bg-red-400/10 transition"
            >
              <XCircle size={15} />
            </button>
          </div>
        )}
        {accepted && <span className="text-[10px] text-green-400 font-semibold">✓ Accepté</span>}
        {rejected && <span className="text-[10px] text-red-400 font-semibold">✗ Rejeté</span>}
      </div>

      {/* Diff */}
      {open && (
        <div className="px-3 pb-3">
          <DiffView oldContent={change.oldContent} newContent={change.newContent} />
        </div>
      )}
    </div>
  );
}

export function ComposerPanel({ currentSchema, previousSchema, onAccept, onReject }: ComposerPanelProps) {
  const [acceptedPaths, setAcceptedPaths] = useState<Set<string>>(new Set());
  const [rejectedPaths, setRejectedPaths] = useState<Set<string>>(new Set());

  if (!currentSchema) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Sparkles size={32} className="text-ink-600" />
        <p className="text-sm text-ink-400">Aucune génération en cours</p>
        <p className="text-xs text-ink-600">Le mode Composer affichera les changements ici.</p>
      </div>
    );
  }

  const changes = computeChanges(
    currentSchema.project.files ?? {},
    previousSchema?.project?.files ?? null
  );

  const pendingChanges = changes.filter(c => !acceptedPaths.has(c.path) && !rejectedPaths.has(c.path));

  const acceptAll = () => {
    const allPaths = changes.map(c => c.path);
    setAcceptedPaths(new Set(allPaths));
    onAccept(allPaths);
  };

  const rejectAll = () => {
    const allPaths = changes.map(c => c.path);
    setRejectedPaths(new Set(allPaths));
    onReject(allPaths);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-electric-400" />
          <span className="text-sm font-semibold text-white">Mode Composer</span>
          <span className="text-xs text-ink-500">
            {changes.length} fichier(s) modifié(s)
          </span>
        </div>
        {pendingChanges.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={rejectAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition"
            >
              <XCircle size={12} /> Tout rejeter
            </button>
            <button
              onClick={acceptAll}
              className="flex items-center gap-1.5 rounded-lg bg-electric-400/20 px-3 py-1.5 text-xs text-electric-400 hover:bg-electric-400/30 transition"
            >
              <CheckCircle2 size={12} /> Tout accepter
            </button>
          </div>
        )}
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
        {changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <CheckCircle2 size={28} className="text-green-500" />
            <p className="text-sm text-ink-300">Aucun changement détecté</p>
            <p className="text-xs text-ink-500">Le projet est à jour.</p>
          </div>
        ) : (
          changes.map((change) => (
            <FileChangeCard
              key={change.path}
              change={change}
              accepted={acceptedPaths.has(change.path)}
              rejected={rejectedPaths.has(change.path)}
              onAccept={() => {
                setAcceptedPaths(prev => new Set([...prev, change.path]));
                onAccept([change.path]);
              }}
              onReject={() => {
                setRejectedPaths(prev => new Set([...prev, change.path]));
                onReject([change.path]);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
