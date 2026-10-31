import { Check, FolderPlus, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../common/Button";

export const SpaceModal: React.FC = () => {
  const {
    isSpaceModalOpen,
    setIsSpaceModalOpen,
    spaces,
    activeSpace,
    createSpace,
    updateSpace,
    deleteSpace,
    openConfirmModal,
  } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  // Editing state for active space
  const [editName, setEditName] = useState(activeSpace?.name || "");
  const [editInstructions, setEditInstructions] = useState(
    activeSpace?.instructions || "",
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isSpaceModalOpen) {
    return null;
  }

  const handleSaveActiveSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSpace) {
      return;
    }
    updateSpace(activeSpace.id, {
      instructions: editInstructions.trim(),
      name: editName.trim() || activeSpace.name,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      return;
    }
    createSpace(newName, newDesc, newInstructions);
    setNewName("");
    setNewDesc("");
    setNewInstructions("");
    setIsCreating(false);
  };

  const handleDeleteSpace = (id: string, name: string) => {
    openConfirmModal({
      confirmLabel: "Supprimer l'espace",
      isDestructive: true,
      message:
        "La suppression d'un espace masquera ses configurations. Êtes-vous certain ?",
      onConfirm: () => deleteSpace(id),
      title: `Supprimer l'espace « ${name} » ?`,
    });
  };

  return (
    <div
      aria-labelledby="space-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-2xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-subtle/50">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-brand-primary" />
            <h3
              className="text-base font-semibold text-text-main"
              id="space-modal-title"
            >
              Gestion des Espaces de Travail
            </h3>
          </div>
          <button
            aria-label="Fermer"
            className="p-1 rounded text-text-muted hover:text-text-main transition-colors focus-ring"
            onClick={() => setIsSpaceModalOpen(false)}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Active Space Configuration */}
          {activeSpace && !isCreating && (
            <form className="space-y-4" onSubmit={handleSaveActiveSpace}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Espace actif : {activeSpace.name}
                </span>
                {spaces.length > 1 && (
                  <button
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                    onClick={() =>
                      handleDeleteSpace(activeSpace.id, activeSpace.name)
                    }
                    type="button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-text-main mb-1.5"
                  htmlFor="space-name-edit"
                >
                  Nom de l'Espace
                </label>
                <input
                  id="space-name-edit"
                  className="w-full px-3 py-2 rounded-lg bg-bg-subtle border border-border-subtle text-sm text-text-main focus-ring"
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  type="text"
                  value={editName}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-text-main mb-1.5"
                  htmlFor="space-instructions-edit"
                >
                  Instructions spécifiques de l'Espace
                </label>
                <textarea
                  id="space-instructions-edit"
                  className="w-full px-3 py-2 rounded-lg bg-bg-subtle border border-border-subtle text-xs md:text-sm text-text-main focus-ring resize-none leading-relaxed"
                  onChange={(e) => setEditInstructions(e.target.value)}
                  placeholder="Ex : Consignes de ton, règles d'architecture, format de sortie attendu..."
                  rows={3}
                  value={editInstructions}
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Ces instructions guident automatiquement les réponses et
                  livrables créés dans cet espace.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  onClick={() => setIsCreating(true)}
                  size="sm"
                  type="button"
                  variant="subtle"
                >
                  + Créer un autre Espace
                </Button>

                <Button size="md" type="submit" variant="primary">
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Enregistré !</span>
                    </>
                  ) : (
                    "Enregistrer les modifications"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* New Space Creation Form */}
          {isCreating && (
            <form className="space-y-4" onSubmit={handleCreateNew}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">
                  Nouvel Espace de Travail
                </span>
                <button
                  className="text-xs text-text-muted hover:underline"
                  onClick={() => setIsCreating(false)}
                  type="button"
                >
                  Annuler
                </button>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-text-main mb-1.5"
                  htmlFor="space-name-create"
                >
                  Nom de l'Espace
                </label>
                <input
                  id="space-name-create"
                  className="w-full px-3 py-2 rounded-lg bg-bg-subtle border border-border-subtle text-sm text-text-main focus-ring"
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex : Projet Alpha, Documentation API, Veille..."
                  required
                  type="text"
                  value={newName}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-text-main mb-1.5"
                  htmlFor="space-description-create"
                >
                  Description
                </label>
                <input
                  id="space-description-create"
                  className="w-full px-3 py-2 rounded-lg bg-bg-subtle border border-border-subtle text-sm text-text-main focus-ring"
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Courte description de l'usage de cet espace"
                  type="text"
                  value={newDesc}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-text-main mb-1.5"
                  htmlFor="space-instructions-create"
                >
                  Instructions spécifiques
                </label>
                <textarea
                  id="space-instructions-create"
                  className="w-full px-3 py-2 rounded-lg bg-bg-subtle border border-border-subtle text-xs md:text-sm text-text-main focus-ring resize-none"
                  onChange={(e) => setNewInstructions(e.target.value)}
                  placeholder="Directives de rédaction ou contraintes techniques pour cet espace..."
                  rows={2}
                  value={newInstructions}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  onClick={() => setIsCreating(false)}
                  size="md"
                  type="button"
                  variant="secondary"
                >
                  Retour
                </Button>
                <Button size="md" type="submit" variant="primary">
                  Créer l'Espace
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
