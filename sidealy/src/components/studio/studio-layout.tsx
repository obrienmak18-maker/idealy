import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "idealy_split_ratio";
const DEFAULT_RATIO = 0.42;
const MIN_LEFT_PX = 320;
const MIN_RIGHT_PX = 380;

export type StudioTab = "preview" | "code" | "database" | "more";

interface StudioLayoutProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  /** If true, the right pane is completely hidden and the left pane takes full width */
  rightPaneHidden?: boolean;
  topBar: React.ReactNode;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({
  leftPane,
  rightPane,
  topBar,
  rightPaneHidden = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startXRef = useRef(0);
  const startRatioRef = useRef(DEFAULT_RATIO);

  const [ratio, setRatio] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const val = Number.parseFloat(stored);
        if (Number.isFinite(val) && val >= 0.2 && val <= 0.8) {
          return val;
        }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_RATIO;
  });

  // Persist ratio
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, ratio.toFixed(4));
    } catch {
      /* ignore */
    }
  }, [ratio]);

  const clampRatio = useCallback((raw: number): number => {
    const container = containerRef.current;
    if (!container) {
      return Math.max(0.2, Math.min(0.8, raw));
    }
    const totalWidth = container.offsetWidth;
    if (totalWidth <= 0) {
      return raw;
    }
    const minL = MIN_LEFT_PX / totalWidth;
    const maxL = 1 - MIN_RIGHT_PX / totalWidth;
    return Math.max(minL, Math.min(maxL, raw));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startXRef.current = e.clientX;
      startRatioRef.current = ratio;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onPointerMove = (ev: PointerEvent) => {
        if (!isDragging.current || !containerRef.current) {
          return;
        }
        const dx = ev.clientX - startXRef.current;
        const totalWidth = containerRef.current.offsetWidth;
        if (totalWidth <= 0) {
          return;
        }
        const newRatio = startRatioRef.current + dx / totalWidth;
        setRatio(clampRatio(newRatio));
      };

      const onPointerUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [ratio, clampRatio]
  );

  // Keyboard resize (Ctrl+Shift+Arrow)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setRatio((r) => clampRatio(r - 0.03));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setRatio((r) => clampRatio(r + 0.03));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clampRatio]);

  if (rightPaneHidden) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        {leftPane}
      </div>
    );
  }

  const leftPercent = `${(ratio * 100).toFixed(2)}%`;
  const rightPercent = `${((1 - ratio) * 100).toFixed(2)}%`;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      ref={containerRef}
    >
      {/* Top bar */}
      {topBar}

      {/* Two-pane body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — Chat */}
        <div
          className="flex h-full flex-col overflow-hidden"
          style={{ minWidth: MIN_LEFT_PX, width: leftPercent }}
        >
          {leftPane}
        </div>

        {/* Resizable divider */}
        <div
          aria-label="Ajuster la taille des panneaux"
          aria-orientation="vertical"
          className="studio-divider group relative z-20 flex w-1 shrink-0 cursor-col-resize items-center justify-center touch-none select-none"
          onPointerDown={onPointerDown}
          role="separator"
          tabIndex={0}
        >
          {/* Visible divider line */}
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--dsw-alias-border-l1)] transition-colors group-hover:bg-[var(--idealy-teal-petrol)] group-active:bg-[var(--idealy-teal-petrol)]" />
          {/* Wider touch target */}
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
          {/* Grip indicator */}
          <div className="relative z-10 flex h-8 w-3.5 items-center justify-center rounded-full bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity shadow-sm">
            <div className="flex flex-col gap-0.5">
              <span className="block h-0.5 w-1 rounded-full bg-[var(--dsw-alias-label-tertiary)]" />
              <span className="block h-0.5 w-1 rounded-full bg-[var(--dsw-alias-label-tertiary)]" />
              <span className="block h-0.5 w-1 rounded-full bg-[var(--dsw-alias-label-tertiary)]" />
            </div>
          </div>
        </div>

        {/* Right pane — Workspace */}
        <div
          className="flex h-full flex-col overflow-hidden bg-[var(--dsw-alias-bg-layer-1)]"
          style={{ minWidth: MIN_RIGHT_PX, width: rightPercent }}
        >
          {rightPane}
        </div>
      </div>
    </div>
  );
};
