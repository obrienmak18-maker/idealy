import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  RotateCcw,
  Table2,
  X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { CodeBlock } from "../chat/CodeBlock";
import { Badge } from "../common/Badge";

export const SidecarPanel: React.FC = () => {
  const { activeArtifact, closeArtifact } = useApp();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const isHtmlOrWeb = useMemo(() => {
    if (!activeArtifact) return false;
    const lang = activeArtifact.language?.toLowerCase();
    const content = activeArtifact.content.trim();
    return (
      lang === "html" ||
      lang === "svg" ||
      content.startsWith("<!DOCTYPE") ||
      content.startsWith("<html") ||
      content.includes("<body") ||
      content.includes("<script")
    );
  }, [activeArtifact]);

  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");

  if (!activeArtifact) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeArtifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const ext =
      activeArtifact.language === "json"
        ? "json"
        : activeArtifact.language === "ts"
          ? "ts"
          : activeArtifact.language === "html"
            ? "html"
            : "md";
    const blob = new Blob([activeArtifact.content], {
      type: ext === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeArtifact.title.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTypeIcon = () => {
    switch (activeArtifact.type) {
      case "code":
        return <Code2 className="w-4 h-4 text-brand-primary" />;
      case "table":
        return <Table2 className="w-4 h-4 text-brand-accent" />;
      default:
        return <FileText className="w-4 h-4 text-brand-primary" />;
    }
  };

  return (
    <aside
      aria-label={`Livrable : ${activeArtifact.title}`}
      className={`fixed inset-y-0 right-0 z-30 bg-bg-surface border-l border-border-subtle shadow-elevated flex flex-col transition-all duration-300 ${
        isExpanded ? "w-full md:w-[75vw] lg:w-[65vw]" : "w-full md:w-[480px] lg:w-[540px]"
      }`}
    >
      {/* Sidecar Header (Inspiré de Claude Progression / Sorties & Bolt Workbench) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-subtle/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-md bg-bg-surface border border-border-subtle flex-shrink-0">
            {renderTypeIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-main truncate">
              {activeArtifact.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge size="sm" variant="primary">
                {activeArtifact.type}
              </Badge>
              {isHtmlOrWeb && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  App Live
                </span>
              )}
              <span className="text-[11px] text-text-muted">
                {new Date(activeArtifact.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            aria-label={isExpanded ? "Réduire le panneau" : "Agrandir le panneau"}
            className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-main transition-colors focus-ring"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Réduire" : "Agrandir"}
            type="button"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            aria-label={copied ? "Contenu copié" : "Copier tout le document"}
            className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-main transition-colors focus-ring"
            onClick={handleCopy}
            title="Copier le document"
            type="button"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            aria-label="Télécharger le fichier"
            className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-main transition-colors focus-ring"
            onClick={handleDownload}
            title="Télécharger le livrable"
            type="button"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            aria-label="Fermer le panneau de travail (Échap)"
            className="p-1.5 rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-main transition-colors focus-ring ml-1"
            onClick={closeArtifact}
            title="Fermer (Échap)"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barre d'onglets Workbench : Code vs Aperçu Live (Pattern Bolt / Claude) */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border-subtle bg-bg-surface text-xs">
        <div className="flex items-center gap-1">
          {isHtmlOrWeb && (
            <button
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-text-muted hover:text-text-main hover:bg-bg-subtle"
              }`}
              onClick={() => setActiveTab("preview")}
              type="button"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu interactif</span>
            </button>
          )}

          <button
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === "code" || !isHtmlOrWeb
                ? "bg-brand-primary/10 text-brand-primary"
                : "text-text-muted hover:text-text-main hover:bg-bg-subtle"
            }`}
            onClick={() => setActiveTab("code")}
            type="button"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code source</span>
          </button>
        </div>

        {isHtmlOrWeb && activeTab === "preview" && (
          <button
            className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-main transition-colors px-2 py-0.5 rounded hover:bg-bg-subtle"
            onClick={() => setIframeKey((k) => k + 1)}
            title="Recharger l'aperçu"
            type="button"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Recharger</span>
          </button>
        )}
      </div>

      {/* Sidecar Content */}
      <div className="flex-1 overflow-y-auto bg-bg-surface">
        {isHtmlOrWeb && activeTab === "preview" ? (
          <div className="w-full h-full min-h-[400px] flex flex-col bg-white">
            <iframe
              className="w-full h-full border-none flex-1"
              key={iframeKey}
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              srcDoc={activeArtifact.content}
              title={`Aperçu interactif : ${activeArtifact.title}`}
            />
          </div>
        ) : activeArtifact.type === "code" ? (
          <div className="p-4 md:p-6">
            <CodeBlock
              code={activeArtifact.content}
              language={activeArtifact.language || "typescript"}
            />
          </div>
        ) : (
          <div className="p-4 md:p-6 text-sm text-text-main leading-relaxed prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans">
            {activeArtifact.content}
          </div>
        )}
      </div>

      {/* Sidecar Footer Status */}
      <div className="px-4 py-2 border-t border-border-subtle bg-bg-subtle/30 text-[11px] text-text-muted flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Environnement sandbox sécurisé</span>
        </span>
        <span>{activeArtifact.content.length.toLocaleString("fr-FR")} caractères</span>
      </div>
    </aside>
  );
};
