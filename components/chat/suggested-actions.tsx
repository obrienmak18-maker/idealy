"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { RefreshCwIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "@/lib/types";
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
  description: string;
  label: string;
  prompt: string;
  tags: string[];
};

const suggestionCatalog: SuggestionEntry[] = [
  {
    description:
      "Concevoir une application claire et accessible pour élèves, enseignants et parents.",
    label: "Créer une application scolaire",
    prompt:
      "Aide-moi à concevoir une application scolaire claire et accessible. Commence par comprendre les utilisateurs (élèves, enseignants et parents), le problème prioritaire, les fonctionnalités essentielles, les données à prévoir et le style d’interface. Propose d’abord une spécification courte avant toute construction.",
    tags: ["mobile", "web", "prototype", "beginner", "intermediate"],
  },
  {
    description:
      "Clarifier l’objectif, le public cible et établir un plan de mission concret avant le code.",
    label: "Structurer mon idée de produit",
    prompt:
      "Aide-moi à clarifier mon idée de produit. Pose les questions utiles sur l’objectif, le public, la proposition de valeur, les contraintes et le résultat attendu, puis transforme les réponses en plan de mission concret avant de construire quoi que ce soit.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
  },
  {
    description:
      "Définir l’architecture des écrans, le parcours interactif et les composants réutilisables.",
    label: "Construire une première interface",
    prompt:
      "Je veux construire une première interface fonctionnelle. Aide-moi à choisir la structure des écrans, le parcours principal, les états vides et de chargement, les données de démonstration et les composants réutilisables. Commence par vérifier que le périmètre est suffisamment clair.",
    tags: ["web", "site", "prototype", "intermediate", "advanced"],
  },
  {
    description:
      "Analyser le parcours, identifier les points de friction et prioriser les optimisations.",
    label: "Améliorer une expérience existante",
    prompt:
      "Aide-moi à améliorer une expérience existante. Analyse d’abord le parcours utilisateur, les points de friction, la hiérarchie visuelle, l’accessibilité et les contraintes techniques. Propose une série de corrections priorisées et attends ma validation avant la construction.",
    tags: ["internal_tool", "saas", "other", "advanced", "expert"],
  },
  {
    description:
      "Cadrer la proposition de valeur, les sections clés et générer un prototype de démonstration.",
    label: "Préparer un prototype de lancement",
    prompt:
      "Prépare un prototype de lancement pour mon idée. Clarifie le message principal, le public cible, la preuve de valeur, les sections de la page et les actions attendues. Génère ensuite une structure de contenu précise avant de passer à la preview.",
    tags: ["site", "prototype", "startup", "beginner", "intermediate"],
  },
  {
    description:
      "Distinguer planification, exécution et validation avec des jalons d’avancement précis.",
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
    .sort((left, right) => right.score - left.score);

  const pool = scored.map((item) => item.entry);
  const offset = (generation * 4) % pool.length;
  const picked: SuggestionEntry[] = [];
  for (let index = 0; index < 4; index += 1) {
    picked.push(pool[(offset + index) % pool.length]);
  }
  return picked;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType: _selectedVisibilityType,
  onSuggestionSelect,
}: SuggestedActionsProps) {
  const [profile, setProfile] = useState<ProfileContext>({});
  const [generation, setGeneration] = useState(0);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const response = await fetch("/api/idealy/profile/onboarding", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as ProfileContext;
        if (!cancelled) {
          setProfile(data);
        }
      } catch {
        // Fallback gracefully without profile context
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestedActions = useMemo(
    () => getSuggestedEntries(profile, generation),
    [profile, generation]
  );

  const handleSuggestionClick = useCallback(
    (entry: SuggestionEntry) => {
      if (onSuggestionSelect) {
        onSuggestionSelect(entry.prompt);
        return;
      }

      window.history.replaceState({}, "", `/chat/${chatId}`);

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
    <div className="flex w-full flex-col gap-3">
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
        className="flex w-full gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible"
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
            className="group relative min-w-[240px] shrink-0 sm:min-w-0 sm:shrink"
            exit={{ opacity: 0, y: 12 }}
            initial={{ opacity: 0, y: 12 }}
            key={entry.label}
            transition={{
              delay: 0.04 * index,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <button
              className="relative flex h-full w-full flex-col justify-between rounded-xl border border-slate-200/90 bg-white/90 p-4 text-left shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-white hover:shadow-[0_8px_25px_-6px_rgba(56,189,248,0.2),0_4px_12px_-4px_rgba(139,92,246,0.12)] active:translate-y-0 dark:border-white/10 dark:bg-slate-900/60 dark:hover:border-violet-400/60 dark:hover:bg-slate-900 dark:hover:shadow-[0_8px_25px_-6px_rgba(139,92,246,0.25)] backdrop-blur-sm cursor-pointer"
              onClick={() => handleSuggestionClick(entry)}
              type="button"
            >
              <div className="flex items-start justify-between gap-2.5">
                <span className="font-semibold text-[13.5px] text-foreground tracking-tight transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-300">
                  {entry.label}
                </span>
                <span className="shrink-0 rounded-full border border-sky-400/25 bg-gradient-to-r from-sky-500/10 via-teal-500/10 to-violet-500/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-sky-700 dark:border-sky-400/30 dark:text-sky-300">
                  Mission
                </span>
              </div>

              <p className="mt-2.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                {entry.description}
              </p>
            </button>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[12px] font-medium text-[#475569] dark:text-slate-300">
          Sélectionnez une mission ou formulez votre idée
        </span>
        <Button
          className="rounded-lg text-[12px] font-medium text-[#475569] hover:text-foreground dark:text-slate-300 cursor-pointer"
          onClick={() => setGeneration((value) => value + 1)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RefreshCwIcon className="mr-1.5 size-3.5" />
          Nouvelles idées
        </Button>
      </div>
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
