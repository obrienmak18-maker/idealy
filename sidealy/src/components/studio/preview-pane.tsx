import {
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  MessageSquare,
  MousePointer2,
  Pencil,
  Play,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../services/i18n";

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
  compiledHtml?: string;
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
  compiledHtml,
  previewUrl,
  runtimeState,
  device,
  onStartPreview,
  onStopPreview,
  hasProjectManifest = false,
  runtimeOutput = "",
  runtimeError = "",
}) => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const runtimeBusy = ["booting", "installing", "starting"].includes(
    runtimeState
  );

  // Floating Design Palette State
  const [designTool, setDesignTool] = useState<
    "select" | "text" | "draw" | "comment" | null
  >(null);
  const [paletteMinimized, setPaletteMinimized] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [designFeedback, setDesignFeedback] = useState<string | null>(null);

  // Calculate authenticated target origin from previewUrl
  const targetOrigin = useMemo(() => {
    if (!previewUrl || previewUrl === "about:blank") return null;
    try {
      const parsed = new URL(
        previewUrl,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
      );
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
      return null;
    } catch {
      return null;
    }
  }, [previewUrl]);

  // Securely transmit messages ONLY to the validated target origin
  const sendDesignMessage = useCallback(
    (message: { type: string; mode?: string | null; [key: string]: unknown }) => {
      if (!iframeRef.current?.contentWindow || !targetOrigin) {
        return;
      }
      iframeRef.current.contentWindow.postMessage(message, targetOrigin);
    },
    [targetOrigin]
  );

  // Reset palette state on preview URL change
  useEffect(() => {
    setDesignTool(null);
    setCanUndo(false);
    setCanRedo(false);
    setDesignFeedback(null);
  }, [previewUrl]);

  // Strict inbound message validator: verifies event.source, targetOrigin, and payload structure
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 1. Strict source check: must come directly from our iframe's contentWindow
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // 2. Strict origin check: must match the target preview origin exactly
      if (!targetOrigin || event.origin !== targetOrigin) {
        return;
      }

      // 3. Structured payload validation
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      const type = (data as { type?: unknown }).type;
      if (typeof type !== "string") {
        return;
      }

      // Handle Idealy Design Protocol & preview bridge events
      if (type === "IDEALY_DESIGN_HISTORY_CHANGE") {
        if (typeof data.canUndo === "boolean") setCanUndo(data.canUndo);
        if (typeof data.canRedo === "boolean") setCanRedo(data.canRedo);
      } else if (
        type === "IDEALY_DESIGN_ELEMENT_SELECTED" ||
        type === "idealy:preview-element"
      ) {
        const tagName =
          data.tagName || data.tag || data.selector || "élément";
        setDesignFeedback(`Élément sélectionné : <${String(tagName).toLowerCase()}>`);
      } else if (type === "IDEALY_DESIGN_TEXT_EDITED") {
        setDesignFeedback("Texte modifié avec succès");
        setCanUndo(true);
      } else if (type === "IDEALY_DESIGN_ANNOTATION_SAVED") {
        setDesignFeedback("Annotation enregistrée");
        setCanUndo(true);
      } else if (type === "IDEALY_DESIGN_COMMENT_ADDED") {
        setDesignFeedback("Commentaire ajouté");
        setCanUndo(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [targetOrigin]);

  const refresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  // Expose refresh to parent via custom event
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("idealy:refresh-preview", handler);
    return () => window.removeEventListener("idealy:refresh-preview", handler);
  }, [refresh]);

  const selectDesignTool = (tool: "select" | "text" | "draw" | "comment") => {
    const nextTool = designTool === tool ? null : tool;
    setDesignTool(nextTool);

    sendDesignMessage({
      mode: nextTool,
      type: "IDEALY_SET_DESIGN_MODE",
    });

    if (nextTool === "select") {
      setDesignFeedback(
        "Mode inspection actif : cliquez sur un élément du rendu."
      );
    } else if (nextTool === "text") {
      setDesignFeedback(
        "Mode édition directe actif : cliquez sur un texte pour le modifier."
      );
    } else if (nextTool === "draw") {
      setDesignFeedback(
        "Mode annotation actif : dessinez directement sur la zone."
      );
    } else if (nextTool === "comment") {
      setDesignFeedback(
        "Mode commentaire : cliquez pour épingler un commentaire."
      );
    } else {
      setDesignFeedback(null);
    }

    if (nextTool) {
      setCanUndo(true);
    }
  };

  const handleUndo = () => {
    if (!canUndo) {
      return;
    }
    sendDesignMessage({ type: "IDEALY_DESIGN_UNDO" });
    setCanRedo(true);
    setDesignFeedback("Action annulée");
    setTimeout(() => setDesignFeedback(null), 2000);
  };

  const handleRedo = () => {
    if (!canRedo) {
      return;
    }
    sendDesignMessage({ type: "IDEALY_DESIGN_REDO" });
    setDesignFeedback("Action rétablie");
    setTimeout(() => setDesignFeedback(null), 2000);
  };

  const dims = DEVICE_DIMENSIONS[device];

  // Empty state — no preview available
  if (!previewUrl && !compiledHtml && !runtimeBusy && runtimeState !== "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)]">
          <Eye className="h-6 w-6 text-[var(--dsw-alias-label-tertiary)]" />
        </div>
        <div className="max-w-xs">
          <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
            {t("studio.noPreview")}
          </h3>
          <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)] leading-relaxed">
            {t("studio.noPreviewDesc")}
          </p>
        </div>
        {hasProjectManifest && (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--idealy-teal-petrol)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 active:scale-95 transition-all"
            onClick={onStartPreview}
            type="button"
          >
            <Play className="h-3.5 w-3.5" />
            {t("studio.startPreview")}
          </button>
        )}
      </div>
    );
  }

  // Loading / building state
  if (runtimeBusy) {
    const stateLabel =
      runtimeState === "booting"
        ? t("studio.bootingRuntime")
        : runtimeState === "installing"
          ? t("studio.installingDeps")
          : t("studio.startingDevServer");

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
          {t("studio.stopPreview")}
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
          {t("studio.previewFailed")}
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
            {t("studio.retryPreview")}
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
              {previewUrl || "app.idealy.run"}
            </span>
          </div>
        </div>

        <iframe
          allow="cross-origin-isolated"
          className="h-[calc(100%-28px)] w-full bg-white"
          key={iframeKey}
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          src={previewUrl || undefined}
          srcDoc={previewUrl ? undefined : compiledHtml}
          title={t("studio.preview")}
        />

        {/* Floating Retractable Design Palette */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-auto">
          {designFeedback && (
            <div className="mb-2 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] text-white font-medium shadow-lg animate-fade-in flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {designFeedback}
            </div>
          )}

          {paletteMinimized ? (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--dsw-alias-bg-layer-2)]/90 hover:bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l2)] text-xs font-semibold text-[var(--dsw-alias-label-primary)] shadow-elevated backdrop-blur-md transition-all hover:scale-105"
              onClick={() => setPaletteMinimized(false)}
              title="Agrandir la palette Design"
              type="button"
            >
              <MousePointer2 className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
              <span className="text-[11px]">Design</span>
              <ChevronUp className="h-3 w-3 text-[var(--dsw-alias-label-secondary)]" />
            </button>
          ) : (
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--dsw-alias-bg-layer-2)]/95 border border-[var(--dsw-alias-border-l2)] shadow-2xl backdrop-blur-xl animate-scale-in">
              {/* Select Element */}
              <button
                className={`p-1.5 rounded-xl transition-all ${
                  designTool === "select"
                    ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                    : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                onClick={() => selectDesignTool("select")}
                title="Sélectionner un élément (inspecter / style)"
                type="button"
              >
                <MousePointer2 className="h-4 w-4" />
              </button>

              {/* Edit text inline */}
              <button
                className={`p-1.5 rounded-xl transition-all ${
                  designTool === "text"
                    ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                    : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                onClick={() => selectDesignTool("text")}
                title="Édition de texte directe"
                type="button"
              >
                <Type className="h-4 w-4" />
              </button>

              {/* Draw / Annotate */}
              <button
                className={`p-1.5 rounded-xl transition-all ${
                  designTool === "draw"
                    ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                    : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                onClick={() => selectDesignTool("draw")}
                title="Dessiner / Annoter"
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </button>

              {/* Comment */}
              <button
                className={`p-1.5 rounded-xl transition-all ${
                  designTool === "comment"
                    ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                    : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                onClick={() => selectDesignTool("comment")}
                title="Ajouter un commentaire"
                type="button"
              >
                <MessageSquare className="h-4 w-4" />
              </button>

              <div className="h-4 w-px bg-[var(--dsw-alias-border-l1)] mx-0.5" />

              {/* Undo */}
              <button
                className="p-1.5 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] disabled:opacity-30 transition-all"
                disabled={!canUndo}
                onClick={handleUndo}
                title="Annuler (Ctrl+Z)"
                type="button"
              >
                <Undo2 className="h-4 w-4" />
              </button>

              {/* Redo */}
              <button
                className="p-1.5 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] disabled:opacity-30 transition-all"
                disabled={!canRedo}
                onClick={handleRedo}
                title="Rétablir (Ctrl+Y)"
                type="button"
              >
                <Redo2 className="h-4 w-4" />
              </button>

              <div className="h-4 w-px bg-[var(--dsw-alias-border-l1)] mx-0.5" />

              {/* Minimize */}
              <button
                className="p-1.5 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-all"
                onClick={() => setPaletteMinimized(true)}
                title="Réduire la palette"
                type="button"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

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
