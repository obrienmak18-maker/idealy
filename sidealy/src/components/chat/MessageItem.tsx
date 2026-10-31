import {
  AlertTriangle,
  Check,
  Copy,
  Paperclip,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import type { Message } from "../../types";
import { Badge } from "../common/Badge";
import { ArtifactCard } from "./ArtifactCard";
import { CodeBlock } from "./CodeBlock";
import { MissionPlanCard } from "./MissionPlanCard";
import { ReasoningBlock } from "./ReasoningBlock";

export const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
  const { artifacts, sendMessage } = useApp();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"liked" | "disliked" | null>(null);

  const isUser = message.role === "user";
  const timeFormatted = new Date(message.createdAt).toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const handleCopyMessage = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const messageArtifacts = artifacts.filter((a) =>
    message.artifactIds?.includes(a.id),
  );

  // Markdown parsing logic for standard blocks
  const renderFormattedContent = (content: string) => {
    if (!content.trim()) {
      return null;
    }

    // Split code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const firstLine = lines[0].trim();
        const hasLang = !firstLine.includes(" ") && firstLine.length < 15;
        const language = hasLang ? firstLine : "text";
        const code = hasLang ? lines.slice(1).join("\n") : lines.join("\n");
        return <CodeBlock code={code} key={index} language={language} />;
      }

      // Check if this part contains tables
      if (part.includes("|") && part.includes("\n")) {
        const lines = part.split("\n");
        const tableLines = lines.filter(
          (l) => l.trim().startsWith("|") && l.trim().endsWith("|"),
        );
        if (tableLines.length >= 2) {
          return (
            <div
              className="my-3 overflow-x-auto rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-base)] shadow-sm"
              key={index}
            >
              <table className="w-full text-left text-xs md:text-sm border-collapse">
                <tbody>
                  {tableLines.map((row, rIdx) => {
                    const cells = row
                      .split("|")
                      .slice(1, -1)
                      .map((c) => c.trim());
                    // Skip markdown separator row like |:---|:---|
                    if (
                      cells.every((c) => c.replace(/[:-]/g, "").length === 0)
                    ) {
                      return null;
                    }
                    const isHeader = rIdx === 0;
                    return (
                      <tr
                        className={
                          isHeader
                            ? "bg-[var(--dsw-alias-interactive-bg-hover)]/70 font-semibold border-b border-[var(--dsw-alias-border-l2)]"
                            : "border-b border-[var(--dsw-alias-border-l3)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]/30 transition-colors"
                        }
                        key={rIdx}
                      >
                        {cells.map((cell, cIdx) =>
                          isHeader ? (
                            <th
                              className="px-3.5 py-2.5 text-[var(--dsw-alias-label-primary)] font-medium"
                              key={cIdx}
                            >
                              {cell}
                            </th>
                          ) : (
                            <td
                              className="px-3.5 py-2 text-[var(--dsw-alias-label-primary)]"
                              key={cIdx}
                            >
                              {parseInline(cell)}
                            </td>
                          ),
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Standard paragraphs, headings, bullet lists
      const textLines = part.split("\n");
      return (
        <div className="space-y-2 leading-relaxed" key={index}>
          {textLines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return <div className="h-1.5" key={lIdx} />;
            }

            if (trimmed.startsWith("### ")) {
              return (
                <h4
                  className="text-base font-semibold text-[var(--dsw-alias-label-primary)] mt-4 mb-1"
                  key={lIdx}
                >
                  {parseInline(trimmed.replace("### ", ""))}
                </h4>
              );
            }
            if (trimmed.startsWith("#### ")) {
              return (
                <h5
                  className="text-sm font-semibold text-[var(--dsw-alias-label-primary)] mt-3 mb-1"
                  key={lIdx}
                >
                  {parseInline(trimmed.replace("#### ", ""))}
                </h5>
              );
            }
            if (trimmed.startsWith("- ")) {
              return (
                <div className="flex items-start gap-2 ml-2 my-0.5" key={lIdx}>
                  <span className="text-[var(--idealy-teal-petrol)] font-bold mt-1 text-xs">
                    •
                  </span>
                  <span>{parseInline(trimmed.replace("- ", ""))}</span>
                </div>
              );
            }

            return <p key={lIdx}>{parseInline(line)}</p>;
          })}
        </div>
      );
    });
  };

  // Inline formatting (bold, code, links)
  const parseInline = (text: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((chunk, i) => {
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        return (
          <strong
            className="font-semibold text-[var(--dsw-alias-label-primary)]"
            key={i}
          >
            {chunk.slice(2, -2)}
          </strong>
        );
      }
      if (chunk.startsWith("`") && chunk.endsWith("`")) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-[var(--dsw-alias-interactive-bg-hover)] border border-[var(--dsw-alias-border-l3)] font-mono text-xs text-[var(--dsw-alias-label-primary)]"
            key={i}
          >
            {chunk.slice(1, -1)}
          </code>
        );
      }
      return chunk;
    });
  };

  return (
    <article
      aria-label={`Message de ${isUser ? "vous" : "Idealy"}`}
      className={`py-3 px-4 md:px-6 transition-colors ${
        isUser
          ? "ml-auto max-w-[85%] md:max-w-[78%] flex flex-col items-end"
          : "mr-auto w-full max-w-full"
      }`}
      data-role={message.role}
    >
      {/* User Bubble (DeepSeek style right-aligned rounded-xl pill) */}
      {isUser ? (
        <div className="flex flex-col items-end gap-1.5 max-w-full">
          {/* Attachments preview */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-1">
              {message.attachments.map((file) => (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--dsw-specific-input-major)] border border-[var(--dsw-alias-border-l2)] text-xs text-[var(--dsw-alias-label-secondary)] shadow-sm"
                  key={file.id}
                >
                  <Paperclip className="w-3 h-3 text-[var(--idealy-teal-petrol)]" />
                  <span className="font-medium text-[var(--dsw-alias-label-primary)] truncate max-w-[140px]">
                    {file.name}
                  </span>
                  <span className="text-[10px]">
                    ({(file.size / 1024).toFixed(0)} Ko)
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            className="px-4 py-2.5 rounded-[var(--dsw-radius-xl)] bg-[var(--dsw-specific-bubble)] text-[var(--dsw-alias-label-primary)] text-sm md:text-[15px] leading-relaxed break-words shadow-sm border border-[var(--dsw-alias-border-l3)]/40"
            style={{
              wordBreak: "break-word",
            }}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
          <span className="text-[10px] text-[var(--dsw-alias-label-tertiary)] px-1">
            {timeFormatted}
          </span>
        </div>
      ) : (
        /* Assistant Message (Full column, with Avatar, Model tag, Reasoning block & Markdown) */
        <div className="space-y-2 max-w-3xl mx-auto">
          {/* Header Info */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              {/* Idealy Custom Geometric Spark Logo */}
              <div
                aria-hidden="true"
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-tr from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
                Idealy
              </span>
              <span className="text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                {timeFormatted}
              </span>
              {message.mode && (
                <Badge
                  size="sm"
                  variant={
                    message.mode === "produce"
                      ? "primary"
                      : message.mode === "explore"
                        ? "accent"
                        : "default"
                  }
                >
                  {message.mode === "produce"
                    ? "Produire"
                    : message.mode === "explore"
                      ? "Explorer"
                      : "Discuter"}
                </Badge>
              )}
            </div>

            {/* Quick Copy Action */}
            {message.content && (
              <button
                aria-label="Copier la réponse"
                className="p-1 rounded text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors focus-ring"
                onClick={handleCopyMessage}
                title="Copier la réponse"
                type="button"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--idealy-teal-petrol)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Reasoning / Deep Think disclosure block */}
          {Boolean(
            message.reasoning || (message.isPartial && !message.content),
          ) && (
            <ReasoningBlock
              duration={message.reasoningDuration}
              isStreaming={Boolean(message.isPartial && !message.content)}
              reasoning={message.reasoning || ""}
            />
          )}

          {/* Body Content */}
          <div className="text-sm md:text-[15px] leading-relaxed text-[var(--dsw-alias-label-primary)] break-words">
            {renderFormattedContent(message.content)}

            {/* Content Streaming Indicator */}
            {message.isPartial && message.content && (
              <span
                aria-label="Génération en cours"
                aria-live="polite"
                className="inline-flex items-center gap-1 ml-1.5 align-middle"
                role="status"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--idealy-teal-petrol)] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--idealy-teal-petrol)] animate-pulse delay-75" />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--idealy-teal-petrol)] animate-pulse delay-150" />
              </span>
            )}
          </div>

          {message.mission && (
            <MissionPlanCard messageId={message.id} mission={message.mission} />
          )}

          {/* Interrupted status alert */}
          {message.status === "interrupted" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Réponse interrompue par l'utilisateur. Contenu partiel conservé.
              </span>
            </div>
          )}

          {/* Linked Artifact Cards */}
          {messageArtifacts.length > 0 && (
            <div className="mt-3 space-y-2">
              {messageArtifacts.map((art) => (
                <ArtifactCard artifact={art} key={art.id} />
              ))}
            </div>
          )}

          {/* Assistant Action Toolbar (Thumbs, Regenerate, Copy) */}
          {!message.isPartial && message.content && (
            <div className="flex items-center gap-2 pt-2 text-xs text-[var(--dsw-alias-label-tertiary)]">
              <button
                aria-label="Copier"
                className="flex items-center gap-1 p-1 rounded hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
                onClick={handleCopyMessage}
                title="Copier la réponse"
                type="button"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--idealy-teal-petrol)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px]">
                  {copied ? "Copié" : "Copier"}
                </span>
              </button>

              <button
                aria-label="Réponse utile"
                className={`p-1 rounded transition-colors ${
                  feedback === "liked"
                    ? "text-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)]"
                    : "hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                onClick={() =>
                  setFeedback(feedback === "liked" ? null : "liked")
                }
                title="Bonne réponse"
                type="button"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                aria-label="Réponse à améliorer"
                className={`p-1 rounded transition-colors ${
                  feedback === "disliked"
                    ? "text-[var(--dsw-alias-state-error-primary)] bg-red-500/10"
                    : "hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                }`}
                onClick={() =>
                  setFeedback(feedback === "disliked" ? null : "disliked")
                }
                title="Réponse insatisfaisante"
                type="button"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              <button
                aria-label="Régénérer"
                className="flex items-center gap-1 p-1 rounded hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors ml-auto"
                onClick={() =>
                  sendMessage("Régénérer et approfondir la réponse précédente.")
                }
                title="Régénérer"
                type="button"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Régénérer</span>
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
