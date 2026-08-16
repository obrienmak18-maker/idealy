import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Github, Image as ImageIcon, Mic, Send, Upload, Figma } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SlashCommand = {
  cmd: string;
  label: string;
  desc: string;
};

type DictationTheme = {
  active: string;
  wave: string;
  ring: string;
  label: string;
};

type CommandBarProps = {
  value: string;
  busy: boolean;
  pendingBrief: boolean;
  showSlashMenu: boolean;
  commands: SlashCommand[];
  dictationTheme: DictationTheme;
  listening: boolean;
  shouldReduceMotion: boolean | null;
  isUploading: boolean;
  toolMessage: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSlashMenuChange: (open: boolean) => void;
  onSelectCommand: (command: SlashCommand) => void;
  onUpload: (files: FileList | null) => void;
  onToggleDictation: () => void;
  onOpenFigma: () => void;
  onConnectGitHub: () => void;
};

export function CommandBar({
  value,
  busy,
  pendingBrief,
  showSlashMenu,
  commands,
  dictationTheme,
  listening,
  shouldReduceMotion,
  isUploading,
  toolMessage,
  onChange,
  onSubmit,
  onSlashMenuChange,
  onSelectCommand,
  onUpload,
  onToggleDictation,
  onOpenFigma,
  onConnectGitHub,
}: CommandBarProps) {
  const attachmentRef = useRef<HTMLInputElement>(null);
  const motionEnabled = !shouldReduceMotion;

  return (
    <div className="sticky bottom-0 z-20 shrink-0 border-t border-white/5 bg-[#0a0a0f]/90 px-4 pb-4 pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="pointer-events-none absolute left-1/2 h-24 w-[min(40rem,90vw)] -translate-x-1/2 -translate-y-5 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.2),rgba(249,115,22,0.08),transparent_70%)] blur-2xl" />
        <div className="relative rounded-2xl bg-[linear-gradient(100deg,rgba(139,92,246,0.9),rgba(249,115,22,0.88),rgba(139,92,246,0.72))] p-px shadow-[0_0_38px_rgba(139,92,246,0.14)]">
          <div className="relative rounded-[15px] bg-[#0d0d14]/95 p-3">
            <AnimatePresence>
              {showSlashMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-xl border border-white/10 bg-[#12121a]/95 py-1.5 shadow-2xl backdrop-blur-xl"
                >
                  <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">Commandes rapides</div>
                  {commands.filter((command) => command.cmd.startsWith(value.toLowerCase()) || value === '/').map((command) => (
                    <button
                      type="button"
                      key={command.cmd}
                      onClick={() => onSelectCommand(command)}
                      className="flex w-full items-start gap-3 px-3 py-2 text-left transition hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-violet-300">{command.label}</span>
                      <span className="text-xs text-ink-400">{command.desc}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value;
                onChange(nextValue);
                onSlashMenuChange(nextValue === '/' || (nextValue.startsWith('/') && !nextValue.includes(' ')));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  onSlashMenuChange(false);
                  return;
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Décrivez votre mission… ou tapez / pour une commande"
              rows={1}
              aria-label="Décrire une mission"
              className="max-h-40 min-h-[2.75rem] w-full resize-none bg-transparent px-1 text-sm leading-6 text-ink-100 placeholder:text-ink-500 focus:outline-none scrollbar-thin"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => attachmentRef.current?.click()} aria-label="Ajouter un fichier" title="Ajouter un fichier" className="text-ink-400 hover:bg-white/5 hover:text-white">
                  <Upload size={16} />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => attachmentRef.current?.click()} aria-label="Ajouter une image" title="Ajouter une image" className="text-ink-400 hover:bg-white/5 hover:text-white">
                  <ImageIcon size={16} />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={onOpenFigma} aria-label="Connecter Figma" title="Connecter Figma" className="text-ink-400 hover:bg-white/5 hover:text-white">
                  <Figma size={16} />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={onConnectGitHub} aria-label="Connecter GitHub" title="Connecter GitHub" className="text-ink-400 hover:bg-white/5 hover:text-white">
                  <Github size={16} />
                </Button>
                <input ref={attachmentRef} type="file" multiple className="hidden" onChange={(event) => onUpload(event.target.files)} />
                <button
                  type="button"
                  onClick={onToggleDictation}
                  aria-pressed={listening}
                  aria-label={listening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
                  title={listening ? 'Arrêter la dictée' : 'Dicter votre mission'}
                  className={`relative inline-flex h-9 w-9 items-center justify-center overflow-visible rounded-lg p-2 transition focus:outline-none focus:ring-2 focus:ring-white/30 ${listening ? dictationTheme.active : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {listening && motionEnabled && <motion.span aria-hidden="true" className={`pointer-events-none absolute -inset-1 rounded-xl border ${dictationTheme.ring}`} initial={{ opacity: 0.75, scale: 0.82 }} animate={{ opacity: 0, scale: 1.35 }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }} />}
                  <span className={`absolute inset-0 flex items-center justify-center gap-[2px] transition-opacity ${listening ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
                    {[0, 1, 2, 3].map((bar) => <motion.span key={bar} className={`h-3 w-[2px] rounded-full ${dictationTheme.wave}`} style={{ transformOrigin: 'center' }} animate={listening && motionEnabled ? { scaleY: [0.45, 1, 0.55, 0.85, 0.45] } : { scaleY: 0.45 }} transition={{ duration: 0.72, delay: bar * 0.09, repeat: listening && motionEnabled ? Infinity : 0, ease: 'easeInOut' }} />)}
                  </span>
                  <Mic size={16} className={`transition-opacity ${listening ? 'opacity-0' : 'opacity-100'}`} />
                </button>
              </div>
              <Button type="button" onClick={onSubmit} disabled={!value.trim() || busy || pendingBrief} size="icon" className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 text-white shadow-lg shadow-violet-950/30 hover:from-violet-400 hover:to-orange-400">
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
        {listening && <p role="status" aria-live="polite" className={`mt-2 flex items-center gap-2 text-xs ${dictationTheme.active.split(' ').find((token) => token.startsWith('text-')) ?? 'text-violet-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${dictationTheme.wave} motion-safe:animate-pulse`} aria-hidden="true" />{dictationTheme.label} — parlez, puis appuyez à nouveau sur le micro pour arrêter.</p>}
        {toolMessage && <p role="status" className="mt-2 text-xs text-ink-400">{isUploading ? 'Import en cours…' : toolMessage}</p>}
        <p className="mt-2 text-center text-[11px] text-ink-600">Idealy peut se tromper. Vérifiez le code généré avant publication.</p>
      </div>
    </div>
  );
}
