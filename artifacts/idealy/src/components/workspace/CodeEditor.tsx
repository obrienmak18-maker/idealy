import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Copy, RotateCcw, Save, Sparkles, Target, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createChangeCapsule } from '@/core/mission/changeCapsule';
import type { ChangeCapsule } from '@/core/mission/contracts';
import type { Way } from '@/lore/ways';

interface CodeEditorProps {
  files: Record<string, string>;
  baseFiles?: Record<string, string>;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => void;
  onAskAI?: (prompt: string) => void;
  onProposeChange?: (capsule: ChangeCapsule) => void;
  reviewMode?: boolean;
  way?: Way;
  onAcceptGhost?: (path: string, content: string) => void;
  onRejectGhost?: () => void;
}

interface EditorSelection {
  start: number;
  end: number;
}

type GhostLine = 'same' | 'added';

export function CodeEditor({ files, baseFiles = {}, selectedPath, onSelectFile, onSaveFile, onAskAI, onProposeChange, reviewMode = false, way, onAcceptGhost, onRejectGhost }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiBar, setShowAiBar] = useState(false);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [pendingCapsule, setPendingCapsule] = useState<ChangeCapsule | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  const filePaths = Object.keys(files).filter((path) => !path.startsWith('.idealy/')).sort();
  const currentPath = selectedPath || filePaths[0] || '';
  const currentContent = files[currentPath] || '';
  const baseContent = baseFiles[currentPath] || '';
  const hasUnsavedChanges = content !== currentContent;
  const selectedText = selection ? content.slice(selection.start, selection.end) : '';
  const selectedLineCount = useMemo(() => selectedText ? selectedText.split('\n').length : 0, [selectedText]);
  const ghostLines = useMemo<GhostLine[]>(() => {
    const draftLines = content.split('\n');
    const stableLines = baseContent.split('\n');
    return draftLines.map((line, index) => line === stableLines[index] ? 'same' : 'added');
  }, [baseContent, content]);
  const hasGhostDiff = reviewMode && content !== baseContent;
  const accent = way?.textClass ?? 'text-electric-300';
  const accentBg = way?.primaryClass ?? 'bg-electric-500';
  const accentBorder = way?.borderClass ?? 'border-electric-500/30';

  useEffect(() => {
    setContent(currentContent);
    setSelection(null);
    setShowAiBar(false);
  }, [currentPath, currentContent]);

  const syncSelection = () => {
    const editor = textareaRef.current;
    if (!editor || editor.selectionStart === editor.selectionEnd) {
      setSelection(null);
      return;
    }
    setSelection({ start: editor.selectionStart, end: editor.selectionEnd });
  };

  const handleSave = () => {
    if (!currentPath || !hasUnsavedChanges) return;
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
    setSelection(null);
    onRejectGhost?.();
  };

  const handleRevert = () => {
    setContent(currentContent);
    setSelection(null);
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openTargetedAsk = () => {
    syncSelection();
    setShowAiBar(true);
    setTimeout(() => aiInputRef.current?.focus(), 50);
  };

  const handleAskAI = () => {
    if (!aiPrompt.trim() || !onAskAI) return;
    const target = selectedText.trim() || content;
    const scope = selectedText.trim()
      ? `Portée autorisée : uniquement la sélection ci-dessous (${selectedLineCount} ligne${selectedLineCount > 1 ? 's' : ''}). Ne modifie pas les autres parties ni les autres fichiers sans l’expliquer.`
      : 'Portée autorisée : le fichier actuel uniquement. Ne modifie pas les autres fichiers sans l’expliquer.';
    const contextPrompt = `Fichier ciblé : \`${currentPath}\`\n${scope}\n\n\`\`\`\n${target}\n\`\`\`\n\nDemande : ${aiPrompt.trim()}\n\nRetourne une correction précise et garde l’intention actuelle de l’application.`;
    const capsule = createChangeCapsule({
      scope: selectedText.trim() ? 'selection' : 'file',
      filePath: currentPath,
      summary: aiPrompt.trim(),
      reason: selectedText.trim() ? `Amélioration ciblée de ${selectedLineCount} ligne${selectedLineCount > 1 ? 's' : ''}.` : 'Amélioration du fichier actif sans élargir la portée.',
      selectedLineCount,
      expectedTest: selectedText.trim() ? 'Relire la sélection, puis exécuter la validation de mission.' : 'Relire le diff du fichier, puis exécuter la validation de mission.',
    });
    setPendingCapsule(capsule);
    onProposeChange?.(capsule);
    onAskAI(contextPrompt);
    setAiPrompt('');
    setShowAiBar(false);
  };

  return (
    <div className="flex h-full">
      <div className="w-48 shrink-0 overflow-y-auto border-r border-white/5 bg-[#0d1117] py-2">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Fichiers ({filePaths.length})</div>
        {filePaths.map((path) => (
          <button key={path} onClick={() => onSelectFile(path)} className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${currentPath === path ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}>
            <span className="truncate">{path.split('/').pop()}</span>
          </button>
        ))}
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#0d1117]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-xs text-ink-400">{currentPath}</span>
            {reviewMode && hasGhostDiff && <span className={`shrink-0 rounded-full ${accentBg}/15 px-1.5 py-0.5 text-[10px] font-medium ${accent}`}>Proposition</span>}
            {!reviewMode && hasUnsavedChanges && <span className="shrink-0 rounded-full bg-amber-300/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">Non sauvegardé</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onAskAI && <button onClick={openTargetedAsk} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${showAiBar ? 'bg-electric-400/20 text-electric-400' : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'}`} title="Demander une correction sur le fichier ou la sélection"><Sparkles size={12} />Demander à Idealy</button>}
            <button onClick={handleRevert} disabled={!hasUnsavedChanges} title="Revenir à la dernière version" className="rounded-lg p-1.5 text-ink-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><RotateCcw size={14} /></button>
            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20">{copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}{copied ? 'Copié !' : 'Copier'}</button>
            <button onClick={handleSave} disabled={!hasUnsavedChanges} className="flex items-center gap-1.5 rounded-lg bg-electric-500/80 px-3 py-1.5 text-xs text-white transition hover:bg-electric-500 disabled:cursor-not-allowed disabled:opacity-45">{saved ? <CheckCircle2 size={12} className="text-green-300" /> : <Save size={12} />}{saved ? 'Sauvegardé !' : 'Sauvegarder'}</button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {hasGhostDiff && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`absolute right-4 top-14 z-20 flex items-center gap-2 rounded-xl border ${accentBorder} bg-ink-950/95 px-2 py-2 shadow-2xl`}>
              <span className={`px-1.5 text-[10px] font-semibold ${accent}`}>Ghost Diff · non appliqué</span>
              <button onClick={handleAcceptGhost} className={`flex items-center gap-1 rounded-lg ${accentBg} px-2 py-1 text-[10px] font-semibold text-ink-950 transition hover:brightness-110`}><Check size={12} /> Accepter</button>
              <button onClick={handleRejectGhost} className="flex items-center gap-1 rounded-lg bg-zinc-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-zinc-500"><X size={12} /> Rejeter</button>
            </motion.div>
          )}
        </AnimatePresence>

        {showAiBar && (
          <div className="shrink-0 border-b border-electric-500/20 bg-electric-500/5 px-4 py-2.5">
            {pendingCapsule && <div className="mb-2 grid gap-1 rounded-lg border border-electric-400/20 bg-electric-400/10 px-2.5 py-2 text-[10px] text-electric-100"><div className="flex items-center justify-between gap-2"><span className="font-semibold uppercase tracking-wider text-electric-300">Capsule de changement · {pendingCapsule.risk}</span><span>{pendingCapsule.energyEstimate} énergie estimée</span></div><span className="text-electric-100/80">Test attendu : {pendingCapsule.expectedTest}</span></div>}
            {selectedText && <div className="mb-2 flex items-center gap-2 text-[11px] text-electric-200"><Target size={13} />Sélection ciblée : {selectedLineCount} ligne{selectedLineCount > 1 ? 's' : ''}.<button onClick={() => setSelection(null)} className="text-ink-400 underline-offset-2 hover:text-white hover:underline">Utiliser tout le fichier</button></div>}
            <div className="flex items-center gap-2"><Sparkles size={13} className="shrink-0 text-electric-400" /><textarea ref={aiInputRef} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }} placeholder={selectedText ? 'Ex. simplifie cette logique…' : 'Ex. ajoute la gestion des erreurs…'} rows={1} className="flex-1 resize-none bg-transparent text-xs text-ink-100 placeholder:text-ink-500 focus:outline-none" /><button onClick={handleAskAI} disabled={!aiPrompt.trim()} className="shrink-0 rounded-lg bg-electric-400/20 px-3 py-1.5 text-xs text-electric-400 transition hover:bg-electric-400/30 disabled:opacity-40">Envoyer</button></div>
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-auto font-mono text-xs leading-relaxed">
          {hasGhostDiff && (
            <pre aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 whitespace-pre-wrap break-words p-4 text-[#c9d1d9]">
              {content.split('\n').map((line, index) => <span key={`${index}-${line}`} className={`block min-h-[1.25rem] ${ghostLines[index] === 'added' ? 'rounded-sm bg-emerald-400/[0.12] text-emerald-100' : ''}`}>{line || ' '}</span>)}
            </pre>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); setSelection(null); }}
            onSelect={syncSelection}
            onKeyUp={syncSelection}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onAskAI) { e.preventDefault(); openTargetedAsk(); }
            }}
            spellCheck={false}
            aria-label={`Éditeur de code pour ${currentPath}`}
            className={`relative z-10 h-full min-h-full w-full resize-none bg-transparent p-4 text-[#c9d1d9] focus:outline-none scrollbar-thin ${hasGhostDiff ? 'text-transparent caret-white selection:bg-white/20' : ''}`}
            style={{ tabSize: 2 }}
          />
        </div>
      </div>
    </div>
  );
}
