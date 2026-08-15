import Editor, { type OnMount } from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Copy, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import { createChangeCapsule } from '@/core/mission/changeCapsule';
import type { ChangeCapsule } from '@/core/mission/contracts';
import type { Way } from '@/lore/ways';

export type CodeActionIntent = 'IDEATION' | 'EXECUTION';

type ContextAction = {
  label: string;
  description: string;
  prompt: string;
  intent: CodeActionIntent;
};

interface CodeEditorProps {
  files: Record<string, string>;
  baseFiles?: Record<string, string>;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => void;
  onAskAI?: (prompt: string, intent?: CodeActionIntent) => void;
  onProposeChange?: (capsule: ChangeCapsule) => void;
  reviewMode?: boolean;
  way?: Way;
  onAcceptGhost?: (path: string, content: string) => void;
  onRejectGhost?: () => void;
}

function languageForPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'tsx' || extension === 'ts') return 'typescript';
  if (extension === 'jsx' || extension === 'js') return 'javascript';
  if (extension === 'html') return 'html';
  if (extension === 'css') return 'css';
  if (extension === 'json') return 'json';
  if (extension === 'md') return 'markdown';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';
  return 'plaintext';
}

function createLineDecorations(
  monaco: typeof Monaco,
  stable: string,
  proposed: string,
): { decorations: Monaco.editor.IModelDeltaDecoration[]; firstChangedLine: number } {
  const stableLines = stable.split('\n');
  const proposedLines = proposed.split('\n');
  const decorations: Monaco.editor.IModelDeltaDecoration[] = [];
  let stableIndex = 0;
  let proposedIndex = 0;
  let firstChangedLine = Number.POSITIVE_INFINITY;

  const addDecoration = (lineNumber: number, className: string, injectedText?: string) => {
    const safeLine = Math.max(1, Math.min(proposedLines.length, lineNumber));
    firstChangedLine = Math.min(firstChangedLine, safeLine);
    decorations.push({
      range: new monaco.Range(safeLine, 1, safeLine, 1),
      options: {
        className,
        isWholeLine: true,
        glyphMarginClassName: className === 'idealy-ghost-added' ? 'idealy-ghost-glyph-added' : 'idealy-ghost-glyph-deleted',
        before: injectedText ? { content: injectedText, inlineClassName: 'idealy-ghost-injected' } : undefined,
      },
    });
  };

  while (stableIndex < stableLines.length || proposedIndex < proposedLines.length) {
    const stableLine = stableLines[stableIndex];
    const proposedLine = proposedLines[proposedIndex];
    if (stableLine === proposedLine) {
      stableIndex += 1;
      proposedIndex += 1;
      continue;
    }

    if (proposedIndex + 1 < proposedLines.length && stableLine === proposedLines[proposedIndex + 1]) {
      addDecoration(proposedIndex + 1, 'idealy-ghost-added');
      proposedIndex += 1;
      continue;
    }

    if (stableIndex + 1 < stableLines.length && stableLines[stableIndex + 1] === proposedLine) {
      addDecoration(proposedIndex + 1, 'idealy-ghost-deleted', `− ${stableLine}`);
      stableIndex += 1;
      continue;
    }

    if (proposedIndex < proposedLines.length) {
      addDecoration(proposedIndex + 1, 'idealy-ghost-added');
      proposedIndex += 1;
    }
    if (stableIndex < stableLines.length) stableIndex += 1;
  }

  return {
    decorations,
    firstChangedLine: Number.isFinite(firstChangedLine) ? firstChangedLine : 1,
  };
}

function defineIdealyTheme(monaco: typeof Monaco) {
  monaco.editor.defineTheme('idealy-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '728096', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C4B5FD' },
      { token: 'string', foreground: '86EFAC' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorLineNumber.foreground': '#4b5563',
      'editorLineNumber.activeForeground': '#d1d5db',
      'editor.selectionBackground': '#334155',
      'editorCursor.foreground': '#f8fafc',
    },
  });
}

