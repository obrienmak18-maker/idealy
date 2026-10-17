"use client";

import { useId } from "react";

export function CosmicHorizon() {
  const uid = useId().replace(/:/g, "");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* 1. Deep cosmic gradient mesh */}
      <div className="absolute inset-0 bg-[#07080E]/95" />

      {/* 2. Top-left Cyan & Emerald stellar flare */}
      <div className="absolute -left-32 -top-24 size-[34rem] rounded-full bg-cyan-500/[0.08] blur-[120px]" />
      <div className="absolute left-[5%] top-[10%] size-[24rem] rounded-full bg-emerald-500/[0.04] blur-[100px]" />

      {/* 3. Right & Bottom-Right Violet & Magenta Nebula */}
      <div className="absolute -right-24 top-[15%] size-[36rem] rounded-full bg-violet-600/[0.12] blur-[130px]" />
      <div className="absolute right-[5%] bottom-[5%] size-[30rem] rounded-full bg-fuchsia-500/[0.08] blur-[120px]" />

      {/* 4. Sweeping Planetary Orbital Horizon Line */}
      <svg
        className="absolute inset-0 size-full opacity-60"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${uid}-arc`} x1="0%" y1="30%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#818CF8" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#A855F7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.3" />
          </linearGradient>
          <filter id={`${uid}-glow`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer subtle glow arc */}
        <path
          d="M -100 450 C 350 200, 1050 300, 1550 750"
          stroke={`url(#${uid}-arc)`}
          strokeWidth="3"
          filter={`url(#${uid}-glow)`}
          opacity="0.75"
        />

        {/* Secondary inner orbital arc */}
        <path
          d="M 50 550 C 450 320, 1150 420, 1600 850"
          stroke={`url(#${uid}-arc)`}
          strokeWidth="1.5"
          strokeDasharray="8 16"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}
