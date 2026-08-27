import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { RefreshCwIcon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { suggestions } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../ai-elements/suggestion";
import { Button } from "../ui/button";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  onSuggestionSelect?: (prompt: string) => void;
};

const detailedPrompts: Record<string, string> = {
  Dijkstra:
    "Explique puis implémente l’algorithme de Dijkstra dans une interface pédagogique. Ajoute un exemple interactif avec un graphe, des nœuds sélectionnables, l’affichage du chemin optimal et une visualisation étape par étape. Utilise un code clair et commente les décisions importantes.",
  "Next.js":
    "Crée une application Next.js moderne avec TypeScript et Tailwind CSS. Ajoute une page d’accueil responsive, une navigation claire, un état de chargement, une gestion d’erreur et des composants réutilisables. Commence par proposer la structure du projet puis génère une première interface fonctionnelle dans la preview.",
  Weather:
    "Crée un tableau de bord météo élégant et responsive. Prévois une recherche par ville, les conditions actuelles, la température, les prévisions sur plusieurs jours, des états de chargement et un état vide. Commence par construire l’interface avec des données de démonstration clairement identifiées.",
  "Write an essay":
    "Rédige un essai structuré sur le sujet indiqué. Commence par proposer une problématique et un plan en trois parties, puis écris une introduction, des transitions naturelles, des arguments illustrés et une conclusion. Adopte un ton clair, nuancé et adapté au niveau du lecteur.",
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  onSuggestionSelect,
}: SuggestedActionsProps) {
  const [generation, setGeneration] = useState(0);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const suggestedActions = useMemo(() => {
    const offset = generation % suggestions.length;
    return [...suggestions.slice(offset), ...suggestions.slice(0, offset)];
  }, [generation]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      const prompt = detailedPrompts[suggestion] ?? suggestion;
      if (onSuggestionSelect) {
        onSuggestionSelect(prompt);
        return;
      }
      window.history.pushState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        parts: [{ text: prompt, type: "text" }],
        role: "user",
      });
    },
    [chatId, onSuggestionSelect, sendMessage]
  );

  const startLocalWorkspaceDemo = useCallback(() => {
    sendMessage({
      parts: [
        {
          text: "Lance la démonstration complète d’Atelier Nord avec plan, escouade, fichiers, aperçu et revue locale.",
          type: "text",
        },
      ],
      role: "user",
    });
  }, [sendMessage]);

  return (
    <div className="flex w-full flex-col gap-2.5">
      {isDemoMode ? (
        <Button
          className="w-full rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-5 text-sm font-semibold text-sky-900 shadow-[var(--shadow-card)] hover:bg-sky-400/20 dark:text-sky-100"
          data-testid="start-local-workspace-demo"
          onClick={startLocalWorkspaceDemo}
          type="button"
          variant="ghost"
        >
          Ouvrir la démonstration complète
        </Button>
      ) : null}
      <div
        className="flex w-full gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible"
        data-testid="suggested-actions"
        style={{
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {suggestedActions.map((suggestedAction, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="min-w-[200px] shrink-0 sm:min-w-0 sm:shrink"
            exit={{ opacity: 0, y: 16 }}
            initial={{ opacity: 0, y: 16 }}
            key={suggestedAction}
            transition={{
              delay: 0.06 * index,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Suggestion
              className="h-auto w-full whitespace-nowrap rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)] sm:whitespace-normal sm:p-4 sm:text-[13px]"
              onClick={handleSuggestionClick}
              suggestion={suggestedAction}
            >
              {suggestedAction}
            </Suggestion>
          </motion.div>
        ))}
      </div>
      <Button
        className="w-fit self-end rounded-lg text-[11px] text-muted-foreground hover:text-foreground"
        onClick={() => setGeneration((value) => value + 1)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <RefreshCwIcon className="mr-1.5 size-3.5" />
        Regenerate suggestions
      </Button>
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    if (prevProps.onSuggestionSelect !== nextProps.onSuggestionSelect) {
      return false;
    }

    return true;
  }
);
