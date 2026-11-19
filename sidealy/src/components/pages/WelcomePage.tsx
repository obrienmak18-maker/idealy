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

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export const WelcomePage: React.FC = () => {
  const { language, setActivePage } = useApp();
  const [selectedWay, setSelectedWay] = useState<WayKey>("mage");
  const activeWay: WayDetailed = voiesCatalog[selectedWay] ?? voiesCatalog.mage;

  const isFr = language === "fr";
  const isEs = language === "es";

  const productSteps = [
    {
      number: "01",
      icon: Compass,
      title: isFr ? "Clarifier" : isEs ? "Clarificar" : "Clarify",
      description: isFr
        ? "Transformez votre idée en mission claire : objectifs, périmètre et décisions importantes sont posés avant la construction."
        : isEs
          ? "Transforme su idea en una misión clara: objetivos, alcance y decisiones clave antes de construir."
          : "Transform your idea into a clear mission: goals, scope, and key decisions are framed before building.",
    },
    {
      number: "02",
      icon: Code2,
      title: isFr ? "Construire" : isEs ? "Construir" : "Build",
      description: isFr
        ? "Suivez votre Voie, les agents mobilisés, les fichiers créés et l’avancement de la mission dans un seul workspace."
        : isEs
          ? "Siga su Camino, los agentes movilizados, los archivos creados y el avance en un único workspace."
          : "Follow your Way, mobilized agents, generated files, and mission progress in a single workspace.",
    },
    {
      number: "03",
      icon: FileCheck2,
      title: isFr ? "Vérifier et livrer" : isEs ? "Verificar y entregar" : "Verify & Deliver",
      description: isFr
        ? "Inspectez le code, testez l’aperçu, ajustez le résultat puis préparez l’export ou le déploiement."
        : isEs
          ? "Inspeccione el código, pruebe la vista previa, ajuste el resultado y prepare la exportación o despliegue."
          : "Inspect code, test the preview, refine the result, then prepare export or deployment.",
    },
  ];

  const betaPillars = [
    {
      icon: Rocket,
      title: isFr ? "Un espace pour commencer" : isEs ? "Un espacio para empezar" : "A space to get started",
      description: isFr
        ? "Explorez le workspace, décrivez un besoin et découvrez comment Idealy transforme une intention en mission structurée."
        : isEs
          ? "Explore el workspace, describa una necesidad y descubra cómo Idealy transforma la intención en misión estructurada."
          : "Explore the workspace, describe a need, and discover how Idealy turns intention into structured missions.",
    },
    {
      icon: Gauge,
      title: isFr ? "Une consommation lisible" : isEs ? "Consumo transparente" : "Transparent consumption",
      description: isFr
        ? "Les Power Points représentent les ressources utilisées par les missions. La consommation dépend du périmètre et de la complexité du travail."
        : isEs
          ? "Los Power Points representan los recursos utilizados por las misiones. El consumo depende del alcance y complejidad."
          : "Power Points represent resources used by missions. Consumption reflects scope and complexity.",
    },
    {
      icon: ShieldCheck,
      title: isFr ? "Une bêta sans paiement" : isEs ? "Una beta sin pago" : "Card-free beta",
      description: isFr
        ? "L’accès d’évaluation ne demande pas de carte bancaire. Les conditions des abonnements seront précisées avant l’activation des paiements."
        : isEs
          ? "El acceso de evaluación no requiere tarjeta bancaria. Los términos de suscripción se detallarán antes de activar los pagos."
          : "Evaluation access requires no credit card. Subscription terms will be detailed before payments are activated.",
    },
  ];

  const beginWithSelectedWay = () => {
    try {
      window.localStorage.setItem("idealy_preferred_way", selectedWay);
    } catch {
      // Storage unavailable fallback
    }
    setActivePage("register");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090c13] text-white selection:bg-violet-400/30">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(circle_at_top,#2b2353_0%,#151928_40%,transparent_75%)] opacity-70"
      />

      <header className="relative z-20 border-b border-white/[0.08] bg-[#090c13]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-7">
            <button
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
              onClick={() => setActivePage("welcome")}
              type="button"
            >
              <IdealyLogo animated={false} compact size={32} />
            </button>
            <nav
              aria-label={isFr ? "Navigation principale" : isEs ? "Navegación principal" : "Main navigation"}
              className="hidden items-center gap-5 text-[13px] text-white/60 md:flex"
            >
              <button className="transition hover:text-white" onClick={() => scrollToSection("product")} type="button">
                {isFr ? "Produit" : isEs ? "Producto" : "Product"}
              </button>
              <button className="transition hover:text-white" onClick={() => scrollToSection("ways")} type="button">
                {isFr ? "Voies" : isEs ? "Caminos" : "Ways"}
              </button>
              <button className="transition hover:text-white" onClick={() => scrollToSection("squad")} type="button">
                {isFr ? "Escouade IA" : isEs ? "Escuadrón IA" : "AI Squad"}
              </button>
              <button className="transition hover:text-white" onClick={() => scrollToSection("beta")} type="button">
                {isFr ? "Bêta" : isEs ? "Beta" : "Beta"}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl px-3.5 text-[13px] font-medium text-white/75 transition hover:text-white"
              onClick={() => setActivePage("login")}
              type="button"
            >
              {isFr ? "Se connecter" : isEs ? "Iniciar sesión" : "Sign in"}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-[13px] font-semibold text-[#10131a] transition hover:bg-white/90 active:scale-[0.98]"
              onClick={() => setActivePage("register")}
              type="button"
            >
              {isFr ? "Créer un compte" : isEs ? "Crear cuenta" : "Create account"}
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10 lg:pb-32 lg:pt-28" id="product">
          <div className="max-w-[620px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3.5 py-2 text-[11px] font-semibold tracking-[0.02em] text-violet-200 sm:text-xs">
              <Sparkles className="size-3.5 text-sky-300" />
              {isFr ? "Studio de création logicielle assisté par IA" : isEs ? "Estudio de creación de software asistido por IA" : "AI-Powered Software Creation Studio"}
              <span className="ml-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase tracking-[0.13em] text-white/50">
                {isFr ? "Bêta" : "Beta"}
              </span>
            </div>

            <h1 className="max-w-[620px] text-balance text-[42px] font-semibold leading-[1.06] tracking-[-0.055em] text-white sm:text-[58px] lg:text-[68px]">
              {isFr ? "Passez de l’idée" : isEs ? "De la idea" : "Turn ideas"}
              <span className="block bg-gradient-to-r from-sky-300 via-violet-300 to-orange-200 bg-clip-text text-transparent">
                {isFr ? "à une application concrète." : isEs ? "a una aplicación real." : "into real applications."}
              </span>
            </h1>

            <p className="mt-7 max-w-[570px] text-pretty text-[16px] leading-[1.8] text-[#a3adbe] sm:text-[18px]">
              {isFr
                ? "Décrivez votre intention. Alvin la transmet à votre Voie, puis Idealy rassemble la conversation, les agents, les fichiers, le code et l’aperçu dans un seul workspace. Vous suivez chaque étape et gardez la main sur le résultat."
                : isEs
                  ? "Describa su intención. Alvin la transmite a su Camino, e Idealy reúne conversación, agentes, archivos, código y vista previa en un único workspace."
                  : "Describe your intention. Alvin coordinates your Way, and Idealy brings conversation, agents, files, code, and live preview together in one unified workspace. You follow every step and keep full control."}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#ee8752] px-6 text-[14px] font-semibold text-white shadow-[0_14px_34px_-14px_rgba(238,135,82,0.50)] transition hover:-translate-y-0.5 hover:bg-[#fa9661] active:translate-y-0"
                onClick={beginWithSelectedWay}
                type="button"
              >
                {isFr ? "Commencer un projet" : isEs ? "Comenzar un proyecto" : "Start a project"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.035] px-6 text-[14px] font-medium text-white/85 transition hover:border-white/20 hover:bg-white/[0.07]"
                onClick={() => scrollToSection("ways")}
                type="button"
              >
                {isFr ? "Explorer les Voies" : isEs ? "Explorar Caminos" : "Explore Ways"}
                <Compass className="size-4 text-white/60" />
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[0.08] pt-6 text-[12px] text-white/50">
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-300" />
                {isFr ? "Équipe IA coordonnée" : isEs ? "Equipo IA coordinado" : "Coordinated AI squad"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-300" />
                {isFr ? "Code et fichiers visibles" : isEs ? "Código y archivos visibles" : "Visible code & files"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-300" />
                {isFr ? "Export du projet" : isEs ? "Exportación de proyecto" : "Project export"}
              </span>
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
                    {isFr ? "Mission active" : isEs ? "Misión activa" : "Active mission"}
                  </div>
                  <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
                    {isFr ? "Votre intention" : isEs ? "Su intención" : "Your intention"}
                  </p>
                  <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-[11px] leading-relaxed text-white/75">
                    {isFr ? "Construire un espace de travail clair pour mon équipe…" : isEs ? "Construir un espacio de trabajo claro para mi equipo…" : "Build a clear workspace for my team…"}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-[10px] text-white/40">
                    <span>{isFr ? "Équipe IA" : isEs ? "Equipo IA" : "AI Squad"}</span>
                    <span>{isFr ? "3 rôles" : isEs ? "3 roles" : "3 roles"}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      [isFr ? "Architecte" : isEs ? "Arquitecto" : "Architect", isFr ? "Structure le projet" : isEs ? "Estructura el proyecto" : "Structures the project", "text-sky-200"],
                      [isFr ? "Builder" : isEs ? "Constructor" : "Builder", isFr ? "Conçoit et assemble" : isEs ? "Diseña y ensambla" : "Designs and assembles", "text-orange-200"],
                      [isFr ? "Reviewer" : isEs ? "Revisor" : "Reviewer", isFr ? "Vérifie le résultat" : isEs ? "Verifica el resultado" : "Verifies the result", "text-emerald-200"],
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
                  <p className="mt-2 text-[9px] text-white/35">
                    {isFr ? "Plan, réalisation et revue dans le même espace" : isEs ? "Plan, ejecución y revisión en el mismo espacio" : "Plan, build, and review in the same workspace"}
                  </p>
                </div>

                <div className="bg-[#171d27] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                        {isFr ? "Aperçu du projet" : isEs ? "Vista previa" : "Project preview"}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-white/90">
                        {isFr ? "Workspace de l’équipe" : isEs ? "Workspace del equipo" : "Team Workspace"}
                      </p>
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
                      <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-[#74809a]">
                        {isFr ? "Vue d’ensemble" : isEs ? "Visión general" : "Overview"}
                      </p>
                      <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[#20283a] sm:text-[23px]">
                        {isFr ? "Tout votre travail, au même endroit." : isEs ? "Todo su trabajo, en un solo lugar." : "All your work, in one place."}
                      </h3>
                      <p className="mt-2 max-w-[280px] text-[9px] leading-relaxed text-[#737e92]">
                        {isFr ? "Une interface structurée pour organiser les projets, suivre les tâches et collaborer sereinement." : isEs ? "Una interfaz estructurada para organizar proyectos, seguir tareas y colaborar con calma." : "A structured interface to organize projects, track tasks, and collaborate smoothly."}
                      </p>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-[#e7eaf0] bg-white p-2.5">
                        <span className="block text-[8px] text-[#8490a4]">{isFr ? "Projets" : isEs ? "Proyectos" : "Projects"}</span>
                        <span className="mt-1 block text-[15px] font-semibold text-[#273249]">12</span>
                        <span className="mt-1 block h-1 w-8 rounded-full bg-sky-300" />
                      </div>
                      <div className="rounded-xl border border-[#e7eaf0] bg-white p-2.5">
                        <span className="block text-[8px] text-[#8490a4]">{isFr ? "Tâches" : isEs ? "Tareas" : "Tasks"}</span>
                        <span className="mt-1 block text-[15px] font-semibold text-[#273249]">28</span>
                        <span className="mt-1 block h-1 w-6 rounded-full bg-violet-300" />
                      </div>
                      <div className="rounded-xl border border-[#e7eaf0] bg-white p-2.5">
                        <span className="block text-[8px] text-[#8490a4]">{isFr ? "Équipe" : isEs ? "Equipo" : "Team"}</span>
                        <span className="mt-1 block text-[15px] font-semibold text-[#273249]">08</span>
                        <span className="mt-1 block h-1 w-7 rounded-full bg-orange-300" />
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-[#e7eaf0] bg-white p-3">
                      <div className="flex items-center justify-between text-[8px] font-semibold text-[#59657a]">
                        <span>{isFr ? "Activité récente" : isEs ? "Actividad reciente" : "Recent activity"}</span>
                        <span className="text-[#8a94a6]">{isFr ? "Voir tout" : isEs ? "Ver todo" : "View all"}</span>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-400" /><span className="h-1.5 w-[58%] rounded-full bg-[#e4e8ef]" /><span className="ml-auto h-1.5 w-8 rounded-full bg-[#edf0f5]" /></div>
                        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-violet-400" /><span className="h-1.5 w-[72%] rounded-full bg-[#e4e8ef]" /><span className="ml-auto h-1.5 w-8 rounded-full bg-[#edf0f5]" /></div>
                        <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-sky-400" /><span className="h-1.5 w-[48%] rounded-full bg-[#e4e8ef]" /><span className="ml-auto h-1.5 w-8 rounded-full bg-[#edf0f5]" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9px] text-white/40">
                    <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-300" /> {isFr ? "Preview de démonstration visuelle" : isEs ? "Vista previa de demostración visual" : "Visual demo preview"}</span>
                    <span>{isFr ? "Exemple d’interface" : isEs ? "Ejemplo de interfaz" : "UI sample"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
              {isFr ? "Un flux de travail continu" : isEs ? "Flujo de trabajo continuo" : "Continuous Workflow"}
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[42px]">
              {isFr ? "Une seule continuité, de l’idée au résultat." : isEs ? "Una sola continuidad, de la idea al resultado." : "One seamless continuity, from idea to delivery."}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/55 sm:text-[16px]">
              {isFr ? "La réflexion, la construction et la vérification restent reliées. Vous gardez le contexte et voyez ce qui change." : isEs ? "La reflexión, la construcción y la verificación permanecen conectadas. Mantiene el contexto y ve los cambios." : "Ideation, building, and verification stay connected. You keep full context and see what changes."}
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {productSteps.map((item) => {
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
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-200">
              <Layers3 className="size-3.5" /> {isFr ? "Approches de travail" : isEs ? "Enfoques de trabajo" : "Work Approaches"}
            </p>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[42px]">
              {isFr ? "Choisissez l’approche adaptée à votre projet." : isEs ? "Elija el enfoque adaptado a su proyecto." : "Choose the approach that fits your project."}
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/55 sm:text-[16px]">
              {isFr ? "Chaque Voie donne une priorité de travail à l’escouade. Les capacités du produit restent les mêmes, et votre choix peut évoluer au fil du projet." : isEs ? "Cada Camino da prioridad de trabajo al escuadrón. Las capacidades principales son las mismas y su elección puede evolucionar." : "Each Way sets tactical priorities for the squad. Core capabilities remain the same, and your choice can evolve anytime."}
            </p>
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
                    <span className="pl-3 text-[10px] text-white/35">
                      {way.agents.length} {isFr ? "spécialistes" : isEs ? "especialistas" : "specialists"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#111721]/90">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
              <div className="p-6 sm:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-sky-200/70">
                  {isFr ? "Voie sélectionnée" : isEs ? "Camino seleccionado" : "Selected Way"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{activeWay.label}</h3>
                  <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60">{activeWay.resourceLabel}</span>
                </div>
                <p className="mt-4 max-w-[640px] text-[14px] leading-[1.8] text-white/60">{activeWay.philosophy}</p>
                <p className="mt-4 text-[13px] font-medium text-sky-200/85">{activeWay.tagline}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-semibold text-[#161922] transition hover:bg-white/90" onClick={beginWithSelectedWay} type="button">
                    {isFr ? "Continuer avec cette Voie" : isEs ? "Continuar con este Camino" : "Continue with this Way"} <ArrowRight className="size-4" />
                  </button>
                  <button className="inline-flex h-12 items-center rounded-xl border border-white/10 px-4 text-[13px] font-medium text-white/65 transition hover:bg-white/[0.05] hover:text-white" onClick={() => setActivePage("pricing")} type="button">
                    {isFr ? "Découvrir les offres" : isEs ? "Descubrir planes" : "View plans & pricing"}
                  </button>
                </div>
              </div>
              <div className="border-t border-white/[0.08] bg-white/[0.025] p-6 sm:p-8 lg:border-l lg:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  {isFr ? "Spécialistes de cette Voie" : isEs ? "Especialistas de este Camino" : "Specialists in this Way"}
                </p>
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
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">
                <Brain className="size-3.5" /> {isFr ? "Intelligence collective" : isEs ? "Inteligencia colectiva" : "Collective Intelligence"}
              </p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-[42px]">
                {isFr ? "Une escouade coordonnée, pas une suite d’outils isolés." : isEs ? "Un escuadrón coordinado, no herramientas aisladas." : "A coordinated squad, not isolated tools."}
              </h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-white/55">
                {isFr ? "Alvin reçoit votre intention et la transmet à la Voie active. Les rôles spécialisés prennent le relais selon les besoins de la mission." : isEs ? "Alvin recibe su intención y la transmite al Camino activo. Los roles especializados toman el relevo según la misión." : "Alvin receives your intention and coordinates the active Way. Specialized roles take over based on mission needs."}
              </p>
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
                { icon: Compass, title: isFr ? "Architecte" : isEs ? "Arquitecto" : "Architect", desc: isFr ? "Clarifie les besoins et structure les étapes." : isEs ? "Clarifica necesidades y estructura pasos." : "Clarifies needs and structures steps." },
                { icon: Code2, title: isFr ? "Builder" : isEs ? "Constructor" : "Builder", desc: isFr ? "Assemble les écrans, les composants et la logique." : isEs ? "Ensambla pantallas, componentes y lógica." : "Assembles screens, components, and logic." },
                { icon: ShieldCheck, title: isFr ? "Reviewer" : isEs ? "Revisor" : "Reviewer", desc: isFr ? "Contrôle la cohérence et repère les régressions." : isEs ? "Controla coherencia y detecta regresiones." : "Audits consistency and catches regressions." },
                { icon: Gauge, title: isFr ? "Optimisation" : isEs ? "Optimización" : "Optimization", desc: isFr ? "Vérifie la performance et affine le résultat." : isEs ? "Verifica rendimiento y afina el resultado." : "Verifies performance and refines results." },
              ].map((role) => {
                const Icon = role.icon;
                return (
                  <article className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-5" key={role.title}>
                    <span className="grid size-9 place-items-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200"><Icon className="size-4.5" /></span>
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
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-violet-200">
                <Sparkles className="size-3.5" /> {isFr ? "Bêta · accès d’évaluation" : isEs ? "Beta · acceso de evaluación" : "Beta · Evaluation Access"}
              </p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[40px]">
                {isFr ? "Découvrez Idealy pendant la bêta." : isEs ? "Descubra Idealy durante la beta." : "Experience Idealy during the beta."}
              </h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-white/60">
                {isFr ? "Cette phase nous permet d’améliorer la qualité des missions, la fiabilité des résultats et l’expérience du workspace. Les conditions des abonnements seront communiquées avant l’ouverture des paiements." : isEs ? "Esta fase nos permite mejorar la calidad y fiabilidad. Las condiciones de suscripción se comunicarán antes de abrir los pagos." : "This phase helps us refine mission quality, execution reliability, and workspace ergonomics. Subscription terms will be announced before billing opens."}
              </p>
            </div>
            <div className="mt-9 grid gap-3 md:grid-cols-3">
              {betaPillars.map((pillar) => {
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
              {isFr
                ? "Pendant la bêta, aucun paiement n’est demandé pour découvrir Idealy. Les offres et leurs conditions seront présentées clairement avant leur mise en service."
                : isEs
                  ? "Durante la beta, no se requiere ningún pago para descubrir Idealy. Las ofertas y condiciones se presentarán antes de su activación."
                  : "During the beta, exploring Idealy is completely free. Plans and conditions will be clearly presented before launch."}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-20" id="plans">
          <div className="rounded-[26px] border border-white/[0.10] bg-white/[0.035] p-7 text-center sm:p-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/80">
              {isFr ? "Offres Idealy" : isEs ? "Planes Idealy" : "Idealy Plans"}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[38px]">
              {isFr ? "Une formule adaptée à chaque étape." : isEs ? "Una fórmula adaptada a cada etapa." : "Formulas designed for every stage."}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">
              {isFr ? "Découvrez les offres prévues pour les créateurs et les équipes. Pendant la bêta, les modalités de paiement restent désactivées ; les tarifs définitifs seront affichés avant leur ouverture." : isEs ? "Descubra las ofertas para creadores y equipos. Durante la beta los pagos permanecen desactivados." : "Explore planned tiers for creators and teams. Payments remain disabled during the beta; final pricing will be displayed prior to opening."}
            </p>
            <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
              {[
                [isFr ? "Découverte" : isEs ? "Descubrimiento" : "Starter", isFr ? "Pour explorer le workspace et réaliser vos premières missions." : isEs ? "Para explorar el workspace y realizar sus primeras misiones." : "To explore the workspace and launch your first missions.", isFr ? "Accès d’évaluation" : isEs ? "Acceso de evaluación" : "Evaluation access"],
                ["Pro", isFr ? "Pour développer régulièrement et accélérer vos cycles de construction." : isEs ? "Para construir regularmente y acelerar sus ciclos." : "For frequent builders accelerating development cycles.", isFr ? "Capacité étendue" : isEs ? "Capacidad extendida" : "Extended capacity"],
                ["Business", isFr ? "Pour les équipes qui ont besoin de collaboration et de gouvernance." : isEs ? "Para equipos con necesidad de colaboración y gobernanza." : "For teams needing collaboration and governance.", isFr ? "Travail en équipe" : isEs ? "Trabajo en equipo" : "Team collaboration"],
              ].map(([name, description, meta]) => (
                <div className="rounded-2xl border border-white/[0.08] bg-[#10151f]/65 p-5" key={name}>
                  <p className="text-[16px] font-semibold text-white">{name}</p>
                  <p className="mt-2 min-h-[58px] text-[12px] leading-relaxed text-white/50">{description}</p>
                  <p className="mt-4 border-t border-white/[0.08] pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/75">{meta}</p>
                </div>
              ))}
            </div>
            <button className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.05] px-5 text-[13px] font-semibold text-white transition hover:bg-white/[0.09]" onClick={() => setActivePage("pricing")} type="button">
              {isFr ? "Voir les offres et conditions" : isEs ? "Ver planes y condiciones" : "View plans and terms"} <ArrowUpRight className="size-4" />
            </button>
          </div>
        </section>

        <footer className="border-t border-white/[0.08]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 sm:flex-row sm:px-8">
            <div className="flex items-center gap-3">
              <IdealyLogo animated={false} compact size={25} />
              <span className="text-[11px] text-white/40">
                © 2026 Idealy Studio. {isFr ? "Tous droits réservés." : isEs ? "Todos los derechos reservados." : "All rights reserved."}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-white/45">
              <button className="transition hover:text-white" onClick={() => setActivePage("privacy")} type="button">
                {isFr ? "Confidentialité" : isEs ? "Privacidad" : "Privacy"}
              </button>
              <button className="transition hover:text-white" onClick={() => setActivePage("terms")} type="button">
                {isFr ? "Conditions d’utilisation" : isEs ? "Términos" : "Terms"}
              </button>
              <button className="transition hover:text-white" onClick={() => setActivePage("docs")} type="button">
                {isFr ? "Documentation" : isEs ? "Documentación" : "Documentation"}
              </button>
              <button className="transition hover:text-white" onClick={() => setActivePage("login")} type="button">
                {isFr ? "Se connecter" : isEs ? "Iniciar sesión" : "Sign in"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default WelcomePage;
