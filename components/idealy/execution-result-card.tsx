import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ExecutionResultCardProps = {
  status: "running" | "completed" | "failed" | "needs-input";
  title: string;
  summary: string;
  changedFiles?: number;
  checksPassed?: number;
  warnings?: number;
  details?: ReactNode;
};

export function ExecutionResultCard({
  status,
  title,
  summary,
  changedFiles,
  checksPassed,
  warnings,
  details,
}: ExecutionResultCardProps) {
  const icon =
    status === "completed" ? <CheckCircle2 className="size-4 text-emerald-500" /> :
    status === "failed" || status === "needs-input" ? <CircleAlert className="size-4 text-amber-500" /> :
    <Loader2 className="size-4 animate-spin text-muted-foreground" />;

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{title}</h3>
            <span className={cn("text-xs", status === "completed" ? "text-emerald-600" : "text-muted-foreground")}>
              {status === "completed" ? "Vérifié" : status === "failed" ? "À corriger" : status === "needs-input" ? "Action requise" : "En cours"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
          {(changedFiles !== undefined || checksPassed !== undefined || warnings !== undefined) && (
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {changedFiles !== undefined && <div><dt className="inline">Fichiers : </dt><dd className="inline font-medium text-foreground">{changedFiles}</dd></div>}
              {checksPassed !== undefined && <div><dt className="inline">Checks : </dt><dd className="inline font-medium text-foreground">{checksPassed}</dd></div>}
              {warnings !== undefined && <div><dt className="inline">Avertissements : </dt><dd className="inline font-medium text-foreground">{warnings}</dd></div>}
            </dl>
          )}
          {details && <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Voir les détails</summary><div className="mt-2">{details}</div></details>}
        </div>
      </div>
    </section>
  );
}
