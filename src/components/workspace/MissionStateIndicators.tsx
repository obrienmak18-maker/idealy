import { motion, useReducedMotion } from 'framer-motion';
import { FileCode2, Sparkles } from 'lucide-react';

interface IndicatorProps {
  className?: string;
}

function AnimatedIndicatorText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      aria-live="polite"
      animate={shouldReduceMotion ? { opacity: 0.72 } : { opacity: [0.3, 0.8, 0.3] }}
      transition={shouldReduceMotion ? undefined : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`inline-block bg-[linear-gradient(90deg,#4ade80,#facc15,#60a5fa,#4ade80)] bg-[length:240%_100%] bg-clip-text text-transparent ${className}`}
      style={{ animation: shouldReduceMotion ? undefined : 'idealy-gradient-shift 3.2s linear infinite' }}
    >
      {children}
    </motion.span>
  );
}

export function ThinkingIndicator({ className = '' }: IndicatorProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-ink-400 ${className}`} role="status">
      <Sparkles size={12} aria-hidden="true" className="text-electric-300" />
      <AnimatedIndicatorText>réfléchit…</AnimatedIndicatorText>
    </span>
  );
}

export function FileCreationIndicator({ path, className = '' }: { path: string; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs text-ink-400 ${className}`} role="status">
      <FileCode2 size={12} aria-hidden="true" className="shrink-0 text-emerald-300" />
      <AnimatedIndicatorText className="truncate">création de {path}…</AnimatedIndicatorText>
    </span>
  );
}
