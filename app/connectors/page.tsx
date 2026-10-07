"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Database,
  ExternalLink,
  Github,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import { IdealyMark } from "@/components/branding/idealy-logo";
import { connectorCatalog } from "@/lib/idealy/connectors";

const filters = [
  { id: "all", label: "Tous" },
  { id: "code", label: "Développement" },
  { id: "design", label: "Design" },
  { id: "data", label: "Données" },
  { id: "deploy", label: "Déploiement" },
  { id: "communication", label: "Communication" },
  { id: "billing", label: "Facturation" },
] as const;

const brandColors: Record<string, string> = {
  github: "#f0f0f0",
  supabase: "#3ecf8e",
  stripe: "#635bff",
  vercel: "#f5f5f5",
  figma: "#f24e1e",
  slack: "#36c5f0",
  canva: "#7d2ae8",
  notion: "#f5f5f5",
  "google-drive": "#34a853",
};

const orbitIds = ["github", "figma", "supabase", "stripe", "vercel", "slack"];
const orbitPositions = [
  { x: 50, y: 8 },
  { x: 81, y: 24 },
  { x: 81, y: 76 },
  { x: 50, y: 92 },
  { x: 19, y: 76 },
  { x: 19, y: 24 },
];

function BrandMark({ id, size = 22 }: { id: string; size?: number }) {
  const color = brandColors[id] ?? "currentColor";
  if (id === "github") {
    return <Github size={size} strokeWidth={1.8} aria-hidden="true" />;
  }
  if (id === "supabase") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13.4 2.5c.5-.7 1.6-.3 1.6.6v6.2h5.2c1 0 1.5 1.1.9 1.9l-9.2 10.3c-.6.7-1.7.2-1.7-.7v-6H5.1c-1 0-1.5-1.1-.9-1.9L13.4 2.5Z" fill={color} />
      </svg>
    );
  }
  if (id === "stripe") {
    return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill={color} d="M13.6 9.1c-1.8-.7-2.8-1.1-2.8-1.8 0-.6.5-.9 1.4-.9 1.6 0 3.2.6 4.8 1.5V3.4a12.5 12.5 0 0 0-4.8-.9c-4.1 0-6.8 2.1-6.8 5.5 0 5.3 7.3 4.5 7.3 6.8 0 .7-.6 1.1-1.7 1.1-1.5 0-3.8-.7-5.5-1.8v4.6a14 14 0 0 0 5.5 1.2c4.2 0 7-2.1 7-5.7 0-5.7-7.3-4.9-7.3-7.1Z" /></svg>;
  }
  if (id === "vercel") {
    return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill={color} d="M12 3 23 21H1L12 3Z" /></svg>;
  }
  if (id === "figma") {
    return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="#f24e1e" d="M12 12a4 4 0 1 1 4-4h-4v4Z"/><path fill="#ff7262" d="M8 4h4v8H8a4 4 0 1 1 0-8Z"/><path fill="#a259ff" d="M8 12h4v4a4 4 0 1 1-4-4Z"/><path fill="#1abcfe" d="M12 12h4a4 4 0 1 1-4 4v-4Z"/><path fill="#0acf83" d="M12 4h4a4 4 0 1 1-4 4V4Z"/></svg>;
  }
  if (id === "slack") {
    return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="#36c5f0" d="M9.2 14.4a1.8 1.8 0 1 1-1.8-1.8h1.8v1.8Zm.9 0a1.8 1.8 0 1 1 3.6 0v4.5a1.8 1.8 0 1 1-3.6 0v-4.5Z"/><path fill="#2eb67d" d="M11.9 9.2a1.8 1.8 0 1 1 1.8-1.8v1.8h-1.8Zm0 .9a1.8 1.8 0 1 1 0 3.6H7.4a1.8 1.8 0 1 1 0-3.6h4.5Z"/><path fill="#ecb22e" d="M14.6 11.9a1.8 1.8 0 1 1 1.8 1.8h-1.8v-1.8Zm-.9 0a1.8 1.8 0 1 1-3.6 0V7.4a1.8 1.8 0 1 1 3.6 0v4.5Z"/><path fill="#e01e5a" d="M12 14.6a1.8 1.8 0 1 1-1.8 1.8v-1.8H12Zm0-.9a1.8 1.8 0 1 1 0-3.6h4.5a1.8 1.8 0 1 1 0 3.6H12Z"/></svg>;
  }
  if (id === "canva") {
    return <span className="font-semibold tracking-tight" style={{ color, fontSize: size * 0.95 }}>C</span>;
  }
  if (id === "notion") {
    return <span className="font-bold tracking-tight" style={{ color, fontSize: size * 0.82 }}>N</span>;
  }
  if (id === "google-drive") {
    return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="#00832d" d="m8.2 3.2 4.1 0-7.1 12.3-2.1 3.7L1 15.6Z"/><path fill="#0066da" d="M5.2 15.5h14.2l-2.1 3.7H3.1Z"/><path fill="#ffba00" d="M12.3 3.2h4.2L24 16.1l-2.1 3.7Z"/></svg>;
  }
  return <Layers3 size={size} strokeWidth={1.7} aria-hidden="true" />;
}

