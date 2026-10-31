import {
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  Table2,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { CodeBlock } from "../chat/CodeBlock";
import { Badge } from "../common/Badge";

export const SidecarPanel: React.FC = () => {
  const { activeArtifact, closeArtifact } = useApp();
  const [copied, setCopied] = useState(false);

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
          : "md";
    const blob = new Blob([activeArtifact.content], {
      type: "text/plain;charset=utf-8",
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
      className="fixed inset-y-0 right-0 z-30 w-full md:w-[440px] lg:w-[480px] bg-bg-surface border-l border-border-subtle shadow-elevated flex flex-col transition-all duration-200"
    >
      {/* Sidecar Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle bg-bg-subtle/50">
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
              <span className="text-[11px] text-text-muted">
                {new Date(activeArtifact.createdAt).toLocaleTimeString(
                  "fr-FR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
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

      {/* Sidecar Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 text-sm text-text-main leading-relaxed">
        {activeArtifact.type === "code" ? (
          <CodeBlock
            code={activeArtifact.content}
            language={activeArtifact.language || "typescript"}
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans">
            {activeArtifact.content}
          </div>
        )}
      </div>

      {/* Sidecar Footer Status */}
      <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-subtle/30 text-[11px] text-text-muted flex items-center justify-between">
        <span>Stocké localement dans la session</span>
        <span>{activeArtifact.content.length} caractères</span>
      </div>
    </aside>
  );
};
