"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Lightbulb,
  ListChecks,
  PanelsTopLeft,
  RefreshCwIcon,
  Rocket,
  WandSparkles,
} from "lucide-react";
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
  gradient?: string;
};

const suggestionCatalog: SuggestionEntry[] = [
  {
    icon: Rocket,
    description:
      "Cadrer la proposition de valeur, les sections clés et générer un prototype complet avec landing page.",
    label: "Prototype de lancement",
    prompt:
      "Prépare un prototype de lancement pour mon idée. Clarifie le message principal, le public cible, la preuve de valeur, les sections de la page et les actions attendues. Génère ensuite une structure de contenu précise avant de passer à la preview.",
    tags: ["site", "prototype", "startup", "beginner", "intermediate"],
    gradient: "from-sky-500/20 to-blue-600/10 border-sky-500/20 text-sky-400",
  },
  {
    icon: Code2,
    description:
      "Concevoir une application complète et responsive prête pour la production (UI, logique et données).",
    label: "Créer une application",
    prompt:
      "Je veux construire une application complète et fonctionnelle. Aide-moi à choisir la structure des écrans, le parcours principal, les états vides et de chargement, les données de démonstration et les composants réutilisables. Commence par vérifier que le périmètre est suffisamment clair.",
    tags: ["web", "site", "prototype", "intermediate", "advanced"],
    gradient: "from-violet-500/20 to-indigo-600/10 border-violet-500/20 text-violet-400",
  },
  {
    icon: WandSparkles,
    description:
      "Identité de marque, logo vectoriel, tokens de design et bannières visuelles coordonnées.",
    label: "Design Studio",
    prompt:
      "Conçois une identité de marque complète et son Design Studio pour mon projet. Définis la palette de couleurs, la typographie, le logo vectoriel SVG, les tokens de design et les bannières visuelles coordonnées avant de lancer les maquettes.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
    gradient: "from-fuchsia-500/20 to-purple-600/10 border-fuchsia-500/20 text-fuchsia-400",
  },
  {
    icon: PanelsTopLeft,
    description:
      "Concevoir une application claire et accessible pour élèves, enseignants et parents.",
    label: "Créer une application scolaire",
    prompt:
      "Aide-moi à concevoir une application scolaire claire et accessible. Commence par comprendre les utilisateurs (élèves, enseignants et parents), le problème prioritaire, les fonctionnalités essentielles, les données à prévoir et le style d’interface. Propose d’abord une spécification courte avant toute construction.",
    tags: ["mobile", "web", "prototype", "beginner", "intermediate"],
    gradient: "from-emerald-500/20 to-teal-600/10 border-emerald-500/20 text-emerald-400",
  },
  {
    icon: Lightbulb,
    description:
      "Clarifier l’objectif, le public cible et établir un plan de mission concret avant le code.",
    label: "Structurer mon idée de produit",
    prompt:
      "Aide-moi à clarifier mon idée de produit. Pose les questions utiles sur l’objectif, le public, la proposition de valeur, les contraintes et le résultat attendu, puis transforme les réponses en plan de mission concret avant de construire quoi que ce soit.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
    gradient: "from-amber-500/20 to-orange-600/10 border-amber-500/20 text-amber-400",
  },
  {
    icon: ListChecks,
    description:
      "Distinguer planification, exécution et validation avec des jalons d’avancement précis.",
    label: "Transformer mon objectif en étapes",
    prompt:
      "Transforme mon objectif en étapes de réalisation réalistes. Distingue ce qui doit être compris, planifié, construit et vérifié. Signale les décisions manquantes et propose une première mission courte plutôt qu’un périmètre trop large.",
    tags: ["mobile", "web", "internal_tool", "non_coder", "beginner"],
    gradient: "from-cyan-500/20 to-blue-600/10 border-cyan-500/20 text-cyan-400",
  },
];

function getSuggestedEntries(profile: ProfileContext, generation: number) {
  if (generation === 0) {
    return suggestionCatalog.slice(0, 3);
  }
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
  for (let index = 0; index < 3; index += 1) {
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
    (suggestion: SuggestionEntry) => {
      if (onSuggestionSelect) {
        onSuggestionSelect(suggestion.prompt);
        return;
      }

      sendMessage({
        parts: [
          {
            text: suggestion.prompt,
            type: "text",
          },
        ],
        role: "user",
      });
    },
    [onSuggestionSelect, sendMessage]
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
    <section aria-labelledby="mission-start-title" className="flex w-full flex-col gap-3.5">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70" id="mission-start-title">
            Point de départ
          </h2>
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
        className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-3"
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
                className="group/card relative flex min-h-[148px] w-full flex-col justify-between rounded-2xl border border-white/10 bg-card/30 p-4 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/50 hover:bg-card/50 hover:shadow-[0_12px_36px_rgba(139,92,246,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4.5"
                onClick={() => handleSuggestionClick(entry)}
                type="button"
              >
                {/* Top: Icon in squircle badge */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl border bg-gradient-to-br transition-transform group-hover/card:scale-105 ${
                      entry.gradient || "from-violet-500/20 to-indigo-600/10 border-violet-500/20 text-violet-400"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </div>

                {/* Middle: Title & Description */}
                <div className="mt-3">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover/card:text-violet-300">
                    {entry.label}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
                    {entry.description}
                  </p>
                </div>

                {/* Bottom: Subtle arrow */}
                <div className="mt-2.5 flex items-center justify-end text-xs text-muted-foreground/60 transition-colors group-hover/card:text-violet-300">
                  <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover/card:translate-x-1" />
                </div>
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