export function CodeEditor({ files, baseFiles = {}, selectedPath, onSelectFile, onSaveFile, onAskAI, onProposeChange, reviewMode = false, way, onAcceptGhost, onRejectGhost }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState('');
  const [pendingCapsule, setPendingCapsule] = useState<ChangeCapsule | null>(null);
  const [ghostAnchorTop, setGhostAnchorTop] = useState(12);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const selectionDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const scrollDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const filePaths = Object.keys(files).filter((path) => !path.startsWith('.idealy/')).sort();
  const currentPath = selectedPath || filePaths[0] || '';
  const currentContent = files[currentPath] || '';
  const baseContent = baseFiles[currentPath] || '';
  const hasUnsavedChanges = content !== currentContent;
  const hasGhostDiff = reviewMode && content !== baseContent;
  const selectedLineCount = useMemo(() => selection ? selection.split('\n').length : 0, [selection]);
  const accent = way?.textClass ?? 'text-electric-300';
  const accentBg = way?.primaryClass ?? 'bg-electric-500';
  const accentBorder = way?.borderClass ?? 'border-electric-500/30';

  useEffect(() => {
    setContent(currentContent);
    setSelection('');
  }, [currentPath, currentContent]);

  const updateGhostAnchor = useCallback((lineNumber: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    setGhostAnchorTop(Math.max(12, editor.getTopForLineNumber(lineNumber) + 8));
  }, []);

  const refreshDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const next = hasGhostDiff ? createLineDecorations(monaco, baseContent, content) : { decorations: [], firstChangedLine: 1 };
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, next.decorations);
    if (hasGhostDiff) updateGhostAnchor(next.firstChangedLine);
  }, [baseContent, content, hasGhostDiff, updateGhostAnchor]);

  useEffect(() => {
    refreshDecorations();
    return () => {
      if (editorRef.current && decorationsRef.current.length) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, [refreshDecorations]);

  const handleBeforeMount = (monaco: typeof Monaco) => {
    defineIdealyTheme(monaco);
    monacoRef.current = monaco;
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    selectionDisposableRef.current?.dispose();
    scrollDisposableRef.current?.dispose();
    selectionDisposableRef.current = editor.onDidChangeCursorSelection((event) => {
      const model = editor.getModel();
      if (!model || event.selection.isEmpty()) {
        setSelection('');
        return;
      }
      setSelection(model.getValueInRange(event.selection));
    });
    scrollDisposableRef.current = editor.onDidScrollChange(() => {
      if (hasGhostDiff) {
        const next = createLineDecorations(monaco, baseContent, content);
        updateGhostAnchor(next.firstChangedLine);
      }
    });
    refreshDecorations();
  };

  useEffect(() => () => {
    selectionDisposableRef.current?.dispose();
    scrollDisposableRef.current?.dispose();
  }, []);

  const handleSave = () => {
    if (!currentPath || !hasUnsavedChanges || reviewMode) return;
    onSaveFile(currentPath, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAcceptGhost = () => {
    if (!currentPath || !hasGhostDiff) return;
    if (onAcceptGhost) onAcceptGhost(currentPath, content);
    else onSaveFile(currentPath, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRejectGhost = () => {
    setContent(currentContent);
    setSelection('');
    onRejectGhost?.();
  };

  const handleRevert = () => {
    setContent(currentContent);
    setSelection('');
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contextActions: ContextAction[] = selection.trim()
    ? [
      { label: 'Expliquer la sélection', description: 'Comprendre ce bloc sans modifier le projet.', prompt: 'Explique la sélection avec précision, ses entrées, ses sorties et ses risques.', intent: 'IDEATION' },
      { label: 'Optimiser ce code', description: 'Proposer une amélioration ciblée.', prompt: 'Optimise uniquement la sélection et retourne une proposition complète et testable.', intent: 'EXECUTION' },
      { label: 'Générer des tests', description: 'Déduire les cas nominaux et limites.', prompt: 'Génère des tests pertinents pour la sélection et explique où les placer.', intent: 'EXECUTION' },
    ]
    : [
      { label: 'Améliorer ce fichier', description: 'Proposer une amélioration du fichier actif.', prompt: 'Améliore le fichier actif sans changer son intention et retourne une proposition complète.', intent: 'EXECUTION' },
      { label: 'Détecter les failles', description: 'Faire une revue de sécurité sans écrire.', prompt: 'Analyse ce fichier à la recherche de failles, risques et mauvaises pratiques. Ne modifie rien.', intent: 'IDEATION' },
      { label: 'Ajouter des commentaires', description: 'Documenter les parties difficiles.', prompt: 'Ajoute des commentaires utiles uniquement là où la logique est difficile à comprendre.', intent: 'EXECUTION' },
    ];

  const handleContextAction = (action: ContextAction) => {
    if (!onAskAI || !currentPath) return;
    const selected = selection.trim();
    const scope = selected
      ? `Sélection active (${selectedLineCount} ligne${selectedLineCount > 1 ? 's' : ''}) :\n\`\`\`\n${selected}\n\`\`\``
      : 'Aucune sélection active.';
    const contextPrompt = `Action contextuelle : ${action.label}\nIntention : ${action.intent}\nFichier actif : \`${currentPath}\`\n\nContenu complet du fichier :\n\`\`\`\n${content}\n\`\`\`\n\n${scope}\n\nConsigne : ${action.prompt}\n\nRespecte la voie active, les contrats de mission et ne prétends pas avoir écrit sur le disque avant validation.`;

    if (action.intent === 'EXECUTION') {
      const capsule = createChangeCapsule({
        scope: selected ? 'selection' : 'file',
        filePath: currentPath,
        summary: action.label,
        reason: selected ? `Action ciblée sur ${selectedLineCount} ligne${selectedLineCount > 1 ? 's' : ''}.` : 'Action ciblée sur le fichier actif.',
        selectedLineCount,
        expectedTest: 'Relire le Ghost Diff, accepter explicitement, puis exécuter la validation de mission.',
      });
      setPendingCapsule(capsule);
      onProposeChange?.(capsule);
    }
    onAskAI(contextPrompt, action.intent);
  };

  return (
    <div className="flex h-full">
      <style>{`.idealy-ghost-added{background:rgba(34,197,94,.2);border-left:2px solid rgba(34,197,94,.75)}.idealy-ghost-deleted{background:rgba(239,68,68,.2);border-left:2px solid rgba(239,68,68,.75)}.idealy-ghost-glyph-added{background:rgba(34,197,94,.9);width:4px!important;margin-left:3px}.idealy-ghost-glyph-deleted{background:rgba(239,68,68,.9);width:4px!important;margin-left:3px}.idealy-ghost-injected{color:rgba(252,165,165,.95);font-style:italic;opacity:.85}`}</style>
      <div className="w-48 shrink-0 overflow-y-auto border-r border-white/5 bg-[#0d1117] py-2">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Fichiers ({filePaths.length})</div>
        {filePaths.map((path) => (
          <button key={path} onClick={() => onSelectFile(path)} className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${currentPath === path ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}>
            <span className="truncate">{path.split('/').pop()}</span>
          </button>
        ))}
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0d1117]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-xs text-ink-400">{currentPath}</span>
            {reviewMode && hasGhostDiff && <span className={`shrink-0 rounded-full ${accentBg}/15 px-1.5 py-0.5 text-[10px] font-medium ${accent}`}>Proposition</span>}
            {!reviewMode && hasUnsavedChanges && <span className="shrink-0 rounded-full bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">Non sauvegardé</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onAskAI && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-ink-200 transition hover:bg-white/10 hover:text-white" title="Actions contextuelles sur le code">
                    <Sparkles size={12} />Demander à Idealy
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-64 rounded-xl border border-white/10 bg-ink-950/95 p-1.5 text-ink-100 shadow-2xl backdrop-blur-xl">
                    <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">{selection.trim() ? 'Sélection active' : 'Fichier actif'}</DropdownMenu.Label>
                    <DropdownMenu.Separator className="my-1 h-px bg-white/8" />
                    {contextActions.map((action) => (
                      <DropdownMenu.Item key={action.label} onSelect={() => handleContextAction(action)} className="cursor-pointer rounded-lg px-2.5 py-2 outline-none transition data-[highlighted]:bg-white/10">
                        <div className="grid gap-0.5"><span className="text-xs font-medium">{action.label}</span><span className="text-[10px] text-ink-500">{action.description} · {action.intent}</span></div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )}
            <button onClick={handleRevert} disabled={!hasUnsavedChanges || reviewMode} title="Revenir à la dernière version" className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><RotateCcw size={14} /></button>
            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20">{copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}{copied ? 'Copié !' : 'Copier'}</button>
            <button onClick={handleSave} disabled={!hasUnsavedChanges || reviewMode} className="flex items-center gap-1.5 rounded-lg bg-electric-500/80 px-3 py-1.5 text-xs text-white transition hover:bg-electric-500 disabled:cursor-not-allowed disabled:opacity-45">{saved ? <CheckCircle2 size={12} className="text-green-300" /> : <Save size={12} />}{reviewMode ? 'Accepter pour sauvegarder' : saved ? 'Sauvegardé !' : 'Sauvegarder'}</button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {hasGhostDiff && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ top: ghostAnchorTop }} className={`absolute right-4 z-20 flex items-center gap-2 rounded-xl border ${accentBorder} bg-ink-950/95 px-2 py-2 shadow-2xl`}>
              <span className={`px-1.5 text-[10px] font-semibold ${accent}`}>Ghost Diff · non appliqué</span>
              <button onClick={handleAcceptGhost} className={`flex items-center gap-1 rounded-lg ${accentBg} px-2 py-1 text-[10px] font-semibold text-ink-950 transition hover:brightness-110`}><Check size={12} /> Accepter</button>
              <button onClick={handleRejectGhost} className="flex items-center gap-1 rounded-lg bg-zinc-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-zinc-500"><X size={12} /> Rejeter</button>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingCapsule && reviewMode && <div className="shrink-0 border-b border-electric-500/15 bg-electric-500/5 px-4 py-2 text-[10px] text-electric-100"><span className="font-semibold text-electric-300">Capsule de changement · {pendingCapsule.risk}</span><span className="ml-3 text-electric-100/70">Test attendu : {pendingCapsule.expectedTest}</span></div>}

        <div className="relative min-h-0 flex-1">
          <Editor
            height="100%"
            language={languageForPath(currentPath)}
            theme="idealy-dark"
            value={content}
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            onChange={(value) => { if (!reviewMode) setContent(value ?? ''); }}
            options={{
              readOnly: reviewMode,
              minimap: { enabled: true },
              fontSize: 12,
              lineHeight: 19,
              padding: { top: 14, bottom: 14 },
              wordWrap: 'on',
              smoothScrolling: true,
              renderLineHighlight: 'line',
              glyphMargin: true,
              folding: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
