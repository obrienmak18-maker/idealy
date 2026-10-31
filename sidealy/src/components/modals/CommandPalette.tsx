import {
  Download,
  FileText,
  FolderOpen,
  Laptop,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";

interface PaletteItem {
  action: () => void;
  category: "Actions" | "Discussions" | "Espaces" | "Livrables";
  icon: React.ReactNode;
  id: string;
  title: string;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    conversations,
    setActiveConversationId,
    createConversation,
    spaces,
    setActiveSpaceId,
    artifacts,
    openArtifact,
    setTheme,
    setIsSettingsOpen,
    setIsSpaceModalOpen,
    activeConversation,
    exportConversation,
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) {
    return null;
  }

  // Build items list
  const baseActions: PaletteItem[] = [
    {
      action: () => {
        createConversation();
        setIsCommandPaletteOpen(false);
      },
      category: "Actions",
      icon: <Plus className="w-4 h-4 text-brand-primary" />,
      id: "act-new",
      title: "Nouvelle conversation",
    },
    {
      action: () => {
        setIsCommandPaletteOpen(false);
        setIsSpaceModalOpen(true);
      },
      category: "Actions",
      icon: <FolderOpen className="w-4 h-4 text-brand-primary" />,
      id: "act-spaces",
      title: "Gérer les Espaces et Instructions",
    },
    {
      action: () => {
        setIsCommandPaletteOpen(false);
        setIsSettingsOpen(true);
      },
      category: "Actions",
      icon: <Settings className="w-4 h-4 text-text-muted" />,
      id: "act-settings",
      title: "Ouvrir les Paramètres",
    },
    {
      action: () => {
        if (activeConversation) {
          exportConversation(activeConversation.id);
        }
        setIsCommandPaletteOpen(false);
      },
      category: "Actions",
      icon: <Download className="w-4 h-4 text-text-muted" />,
      id: "act-export",
      title: "Exporter la conversation active en Markdown",
    },
    {
      action: () => {
        setTheme("light");
        setIsCommandPaletteOpen(false);
      },
      category: "Actions",
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      id: "act-theme-light",
      title: "Passer en thème Clair",
    },
    {
      action: () => {
        setTheme("dark");
        setIsCommandPaletteOpen(false);
      },
      category: "Actions",
      icon: <Moon className="w-4 h-4 text-brand-primary" />,
      id: "act-theme-dark",
      title: "Passer en thème Sombre",
    },
    {
      action: () => {
        setTheme("system");
        setIsCommandPaletteOpen(false);
      },
      category: "Actions",
      icon: <Laptop className="w-4 h-4 text-text-muted" />,
      id: "act-theme-system",
      title: "Passer en thème Système",
    },
  ];

  const convItems: PaletteItem[] = conversations.map((c) => ({
    action: () => {
      setActiveConversationId(c.id);
      setIsCommandPaletteOpen(false);
    },
    category: "Discussions",
    icon: <MessageSquare className="w-4 h-4 text-brand-primary" />,
    id: `conv-${c.id}`,
    title: c.title,
  }));

  const spaceItems: PaletteItem[] = spaces.map((s) => ({
    action: () => {
      setActiveSpaceId(s.id);
      setIsCommandPaletteOpen(false);
    },
    category: "Espaces",
    icon: <FolderOpen className="w-4 h-4 text-brand-accent" />,
    id: `space-${s.id}`,
    title: `Basculer vers : ${s.name}`,
  }));

  const artifactItems: PaletteItem[] = artifacts.map((a) => ({
    action: () => {
      openArtifact(a.id);
      setIsCommandPaletteOpen(false);
    },
    category: "Livrables",
    icon: <FileText className="w-4 h-4 text-brand-primary" />,
    id: `art-${a.id}`,
    title: `Consulter : ${a.title}`,
  }));

  const allItems = [
    ...baseActions,
    ...convItems,
    ...spaceItems,
    ...artifactItems,
  ];

  const filteredItems = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredItems.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  return (
    <div
      aria-label="Palette de commandes"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-xl bg-bg-surface border border-border-subtle rounded-2xl shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-border-subtle gap-3">
          <Search className="w-5 h-5 text-text-muted flex-shrink-0" />
          <input
            aria-label="Recherche dans la palette"
            className="w-full bg-transparent border-0 p-0 text-sm md:text-base text-text-main placeholder:text-text-muted focus:outline-none"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une discussion, un livrable ou une action..."
            ref={inputRef}
            type="text"
            value={query}
          />
          <button
            aria-label="Fermer la palette"
            className="p-1 rounded text-text-muted hover:text-text-main transition-colors focus-ring"
            onClick={() => setIsCommandPaletteOpen(false)}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-brand-primary text-brand-onPrimary font-medium"
                        : "text-text-main hover:bg-bg-subtle"
                    }`}
                    key={item.id}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    type="button"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className={isSelected ? "text-white" : ""}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-bg-subtle text-text-muted"
                      }`}
                    >
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-border-subtle bg-bg-subtle/40 text-[11px] text-text-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Naviguer</span>
            <span>↵ Exécuter</span>
            <span>Échap Fermer</span>
          </div>
          <span>{filteredItems.length} options</span>
        </div>
      </div>
    </div>
  );
};
