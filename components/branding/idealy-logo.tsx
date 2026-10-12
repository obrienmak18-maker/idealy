"use client";

import { useId, type SVGProps } from "react";
import { cn } from "@/lib/utils";

type IdealyLogoProps = {
  className?: string;
  compact?: boolean;
  animated?: boolean;
  label?: string;
  size?: number;
};

/**
 * True Idealy brand mark: 4-pointed compass star with teal/cyan top+left branches,
 * purple right+bottom branches, human silhouette cutout on the north point,
 * white oval center with rounded black cross, inclined orbital rings (animated),
 * and decorative motion dash arcs.
 */
export function IdealyMark({
  className,
  animated = true,
  label = "Idealy",
  size = 32,
  ...props
}: IdealyLogoProps & SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      aria-label={label}
      className={cn("idealy-mark", animated && "idealy-mark--animated", className)}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 256 256"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        {/* Teal-to-cyan gradient for top & left branches */}
        <linearGradient id={`${uid}-teal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        {/* Purple gradient for right & bottom branches */}
        <linearGradient id={`${uid}-purple`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        {/* Full spectrum for orbital rings */}
        <linearGradient id={`${uid}-orbit`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        {/* Glow filter */}
        <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Orbital ring 1 — main ellipse, inclined -15° (animated spin) */}
      <ellipse
        className="idealy-mark__orbit idealy-mark__orbit--one"
        cx="128" cy="128" rx="110" ry="52"
        stroke={`url(#${uid}-orbit)`}
        strokeWidth="7" strokeLinecap="round" opacity="0.9"
      />

      {/* Orbital ring 2 — secondary dashed ellipse, inclined +30° (reverse spin) */}
      <ellipse
        className="idealy-mark__orbit idealy-mark__orbit--two"
        cx="128" cy="128" rx="100" ry="44"
        stroke={`url(#${uid}-orbit)`}
        strokeWidth="4" strokeLinecap="round" strokeDasharray="16 28"
        strokeOpacity="0.55"
      />

      {/* Decorative motion dashes */}
      <path d="M62 68 Q56 58 52 64" stroke="#7DD3C8" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
      <path d="M88 48 Q82 40 78 47" stroke="#7DD3C8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M164 56 Q172 48 168 44" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M196 192 Q202 200 198 204" stroke="#C4B5FD" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
      <path d="M168 208 Q174 216 170 220" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" opacity="0.5" />

      {/* Star: Top branch (teal) with human silhouette */}
      <path d="M128 32 L144 108 Q128 100 112 108 Z" fill={`url(#${uid}-teal)`} filter={`url(#${uid}-glow)`} />
      <circle cx="128" cy="80" r="8" fill="white" />
      <path d="M121 88 Q128 96 135 88" fill="white" />

      {/* Star: Left branch (cyan) */}
      <path d="M32 128 L108 112 Q100 128 108 144 Z" fill={`url(#${uid}-teal)`} />

      {/* Star: Right branch (purple) */}
      <path d="M224 128 L148 112 Q156 128 148 144 Z" fill={`url(#${uid}-purple)`} />

      {/* Star: Bottom branch (violet) */}
      <path d="M128 224 L112 148 Q128 156 144 148 Z" fill={`url(#${uid}-purple)`} />

      {/* White oval center (pulsing) */}
      <ellipse className="idealy-mark__core" cx="128" cy="128" rx="24" ry="22" fill="white" />

      {/* Black cross (+) */}
      <path d="M128 110 V146" stroke="#0F172A" strokeWidth="8" strokeLinecap="round" />
      <path d="M110 128 H146" stroke="#0F172A" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function IdealyLogo({
  animated = true,
  className,
  compact = false,
  label = "Idealy",
  size = 32,
}: IdealyLogoProps) {
  return (
    <span className={cn("idealy-logo", compact && "idealy-logo--compact", className)}>
      <IdealyMark animated={animated} label={label} size={size} />
      {!compact ? <span className="idealy-logo__wordmark">Idealy</span> : null}
    </span>
  );
}
