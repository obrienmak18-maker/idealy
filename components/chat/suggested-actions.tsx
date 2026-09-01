"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { RefreshCwIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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

type ProfileContext = {
  experienceLevel?: string | null;
  firstName?: string | null;
  primaryGoal?: string | null;
  projectType?: string | null;
  way?: string | null;
};

type SuggestionEntry = {
  label: string;
  prompt: string;
  tags: string[];
};

const suggestionCatalog: SuggestionEntry[] = [
  {
    label: "Créer une application scolaire",
    prompt:
      "Aide-moi à concevoir une application scolaire claire et accessible. Commence par comprendre les utilisateurs (élèves, enseignants et parents), le problème prioritaire, les fonctionnalités essentielles, les données à prévoir et le style d’interface. Propose d’abord une spécification courte avant toute construction.",
    tags: ["mobile", "web", "prototype", "beginner", "intermediate"],
  },
  {
    label: "Structurer mon idée de produit",
    prompt:
      "Aide-moi à clarifier mon idée de produit. Pose les questions utiles sur l’objectif, le public, la proposition de valeur, les contraintes et le résultat attendu, puis transforme les réponses en plan de mission concret avant de construire quoi que ce soit.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
  },
  {
    label: "Construire une première interface",
    prompt:
      "Je veux construire une première interface fonctionnelle. Aide-moi à choisir la structure des écrans, le parcours principal, les états vides et de chargement, les données de démonstration et les composants réutilisables. Commence par vérifier que le périmètre est suffisamment clair.",
    tags: ["web", "site", "prototype", "intermediate", "advanced"],
  },
  {
    label: "Améliorer une expérience existante",
    prompt:
      "Aide-moi à améliorer une expérience existante. Analyse d’abord le parcours utilisateur, les points de friction, la hiérarchie visuelle, l’accessibilité et les contraintes techniques. Propose une série de corrections priorisées et attends ma validation avant la construction.",
    tags: ["internal_tool", "saas", "other", "advanced", "expert"],
  },
  {
    label: "Préparer un prototype de lancement",
    prompt:
      "Prépare un prototype de lancement pour mon idée. Clarifie le message principal, le public cible, la preuve de valeur, les sections de la page et les actions attendues. Génère ensuite une structure de contenu précise avant de passer à la preview.",
    tags: ["site", "prototype", "startup", "beginner", "intermediate"],
  },
  {
    label: "Transformer mon objectif en étapes",
    prompt:
      "Transforme mon objectif en étapes de réalisation réalistes. Distingue ce qui doit être compris, planifié, construit et vérifié. Signale les décisions manquantes et propose une première mission courte plutôt qu’un périmètre trop large.",
    tags: ["mobile", "web", "internal_tool", "non_coder", "beginner"],
  },
];

function getSuggestedEntries(profile: ProfileContext, generation: number) {
  const contextTags = [profile.projectType, profile.experienceLevel].filter(
    (value): value is string => Boolean(value)
  );
  const scored = suggestionCatalog
    .map((entry, index) => ({
      entry,
      index,
      score:
        entry.tags.reduce(
          (total, tag) => total + (contextTags.includes(tag) ? 3 : 0),
          0
        ) + (profile.primaryGoal && index % 2 === 0 ? 1 : 0),
    }))
    .sort(
      (left, right) => right.score - left.score || left.index - right.index
    );
  const ordered = scored.map(({ entry }) => entry);
  const offset = generation % ordered.length;
  return [...ordered.slice(offset), ...ordered.slice(0, offset)].slice(0, 4);
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  onSuggestionSelect,
}: SuggestedActionsProps) {
  const [generation, setGeneration] = useState(0);
  const [profile, setProfile] = useState<ProfileContext>({});
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    if (isDemoMode) {
      return;
    }
    const controller = new AbortController();
    void fetch("/api/idealy/profile/onboarding", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: ProfileContext | null) => {
        if (value) {
          setProfile(value);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isDemoMode]);

  const suggestedActions = useMemo(
    () => getSuggestedEntries(profile, generation),
    [generation, profile]
  );

  const handleSuggestionClick = useCallback(
    (entry: SuggestionEntry) => {
      if (onSuggestionSelect) {
        onSuggestionSelect(entry.prompt);
        return;
      }
      window.history.pushState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        parts: [{ text: entry.prompt, type: "text" }],
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
        {suggestedActions.map((entry, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="min-w-[200px] shrink-0 sm:min-w-0 sm:shrink"
            exit={{ opacity: 0, y: 16 }}
            initial={{ opacity: 0, y: 16 }}
            key={entry.label}
            transition={{
              delay: 0.06 * index,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Suggestion
              className="h-auto w-full whitespace-nowrap rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)] sm:whitespace-normal sm:p-4 sm:text-[13px]"
              onClick={() => handleSuggestionClick(entry)}
              suggestion={entry.label}
            >
              {entry.label}
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
        Nouvelles suggestions
      </Button>
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) =>
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.onSuggestionSelect === nextProps.onSuggestionSelect
);

export { suggestionCatalog };
