import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="#0a0c1c" stroke="url(#logo-g)" strokeWidth="1.5" />
        <path d="M9 7h3v18H9zM16 7h3l6 18h-3l-1.2-3.6h-5.6L14 25h-3zm1.5 5.2L16 16h3z" fill="url(#logo-g)" />
      </svg>
      <span className="font-display font-semibold text-lg tracking-tight text-white">
        Idealy
      </span>
    </div>
  );
}

export function WayBadge({ way, className = '' }: { way: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {way}
    </span>
  );
}

export function AnimatedHeading({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.h1>
  );
}

export function RotatingWords({
  words,
  className = '',
}: {
  words: string[];
  className?: string;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {words.map((w, i) => (
        <motion.span
          key={w}
          className="absolute left-0 top-0 whitespace-nowrap"
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [20, 0, 0, -20],
            filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(8px)'],
          }}
          transition={{
            duration: 9,
            times: [0, 0.1, 0.85, 1],
            delay: i * 3,
            repeat: Infinity,
            repeatDelay: words.length * 3 - 3,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <span className="bg-gradient-to-r from-electric-400 via-white to-ember-400 bg-clip-text text-transparent">
            {w}
          </span>
        </motion.span>
      ))}
      <span className="invisible">{words[0]}</span>
    </span>
  );
}
