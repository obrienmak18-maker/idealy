"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";

type MissionActivityState = "building" | "reviewing" | "correcting";

type MultiAgentRelayProps = {
  currentAgentName: string;
  currentAgentRole: string;
  currentAgentAvatar?: string;
  currentWay: string;
  filesCount: number;
  activityState: MissionActivityState;
};

const wayLabels: Record<string, Record<string, string>> = {
  hunter: { fr: "Hunter", en: "Hunter", es: "Hunter" },
  mage: { fr: "Mage", en: "Mage", es: "Mago" },
  ninja: { fr: "Ninja", en: "Ninja", es: "Ninja" },
  professional: { fr: "Pro", en: "Pro", es: "Pro" },
};

const copy = {
  fr: {
    building: "Construit l’application",
    reviewing: "Vérifie le résultat",
    correcting: "Améliore un point détecté",
    preparing: "Prépare la prochaine étape",
    details: "Détails",
    hide: "Réduire",
    active: "En cours",
    files: (count: number) => `${count} fichier${count > 1 ? "s" : ""} prêt${count > 1 ? "s" : ""}`,
    team: "L’escouade continue le travail. Vous pouvez poursuivre la discussion.",
    role: "Étape actuelle",
  },
  en: {
    building: "Building the app",
    reviewing: "Checking the result",
    correcting: "Improving a detected issue",
    preparing: "Preparing the next step",
    details: "Details",
    hide: "Collapse",
    active: "In progress",
    files: (count: number) => `${count} file${count === 1 ? "" : "s"} ready`,
    team: "The squad keeps working while you continue the conversation.",
    role: "Current step",
  },
  es: {
    building: "Construyendo la aplicación",
    reviewing: "Verificando el resultado",
    correcting: "Mejorando un problema detectado",
    preparing: "Preparando el siguiente paso",
    details: "Detalles",
    hide: "Contraer",
    active: "En curso",
    files: (count: number) => `${count} archivo${count === 1 ? "" : "s"} listo${count === 1 ? "" : "s"}`,
    team: "El equipo sigue trabajando mientras continúas la conversación.",
    role: "Paso actual",
  },
} as const;

export function MultiAgentRelay({
  activityState,
  currentAgentName,
  currentAgentRole,
  currentAgentAvatar,
  currentWay,
  filesCount,
}: MultiAgentRelayProps) {
  const [expanded, setExpanded] = useState(false);
  const [liveSquad, setLiveSquad] = useState<{
    squad?: string;
    objective?: string;
    agents?: Array<{ name: string; role: string; status: string; task?: string }>;
  } | null>(null);

  useEffect(() => {
    const handleSubAgents = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLiveSquad(customEvent.detail);
      }
    };
    window.addEventListener("idealy:subagents-updated", handleSubAgents);
    return () =>
      window.removeEventListener("idealy:subagents-updated", handleSubAgents);
  }, []);
  const { language: activeLanguage } = useTranslation();
  const language = activeLanguage === "en" || activeLanguage === "es" ? activeLanguage : "fr";
  const text = copy[language];
  const agentName = currentAgentName.trim() || "Idealy";
  const label = currentAgentName.trim() ? text[activityState] : text.preparing;
  const wayLabel = wayLabels[currentWay]?.[language] ?? "Idealy";

  return (
    <motion.section
      aria-label={`${agentName}: ${label}`}
      aria-live="polite"
      className="my-1 w-full max-w-2xl overflow-hidden"
      data-testid="multi-agent-live-status"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-center gap-2 px-1 py-1">
        <div className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/8 text-primary">
          {currentAgentAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentAgentAvatar} alt="" className="size-full object-cover" />
          ) : (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          <span className="absolute bottom-0 right-0 size-1.5 rounded-full border border-background bg-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-foreground/90">{agentName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-border/60 bg-background/65 px-2 py-1 text-[10px] text-muted-foreground sm:inline-flex">
          {wayLabel}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
          {text.active}
        </span>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={expanded ? text.hide : text.details}
        >
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
              <p className="font-medium text-foreground/80">{text.role}</p>
              <p>{currentAgentRole || label}</p>
              {filesCount > 0 ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check aria-hidden="true" className="size-3" /> {text.files(filesCount)}
                </p>
              ) : null}
              {liveSquad?.agents && liveSquad.agents.length > 0 ? (
                <div className="mt-2.5 pt-2 border-t border-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                    Sous-agents mobilisés en parallèle
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {liveSquad.agents.map((ag) => (
                      <span
                        key={ag.name}
                        className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-foreground"
                      >
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {ag.name}
                        <span className="text-muted-foreground text-[9px]">({ag.role})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="mt-1.5">{text.team}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
