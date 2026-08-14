import { motion } from 'framer-motion';
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
  channel?: 'conversation' | 'ideation' | 'execution';
  avatar?: string;
}

function hashHue(value: string): number {
  let hue = 0;
  for (let index = 0; index < value.length; index += 1) hue = (hue * 31 + value.charCodeAt(index)) % 360;
  return hue;
}

function visibleText(rawText: string): string {
  return rawText
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
    .replace(/<\/think>/gi, '')
    .trim();
}

export function MessageBubble({ msg, way }: { msg: ChatMessage; way: Way }) {
  const isUser = msg.kind === 'user';
  const agent = way.agents.find((candidate) => candidate.id === msg.agentId);
  const hue = agent ? hashHue(agent.id) : 200;
  const text = visibleText(msg.text);
  const isExecutionAgent = !isUser && msg.kind === 'agent' && msg.channel !== 'conversation';

  if (isExecutionAgent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {agent?.avatar ? (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10">
          <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-ink-950"
          style={{ background: isUser ? `hsl(${hashHue(msg.author)} 60% 55%)` : `hsl(${hue} 70% 55%)` }}
        >
          {msg.author[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div className={`max-w-[85%] min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className="mb-1 flex items-center gap-2 text-xs text-ink-400">
          <span className="font-medium text-ink-200">{msg.author}</span>
          {!isUser && <span className={way.textClass}>{msg.role}</span>}
        </div>
        {text && (
          <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${isUser ? 'bg-electric-600/20 text-ink-100' : 'glass-soft text-ink-100'}`}>
            {text}
            {msg.status === 'writing' && !isUser && <span className="ml-1 animate-pulse font-bold text-electric-400">|</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
