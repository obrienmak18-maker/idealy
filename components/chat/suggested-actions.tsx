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
import { useTranslation } from "@/lib/i18n/provider";
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
      "Build a real, responsive product landing page for my startup. Create a polished hero, feature sections, pricing, testimonials, FAQ, mobile navigation and a working primary CTA. Use realistic content and finish the interface instead of returning a written plan.",
    tags: ["site", "prototype", "startup", "beginner", "intermediate"],
    gradient: "from-sky-500/20 to-blue-600/10 border-sky-500/20 text-sky-400",
  },
  {
    icon: Code2,
    description:
      "Concevoir une application complète et responsive prête pour la production (UI, logique et données).",
    label: "Créer une application",
    prompt:
      "Build a complete, usable web application from this idea. Create the actual screens, navigation, responsive layout, interactive forms, realistic sample data, empty/loading/error states and working client-side interactions. Ask one concise question only if the product goal is genuinely unclear; otherwise start building.",
    tags: ["web", "site", "prototype", "intermediate", "advanced"],
    gradient: "from-violet-500/20 to-indigo-600/10 border-violet-500/20 text-violet-400",
  },
  {
    icon: WandSparkles,
    description:
      "Identité de marque, logo vectoriel, tokens de design et bannières visuelles coordonnées.",
    label: "Design Studio",
    prompt:
      "Build an interactive brand design studio web app with editable color palettes, typography previews, logo/SVG preview, design tokens, component samples and export/copy actions. Make the controls work and present the result as a real application, not a written brand document.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
    gradient: "from-fuchsia-500/20 to-purple-600/10 border-fuchsia-500/20 text-fuchsia-400",
  },
  {
    icon: PanelsTopLeft,
    description:
      "Concevoir une application claire et accessible pour élèves, enseignants et parents.",
    label: "Créer une application scolaire",
    prompt:
      "Build a responsive school management web app for school administrators, teachers and parents. Include student profiles, attendance, tuition payments, grades, search/filter controls and a dashboard with realistic demo data. Create working navigation and interactions; do not return only a specification.",
    tags: ["mobile", "web", "prototype", "beginner", "intermediate"],
    gradient: "from-emerald-500/20 to-teal-600/10 border-emerald-500/20 text-emerald-400",
  },
  {
    icon: Lightbulb,
    description:
      "Clarifier l’objectif, le public cible et établir un plan de mission concret avant le code.",
    label: "Structurer mon idée de produit",
    prompt:
      "Help me turn my product idea into a small working first version. Ask at most one essential clarifying question, then build the main screen and core interaction with realistic sample data instead of producing a document or a long plan.",
    tags: ["startup", "saas", "other", "beginner", "non_coder"],
    gradient: "from-amber-500/20 to-orange-600/10 border-amber-500/20 text-amber-400",
  },
  {
    icon: ListChecks,
    description:
      "Distinguer planification, exécution et validation avec des jalons d’avancement précis.",
    label: "Transformer mon objectif en étapes",
    prompt:
      "Turn my goal into a small working app with one clear core workflow. Build the interface and interactive first version now, use realistic sample data, and keep any planning brief and directly tied to implementation.",
    tags: ["mobile", "web", "internal_tool", "non_coder", "beginner"],
    gradient: "from-cyan-500/20 to-blue-600/10 border-cyan-500/20 text-cyan-400",
  },
];


type SuggestionLocale = "fr" | "en" | "es";
type LocalizedSuggestionCopy = { label: string; description: string; prompt: string };

