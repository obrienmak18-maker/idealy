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
    <div className="my-3 w-[min(100%,560px)] overflow-hidden rounded-2xl border border-white/10 bg-[#0f111a]/80 shadow-xl backdrop-blur-md text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {type === "chart" && <BarChart3 className="size-4 text-cyan-400" />}
          {type === "calculator" && <Calculator className="size-4 text-emerald-400" />}
          {type === "kpi_grid" && <TrendingUp className="size-4 text-sky-400" />}
          {type === "comparison" && <Sparkles className="size-4 text-amber-400" />}
          <span className="text-xs font-semibold tracking-tight text-white">{title}</span>
        </div>
        {subtitle && (
          <span className="text-[10px] text-zinc-400">{subtitle}</span>
        )}
      </div>

      <div className="p-4">
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
        color: typeof rec.color === "string" ? rec.color : "bg-cyan-500",
      };
    }
    return { label: "Item", value: 10, color: "bg-cyan-500" };
  });

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const pct = Math.round((item.value / maxValue) * 100);
        return (
          <div key={item.label + idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-zinc-200">{item.label}</span>
              <span className="text-zinc-400">{item.value}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.color.startsWith("bg-") ? item.color : "bg-cyan-500"
                }`}
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
        <div>
          <div className="flex justify-between text-xs text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Sliders className="size-3 text-emerald-400" /> Collaborateurs
            </span>
            <span className="font-semibold text-emerald-400">{users} pers.</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={users}
            onChange={(e) => setUsers(Number(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-emerald-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Sliders className="size-3 text-emerald-400" /> Heures sauvées / sem.
            </span>
            <span className="font-semibold text-emerald-400">{hoursSaved} h</span>
          </div>
          <input
            type="range"
            min={1}
            max={35}
            value={hoursSaved}
            onChange={(e) => setHoursSaved(Number(e.target.value))}
            className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400">Économie / mois</div>
          <div className="text-base font-bold text-white">
            {monthlySavings.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400">Gain annuel estimé</div>
          <div className="text-base font-bold text-emerald-400">
            {annualSavings.toLocaleString("fr-FR")} €
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiGrid({ data }: { data: Record<string, unknown> }) {
  const kpis = Array.isArray(data.kpis)
    ? (data.kpis as Array<{ label: string; value: string; trend?: string }>)
    : [
        { label: "Temps de réponse", value: "< 240 ms", trend: "-45%" },
        { label: "Précision de code", value: "99.4%", trend: "+12%" },
        { label: "Économie de tokens", value: "3.2x", trend: "+68%" },
      ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center"
        >
          <div className="text-[10px] text-zinc-400 truncate">{kpi.label}</div>
          <div className="mt-1 text-sm font-bold text-white">{kpi.value}</div>
          {kpi.trend && (
            <div className="mt-0.5 text-[9px] font-semibold text-sky-400">
              {kpi.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ data }: { data: Record<string, unknown> }) {
  const rows = Array.isArray(data.rows)
    ? (data.rows as Array<{ feature: string; standard: boolean; idealy: boolean }>)
    : [
        { feature: "Multi-Agents Coordonnés", standard: false, idealy: true },
        { feature: "Mode Vocal Temps Réel", standard: false, idealy: true },
        { feature: "Gestion Budgets 1M Tokens", standard: false, idealy: true },
        { feature: "Système de Design Ciselé", standard: false, idealy: true },
      ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 text-xs">
      <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 p-2 font-semibold text-zinc-300">
        <div>Fonctionnalité</div>
        <div className="text-center text-zinc-400">Standard</div>
        <div className="text-center text-cyan-400">Idealy</div>
      </div>
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="grid grid-cols-3 border-b border-white/5 p-2 last:border-0 hover:bg-white/5 transition-colors"
        >
          <div className="text-zinc-200">{row.feature}</div>
          <div className="text-center text-zinc-500">
            {row.standard ? <Check className="inline size-3.5 text-zinc-400" /> : "—"}
          </div>
          <div className="text-center text-cyan-400">
            {row.idealy ? <Check className="inline size-3.5 text-cyan-400 font-bold" /> : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
