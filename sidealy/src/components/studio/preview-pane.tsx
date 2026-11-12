import { Eye, Loader2, Play, Square } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type DeviceViewport = "desktop" | "tablet" | "mobile";

const DEVICE_DIMENSIONS: Record<
  DeviceViewport,
  { width: string; maxWidth?: string }
> = {
  desktop: { width: "100%" },
  mobile: { maxWidth: "375px", width: "375px" },
  tablet: { maxWidth: "768px", width: "768px" },
};

interface PreviewPaneProps {
  device: DeviceViewport;
  hasProjectManifest?: boolean;
  onStartPreview?: () => void;
  onStopPreview?: () => void;
  previewUrl: string;
  runtimeError?: string;
  runtimeOutput?: string;
  runtimeState: string;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  previewUrl,
  runtimeState,
  device,
  onStartPreview,
  onStopPreview,
  hasProjectManifest = false,
  runtimeOutput = "",
  runtimeError = "",
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const runtimeBusy = ["booting", "installing", "starting"].includes(
    runtimeState
  );

  const refresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  // Expose refresh to parent via custom event
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("idealy:refresh-preview", handler);
    return () => window.removeEventListener("idealy:refresh-preview", handler);
  }, [refresh]);

  const dims = DEVICE_DIMENSIONS[device];

  // Empty state — no preview available
  if (!previewUrl && !runtimeBusy && runtimeState !== "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)]">
          <Eye className="h-6 w-6 text-[var(--dsw-alias-label-tertiary)]" />
        </div>
        <div className="max-w-xs">
          <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
            Aucun aperçu disponible
          </h3>
          <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)] leading-relaxed">
            Décrivez votre application dans le chat pour commencer la
            construction, ou lancez l'aperçu manuellement.
          </p>
        </div>
        {hasProjectManifest && (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--idealy-teal-petrol)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 active:scale-95 transition-all"
            onClick={onStartPreview}
            type="button"
          >
            <Play className="h-3.5 w-3.5" />
            Lancer l'aperçu
          </button>
        )}
      </div>
    );
  }

  // Loading / building state
  if (runtimeBusy) {
    const stateLabel =
      runtimeState === "booting"
        ? "Démarrage du runtime…"
        : runtimeState === "installing"
          ? "Installation des dépendances…"
          : "Lancement du serveur de dev…";

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--idealy-teal-petrol)]" />
        <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
          {stateLabel}
        </p>
        {runtimeOutput && (
          <pre className="mt-2 max-h-32 w-full max-w-md overflow-auto rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-3 text-[10px] text-[var(--dsw-alias-label-secondary)] leading-relaxed font-mono">
            {runtimeOutput.slice(-2000)}
          </pre>
        )}
        <button
          className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
          onClick={onStopPreview}
          type="button"
        >
          <Square className="h-3 w-3" />
          Arrêter
        </button>
      </div>
    );
  }

  // Error state
  if (runtimeState === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <Square className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium text-destructive">
          L'aperçu n'a pas pu démarrer
        </p>
        {runtimeError && (
          <p className="max-w-sm text-[11px] text-[var(--dsw-alias-label-secondary)]">
            {runtimeError}
          </p>
        )}
        {hasProjectManifest && (
          <button
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[var(--idealy-teal-petrol)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 active:scale-95 transition-all"
            onClick={onStartPreview}
            type="button"
          >
            <Play className="h-3.5 w-3.5" />
            Réessayer
          </button>
        )}
      </div>
    );
  }

  // Live preview iframe
  return (
    <div className="relative flex h-full w-full items-start justify-center overflow-auto bg-[var(--dsw-alias-bg-layer-2)] p-2">
      <div
        className="relative h-full rounded-lg border border-[var(--dsw-alias-border-l1)] bg-white shadow-sm transition-all duration-200 overflow-hidden"
        style={{ maxWidth: dims.maxWidth, width: dims.width }}
      >
        {/* URL bar indicator */}
        <div className="flex h-7 items-center gap-2 border-b border-gray-100 bg-gray-50 px-3">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-300" />
            <span className="h-2 w-2 rounded-full bg-yellow-300" />
            <span className="h-2 w-2 rounded-full bg-green-300" />
          </div>
          <div className="flex-1 flex items-center">
            <span className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 font-mono truncate max-w-full">
              {previewUrl || "sandbox.idealy.run"}
            </span>
          </div>
        </div>

        <iframe
          allow="cross-origin-isolated"
          className="h-[calc(100%-28px)] w-full bg-white"
          key={iframeKey}
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          src={previewUrl}
          title="Aperçu de l'application"
        />

        {/* Built with Idealy watermark */}
        <div className="absolute bottom-2 right-2 z-10">
          <a
            className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-medium text-white/70 backdrop-blur-sm hover:text-white transition-colors"
            href="https://idealy.run"
            rel="noopener noreferrer"
            target="_blank"
          >
            Built with Idealy
          </a>
        </div>
      </div>
    </div>
  );
};
