import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type IdealyLogoProps = {
  className?: string;
  compact?: boolean;
  animated?: boolean;
  label?: string;
  size?: number;
};

export function IdealyMark({
  className,
  animated = true,
  label = "Idealy",
  size = 32,
  ...props
}: IdealyLogoProps & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label={label}
      className={cn("idealy-mark", animated && "idealy-mark--animated", className)}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="idealy-spectrum" x1="8" x2="56" y1="10" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.35" stopColor="#14B8A6" />
          <stop offset="0.68" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#FB923C" />
        </linearGradient>
        <filter id="idealy-glow" colorInterpolationFilters="sRGB" height="180%" width="180%" x="-40%" y="-40%">
          <feGaussianBlur result="blur" stdDeviation="2.2" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse className="idealy-mark__orbit idealy-mark__orbit--one" cx="32" cy="32" rx="25" ry="12" stroke="url(#idealy-spectrum)" strokeLinecap="round" strokeWidth="1.5" transform="rotate(-28 32 32)" />
      <ellipse className="idealy-mark__orbit idealy-mark__orbit--two" cx="32" cy="32" rx="22" ry="10" stroke="url(#idealy-spectrum)" strokeDasharray="4 7" strokeLinecap="round" strokeOpacity="0.55" strokeWidth="1" transform="rotate(38 32 32)" />
      <path d="M32 5.5L37.3 26.7L58.5 32L37.3 37.3L32 58.5L26.7 37.3L5.5 32L26.7 26.7L32 5.5Z" fill="url(#idealy-spectrum)" filter="url(#idealy-glow)" />
      <circle className="idealy-mark__core" cx="32" cy="32" fill="#fff" r="8.5" />
      <path d="M32 26.2V39.2M27.8 30.2H36.2" stroke="#0F172A" strokeLinecap="round" strokeWidth="2.8" />
      <circle cx="32" cy="22.6" fill="#fff" r="2.4" />
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
