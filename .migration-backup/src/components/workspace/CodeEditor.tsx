import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Save } from 'lucide-react';

interface CodeEditorProps {
  files: Record<string, string>;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => void;
}

export function CodeEditor({ files, selectedPath, onSelectFile, onSaveFile }: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.json')) return 'json';
    return 'plaintext';
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
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <span className="text-xs font-mono text-ink-400">{currentPath}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition"
            >
              {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary-fixed-dim transition"
            >
              {saved ? <CheckCircle2 size={12} className="text-green-400" /> : <Save size={12} />}
              {saved ? 'Sauvegardé !' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Textarea editor (Monaco would go here in production) */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full resize-none bg-transparent p-4 font-mono text-xs text-[#c9d1d9] focus:outline-none scrollbar-thin leading-relaxed"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}