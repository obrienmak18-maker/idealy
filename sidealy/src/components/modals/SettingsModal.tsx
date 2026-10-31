import {
  Laptop,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../common/Button";

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    theme,
    setTheme,
    spaces,
    conversations,
    messages,
    artifacts,
    openConfirmModal,
    setActivePage,
  } = useApp();

  if (!isSettingsOpen) {
    return null;
  }

  const handleClearAllData = () => {
    openConfirmModal({
      confirmLabel: "Réinitialiser toutes les données",
      isDestructive: true,
      message:
        "Cette opération réinitialisera l'ensemble des conversations, brouillons et livrables stockés dans votre navigateur. Cette action est irréversible.",
      onConfirm: () => {
        try {
          localStorage.clear();
          window.location.reload();
        } catch {
          window.location.reload();
        }
      },
      title: "Effacer toutes les données locales ?",
    });
  };

  return (
    <div
      aria-labelledby="settings-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-2xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-subtle/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-primary" />
            <h3
              className="text-base font-semibold text-text-main"
              id="settings-modal-title"
            >
              Paramètres & Préférences
            </h3>
          </div>
          <button
            aria-label="Fermer les paramètres"
            className="p-1 rounded text-text-muted hover:text-text-main transition-colors focus-ring"
            onClick={() => setIsSettingsOpen(false)}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm text-text-main">
          {/* Appearance Section */}
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Apparence & Thème
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  theme === "light"
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold"
                    : "border-border-subtle bg-bg-subtle text-text-muted hover:text-text-main hover:bg-border-subtle/60"
                }`}
                onClick={() => setTheme("light")}
                type="button"
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span>Clair</span>
              </button>

              <button
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  theme === "dark"
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold"
                    : "border-border-subtle bg-bg-subtle text-text-muted hover:text-text-main hover:bg-border-subtle/60"
                }`}
                onClick={() => setTheme("dark")}
                type="button"
              >
                <Moon className="w-5 h-5 text-brand-primary" />
                <span>Sombre</span>
              </button>

              <button
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                  theme === "system"
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold"
                    : "border-border-subtle bg-bg-subtle text-text-muted hover:text-text-main hover:bg-border-subtle/60"
                }`}
                onClick={() => setTheme("system")}
                type="button"
              >
                <Laptop className="w-5 h-5" />
                <span>Système</span>
              </button>
            </div>
          </div>

          {/* Technical Transparency Note */}
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Statut Technique & Connexions
            </h4>
            <div className="p-4 rounded-xl border border-border-subtle bg-bg-subtle/50 space-y-2 text-xs leading-relaxed">
              <div className="flex items-center gap-2 text-text-main font-semibold">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>Confidentialité & Rigueur Technique</span>
              </div>
              <p className="text-text-muted">
                • <strong>Moteur IA :</strong> réponses diffusées depuis le
                backend Idealy via l’API de chat.
              </p>
              <p className="text-text-muted">
                • <strong>Clés API distantes :</strong> Aucune clé secrète n'est
                exposée dans le navigateur.
              </p>
              <p className="text-text-muted">
                • <strong>Persistance :</strong> conversations synchronisées
                avec le compte quand une session est active ; les brouillons
                restent dans ce navigateur.
              </p>
              <Button
                className="mt-2"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setActivePage("settings");
                }}
                size="sm"
                variant="secondary"
              >
                Ouvrir tous les paramètres
              </Button>
            </div>
          </div>

          {/* Data Statistics & Reset */}
          <div>
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
              Cache de cet appareil
            </h4>
            <div className="p-4 rounded-xl border border-border-subtle bg-bg-subtle/30 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted">Espaces créés :</span>{" "}
                  <strong className="text-text-main">{spaces.length}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Conversations :</span>{" "}
                  <strong className="text-text-main">
                    {conversations.length}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted">Messages stockés :</span>{" "}
                  <strong className="text-text-main">{messages.length}</strong>
                </div>
                <div>
                  <span className="text-text-muted">
                    Livrables / Artefacts :
                  </span>{" "}
                  <strong className="text-text-main">{artifacts.length}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Données locales du navigateur
                </span>
                <Button
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={handleClearAllData}
                  size="sm"
                  variant="destructive"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle bg-bg-subtle/40 text-[11px] text-text-muted flex items-center justify-between">
          <span>Idealy 2026 — Respect des standards WCAG AA</span>
          <Button
            onClick={() => setIsSettingsOpen(false)}
            size="sm"
            variant="secondary"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