const localizedSuggestionCopy: Record<string, Record<SuggestionLocale, LocalizedSuggestionCopy>> = {
  "Prototype de lancement": {
    fr: {
      label: "Prototype de lancement",
      description: "Clarifier la proposition de valeur et créer une landing page complète.",
      prompt: "Crée une vraie landing page produit responsive pour ma startup : une section d’accueil convaincante, les fonctionnalités, les tarifs, des témoignages, une FAQ, une navigation mobile et un bouton d’action fonctionnel. Utilise du contenu réaliste et finalise l’interface au lieu de me rendre un simple plan. Réponds en français.",
    },
    en: {
      label: "Launch prototype",
      description: "Clarify the value proposition and build a complete product landing page.",
      prompt: "Build a real, responsive product landing page for my startup. Include a polished hero, feature sections, pricing, testimonials, FAQ, mobile navigation and a working primary CTA. Use realistic content and finish the interface instead of returning a written plan. Respond in English.",
    },
    es: {
      label: "Prototipo de lanzamiento",
      description: "Definir la propuesta de valor y crear una página de producto completa.",
      prompt: "Crea una landing page de producto real y adaptable para mi startup. Incluye una portada convincente, funciones, precios, testimonios, preguntas frecuentes, navegación móvil y una llamada a la acción funcional. Utiliza contenido realista y termina la interfaz en lugar de entregar solo un plan. Responde en español.",
    },
  },
  "Créer une application": {
    fr: {
      label: "Créer une application",
      description: "Construire une application complète avec écrans, navigation et interactions réelles.",
      prompt: "Crée une application web complète et utilisable à partir de cette idée. Construis les vrais écrans, la navigation, une mise en page responsive, des formulaires interactifs, des données d’exemple réalistes ainsi que les états de chargement, de vide et d’erreur. Pose au maximum une question courte si l’objectif est réellement ambigu ; sinon, commence directement. Réponds en français.",
    },
    en: {
      label: "Build an app",
      description: "Create a complete app with real screens, navigation and interactions.",
      prompt: "Build a complete, usable web application from this idea. Create the actual screens, navigation, responsive layout, interactive forms, realistic sample data, empty/loading/error states and working client-side interactions. Ask one concise question only if the product goal is genuinely unclear; otherwise start building. Respond in English.",
    },
    es: {
      label: "Crear una aplicación",
      description: "Construir una aplicación completa con pantallas, navegación e interacciones reales.",
      prompt: "Crea una aplicación web completa y utilizable a partir de esta idea. Implementa las pantallas reales, navegación, diseño adaptable, formularios interactivos, datos de ejemplo realistas y estados de carga, vacío y error. Haz como máximo una pregunta breve si el objetivo no está claro; de lo contrario, empieza a construir. Responde en español.",
    },
  },
  "Design Studio": {
    fr: {
      label: "Studio de design",
      description: "Créer un atelier visuel avec palettes, typographies et composants modifiables.",
      prompt: "Construis une véritable application web de studio de design de marque avec palettes de couleurs modifiables, aperçus typographiques, aperçu de logo/SVG, design tokens, exemples de composants et actions fonctionnelles d’export et de copie. Les contrôles doivent fonctionner : ne rends pas un simple document de marque. Réponds en français.",
    },
    en: {
      label: "Design studio",
      description: "Build a visual workspace for editable palettes, typography and components.",
      prompt: "Build an interactive brand design studio web app with editable color palettes, typography previews, logo/SVG preview, design tokens, component samples and working export/copy actions. Make the controls work and present the result as a real application, not a written brand document. Respond in English.",
    },
    es: {
      label: "Estudio de diseño",
      description: "Crear un espacio visual con paletas, tipografías y componentes editables.",
      prompt: "Construye una aplicación web interactiva de diseño de marca con paletas de colores editables, vistas previas tipográficas, vista de logo/SVG, tokens de diseño, ejemplos de componentes y acciones funcionales para exportar y copiar. Los controles deben funcionar; no entregues solo un documento de marca. Responde en español.",
    },
  },
  "Créer une application scolaire": {
    fr: {
      label: "Créer une application scolaire",
      description: "Organiser élèves, présences, frais et résultats dans une interface interactive.",
      prompt: "Crée une application web responsive de gestion scolaire pour la direction, les enseignants et les parents. Inclus les profils des élèves, les présences, les frais scolaires, les notes, la recherche, les filtres et un tableau de bord avec des données de démonstration réalistes. La navigation et les interactions doivent fonctionner ; ne renvoie pas seulement une spécification. Réponds en français.",
    },
    en: {
      label: "Build a school app",
      description: "Manage students, attendance, tuition and grades in an interactive workspace.",
      prompt: "Build a responsive school management web app for school administrators, teachers and parents. Include student profiles, attendance, tuition payments, grades, search/filter controls and a dashboard with realistic demo data. Create working navigation and interactions; do not return only a specification. Respond in English.",
    },
    es: {
      label: "Crear una aplicación escolar",
      description: "Gestionar alumnos, asistencia, matrículas y notas en una interfaz interactiva.",
      prompt: "Crea una aplicación web adaptable de gestión escolar para administradores, docentes y familias. Incluye perfiles de alumnos, asistencia, pagos de matrícula, calificaciones, búsqueda, filtros y un panel con datos de demostración realistas. La navegación y las interacciones deben funcionar; no entregues solo una especificación. Responde en español.",
    },
  },
  "Structurer mon idée de produit": {
    fr: {
      label: "Structurer mon idée de produit",
      description: "Passer d’une idée à une première version fonctionnelle, sans long document.",
      prompt: "Aide-moi à transformer mon idée de produit en une première version fonctionnelle et réduite. Pose au maximum une question essentielle, puis construis l’écran principal et l’interaction centrale avec des données d’exemple réalistes, plutôt que de produire un document ou un long plan. Réponds en français.",
    },
    en: {
      label: "Shape my product idea",
      description: "Turn an idea into a working first version without a lengthy document.",
      prompt: "Help me turn my product idea into a small working first version. Ask at most one essential clarifying question, then build the main screen and core interaction with realistic sample data instead of producing a document or a long plan. Respond in English.",
    },
    es: {
      label: "Estructurar mi idea de producto",
      description: "Convertir una idea en una primera versión funcional, sin un documento largo.",
      prompt: "Ayúdame a convertir mi idea de producto en una primera versión funcional y pequeña. Haz como máximo una pregunta esencial y después construye la pantalla principal y la interacción central con datos de ejemplo realistas, en vez de producir un documento o un plan largo. Responde en español.",
    },
  },
  "Transformer mon objectif en étapes": {
    fr: {
      label: "Transformer mon objectif en étapes",
      description: "Transformer un objectif en un parcours concret, interactif et vérifiable.",
      prompt: "Transforme mon objectif en une petite application fonctionnelle avec un parcours principal clair. Construis l’interface et la première interaction réelle maintenant, utilise des données d’exemple réalistes et garde la planification courte et directement liée à la réalisation. Réponds en français.",
    },
    en: {
      label: "Turn my goal into steps",
      description: "Turn a goal into a practical, interactive and testable workflow.",
      prompt: "Turn my goal into a small working app with one clear core workflow. Build the interface and interactive first version now, use realistic sample data, and keep any planning brief and directly tied to implementation. Respond in English.",
    },
    es: {
      label: "Convertir mi objetivo en pasos",
      description: "Convertir un objetivo en un flujo concreto, interactivo y verificable.",
      prompt: "Convierte mi objetivo en una aplicación pequeña y funcional con un flujo principal claro. Construye ahora la interfaz y la primera interacción real, usa datos de ejemplo realistas y mantén la planificación breve y vinculada directamente a la implementación. Responde en español.",
    },
  },
};

