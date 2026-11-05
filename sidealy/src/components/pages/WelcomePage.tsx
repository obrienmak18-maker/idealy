import {
  ArrowRight,
  Sparkles,
  Zap,
  Check,
  ChevronRight,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

type WayKey = "ninja" | "mage" | "hunter" | "professional";

const WAYS_DATA = {
  ninja: {
    name: "Ninja",
    chief: "Minato",
    resource: "Chakra",
    rgb: "249,115,22",
    tagline: "Vitesse d'exécution maximale & itérations chirurgicales",
    description:
      "Pour les créateurs qui veulent itérer à la vitesse de l'éclair, prototyper en quelques secondes et déployer sans friction.",
    avatar: "/images/agents/Minato.jpg",
    roles: [
      { title: "Architecte", desc: "Clarifie le besoin et structure les routes sans délai." },
      { title: "Constructeur", desc: "Assemble l'interface et la logique avec agilité." },
      { title: "Vérificateur", desc: "Contrôle la fluidité et le rendu immédiat." },
    ],
  },
  mage: {
    name: "Mage",
    chief: "Erza",
    resource: "Mana",
    rgb: "139,92,246",
    tagline: "Sens du détail visuel, UI soignée & créations féeriques",
    description:
      "Pour les interfaces haut de gamme, les animations ciselées et les expériences utilisateur qui marquent les esprits.",
    avatar: "/images/agents/Erza.jpg",
    roles: [
      { title: "Architecte", desc: "Conçoit l'expérience et le rythme visuel global." },
      { title: "Constructeur", desc: "Compose des interfaces somptueuses et réactives." },
      { title: "Vérificateur", desc: "Peaufine les micro-détails graphiques et thèmes." },
    ],
  },
  hunter: {
    name: "Hunter",
    chief: "Netero",
    resource: "Nen",
    rgb: "20,184,166",
    tagline: "Rigueur d'ingénierie, traque des failles & robustesse Clean",
    description:
      "Pensé pour la solidité algorithmique, la couverture de tests et les architectures applicatives pérennes.",
    avatar: "/images/agents/Netero.jpg",
    roles: [
      { title: "Architecte", desc: "Pose les fondations et isole les responsabilités." },
      { title: "Constructeur", desc: "Rédige du code typé, testable et optimisé." },
      { title: "Vérificateur", desc: "Traque les régressions et audite la sécurité." },
    ],
  },
  professional: {
    name: "Pro",
    chief: "Daniel",
    resource: "Énergie",
    rgb: "37,99,235",
    tagline: "Standards d'entreprise, sécurité & conformité de production",
    description:
      "Parfait pour les systèmes critiques, les intégrations d'entreprise, la scalabilité et les flux de données sensibles.",
    avatar: "/images/agents/Daniel.jpg",
    roles: [
      { title: "Architecte", desc: "Cadre la conformité et les schémas d'intégration." },
      { title: "Constructeur", desc: "Implémente les normes d'ingénierie industrielle." },
      { title: "Vérificateur", desc: "Valide la gouvernance, les rôles et l'auditabilité." },
    ],
  },
} as const;

const PILLARS = [
  {
    icon: Zap,
    title: "Un espace pour commencer",
    description:
      "Explorez les outils disponibles, décrivez un besoin en langage naturel et découvrez comment Idealy structure une mission avant de commencer la construction.",
  },
  {
    icon: Gauge,
    title: "Une consommation transparente",
    description:
      "Vos points d'énergie représentent l'utilisation des ressources nécessaires aux missions. Leur consommation dépend de la portée et de la complexité du travail demandé.",
  },
  {
    icon: ShieldCheck,
    title: "Code propre & sans vendor-lock",
    description:
      "Tout le code produit est du React, TypeScript et Tailwind CSS standard. Vous pouvez télécharger le ZIP complet ou exporter directement vers GitHub.",
  },
] as const;

export const WelcomePage: React.FC = () => {
  const { setActivePage } = useApp();
  const [selectedWay, setSelectedWay] = useState<WayKey>("mage");
  const [yearly, setYearly] = useState(true);

  const activeWay = WAYS_DATA[selectedWay];

  const handleLaunchApp = () => {
    try {
      localStorage.setItem("idealy_session", "active");
      localStorage.setItem("idealy_user_way", selectedWay);
    } catch {
      /* ignore */
    }
    setActivePage("chat");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#08070d] text-zinc-100 flex flex-col overflow-y-auto selection:bg-teal-500/20 antialiased font-sans">
      {/* Cosmic Horizon Glow & Ambient Starlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute -top-[180px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px]"
          style={{
            background:
              "radial-gradient(55% 50% at 50% 20%, rgba(56, 189, 248, 0.16) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 80%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-[900px] left-0 w-[500px] h-[500px]"
          style={{
            background: `radial-gradient(circle, rgba(${activeWay.rgb}, 0.08) 0%, transparent 70%)`,
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-[1600px] right-0 w-[600px] h-[600px]"
          style={{
            background: "radial-gradient(circle, rgba(45, 212, 191, 0.06) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
      </div>

      {/* Top Navbar — Style Idealy Original & Minimalist */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#08070d]/80 backdrop-blur-xl px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600 grid place-items-center text-white font-bold text-sm shadow-[0_0_15px_rgba(45,212,191,0.35)]">
            ✦
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Idealy
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-400 border border-white/[0.08] tracking-wider uppercase">
            Bêta
          </span>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <button
            className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            onClick={() => scrollToSection("voies")}
            type="button"
          >
            Les Voies
          </button>
          <button
            className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            onClick={() => scrollToSection("tarifs")}
            type="button"
          >
            Tarifs
          </button>
          <button
            className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            onClick={() => setActivePage("login")}
            type="button"
          >
            Se connecter
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            onClick={handleLaunchApp}
            type="button"
          >
            <span>Lancer l'application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24 space-y-28">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Moteur d'ingénierie logicielle autonome</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12]">
            Vos idées logicielles,{" "}
            <span className="bg-gradient-to-r from-teal-300 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              devenues réalité sans compromis
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto font-normal">
            Un espace d'ingénierie conversationnel où Alvin orchestre votre escouade
            d'agents spécialisés pour concevoir, coder et prévisualiser vos applications
            web en temps réel.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.98] shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              onClick={handleLaunchApp}
              type="button"
            >
              <span>Lancer l'application</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              onClick={() => scrollToSection("tarifs")}
              type="button"
            >
              <span>Voir les offres & tarifs</span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          </div>

          {/* Command Bar / Régie Dispatch Showcase */}
          <div className="pt-10">
            <div className="rounded-2xl border border-white/[0.1] bg-[#0c0d14]/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden text-left p-4 sm:p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-500">
                    idealy-workspace — mission-active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                  </span>
                  <span className="text-[11px] text-teal-400 font-medium">Alvin en régie</span>
                </div>
              </div>

              {/* Prompt Emulation */}
              <div className="bg-[#141622] rounded-xl border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Prompt utilisateur :</span>
                </div>
                <p className="text-sm font-mono text-zinc-200">
                  "Crée un SaaS de facturation avec export PDF, aperçu interactif et calcul de TVA."
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    TypeScript
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    React 18
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    Tailwind CSS
                  </span>
                </div>
              </div>

              {/* Multi-Agent Live Dispatch Stream */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 grid place-items-center text-[10px] font-bold">
                    ⚡
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-200">Minato (Ninja)</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Scaffolding structurel & logique de calcul financier.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 grid place-items-center text-[10px] font-bold">
                    🔮
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-200">Erza (Mage)</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Mise en page des factures & design de l'aperçu PDF.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Showcase Interactif des 4 Voies (Exactement comme dans l'original) */}
        <section id="voies" className="space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Personnalisation
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Choisissez votre Voie
            </h2>
            <p className="text-sm text-zinc-400">
              Chaque voie façonne votre univers, le vocabulaire d'énergie et les spécialistes qui composent votre escouade.
            </p>

            {/* Sélecteur de Voies */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
              {(["ninja", "mage", "hunter", "professional"] as const).map((key) => {
                const w = WAYS_DATA[key];
                const active = selectedWay === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedWay(key)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                      active
                        ? "bg-white text-black shadow-lg scale-105"
                        : "bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.1]"
                    }`}
                  >
                    <span>Voie du {w.name}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold"
                      style={{
                        backgroundColor: active ? `rgba(${w.rgb}, 0.2)` : "transparent",
                        color: active ? `rgb(${w.rgb})` : "inherit",
                      }}
                    >
                      {w.resource}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Carte Active de la Voie Sélectionnée */}
          <div
            className="rounded-3xl border p-7 sm:p-9 transition-all duration-300"
            style={{
              background: `radial-gradient(120% 80% at 0% 0%, rgba(${activeWay.rgb}, 0.15), transparent 70%), #0c0d13`,
              borderColor: `rgba(${activeWay.rgb}, 0.35)`,
              boxShadow: `0 20px 60px -20px rgba(${activeWay.rgb}, 0.25)`,
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl overflow-hidden ring-2 shrink-0 shadow-lg"
                  style={{ borderColor: `rgb(${activeWay.rgb})` }}
                >
                  <img
                    alt={activeWay.chief}
                    className="w-full h-full object-cover"
                    src={activeWay.avatar}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-white">
                      Voie du {activeWay.name}
                    </h3>
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `rgba(${activeWay.rgb}, 0.2)`,
                        color: `rgb(${activeWay.rgb})`,
                      }}
                    >
                      {activeWay.resource}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Chef d'escouade : <strong className="text-zinc-200">{activeWay.chief}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLaunchApp}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-black bg-white hover:bg-zinc-200 transition-all self-start md:self-center shadow-md active:scale-95"
              >
                <span>Continuer avec cette Voie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-6 text-sm text-zinc-300 leading-relaxed max-w-2xl">
              {activeWay.description}
            </p>

            {/* Rôles Spécialistes de la Voie */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeWay.roles.map((r) => (
                <div
                  key={r.title}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5"
                >
                  <span className="text-xs font-bold text-white">{r.title}</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Les 3 Piliers de la Plateforme */}
        <section className="space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Conception
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Une ingénierie claire et maîtrisée
            </h2>
            <p className="text-sm text-zinc-400">
              Conçu pour vous donner le contrôle total sur votre application sans complexité superflue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d14] space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 grid place-items-center text-teal-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">{p.title}</h3>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section Tarifs Intégrée */}
        <section id="tarifs" className="space-y-10 pt-6">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Offres & Forfaits
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Des tarifs simples et transparents
            </h2>
            <p className="text-sm text-zinc-400">
              Commencez gratuitement. Passez au niveau supérieur lorsque vous êtes prêt.
            </p>

            {/* Toggle Mensuel / Annuel */}
            <div className="pt-2 flex justify-center">
              <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] p-1 text-xs font-medium backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setYearly(false)}
                  className={`rounded-full px-4 py-1.5 transition-all ${
                    !yearly
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setYearly(true)}
                  className={`rounded-full px-4 py-1.5 transition-all flex items-center gap-1.5 ${
                    yearly
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Annuel</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-bold">
                    2 mois offerts
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Découverte */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d14] p-7 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Découverte</h3>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">
                    Pour tester votre première idée et explorer l'espace.
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-white">0 €</span>
                  <span className="text-xs text-zinc-400">gratuit</span>
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-white/[0.08]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>200 {activeWay.resource} / mois</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Aperçu interactif dans le Sidecar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Export ZIP du code source</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleLaunchApp}
                className="mt-8 w-full py-3 rounded-xl border border-white/[0.12] bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition-all"
              >
                Commencer gratuitement
              </button>
            </div>

            {/* Pro */}
            <div className="relative rounded-3xl border-2 border-white/[0.2] bg-[#12131d] p-7 flex flex-col justify-between shadow-2xl ring-1 ring-white/[0.15]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white text-black shadow-md">
                Le plus populaire
              </div>
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">
                    Pour construire en continu avec la régie multi-agents.
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-white">
                    {yearly ? "15,90 €" : "19 €"}
                  </span>
                  <span className="text-xs text-zinc-400">/ mois</span>
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-white/[0.08]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>2 500 {activeWay.resource} / mois</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Régie complète (Alvin + Spécialistes)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Choix des modèles LLM de pointe</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Export et synchronisation GitHub</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setActivePage("pricing")}
                className="mt-8 w-full py-3 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-md active:scale-95"
              >
                Passer à Pro
              </button>
            </div>

            {/* Business */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0d14] p-7 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Business</h3>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">
                    Pour les équipes et organisations collaboratives.
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-white">
                    {yearly ? "40,90 €" : "49 €"}
                  </span>
                  <span className="text-xs text-zinc-400">/ mois</span>
                </div>
                <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-white/[0.08]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>4 000 {activeWay.resource} / mois</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Espaces d'équipe partagés</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Support dédié et registre MCP</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setActivePage("pricing")}
                className="mt-8 w-full py-3 rounded-xl border border-white/[0.12] bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition-all"
              >
                Rejoindre Business
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">Idealy</span>
            <span>— Workspace IA d'ingénierie logicielle.</span>
          </div>

          <div className="flex items-center gap-5">
            <button
              className="hover:text-zinc-300 transition-colors"
              onClick={() => setActivePage("terms")}
              type="button"
            >
              Conditions
            </button>
            <button
              className="hover:text-zinc-300 transition-colors"
              onClick={() => setActivePage("privacy")}
              type="button"
            >
              Confidentialité
            </button>
            <button
              className="hover:text-zinc-300 transition-colors"
              onClick={() => setActivePage("login")}
              type="button"
            >
              Se connecter
            </button>
            <button
              className="hover:text-zinc-300 transition-colors"
              onClick={handleLaunchApp}
              type="button"
            >
              Lancer l'application
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};