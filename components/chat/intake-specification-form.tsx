"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowRight, ClipboardList, X } from "lucide-react";

type IntakeSpecificationFormProps = {
  onCancel: () => void;
  onSubmit: (formattedBrief: string) => void;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/70";

export function IntakeSpecificationForm({
  onCancel,
  onSubmit,
}: IntakeSpecificationFormProps) {
  const id = useId();
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");
  const [features, setFeatures] = useState("");
  const [style, setStyle] = useState("Professionnel, simple et épuré");
  const [constraints, setConstraints] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedIdea = idea.trim();
    if (!trimmedIdea) {
      setError("Décris ton idée en une phrase pour commencer.");
      return;
    }

    const fields: Array<[string, string]> = [
      ["Idée", trimmedIdea],
      ["Public cible", audience.trim()],
      ["Résultat attendu", outcome.trim()],
      ["Fonctionnalités essentielles", features.trim()],
      ["Direction visuelle", style.trim()],
      ["Contraintes et intégrations", constraints.trim()],
    ];
    const brief = [
      "Je veux créer une application avec le cadrage suivant :",
      ...fields
        .filter(([, value]) => value.length > 0)
        .map(([label, value]) => `- ${label} : ${value}`),
      "",
      "À partir de ces informations, clarifie uniquement les ambiguïtés bloquantes, puis propose un plan d'exécution concret. Ne prétends pas qu'une intégration, une fonctionnalité ou un test fonctionne tant qu'il n'a pas été réellement vérifié. Privilégie une première version utilisable de bout en bout.",
    ].join("\n");

    setError("");
    onSubmit(brief);
  }

  return (
    <form
      className="mx-auto w-full max-w-2xl rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6"
      onSubmit={handleSubmit}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Cadrons ton idée
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Quelques détails utiles pour construire la bonne application dès le départ.
            </p>
          </div>
        </div>
        <button
          aria-label="Fermer le cadrage"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor={`${id}-idea`}>
            Quelle application veux-tu créer ?
            <span className="ml-1 text-destructive" aria-hidden="true">*</span>
          </label>
          <textarea
            autoComplete="off"
            className={fieldClass}
            id={`${id}-idea`}
            maxLength={4000}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Ex. : une plateforme où les écoles gèrent les élèves, les paiements et les résultats…"
            required
            rows={3}
            value={idea}
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Une phrase suffit pour commencer.</span>
            <span>{idea.length}/4000</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor={`${id}-audience`}>
              Pour qui ?
            </label>
            <input
              className={fieldClass}
              id={`${id}-audience`}
              maxLength={240}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Ex. : parents et écoles"
              value={audience}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor={`${id}-outcome`}>
              Quel résultat doit-elle apporter ?
            </label>
            <input
              className={fieldClass}
              id={`${id}-outcome`}
              maxLength={300}
              onChange={(event) => setOutcome(event.target.value)}
              placeholder="Ex. : suivre les paiements en temps réel"
              value={outcome}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor={`${id}-features`}>
            Les fonctionnalités indispensables
          </label>
          <textarea
            className={fieldClass}
            id={`${id}-features`}
            maxLength={1200}
            onChange={(event) => setFeatures(event.target.value)}
            placeholder="Ex. : connexion, tableau de bord, recherche, export PDF…"
            rows={2}
            value={features}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor={`${id}-style`}>
              Quel style visuel ?
            </label>
            <select
              className={fieldClass}
              id={`${id}-style`}
              onChange={(event) => setStyle(event.target.value)}
              value={style}
            >
              <option>Professionnel, simple et épuré</option>
              <option>Éditorial et élégant</option>
              <option>Coloré et énergique</option>
              <option>Minimaliste, inspiré des outils développeurs</option>
              <option>Chaleureux et accessible</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor={`${id}-constraints`}>
              Contraintes ou intégrations
            </label>
            <input
              className={fieldClass}
              id={`${id}-constraints`}
              maxLength={500}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Ex. : mobile d'abord, Supabase, GitHub…"
              value={constraints}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Les champs facultatifs peuvent rester vides.
        </p>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          type="submit"
        >
          Continuer avec ce cadrage
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}