function getLocalizedSuggestion(label: string, locale: SuggestionLocale): LocalizedSuggestionCopy | undefined {
  return localizedSuggestionCopy[label]?.[locale];
}

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
  const { language } = useTranslation();
  const locale: SuggestionLocale = language === "en" || language === "es" ? language : "fr";
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
      const localized = getLocalizedSuggestion(suggestion.label, locale);
      const prompt = localized?.prompt ?? suggestion.prompt;
      if (onSuggestionSelect) {
        onSuggestionSelect(prompt);
        return;
      }

      sendMessage({
        parts: [
          {
            text: prompt,
            type: "text",
          },
        ],
        role: "user",
      });
    },
    [locale, onSuggestionSelect, sendMessage]
  );

  const startLocalWorkspaceDemo = useCallback(() => {
    sendMessage({
      parts: [
        {
          text: locale === "en"
            ? "Launch the full Atelier Nord demo with a plan, agent squad, files, preview and local review."
            : locale === "es"
              ? "Inicia la demo completa de Atelier Nord con plan, equipo de agentes, archivos, vista previa y revisión local."
              : "Lance la démonstration complète d’Atelier Nord avec plan, escouade, fichiers, aperçu et revue locale.",
          type: "text",
        },
      ],
      role: "user",
    });
  }, [locale, sendMessage]);

  return (
    <section aria-labelledby="mission-start-title" className="flex w-full flex-col gap-3.5">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70" id="mission-start-title">
            {locale === "en" ? "Start here" : locale === "es" ? "Punto de partida" : "Point de départ"}
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
          {locale === "en" ? "Other ideas" : locale === "es" ? "Otras ideas" : "Autres idées"}
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
          {locale === "en" ? "Launch full demo" : locale === "es" ? "Iniciar demo completa" : "Ouvrir la démonstration complète"}
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
                className="group/card relative flex min-h-[104px] w-full flex-col justify-between rounded-xl border border-white/10 bg-card/20 p-3 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/50 hover:bg-card/50 hover:shadow-[0_12px_36px_rgba(139,92,246,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4.5"
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
                <div className="mt-2">
                  <h3 className="text-xs font-semibold tracking-tight text-foreground transition-colors group-hover/card:text-violet-300">
                    {getLocalizedSuggestion(entry.label, locale)?.label ?? entry.label}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground/75">
                    {getLocalizedSuggestion(entry.label, locale)?.description ?? entry.description}
                  </p>
                </div>

                {/* Bottom: Subtle arrow */}
                <div className="mt-1.5 flex items-center justify-end text-[10px] text-muted-foreground/50 transition-colors group-hover/card:text-violet-300">
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
