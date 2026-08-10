import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Save, Sparkles } from 'lucide-react';

interface CodeEditorProps {
  files: Record<string, string>;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => void;
  /** Called when the user wants the AI to refine the current file */
  onAskAI?: (prompt: string) => void;
}

export function CodeEditor({ files, selectedPath, onSelectFile, onSaveFile, onAskAI }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiBar, setShowAiBar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  const filePaths = Object.keys(files).sort();
  const currentPath = selectedPath || filePaths[0] || '';
  const currentContent = files[currentPath] || '';

  useEffect(() => {
    setContent(currentContent);
  }, [currentPath, currentContent]);

  const handleSave = () => {
    if (currentPath) {
      onSaveFile(currentPath, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAI = () => {
    if (!aiPrompt.trim() || !onAskAI) return;
    // Build a context-aware prompt including the current file content
    const contextPrompt = `Fichier actuel : \`${currentPath}\`\n\n\`\`\`\n${content}\n\`\`\`\n\n${aiPrompt.trim()}`;
    onAskAI(contextPrompt);
    setAiPrompt('');
    setShowAiBar(false);
  };

  return (
    <div className="flex h-full">
      {/* File sidebar */}
      <div className="w-48 shrink-0 border-r border-white/5 bg-[#0d1117] py-2 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Fichiers ({filePaths.length})
        </div>
        {filePaths.map((path) => (
          <button
            key={path}
            onClick={() => onSelectFile(path)}
            className={`flex w-full items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
              currentPath === path ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="truncate">{path.split('/').pop()}</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
          <span className="text-xs font-mono text-ink-400">{currentPath}</span>
          <div className="flex items-center gap-2">
            {onAskAI && (
              <button
                onClick={() => { setShowAiBar(v => !v); setTimeout(() => aiInputRef.current?.focus(), 50); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                  showAiBar ? 'bg-electric-400/20 text-electric-400' : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Sparkles size={12} />
                Améliorer avec l'IA
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition"
            >
              {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-electric-500/80 px-3 py-1.5 text-xs text-white hover:bg-electric-500 transition"
            >
              {saved ? <CheckCircle2 size={12} className="text-green-300" /> : <Save size={12} />}
              {saved ? 'Sauvegardé !' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* AI prompt bar — Fix #15 */}
        {showAiBar && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-electric-500/20 bg-electric-500/5 shrink-0">
            <Sparkles size={13} className="text-electric-400 shrink-0" />
            <textarea
              ref={aiInputRef}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
              placeholder={`Ex: "Ajoute la gestion des erreurs", "Améliore les performances", "Convertis en TypeScript"...`}
              rows={1}
              className="flex-1 bg-transparent text-xs text-ink-100 placeholder:text-ink-500 resize-none focus:outline-none"
            />
            <button
              onClick={handleAskAI}
              disabled={!aiPrompt.trim()}
              className="shrink-0 rounded-lg bg-electric-400/20 px-3 py-1.5 text-xs text-electric-400 hover:bg-electric-400/30 transition disabled:opacity-40"
            >
              Envoyer
            </button>
          </div>
        )}

        {/* Textarea editor */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl+S → save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
            }
          }}
          spellCheck={false}
          className="flex-1 w-full resize-none bg-transparent p-4 font-mono text-xs text-[#c9d1d9] focus:outline-none scrollbar-thin leading-relaxed"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}