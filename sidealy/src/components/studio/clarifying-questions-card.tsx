import { Send, Sparkles, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";

export interface ClarifyingQuestionData {
  context?: string;
  id: string;
  options: string[];
  question: string;
}

export const ClarifyingQuestionsCard: React.FC = () => {
  const { sendMessage } = useApp();
  const [activeQuestion, setActiveQuestion] =
    useState<ClarifyingQuestionData | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if an event was dispatched or if the last assistant message contains clarifying questions
  useEffect(() => {
    const handleClarificationEvent = (
      e: CustomEvent<ClarifyingQuestionData>
    ) => {
      if (e.detail?.question && Array.isArray(e.detail?.options)) {
        setActiveQuestion(e.detail);
        setSelectedOption(null);
        setCustomText("");
      }
    };

    window.addEventListener(
      "idealy:ask-clarification" as unknown as keyof WindowEventMap,
      handleClarificationEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "idealy:ask-clarification" as unknown as keyof WindowEventMap,
        handleClarificationEvent as EventListener
      );
    };
  }, []);

  const handleSubmitOption = useCallback(
    async (optionIndex: number) => {
      if (!activeQuestion || isSubmitting) {
        return;
      }
      const choice = activeQuestion.options[optionIndex];
      if (!choice) {
        return;
      }

      setIsSubmitting(true);
      try {
        await sendMessage(`Option choisie : ${choice}`);
        setActiveQuestion(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeQuestion, isSubmitting, sendMessage]
  );

  const handleSubmitCustom = useCallback(async () => {
    if (!activeQuestion || !customText.trim() || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await sendMessage(`Réponse personnalisée : ${customText.trim()}`);
      setActiveQuestion(null);
      setCustomText("");
    } finally {
      setIsSubmitting(false);
    }
  }, [activeQuestion, customText, isSubmitting, sendMessage]);

  const handleDismiss = useCallback(() => setActiveQuestion(null), []);

  const handleCustomTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomText(e.target.value);
    },
    []
  );

  const handleCustomKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && customText.trim()) {
        e.preventDefault();
        handleSubmitCustom();
      }
    },
    [customText, handleSubmitCustom]
  );

  // Keyboard navigation: 1-9 for options, Enter to submit
  useEffect(() => {
    if (!activeQuestion) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const num = Number.parseInt(e.key, 10);
      if (
        !Number.isNaN(num) &&
        num >= 1 &&
        num <= activeQuestion.options.length
      ) {
        e.preventDefault();
        setSelectedOption(num - 1);
      } else if (e.key === "Enter" && selectedOption !== null) {
        e.preventDefault();
        handleSubmitOption(selectedOption);
      } else if (e.key === "Escape") {
        setActiveQuestion(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeQuestion, selectedOption, handleSubmitOption]);

  if (!activeQuestion) {
    return null;
  }

  return (
    <section
      aria-label="Clarification requise par l'agent"
      className="mx-auto w-full max-w-3xl px-3 sm:px-4 mb-2 animate-fade-in"
    >
      <div className="relative rounded-2xl border border-[var(--idealy-teal-petrol)]/40 bg-[var(--dsw-alias-bg-layer-2)]/95 p-3.5 sm:p-4 shadow-elevated backdrop-blur-md">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)]">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
              Précision nécessaire pour votre projet
            </span>
          </div>

          <button
            aria-label="Ignorer la question"
            className="grid h-6 w-6 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
            onClick={handleDismiss}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs sm:text-[13px] font-medium leading-snug text-[var(--dsw-alias-label-primary)] mb-3">
          {activeQuestion.question}
        </p>

        {/* Options list */}
        <div className="space-y-1.5 mb-3">
          {activeQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all focus-ring ${
                  isSelected
                    ? "border border-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)]/30 text-[var(--dsw-alias-label-primary)] shadow-xs"
                    : "border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] text-[var(--dsw-alias-label-secondary)] hover:border-[var(--idealy-teal-petrol)]/40 hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
                }`}
                disabled={isSubmitting}
                key={option}
                onClick={() => {
                  setSelectedOption(idx);
                  handleSubmitOption(idx);
                }}
                type="button"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] text-[10px] font-semibold text-[var(--dsw-alias-label-tertiary)] group-hover:text-[var(--idealy-teal-petrol)]">
                    {idx + 1}
                  </span>
                  <span className="truncate">{option}</span>
                </div>
                <span className="text-[10px] text-[var(--dsw-alias-label-caption)] group-hover:text-[var(--idealy-teal-petrol)]">
                  Entrée ↵
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom text alternative */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--dsw-alias-border-l1)]">
          <input
            className="flex-1 rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] px-2.5 py-1.5 text-xs text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] focus:border-[var(--idealy-teal-petrol)] focus:outline-none"
            onChange={handleCustomTextChange}
            onKeyDown={handleCustomKeyDown}
            placeholder="Autre précision personnalisée…"
            type="text"
            value={customText}
          />
          <button
            aria-label="Envoyer la réponse personnalisée"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--idealy-teal-petrol)] text-white disabled:opacity-30 transition-all hover:opacity-90 active:scale-95"
            disabled={!customText.trim() || isSubmitting}
            onClick={handleSubmitCustom}
            type="button"
          >
            <Send aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
