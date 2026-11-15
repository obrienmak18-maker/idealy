import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  Code2,
  Compass,
  FileCheck2,
  Gauge,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { IdealyLogo } from "../branding/IdealyLogo";
import { alvinMessenger, voiesCatalog, type WayDetailed } from "../../services/voies-catalog";

type WayKey = "ninja" | "mage" | "hunter" | "professional";

const WAY_KEYS: WayKey[] = ["ninja", "mage", "hunter", "professional"];

const PRODUCT_STEPS = [
  {
    number: "01",
    icon: Compass,
    title: "Clarifier",
    description:
      "Transformez votre idée en mission claire : objectifs, périmètre et décisions importantes sont posés avant la construction.",
  },
  {
    number: "02",
    icon: Code2,
    title: "Construire",
    description:
      "Suivez votre Voie, les agents mobilisés, les fichiers créés et l’avancement de la mission dans un seul workspace.",
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Vérifier et livrer",
    description:
      "Inspectez le code, testez l’aperçu, ajustez le résultat puis préparez l’export ou le déploiement.",
  },
];

const BETA_PILLARS = [
  {
    icon: Rocket,
    title: "Un espace pour commencer",
    description:
      "Explorez le workspace, décrivez un besoin et découvrez comment Idealy transforme une intention en mission structurée.",
  },
  {
    icon: Gauge,
    title: "Une consommation lisible",
    description:
      "Les Power Points représentent les ressources utilisées par les missions. La consommation dépend du périmètre et de la complexité du travail.",
  },
  {
    icon: ShieldCheck,
    title: "Une bêta sans paiement",
    description:
      "L’accès d’évaluation ne demande pas de carte bancaire. Les conditions des abonnements seront précisées avant l’activation des paiements.",
  },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export const WelcomePage: React.FC = () => {
  const { setActivePage } = useApp();
  const [selectedWay, setSelectedWay] = useState<WayKey>("mage");
  const activeWay: WayDetailed = voiesCatalog[selectedWay] ?? voiesCatalog.mage;

  const beginWithSelectedWay = () => {
    try {
      // This is only an onboarding preference, never an authentication flag.
      window.localStorage.setItem("idealy_preferred_way", selectedWay);
    } catch {
      // The onboarding screen can still use its default when storage is unavailable.
    }
    setActivePage("login");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090c13] text-white selection:bg-violet-400/30">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-56 top-20 h-[560px] w-[560px] rounded-full bg-sky-500/[0.08] blur-[140px]" />
        <div className="absolute -right-48 top-[540px] h-[620px] w-[620px] rounded-full bg-violet-500/[0.09] blur-[150px]" />
        <div className="absolute left-1/2 top-[1180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-orange-400/[0.045] blur-[145px]" />
        <div className="welcome-grid absolute inset-0 opacity-[0.16]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090c13]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <button
            aria-label="Retour à l’accueil Idealy"
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            type="button"
          >
            <IdealyLogo animated={false} size={36} />
          </button>

          <nav aria-label="Navigation principale" className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 md:flex">
            <button className="rounded-full px-4 py-2 text-[13px] text-white/65 transition hover:bg-white/[0.07] hover:text-white" onClick={() => scrollToSection("product")} type="button">Produit</button>
            <button className="rounded-full px-4 py-2 text-[13px] text-white/65 transition hover:bg-white/[0.07] hover:text-white" onClick={() => scrollToSection("ways")} type="button">Voies</button>
            <button className="rounded-full px-4 py-2 text-[13px] text-white/65 transition hover:bg-white/[0.07] hover:text-white" onClick={() => scrollToSection("squad")} type="button">Escouade IA</button>
            <button className="rounded-full px-4 py-2 text-[13px] text-white/65 transition hover:bg-white/[0.07] hover:text-white" onClick={() => scrollToSection("beta")} type="button">Bêta</button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              className="hidden rounded-xl px-3 py-2 text-[13px] font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
              onClick={() => setActivePage("login")}
              type="button"
            >
              Se connecter
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ee8752] px-4 text-[13px] font-semibold text-white shadow-[0_8px_26px_-12px_rgba(238,135,82,0.48)] transition hover:bg-[#fa9661] active:scale-[0.98]"
              onClick={beginWithSelectedWay}
              type="button"
            >
              Créer un compte
              <ArrowUpRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 lg:pb-32 lg:pt-28" id="product">
          <div className="max-w-[620px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3.5 py-2 text-[11px] font-semibold tracking-[0.02em] text-violet-200 sm:text-xs">
              <Sparkles className="size-3.5 text-sky-300" />
              Studio de création logicielle assisté par IA
              <span className="ml-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase tracking-[0.13em] text-white/50">Bêta</span>
            </div>

            <h1 className="max-w-[620px] text-balance text-[42px] font-semibold leading-[1.06] tracking-[-0.055em] text-white sm:text-[58px] lg:text-[68px]">
              Passez de l’idée
              <span className="block bg-gradient-to-r from-sky-300 via-violet-300 to-orange-200 bg-clip-text text-transparent">
                à une application concrète.
              </span>
            </h1>

            <p className="mt-7 max-w-[570px] text-pretty text-[16px] leading-[1.8] text-[#a3adbe] sm:text-[18px]">
              Décrivez votre intention. Alvin la transmet à votre Voie, puis Idealy rassemble la conversation, les agents, les fichiers, le code et l’aperçu dans un seul workspace. Vous suivez chaque étape et gardez la main sur le résultat.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#ee8752] px-6 text-[14px] font-semibold text-white shadow-[0_14px_34px_-14px_rgba(238,135,82,0.50)] transition hover:-translate-y-0.5 hover:bg-[#fa9661] active:translate-y-0"
                onClick={beginWithSelectedWay}
                type="button"
              >
                Commencer un projet
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.035] px-6 text-[14px] font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.07]"
                onClick={() => scrollToSection("ways")}
                type="button"
              >
                Explorer les Voies
                <Compass className="size-4 text-white/60" />
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.08] pt-6 text-[12px] text-white/50">
              <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> Équipe IA coordonnée</span>
              <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> Code et fichiers visibles</span>
              <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> Export du projet</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[650px] lg:ml-auto">
            <div aria-hidden="true" className="absolute -inset-7 rounded-[36px] bg-gradient-to-br from-sky-400/[0.10] via-violet-500/[0.12] to-orange-400/[0.08] blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.12] bg-[#141923] shadow-[0_36px_100px_-48px_rgba(0,0,0,0.95)]">
              <div className="flex h-12 items-center justify-between border-b border-white/[0.08] px-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#f17878]" />
                  <span className="size-2 rounded-full bg-[#e7bd6e]" />
                  <span className="size-2 rounded-full bg-[#64c99b]" />
                  <span className="ml-3 text-[10px] font-medium tracking-[0.02em] text-white/45">IDEALY STUDIO</span>
                </div>
                <span className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.07] px-2 py-1 text-[9px] font-medium text-emerald-200/85">Workspace</span>
              </div>

              <div className="grid min-h-[370px] md:grid-cols-[0.78fr_1.22fr]">
                <div className="border-b border-white/[0.08] bg-[#10151e] p-4 md:border-b-0 md:border-r sm:p-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-white/85">
                    <span className="grid size-6 place-items-center rounded-lg bg-violet-400/10 text-violet-200"><Sparkles className="size-3.5" /></span>
                    Mission active
                  </div>
                  <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">Votre intention</p>
                  <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-[11px] leading-relaxed text-white/75">
                    Construire un espace de travail clair pour mon équipe…
                  </div>
                  <div className="mt-5 flex items-center justify-between text-[10px] text-white/40">
                    <span>Équipe IA</span>
                    <span>3 rôles</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Architecte", "Structure le projet", "text-sky-200"],
                      ["Builder", "Conçoit et assemble", "text-orange-200"],
                      ["Reviewer", "Vérifie le résultat", "text-emerald-200"],
                    ].map(([role, description, color]) => (
                      <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5" key={role}>
                        <span className={"size-2 rounded-full " + color.replace("text-", "bg-")} />
                        <span className="min-w-0">
                          <span className="block text-[10px] font-semibold text-white/80">{role}</span>
                          <span className="mt-0.5 block text-[9px] text-white/40">{description}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-orange-300" />
                  </div>
                  <p className="mt-2 text-[9px] text-white/35">Plan, réalisation et revue dans le même espace</p>
                </div>

                <div className="bg-[#171d27] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Aperçu du projet</p>
                      <p className="mt-1 text-[13px] font-semibold text-white/90">Workspace de l’équipe</p>
                    </div>
                    <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-black/10 p-1 text-[9px] text-white/45">
                      <span className="rounded-md bg-white/[0.09] px-2 py-1 text-white/80">Desktop</span>
                      <span className="px-2 py-1">Mobile</span>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/[0.09] bg-[#f7f8fb] p-4 text-[#222634] sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-lg bg-[#202842] text-[10px] font-bold text-white">W</span>
                        <span className="text-[10px] font-semibold">Workspace</span>
                      </div>
                      <span className="rounded-md bg-[#edf0f6] px-2 py-1 text-[8px] font-medium text-[#647084]">Preview</span>
                    </div>
                    <div className="mt-6">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-[#74809a]">Vue d’ensemble</p>
                      <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[#20283a] sm:text-[23px]">Tout votre travail, au même endroit.</h3>
                      <p className="mt-2 max-w-[280px] text-[9px] leading-relaxed text-[#737e92]">Une interface structurée pour organiser les projets, suivre les tâches et collaborer sereinement.</p>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-[#e7eaf0] bg-white p-2.5">
                        <span className="block text-[8px] text-[#8490a4]">Projets</span>
                        <span className="mt-1 block text-[15px] font-semibold text-[#273249]">12</span>
                        <span className="mt-1 block h-1 w-8 rounded-full bg-sky-300" />
                      </div>
                      <div className="rounded-xl border border-[#e7eaf0] bg-white p-2.5">
                        <span className="block text-[8px] text-[#8490a4]">Tâches</span>
                        <span className="mt-1 block text-[15px] font-semibold text-[#273249]">28</span>
                        <span className="mt-1 block h-1 w-6 rounded-full bg-violet-300" />
                      </div>
                      <div className="rounded-xl border border-[#e7eaf0] bg-white p-2.5">
                        <span className="block text-[8px] text-[#8490a4]">Équipe</span>
                        <span className="mt-1 block text-[15px] font-semibold text-[#273249]">08</span>
                        <span className="mt-1 block h-1 w-7 rounded-full bg-orange-300" />
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-[#e7eaf0] bg-white p-3">
                      <div className="flex items-center justify-between text-[8px] font-semibold text-[#59657a]">
                        <span>Activité récente</span>
                        <span className="text-[#8a94a6]">Voir tout</span>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-400" /><span className="h-1.5 w-[58%] rounded-full bg-[#e4e8ef]" /><span className="ml-auto h-1.5 w-8 rounded-full bg-[#edf0f5]" /></div>
                        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-violet-400" /><span className="h-1.5 w-[72%] rounded-full bg-[#e4e8ef]" /><span className="ml-auto h-1.5 w-8 rounded-full bg-[#edf0f5]" /></div>
                        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-sky-400" /><span className="h-1.5 w-[48%] rounded-full bg-[#e4e8ef]" /><span className="ml-auto h-1.5 w-8 rounded-full bg-[#edf0f5]" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9px] text-white/40">
                    <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-300" /> Preview de démonstration visuelle</span>
                    <span>Exemple d’interface</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">Un flux de travail continu</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[42px]">Une seule continuité, de l’idée au résultat.</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/55 sm:text-[16px]">La réflexion, la construction et la vérification restent reliées. Vous gardez le contexte et voyez ce qui change.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PRODUCT_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <article className="group rounded-2xl border border-white/[0.09] bg-white/[0.035] p-6 transition duration-200 hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.05]" key={item.number}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.15em] text-white/30">{item.number}</span>
                    <span className="grid size-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Icon className="size-4.5" /></span>
                  </div>
                  <h3 className="mt-7 text-[18px] font-semibold tracking-tight text-white">{item.title}</h3>
                  <p className="mt-3 text-[13px] leading-[1.75] text-white/55">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-24" id="ways">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-200"><Layers3 className="size-3.5" /> Approches de travail</p>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[42px]">Choisissez l’approche adaptée à votre projet.</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/55 sm:text-[16px]">Chaque Voie donne une priorité de travail à l’escouade. Les capacités du produit restent les mêmes, et votre choix peut évoluer au fil du projet.</p>
          </div>

          <div className="mt-11 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {WAY_KEYS.map((wayKey) => {
              const way = voiesCatalog[wayKey];
              const selected = selectedWay === wayKey;
              return (
                <button
                  aria-pressed={selected}
                  className={"group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 " + (selected ? "border-white/35 bg-white/[0.085] shadow-[0_18px_50px_-35px_rgba(124,111,255,0.5)]" : "border-white/[0.09] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]")}
                  key={wayKey}
                  onClick={() => setSelectedWay(wayKey)}
                  type="button"
                >
                  <div aria-hidden="true" className={"absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r " + way.accentClassName + (selected ? " opacity-100" : " opacity-35 group-hover:opacity-70")} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-semibold text-white">{way.label}</p>
                      <p className="mt-1 text-[11px] font-medium text-white/40">{way.resourceLabel}</p>
                    </div>
                    {selected ? <span className="grid size-6 place-items-center rounded-full bg-white text-[#10131b]"><Check className="size-3.5" /></span> : <span className="size-6 rounded-full border border-white/15" />}
                  </div>
                  <p className="mt-4 min-h-[52px] text-[12px] leading-relaxed text-white/55">{way.tagline}</p>
                  <div className="mt-5 flex items-center -space-x-2">
                    {way.agents.slice(0, 4).map((agent) => (
                      <img alt={agent.name} className="size-8 rounded-full border-2 border-[#111722] bg-[#202733] object-cover" key={agent.name} src={agent.avatarUrl} />
                    ))}
                    <span className="pl-3 text-[10px] text-white/35">{way.agents.length} spécialistes</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#111721]/90">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
              <div className="p-6 sm:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-sky-200/70">Voie sélectionnée</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{activeWay.label}</h3>
                  <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60">{activeWay.resourceLabel}</span>
                </div>
                <p className="mt-4 max-w-[640px] text-[14px] leading-[1.8] text-white/60">{activeWay.philosophy}</p>
                <p className="mt-4 text-[13px] font-medium text-sky-200/85">{activeWay.tagline}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-semibold text-[#161922] transition hover:bg-white/90" onClick={beginWithSelectedWay} type="button">Continuer avec cette Voie <ArrowRight className="size-4" /></button>
                  <button className="inline-flex h-12 items-center rounded-xl border border-white/10 px-4 text-[13px] font-medium text-white/65 transition hover:bg-white/[0.05] hover:text-white" onClick={() => setActivePage("pricing")} type="button">Découvrir les offres</button>
                </div>
              </div>
              <div className="border-t border-white/[0.08] bg-white/[0.025] p-6 sm:p-8 lg:border-l lg:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Spécialistes de cette Voie</p>
                <div className="mt-5 space-y-4">
                  {activeWay.agents.slice(0, 4).map((agent) => (
                    <div className="flex items-center gap-3" key={agent.name}>
                      <img alt={agent.name} className="size-11 rounded-xl border border-white/10 bg-white/5 object-cover" src={agent.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white/85">{agent.name}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">{agent.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-20" id="squad">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200"><Brain className="size-3.5" /> Intelligence collective</p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[42px]">Une escouade coordonnée, pas une suite d’outils isolés.</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-white/55">Alvin reçoit votre intention et la transmet à la Voie active. Les rôles spécialisés prennent le relais selon les besoins de la mission.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <img alt={alvinMessenger.name} className="size-12 rounded-2xl border border-white/10 object-cover" src={alvinMessenger.avatarUrl} />
                  <div>
                    <p className="text-[14px] font-semibold text-white">{alvinMessenger.name}</p>
                    <p className="mt-0.5 text-[11px] text-sky-200/70">{alvinMessenger.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-white/50">{alvinMessenger.description}</p>
              </article>
              {[
                { icon: Compass, title: "Architecte", desc: "Clarifie les besoins et structure les étapes." },
                { icon: Code2, title: "Builder", desc: "Assemble les écrans, les composants et la logique." },
                { icon: ShieldCheck, title: "Reviewer", desc: "Contrôle la cohérence et repère les régressions." },
                { icon: Gauge, title: "Optimisation", desc: "Vérifie la performance et affine le résultat." },
              ].map((role) => {
                const Icon = role.icon;
                return (
                  <article className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5" key={role.title}>
                    <span className="grid size-9 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Icon className="size-4" /></span>
                    <h3 className="mt-4 text-[14px] font-semibold text-white">{role.title}</h3>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/50">{role.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-20" id="beta">
          <div className="overflow-hidden rounded-[28px] border border-white/[0.11] bg-gradient-to-br from-violet-400/[0.10] via-white/[0.035] to-sky-400/[0.08] p-6 sm:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-violet-200"><Sparkles className="size-3.5" /> Bêta · accès d’évaluation</p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[40px]">Découvrez Idealy pendant la bêta.</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-white/60">Cette phase nous permet d’améliorer la qualité des missions, la fiabilité des résultats et l’expérience du workspace. Les conditions des abonnements seront communiquées avant l’ouverture des paiements.</p>
            </div>
            <div className="mt-9 grid gap-3 md:grid-cols-3">
              {BETA_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <article className="rounded-2xl border border-white/[0.09] bg-[#0b101a]/65 p-5" key={pillar.title}>
                    <span className="grid size-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Icon className="size-4.5" /></span>
                    <h3 className="mt-4 text-[14px] font-semibold text-white">{pillar.title}</h3>
                    <p className="mt-2 text-[12px] leading-[1.75] text-white/52">{pillar.description}</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-7 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.07] px-5 py-4 text-center text-[12px] leading-relaxed text-emerald-100/80">
              Pendant la bêta, aucun paiement n’est demandé pour découvrir Idealy. Les offres et leurs conditions seront présentées clairement avant leur mise en service.
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-20" id="plans">
          <div className="rounded-[26px] border border-white/[0.10] bg-white/[0.035] p-7 text-center sm:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/80">Offres Idealy</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[38px]">Une formule adaptée à chaque étape.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">Découvrez les offres prévues pour les créateurs et les équipes. Pendant la bêta, les modalités de paiement restent désactivées ; les tarifs définitifs seront affichés avant leur ouverture.</p>
            <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
              {[
                ["Découverte", "Pour explorer le workspace et réaliser vos premières missions.", "Accès d’évaluation"],
                ["Pro", "Pour développer régulièrement et accélérer vos cycles de construction.", "Capacité étendue"],
                ["Business", "Pour les équipes qui ont besoin de collaboration et de gouvernance.", "Travail en équipe"],
              ].map(([name, description, meta]) => (
                <div className="rounded-2xl border border-white/[0.08] bg-[#10151f]/65 p-5" key={name}>
                  <p className="text-[16px] font-semibold text-white">{name}</p>
                  <p className="mt-2 min-h-[58px] text-[12px] leading-relaxed text-white/50">{description}</p>
                  <p className="mt-4 border-t border-white/[0.08] pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/75">{meta}</p>
                </div>
              ))}
            </div>
            <button className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.05] px-5 text-[13px] font-semibold text-white transition hover:bg-white/[0.09]" onClick={() => setActivePage("pricing")} type="button">
              Voir les offres et conditions <ArrowUpRight className="size-4" />
            </button>
          </div>
        </section>

        <footer className="border-t border-white/[0.08]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 sm:flex-row sm:px-8">
            <div className="flex items-center gap-3">
              <IdealyLogo animated={false} compact size={25} />
              <span className="text-[11px] text-white/40">© 2026 Idealy Studio. Tous droits réservés.</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-white/45">
              <button className="transition hover:text-white" onClick={() => setActivePage("privacy")} type="button">Confidentialité</button>
              <button className="transition hover:text-white" onClick={() => setActivePage("terms")} type="button">Conditions d’utilisation</button>
              <button className="transition hover:text-white" onClick={() => setActivePage("docs")} type="button">Documentation</button>
              <button className="transition hover:text-white" onClick={() => setActivePage("login")} type="button">Se connecter</button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default WelcomePage;
