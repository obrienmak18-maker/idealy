"use client";

import { useState } from "react";
import { Check, ChevronRight, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanOption = {
  title: string;
  description: string;
};

type PlanChoicesProps = {
  options: PlanOption[];
  onSelectOption: (option: PlanOption) => void;
};

const CHOICE_SECTION =
  /(?:choisis(?:sez)?\s+(?:la\s+)?direction|quelle\s+(?:option|direction)|options?\s+(?:possibles|proposées|à considérer)|directions?\s+(?:possibles|proposées)|propositions?\s+(?:possibles|de direction)?|approches?\s+(?:possibles|proposées)|voici\s+(?:\d+\s+)?(?:options|directions|approches|pistes)|je\s+te\s+propose\s+(?:deux|trois|plusieurs)\s+(?:options|directions|approches|pistes))/i;

function cleanMarkdown(value: string) {
  return value
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\x60([\s\S]*?)\x60/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOptionTitle(line: string): {
  title: string;
  inlineDescription: string;
} | null {
  const numbered = line.match(/^\s*(?:[-*+]\s*)?(?:\d{1,2}[.)]|[A-Da-d][.)])\s+(.+?)\s*$/);
  if (!numbered) return null;

  const value = cleanMarkdown(numbered[1])
    .replace(/\s*\[[ xX]\]\s*/g, " ")
    .trim();
  const split = value.match(/^(.{3,90}?)\s+(?:—|–|:\s*|\s-\s)\s*(.{8,})$/);
  if (split) {
    return { title: split[1].trim(), inlineDescription: split[2].trim() };
  }

  return { title: value.replace(/[.:]+$/, "").trim(), inlineDescription: "" };
}

/**
 * Only turns a numbered list into selectable cards when the assistant clearly
 * introduced it as a set of alternatives. Ordinary numbered instructions are
 * left as normal conversation text.
 */
export function textBeforePlanOptions(text: string): string {
  const lines = text.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) =>
    CHOICE_SECTION.test(cleanMarkdown(line))
  );
  return sectionIndex < 0 ? text : lines.slice(0, sectionIndex).join("\n").trim();
}

export function extractPlanOptionsFromText(text: string): PlanOption[] | null {
  const lines = text.split(/\r?\n/);
  const sectionIndex = lines.findIndex((line) => CHOICE_SECTION.test(cleanMarkdown(line)));
  if (sectionIndex < 0) return null;

  const options: PlanOption[] = [];
  let active: PlanOption | null = null;
  let contentStarted = false;

  const flush = () => {
    if (
      active &&
      active.title.length >= 3 &&
      active.description.length >= 8 &&
      !options.some((option) => option.title.toLowerCase() === active?.title.toLowerCase())
    ) {
      options.push(active);
    }
    active = null;
  };

  for (const rawLine of lines.slice(sectionIndex + 1)) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (active?.description) contentStarted = true;
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed) && options.length >= 2) break;

    const parsed = parseOptionTitle(rawLine);
    if (parsed) {
      flush();
      active = {
        description: parsed.inlineDescription,
        title: parsed.title,
      };
      contentStarted = Boolean(parsed.inlineDescription);
      if (options.length >= 4) break;
      continue;
    }

    if (!active) {
      // Skip explanatory prose between the section heading and first option.
      continue;
    }

    const textLine = cleanMarkdown(trimmed.replace(/^[-*+]\s+/, ""));
    if (!textLine || /^choix recommandé\s*:/i.test(textLine)) continue;
    if (active.description.length === 0) {
      active.description = textLine;
    } else if (!contentStarted || active.description.length < 260) {
      active.description = `${active.description} ${textLine}`;
    }
    contentStarted = true;

    if (active.description.length > 420) {
      flush();
      if (options.length >= 2) break;
    }
  }

  flush();
  return options.length >= 2 ? options.slice(0, 4) : null;
}

export function PlanChoices({ options, onSelectOption }: PlanChoicesProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const selected = selectedIndex === null ? null : options[selectedIndex];
  const isConfirmed = confirmedIndex !== null;

  if (options.length < 2) return null;

  return (
    <section
      aria-label="Choisir une direction pour le projet"
      className="my-3 w-full max-w-2xl rounded-2xl border border-border/70 bg-card p-3 shadow-sm sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles aria-hidden="true" className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">Quelle direction préfères-tu ?</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sélectionne une proposition pour la relire, puis valide ton choix.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "group flex min-h-28 w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/70 bg-background hover:border-primary/50 hover:bg-muted/40"
              )}
              key={`${option.title}-${index}`}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground">
                {isSelected ? (
                  <Check aria-hidden="true" className="size-4 text-primary" />
                ) : (
                  <Circle aria-hidden="true" className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5 text-foreground">
                  {option.title}
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                  isSelected && "translate-x-0.5 text-primary"
                )}
              />
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2.5" aria-live="polite">
          <p className="text-xs font-medium text-foreground">Direction sélectionnée</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {selected.title} — {selected.description}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <span className="text-xs text-muted-foreground">
          {isConfirmed
            ? "Ce choix a été envoyé une seule fois."
            : selected
              ? `${selectedIndex! + 1} sur ${options.length} sélectionnée`
              : `${options.length} propositions`}
        </span>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={!selected || isConfirmed}
          onClick={() => {
            if (!selected || isConfirmed) return;
            setConfirmedIndex(selectedIndex);
            onSelectOption(selected);
          }}
          type="button"
        >
          {isConfirmed ? "Choix envoyé" : "Valider ce choix"}
          <Check aria-hidden="true" className="size-4" />
        </button>
      </div>
    </section>
  );
}
