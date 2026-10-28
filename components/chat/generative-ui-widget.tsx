"use client";

import { useState } from "react";
import { BarChart3, Calculator, Check, TrendingUp, Sparkles, Sliders } from "lucide-react";

export type GenerativeUIWidgetProps = {
  type: "chart" | "calculator" | "kpi_grid" | "comparison" | string;
  title: string;
  subtitle?: string;
  data: Record<string, unknown>;
};

export function GenerativeUIWidget({
  type,
  title,
  subtitle,
  data,
}: GenerativeUIWidgetProps) {
  return (
    <div className="w-[min(100%,560px)] overflow-hidden rounded-xl border border-border/60 bg-card/65 shadow-xs backdrop-blur-xs">
      <div className="flex items-center justify-between border-b border-border/50 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {type === "chart" && <BarChart3 className="size-4 text-primary" />}
          {type === "calculator" && <Calculator className="size-4 text-emerald-500" />}
          {type === "kpi_grid" && <TrendingUp className="size-4 text-sky-500" />}
          {type === "comparison" && <Sparkles className="size-4 text-amber-500" />}
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        )}
      </div>

      <div className="p-3.5">
        {type === "chart" && <InteractiveChart data={data} />}
        {type === "calculator" && <InteractiveCalculator data={data} />}
        {type === "kpi_grid" && <KpiGrid data={data} />}
        {type === "comparison" && <ComparisonTable data={data} />}
      </div>
    </div>
  );
}

function InteractiveChart({ data }: { data: Record<string, unknown> }) {
  const rawItems = Array.isArray(data.items)
    ? data.items
    : [
        { label: "Frontend", value: 45 },
        { label: "Backend API", value: 30 },
        { label: "Design System", value: 15 },
        { label: "Tests & QA", value: 10 },
      ];

  const items = rawItems.map((item: unknown) => {
    if (typeof item === "object" && item !== null) {
      const rec = item as Record<string, unknown>;
      return {
        label: String(rec.label || "Catégorie"),
        value: Number(rec.value || 0),
        color: typeof rec.color === "string" ? rec.color : "bg-primary",
      };
    }
    return { label: "Item", value: 10, color: "bg-primary" };
  });

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const pct = Math.round((item.value / maxValue) * 100);
        return (
          <div key={item.label + idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{item.value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.color.startsWith("bg-") ? item.color : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InteractiveCalculator({ data }: { data: Record<string, unknown> }) {
  const [users, setUsers] = useState<number>(Number(data.defaultUsers || 10));
  const [hoursSaved, setHoursSaved] = useState<number>(
    Number(data.defaultHours || 8)
  );
  const hourlyRate = Number(data.hourlyRate || 50);

  const monthlySavings = users * hoursSaved * 4 * hourlyRate;
  const annualSavings = monthlySavings * 12;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sliders className="size-3" /> Membres d&apos;équipe
            </span>
            <span className="font-bold text-foreground">{users}</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sliders className="size-3" /> Heures économisées / semaine
            </span>
            <span className="font-bold text-foreground">{hoursSaved}h</span>
          </div>
          <input
            type="range"
            min="1"
            max="40"
            value={hoursSaved}
            onChange={(e) => setHoursSaved(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-background/50 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Économie Mensuelle
          </p>
          <p className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
            {monthlySavings.toLocaleString("fr-FR")} €
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Économie Annuelle
          </p>
          <p className="mt-0.5 text-base font-bold text-foreground">
            {annualSavings.toLocaleString("fr-FR")} €
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiGrid({ data }: { data: Record<string, unknown> }) {
  const rawKpis = Array.isArray(data.kpis)
    ? data.kpis
    : [
        { label: "Temps de build", value: "1.2s", change: "-42%" },
        { label: "Score Performance", value: "98/100", change: "+12%" },
        { label: "Composants React", value: "18", change: "Modulaires" },
      ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {rawKpis.map((kpi: unknown, idx: number) => {
        const rec = (typeof kpi === "object" && kpi !== null ? kpi : {}) as Record<string, unknown>;
        return (
          <div
            key={idx}
            className="rounded-lg border border-border/40 bg-background/40 p-2.5 text-center"
          >
            <p className="text-[10px] text-muted-foreground">{String(rec.label || "KPI")}</p>
            <p className="mt-1 text-sm font-bold text-foreground">{String(rec.value || "0")}</p>
            {Boolean(rec.change) && (
              <span className="mt-0.5 inline-block text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                {String(rec.change)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComparisonTable({ data }: { data: Record<string, unknown> }) {
  const features = Array.isArray(data.features)
    ? data.features
    : [
        { name: "Mode Multi-Agents", idealy: true, traditional: false },
        { name: "Arborescence Dynamique", idealy: true, traditional: false },
        { name: "Recherche Web Exa", idealy: true, traditional: false },
        { name: "Persistance Firestore Live", idealy: true, traditional: true },
      ];

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 text-xs">
      <div className="grid grid-cols-3 border-b border-border/50 bg-muted/40 p-2 font-semibold">
        <span>Fonctionnalité</span>
        <span className="text-center text-primary">Idealy Studio</span>
        <span className="text-center text-muted-foreground">Standard</span>
      </div>
      <div className="divide-y divide-border/40 bg-background/30">
        {features.map((f: unknown, i: number) => {
          const rec = (typeof f === "object" && f !== null ? f : {}) as Record<string, unknown>;
          return (
            <div key={i} className="grid grid-cols-3 p-2 items-center">
              <span className="text-muted-foreground">{String(rec.name || "Feature")}</span>
              <span className="flex justify-center text-emerald-500">
                {rec.idealy ? <Check className="size-4" /> : "—"}
              </span>
              <span className="flex justify-center text-muted-foreground/60">
                {rec.traditional ? <Check className="size-4" /> : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
