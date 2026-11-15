import { ArrowUpRight, Code2, FileText, Table2 } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";
import type { Artifact } from "../../types";

export const ArtifactCard: React.FC<{ artifact: Artifact }> = ({
  artifact,
}) => {
  const { openArtifact, activeArtifact } = useApp();
  const isOpen = activeArtifact?.id === artifact.id;

  const renderIcon = () => {
    switch (artifact.type) {
      case "code":
        return <Code2 className="w-4 h-4 text-brand-primary" />;
      case "table":
        return <Table2 className="w-4 h-4 text-brand-accent" />;
      default:
        return <FileText className="w-4 h-4 text-brand-primary" />;
    }
  };

  return (
    <button
      aria-label={`Ouvrir le livrable ${artifact.title}`}
      aria-pressed={isOpen}
      className={`my-3 w-full p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer focus-ring flex items-center justify-between gap-3 ${
        isOpen
          ? "border-brand-primary bg-brand-primary/5 shadow-subtle"
          : "border-border-subtle bg-bg-surface hover:border-brand-primary/40 hover:bg-bg-subtle/50"
      }`}
      onClick={() => openArtifact(artifact.id)}
      type="button"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="p-2 rounded-lg bg-bg-subtle border border-border-subtle flex-shrink-0">
          {renderIcon()}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text-main truncate">
            {artifact.title}
          </span>
          <span className="block text-xs text-text-muted capitalize">
            Livrable {artifact.type}
          </span>
        </span>
      </span>

      <span className="flex items-center gap-1.5 text-xs text-brand-primary font-medium flex-shrink-0">
        <span>{isOpen ? "Actif" : "Consulter"}</span>
        <ArrowUpRight className="w-4 h-4" />
      </span>
    </button>
  );
};
