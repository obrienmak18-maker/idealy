import { AlertTriangle } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../common/Button";

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useApp();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus on Annuler on open
  useEffect(() => {
    if (confirmModal?.isOpen) {
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }
  }, [confirmModal?.isOpen]);

  if (!confirmModal?.isOpen) {
    return null;
  }

  const handleConfirm = () => {
    confirmModal.onConfirm();
    closeConfirmModal();
  };

  return (
    <div
      aria-describedby="confirm-modal-desc"
      aria-labelledby="confirm-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="alertdialog"
    >
      <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-2xl p-6 shadow-elevated animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-base font-semibold text-text-main"
              id="confirm-modal-title"
            >
              {confirmModal.title}
            </h3>
            <p
              className="text-sm text-text-muted mt-1 leading-relaxed"
              id="confirm-modal-desc"
            >
              {confirmModal.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            onClick={closeConfirmModal}
            ref={cancelBtnRef}
            size="md"
            variant="secondary"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            size="md"
            variant={confirmModal.isDestructive ? "destructive" : "primary"}
          >
            {confirmModal.confirmLabel || "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
};
