"use client";

import { motion, useReducedMotion } from "framer-motion";

/** A deliberately small, original presence for Idealy's public surface. */
export function IdealyPresence() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      animate={reducedMotion ? undefined : { y: [0, -1, 0] }}
      aria-hidden="true"
      className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-[#111225] shadow-[0_8px_24px_rgba(56,189,248,0.16)]"
      transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity }}
    >
      <span className="absolute -top-3 size-9 rounded-full bg-sky-400/30 blur-md" />
      <svg className="relative size-7" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 5 29.5 17.8 43 24l-13.5 6.2L24 43l-5.5-12.8L5 24l13.5-6.2L24 5Z" fill="url(#idealy-presence-gradient)" fillOpacity=".9" />
        <path d="M15 23.5c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9Z" fill="#0D1021" stroke="rgba(255,255,255,.7)" />
        <motion.path
          animate={reducedMotion ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }}
          d="M19 23h3M26 23h3"
          stroke="#E8F6FF"
          strokeLinecap="round"
          strokeWidth="2"
          style={{ transformOrigin: "center" }}
          transition={{ duration: 4.6, repeat: Infinity, times: [0, 0.72, 0.76, 0.8, 1] }}
        />
        <path d="M21 28.5c1.7 1.4 4.3 1.4 6 0" stroke="#7DD3FC" strokeLinecap="round" strokeWidth="1.6" />
        <defs>
          <linearGradient id="idealy-presence-gradient" x1="8" x2="40" y1="7" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset=".5" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#FB923C" />
          </linearGradient>
        </defs>
      </svg>
    </motion.span>
  );
}
