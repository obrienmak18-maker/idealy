import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Loader2, Code2 } from 'lucide-react';
import type { Way } from '@/lore/ways';

export interface ChatMessage {
  id: string;
  agentId?: string;
  author: string;
  role: string;
  text: string;
  kind: 'agent' | 'user' | 'system';
  ts: number;
  status?: 'thinking' | 'writing' | 'done';
  avatar?: string; // AI-generated agent portrait
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

// Parses <think> content from text
function parseThoughtProcess(rawText: string) {
  let text = rawText;
  let thought = '';
  
  const startMatch = text.match(/<think>/i);
  const endMatch = text.match(/<\/think>/i);
  
  if (startMatch) {
    if (endMatch) {
      thought = text.slice(startMatch.index! + 7, endMatch.index).trim();
      text = text.slice(0, startMatch.index) + text.slice(endMatch.index! + 8);
    } else {
      thought = text.slice(startMatch.index! + 7).trim();
      text = text.slice(0, startMatch.index);
    }
  }
  
  return { thought, text: text.trim() };
}

export function MessageBubble({ msg, way }: { msg: ChatMessage; way: Way }) {
  const isUser = msg.kind === 'user';
  const agent = way.agents.find((a) => a.id === msg.agentId);
  const hue = agent ? hashHue(agent.id) : 200;
  const [showThought, setShowThought] = useState(false);

  const { thought, text } = parseThoughtProcess(msg.text);
  
  // Dynamic state label for the thought block
  let thoughtLabel = "Réflexion en cours...";
  if (msg.status === 'done') thoughtLabel = "Processus de réflexion";
  else if (msg.status === 'writing') thoughtLabel = "Rédaction de la réponse";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      {agent?.avatar ? (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10">
          <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-ink-950"
          style={{
            background: isUser
              ? `hsl(${hashHue(msg.author)} 60% 55%)`
              : `hsl(${hue} 70% 55%)`,
          }}
        >
          {msg.author[0].toUpperCase()}
        </div>
      )}
      <div className={`max-w-[85%] min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className="mb-1 flex items-center gap-2 text-xs text-ink-400">
          <span className="font-medium text-ink-200">{msg.author}</span>
          {!isUser && <span className={way.textClass}>{msg.role}</span>}
        </div>
        
        {!isUser && (thought || msg.status === 'thinking') && (
          <div className="mb-2 w-full">
            <button 
              onClick={() => setShowThought(!showThought)}
              className="flex items-center gap-2 text-[11px] text-ink-400 hover:text-ink-200 transition bg-ink-900/40 px-2 py-1.5 rounded-lg border border-white/5"
            >
              {msg.status === 'thinking' ? (
                <Loader2 size={12} className="animate-spin text-electric-400" />
              ) : (
                <Code2 size={12} className="text-ink-500" />
              )}
              {thoughtLabel}
              {showThought ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            <AnimatePresence>
              {showThought && thought && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 rounded-xl bg-ink-950/60 p-3 text-xs text-ink-400 font-mono leading-relaxed border border-white/5 whitespace-pre-wrap">
                    {thought}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {text && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm inline-block ${
              isUser
                ? 'bg-electric-600/20 text-ink-100'
                : 'glass-soft text-ink-100'
            }`}
          >
            {text}
            {msg.status === 'writing' && !isUser && (
              <span className="ml-1 animate-pulse font-bold text-electric-400">|</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