export default function ConnectorsPage() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const visibleConnectors = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return connectorCatalog.filter((connector) => {
      const matchesFilter = activeFilter === "all" || connector.category === activeFilter;
      const matchesQuery = !normalized || [connector.label, connector.description, connector.category].some((value) => value.toLowerCase().includes(normalized));
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const selectedConnector = connectorCatalog.find((connector) => connector.id === selected);
  const configuredCount = connectorCatalog.filter((connector) => connector.availability === "configured").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-border/70 px-4 py-5 lg:flex">
          <a href="/chat" className="mb-9 flex items-center gap-2.5 px-2">
            <IdealyMark size={29} animated={false} />
            <span className="text-[17px] font-semibold tracking-tight">idealy</span>
            <span className="ml-auto rounded-md border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[.14em] text-muted-foreground">Studio</span>
          </a>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1">
            <a href="/chat" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><Command size={16} /> Studio</a>
            <a href="/connectors" aria-current="page" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-medium text-foreground"><Workflow size={16} /> Connecteurs <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /></a>
            <a href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"><Database size={16} /> Paramètres</a>
          </nav>
          <div className="mt-auto rounded-xl border border-border/70 bg-muted/30 p-3.5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium"><ShieldCheck size={15} className="text-emerald-500" /> Accès maîtrisés</div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Vos autorisations restent limitées aux ressources que vous choisissez.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-[62px] items-center justify-between border-b border-border/70 px-5 sm:px-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Workspace</span><span className="text-border">/</span><span className="text-foreground">Connecteurs</span></div>
            <div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">Écosystème Idealy</span><div className="flex size-8 items-center justify-center rounded-full border border-border bg-muted/50"><CircleHelp size={15} /></div></div>
          </header>

          <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.13em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> Idealy ecosystem</div>
                <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-[38px]">Tout votre stack. <span className="text-muted-foreground">Un seul espace.</span></h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Reliez vos outils à Idealy pour donner du contexte à vos idées et transformer vos projets en logiciels.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-3.5 py-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><Check size={16} /></span>
                <div><div className="text-sm font-semibold">{configuredCount} intégrations configurées</div><div className="text-[11px] text-muted-foreground">sur {connectorCatalog.length} disponibles au catalogue</div></div>
              </div>
            </div>

            <section className="relative mb-10 overflow-hidden rounded-2xl border border-border/70 bg-card/30">
              <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--primary) / .11), transparent 43%), radial-gradient(hsl(var(--foreground) / .09) .7px, transparent .7px)", backgroundSize: "100% 100%, 18px 18px" }} />
              <div className="relative grid min-h-[320px] items-center gap-2 px-4 py-6 sm:min-h-[360px] sm:px-8 md:grid-cols-[1fr_1fr] md:gap-8">
                <div className="relative mx-auto aspect-square w-full max-w-[340px]">
                  <div className="absolute inset-[9%] rounded-full border border-dashed border-border/80" />
                  <div className="absolute inset-[20%] rounded-full border border-primary/20" />
                  <div className="absolute inset-[31%] rounded-full border border-border/70" />
                  <div className="absolute inset-[9%] animate-[spin_54s_linear_infinite] rounded-full border border-transparent border-t-primary/60 border-r-primary/20" />
                  <div className="absolute inset-[20%] animate-[spin_38s_linear_infinite_reverse] rounded-full border border-dashed border-primary/25" />
                  <div className="absolute left-1/2 top-1/2 flex size-[86px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[26px] border border-primary/25 bg-background/90 shadow-[0_0_65px_hsl(var(--primary)/.18)]">
                    <IdealyMark size={54} animated={false} />
                  </div>
                  {orbitIds.map((id, index) => {
                    const position = orbitPositions[index];
                    const connector = connectorCatalog.find((item) => item.id === id);
                    const available = connector?.availability === "configured";
                    return (
                      <button key={id} type="button" onClick={() => setSelected(id)} aria-label={`Détails : ${connector?.label ?? id}`} className={`absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border bg-background shadow-lg transition hover:scale-110 hover:border-primary/60 sm:size-12 ${available ? "border-emerald-500/40 shadow-emerald-500/10" : "border-border/90"}`} style={{ left: `${position.x}%`, top: `${position.y}%` }}>
                        <BrandMark id={id} size={21} />
                        {available && <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-background bg-emerald-500" />}
                      </button>
                    );
                  })}
                  <div className="absolute bottom-[1%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[.17em] text-muted-foreground">Your tools, connected</div>
                </div>
                <div className="mx-auto max-w-[390px] py-2 md:py-0">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary"><Sparkles size={14} /> L'écosystème en orbite</div>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Vos outils travaillent ensemble.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Chaque intégration ajoute une nouvelle capacité à votre workspace. Connectez vos outils essentiels et gardez le contrôle sur les accès accordés.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5 text-xs text-muted-foreground"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500" />Configuré</span>
                    <span className="rounded-full border border-border/70 bg-background/65 px-3 py-1.5 text-xs text-muted-foreground"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-muted-foreground/50" />À connecter</span>
                    <span className="rounded-full border border-dashed border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">Emplacements futurs</span>
                  </div>
                  <button type="button" onClick={() => document.getElementById("catalogue-connecteurs")?.scrollIntoView({ behavior: "smooth" })} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">Explorer les intégrations <ArrowUpRight size={15} /></button>
                </div>
              </div>
            </section>

            <section id="catalogue-connecteurs">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><h2 className="text-xl font-semibold tracking-tight">Catalogue des connecteurs</h2><p className="mt-1 text-sm text-muted-foreground">Choisissez les outils qui accompagnent votre workflow.</p></div>
                <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-border/80 bg-background px-3 sm:max-w-[260px]"><Search size={15} className="shrink-0 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un outil..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><kbd className="hidden rounded border border-border px-1 text-[10px] text-muted-foreground sm:inline">/</kbd></label>
              </div>
              <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
                {filters.map((filter) => <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${activeFilter === filter.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{filter.label}</button>)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleConnectors.map((connector) => {
                  const configured = connector.availability === "configured";
                  return (
                    <article key={connector.id} className="group rounded-xl border border-border/70 bg-card/40 p-4 transition hover:border-primary/35 hover:bg-card/80">
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground"><BrandMark id={connector.id} size={23} /></div>
                        <div className="min-w-0 flex-1 pt-0.5"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{connector.label}</h3><span className={`size-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-muted-foreground/40"}`} /><span className="text-[10px] text-muted-foreground">{configured ? "Configuré" : "Bientôt disponible"}</span></div><p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{connector.description}</p></div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                        <span className="text-[10px] uppercase tracking-[.12em] text-muted-foreground">{connector.category}</span>
                        <button type="button" onClick={() => setSelected(connector.id)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted">{configured ? "Voir les détails" : "En savoir plus"} <ArrowUpRight size={13} /></button>
                      </div>
                    </article>
                  );
                })}
                {visibleConnectors.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucun connecteur ne correspond à cette recherche.</div>}
              </div>
            </section>
            <footer className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Idealy Connectors · Contrôle des accès intégré</span><a href="https://github.com/obrienmak18-maker/idealy" className="inline-flex items-center gap-1.5 hover:text-foreground">Voir le projet <ExternalLink size={12} /></a></footer>
          </div>
        </section>
      </div>

      {selectedConnector && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="connector-detail-title" className="w-full max-w-md rounded-t-2xl border border-border bg-background p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card"><BrandMark id={selectedConnector.id} size={25} /></div><div><h2 id="connector-detail-title" className="font-semibold">{selectedConnector.label}</h2><p className="mt-0.5 text-xs text-muted-foreground">{selectedConnector.availability === "configured" ? "Intégration configurée" : "Intégration planifiée"}</p></div></div><button type="button" onClick={() => setSelected(null)} aria-label="Fermer" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={16} /></button></div>
            <p className="text-sm leading-6 text-muted-foreground">{selectedConnector.description}</p>
            <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-3.5"><div className="mb-2 flex items-center gap-2 text-xs font-medium"><ShieldCheck size={14} className="text-emerald-500" /> Périmètre d'accès</div><p className="text-xs leading-5 text-muted-foreground">{selectedConnector.dataBoundary === "user-selected-assets" ? "Accès limité aux ressources que vous sélectionnez et autorisez." : selectedConnector.dataBoundary === "server-managed" ? "Les autorisations sont gérées côté serveur, sans exposer les secrets au navigateur." : "Accès aux métadonnées uniquement."}</p></div>
            <div className="mt-4"><p className="mb-2 text-xs font-medium">Capacités prévues</p><ul className="space-y-2">{selectedConnector.operations.slice(0, 4).map((operation) => <li key={operation.id} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1 rounded-full bg-primary" />{operation.label}</li>)}</ul></div>
            <div className="mt-6 flex gap-2"><a href={selectedConnector.docsUrl} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium transition hover:bg-muted">Documentation <ExternalLink size={13} /></a><button type="button" onClick={() => setSelected(null)} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground">Terminé</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
