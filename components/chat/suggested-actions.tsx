"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { ArrowUpRight, Code2, Lightbulb, ListChecks, PanelsTopLeft, Rocket, WandSparkles, RefreshCwIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
  description: string;
  label: string;
  prompt: string;
  tags: string[];
};

const suggestionCatalog: SuggestionEntry[] = [
  {
    icon: PanelsTopLeft,
    description:
      "Concevoir une application claire et accessible pour élèves, enseignants et parents.",
    label: "Créer une application scolaire",
    prompt:
      "Aide-moi à concevoir une application scolaire claire et accessible. Commence par comprendre les utilisateurs (élèves, enseignants et parents), le problème prioritaire, les fonctionnalités essentielles, les données à prévoir et le style d’interface. Propose d’abord une spécification courte avant toute construction.",
    tags: ["mobile", "web", "prototype", "beginner", "intermediate"],
  },
  {
    icon: Lightbulb,
    description:
      "Clarifier l’objectif, le public cible et établir un plan de mission concret avant le code.",
    label: "Structurer mon idée de produit",
    prompt:
      "Aide-moi à clarifier mon idée de produit. Pose les questions utiles sur l’objectif, le public, la proposition de valeur, les contraintes et le résultat attendu, puis transforme les réponses en plan de mission concret avant de construire quoi que ce soit.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
  },
  {
    icon: Code2,
    description:
      "Définir l’architecture des écrans, le parcours interactif et les composants réutilisables.",
    label: "Construire une première interface",
    prompt:
      "Je veux construire une première interface fonctionnelle. Aide-moi à choisir la structure des écrans, le parcours principal, les états vides et de chargement, les données de démonstration et les composants réutilisables. Commence par vérifier que le périmètre est suffisamment clair.",
    tags: ["web", "site", "prototype", "intermediate", "advanced"],
  },
  {
    icon: WandSparkles,
    description:
      "Analyser le parcours, identifier les points de friction et prioriser les optimisations.",
    label: "Améliorer une expérience existante",
    prompt:
      "Aide-moi à améliorer une expérience existante. Analyse d’abord le parcours utilisateur, les points de friction, la hiérarchie visuelle, l’accessibilité et les contraintes techniques. Propose une série de corrections priorisées et attends ma validation avant la construction.",
    tags: ["internal_tool", "saas", "other", "advanced", "expert"],
  },
  {
    icon: Rocket,
    description:
      "Cadrer la proposition de valeur, les sections clés et générer un prototype de démonstration.",
    label: "Préparer un prototype de lancement",
    prompt:
      "Prépare un prototype de lancement pour mon idée. Clarifie le message principal, le public cible, la preuve de valeur, les sections de la page et les actions attendues. Génère ensuite une structure de contenu précise avant de passer à la preview.",
    tags: ["site", "prototype", "startup", "beginner", "intermediate"],
  },
  {
    icon: ListChecks,
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
  const offset = (generation * 3) % pool.length;
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
    <section aria-labelledby="mission-start-title" className="flex w-full flex-col gap-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground" id="mission-start-title">
            Pour commencer
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choisissez un point de départ ou écrivez votre idée.
          </p>
        </div>
        <Button
          className="shrink-0 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setGeneration((value) => value + 1)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RefreshCwIcon className="mr-1.5 size-3.5" />
          Autres idées
        </Button>
      </div>
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
        className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="suggested-actions"
        style={{
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {suggestedActions.map((entry, index) => {
          const Icon = entry.icon;

          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="group relative min-w-0"
              exit={{ opacity: 0, y: 10 }}
              initial={{ opacity: 0, y: 10 }}
              key={entry.label}
              transition={{
                delay: 0.04 * index,
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <button
                className="group/card relative flex min-h-[92px] w-full items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/90 hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
                onClick={() => handleSuggestionClick(entry)}
                type="button"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-colors group-hover/card:bg-primary/15">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold tracking-tight text-foreground transition-colors group-hover/card:text-primary sm:text-[13px]">
                      {entry.label}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5 group-hover/card:text-primary"
                    />
                  </span>
                  <span className="mt-1.5 block line-clamp-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                    {entry.description}
                  </span>
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
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
