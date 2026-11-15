import { Clock3, History, RotateCcw, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { MissionWorkspaceFile } from "../../types";

export interface VersionCheckpoint {
  createdAt: string;
  description?: string;
  fileCount: number;
  files?: MissionWorkspaceFile[];
  id: string;
  name: string;
}

export interface VersionHistoryDrawerProps {
  currentVersion?: number;
  isOpen: boolean;
  missionId: string;
  onClose: () => void;
  onRestoreVersion?: (checkpoint: VersionCheckpoint) => Promise<void> | void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  missionId,
  currentVersion = 1,
  onRestoreVersion,
}) => {
  const [checkpoints, setCheckpoints] = useState<VersionCheckpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !missionId) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/idealy/missions/${encodeURIComponent(missionId)}/checkpoints`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }
        return (await res.json()) as { checkpoints?: VersionCheckpoint[] };
      })
      .then((payload) => {
        if (Array.isArray(payload.checkpoints)) {
          setCheckpoints(payload.checkpoints);
        } else {
          setCheckpoints([]);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger l'historique des versions."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, missionId]);

  if (!isOpen) {
    return null;
  }

  const handleRestore = async (chk: VersionCheckpoint) => {
    if (restoringId) {
      return;
    }
    setRestoringId(chk.id);
    try {
      if (onRestoreVersion) {
        await onRestoreVersion(chk);
      } else {
        const res = await fetch(
          `/api/idealy/missions/${encodeURIComponent(missionId)}/checkpoints/${encodeURIComponent(chk.id)}/restore`,
          {
            credentials: "same-origin",
            method: "POST",
          }
        );
        if (!res.ok) {
          throw new Error("La restauration de la version a échoué.");
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de restauration.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-label="Historique des versions"
        className="flex h-full w-full max-w-sm flex-col border-l border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] shadow-2xl animate-slide-left"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[var(--dsw-alias-border-l1)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--idealy-indigo)]/10 text-[var(--idealy-indigo)]">
              <History aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
                Historique des versions
              </h3>
              <p className="text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                Points de sauvegarde automatique & manuels
              </p>
            </div>
          </div>
          <button
            aria-label="Fermer l'historique"
            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-[var(--dsw-alias-label-tertiary)]">
              Chargement des versions…
            </div>
          ) : checkpoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--dsw-alias-bg-layer-1)] text-[var(--dsw-alias-label-tertiary)] mb-2.5">
                <Clock3 className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
                Version initiale active (v{currentVersion})
              </p>
              <p className="mt-1 text-[11px] text-[var(--dsw-alias-label-tertiary)] max-w-[220px]">
                De nouvelles versions seront enregistrées à chaque génération de
                fichiers de l'escouade.
              </p>
            </div>
          ) : (
            checkpoints.map((chk, index) => {
              const isCurrent = index === 0;
              return (
                <div
                  className={`relative rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? "border-[var(--idealy-indigo)]/40 bg-[var(--idealy-indigo)]/5"
                      : "border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] hover:border-[var(--dsw-alias-border-l2)]"
                  }`}
                  key={chk.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)] truncate">
                          {chk.name || `Version ${checkpoints.length - index}`}
                        </span>
                        {isCurrent && (
                          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-500">
                            Actuelle
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
                        {new Date(chk.createdAt).toLocaleString("fr-FR", {
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "short",
                        })}
                        {chk.fileCount ? ` · ${chk.fileCount} fichiers` : ""}
                      </p>
                    </div>

                    {!isCurrent && (
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] px-2 py-1 text-[10px] font-medium text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors focus-ring"
                        disabled={restoringId === chk.id}
                        onClick={() => handleRestore(chk)}
                        type="button"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restaurer</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
