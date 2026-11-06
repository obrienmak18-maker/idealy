import {
  ArrowRight,
  Check,
  ChevronRight,
  Gauge,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { voiesCatalog } from "../../services/voies-catalog";
import { IdealyMark } from "../branding/IdealyLogo";

type WayKey = "ninja" | "mage" | "hunter" | "professional";

const WAYS_DATA = {
  hunter: {
    avatar: "/images/agents/Netero.jpg",
    chief: "Netero",
    description:
      "Pensé pour la solidité algorithmique, la couverture de tests et les architectures applicatives pérennes.",
    name: "Hunter",
    resource: "Nen",
    rgb: "20,184,166",
    roles: [
      {
        desc: "Pose les fondations et isole les responsabilités.",
        title: "Architecte",
      },
      {
        desc: "Rédige du code typé, testable et optimisé.",
        title: "Constructeur",
      },
      {
        desc: "Traque les régressions et audite la sécurité.",
        title: "Vérificateur",
      },
    ],
    tagline: "Rigueur d'ingénierie, traque des failles & robustesse Clean",
  },
  mage: {
    avatar: "/images/agents/Erza.jpg",
    chief: "Erza",
    description:
      "Pour les interfaces haut de gamme, les animations ciselées et les expériences utilisateur qui marquent les esprits.",
    name: "Mage",
    resource: "Mana",
    rgb: "139,92,246",
    roles: [
      {
        desc: "Conçoit l'expérience et le rythme visuel global.",
        title: "Architecte",
      },
      {
        desc: "Compose des interfaces somptueuses et réactives.",
        title: "Constructeur",
      },
      {
        desc: "Peaufine les micro-détails graphiques et thèmes.",
        title: "Vérificateur",
      },
    ],
    tagline: "Sens du détail visuel, UI soignée & créations féeriques",
  },
  ninja: {
    avatar: "/images/agents/Minato.jpg",
    chief: "Minato",
    description:
      "Pour les créateurs qui veulent itérer à la vitesse de l'éclair, prototyper en quelques secondes et déployer sans friction.",
    name: "Ninja",
    resource: "Chakra",
    rgb: "249,115,22",
    roles: [
      {
        desc: "Clarifie le besoin et structure les routes sans délai.",
        title: "Architecte",
      },
      {
        desc: "Assemble l'interface et la logique avec agilité.",
        title: "Constructeur",
      },
      {
        desc: "Contrôle la fluidité et le rendu immédiat.",
        title: "Vérificateur",
      },
    ],
    tagline: "Vitesse d'exécution maximale & itérations chirurgicales",
  },
  professional: {
    avatar: "/images/agents/Daniel.jpg",
    chief: "Daniel",
    description:
      "Parfait pour les systèmes critiques, les intégrations d'entreprise, la scalabilité et les flux de données sensibles.",
    name: "Pro",
    resource: "Énergie",
    rgb: "37,99,235",
    roles: [
      {
        desc: "Cadre la conformité et les schémas d'intégration.",
        title: "Architecte",
      },
      {
        desc: "Implémente les normes d'ingénierie industrielle.",
        title: "Constructeur",
      },
      {
        desc: "Valide la gouvernance, les rôles et l'auditabilité.",
        title: "Vérificateur",
      },
    ],
    tagline: "Standards d'entreprise, sécurité & conformité de production",
  },
} as const;

const PILLARS = [
  {
    description:
      "Explorez les outils disponibles, décrivez un besoin en langage naturel et découvrez comment Idealy structure une mission avant de commencer la construction.",
    icon: Zap,
    title: "Un espace pour commencer",
  },
  {
    description:
      "Vos points d'énergie représentent l'utilisation des ressources nécessaires aux missions. Leur consommation dépend de la portée et de la complexité du travail demandé.",
    icon: Gauge,
    title: "Une consommation transparente",
  },
  {
    description:
      "Vous pouvez évaluer Idealy sans carte bancaire. Les formules sont présentées à titre indicatif avant l’ouverture des paiements.",
    icon: ShieldCheck,
    title: "Pas de paiement pendant la bêta",
  },
] as const;

export const WelcomePage: React.FC = () => {
  const { setActivePage } = useApp();
  const [selectedWay, setSelectedWay] = useState<WayKey>("mage");
  const [yearly, setYearly] = useState(true);

  const activeWay = WAYS_DATA[selectedWay];
  const activeWayProfile = voiesCatalog[selectedWay];

  const handleLaunchApp = () => {
    setActivePage("login");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="idealy-reference-welcome relative min-h-screen w-full bg-[#08070d] text-zinc-100 flex flex-col overflow-y-auto selection:bg-teal-500/20 antialiased font-sans">
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
            background:
              "radial-gradient(circle, rgba(45, 212, 191, 0.06) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
      </div>

      {/* Top Navbar — Style Idealy Original & Minimalist */}
      <header className="idealy-reference-welcome__header sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#08070d]/80 backdrop-blur-xl px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IdealyMark animated={false} size={32} />
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
            onClick={() => scrollToSection("product")}
            type="button"
          >
            Produit
          </button>
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
            className="hidden text-xs sm:inline-flex sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            onClick={() => setActivePage("docs")}
            type="button"
          >
            Documentation
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
      <main className="idealy-reference-welcome__main flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24 space-y-28">
        {/* Hero adapted from the reference branch: clear story, type-led, no fake workspace mockup. */}
        <section
          className="idealy-reference-welcome__hero relative z-10 mx-auto max-w-5xl px-4 pb-6 pt-10 text-center sm:px-8 sm:pt-14"
          id="product"
        >
          <div className="idealy-reference-welcome__badge mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-md">
            <Sparkles aria-hidden="true" className="size-3.5" />
            <span>Atelier d’ingénierie logicielle</span>
          </div>

          <h1 className="idealy-reference-welcome__title mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Transformez une idée <span>en projet concret.</span>
          </h1>

          <div
            aria-label="Clarifiez, construisez et faites évoluer votre application"
            className="idealy-reference-welcome__typewriter mx-auto mt-6 flex min-h-9 items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span className="idealy-reference-welcome__typewriter-text">
              Clarifiez. Construisez. Faites évoluer.
            </span>
            <span
              aria-hidden="true"
              className="idealy-reference-welcome__cursor"
            />
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
            Décrivez votre objectif, suivez le travail des agents spécialisés et
            faites avancer votre application dans un espace où conversation,
            code et aperçu restent liés.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              className="idealy-reference-welcome__primary group inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-semibold transition active:scale-[.98]"
              onClick={handleLaunchApp}
              type="button"
            >
              Commencer un projet{" "}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </button>
            <button
              className="idealy-reference-welcome__secondary rounded-2xl border px-6 py-3.5 text-center text-sm font-medium transition"
              onClick={() => scrollToSection("tarifs")}
              type="button"
            >
              Découvrir les offres{" "}
              <ChevronRight aria-hidden="true" className="ml-1 inline size-4" />
            </button>
          </div>

          <div className="idealy-reference-welcome__steps mt-14 grid gap-3 text-left sm:grid-cols-3">
            {[
              [
                "01",
                "Clarifiez votre idée",
                "Définissez un objectif et choisissez la façon de travailler qui vous correspond.",
              ],
              [
                "02",
                "Suivez le travail",
                "Voyez les rôles et les étapes prendre forme au fil de votre mission.",
              ],
              [
                "03",
                "Gardez la main",
                "Retrouvez le code, l’aperçu et les décisions dans votre espace de projet.",
              ],
            ].map(([number, title, description]) => (
              <article
                className="idealy-reference-welcome__step rounded-2xl border p-5 backdrop-blur-xl"
                key={number}
              >
                <span className="idealy-reference-welcome__step-number">
                  {number}
                </span>
                <h2 className="mt-4 text-sm font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Showcase Interactif des 4 Voies (Exactement comme dans l'original) */}
        <section className="space-y-10" id="voies">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Personnalisation
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Choisissez votre Voie
            </h2>
            <p className="text-sm text-zinc-400">
              Chaque voie façonne votre univers, le vocabulaire d'énergie et les
              spécialistes qui composent votre escouade.
            </p>

            {/* Sélecteur de Voies */}
            <div className="idealy-reference-welcome__way-grid pt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["ninja", "mage", "hunter", "professional"] as const).map(
                (key) => {
                  const w = WAYS_DATA[key];
                  const active = selectedWay === key;
                  const team = voiesCatalog[key];
                  return (
                    <button
                      aria-pressed={active}
                      className={`idealy-reference-welcome__way-card group rounded-2xl border p-4 text-left transition-all duration-200 ${
                        active
                          ? "is-active border-white/20 bg-white/[0.08]"
                          : "border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]"
                      }`}
                      key={key}
                      onClick={() => setSelectedWay(key)}
                      type="button"
                    >
                      <span
                        className="mb-3 block h-1 w-11 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, rgba(${w.rgb},1), rgba(${w.rgb},.3))`,
                        }}
                      />
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          Voie du {w.name}
                        </span>
                        <span className="idealy-reference-welcome__resource-tag">
                          {w.resource}
                        </span>
                      </span>
                      <span className="mt-2 block min-h-10 text-xs leading-relaxed text-zinc-400">
                        {w.tagline}
                      </span>
                      <span className="mt-4 flex items-center">
                        <span className="idealy-reference-welcome__avatar-stack">
                          {team.agents.slice(0, 5).map((agent) => (
                            <img
                              alt=""
                              key={agent.name}
                              src={agent.avatarUrl}
                              title={`${agent.name} · ${agent.role}`}
                            />
                          ))}
                        </span>
                        <span className="ml-2 text-[10px] text-zinc-500">
                          {team.agents.length} spécialistes
                        </span>
                      </span>
                    </button>
                  );
                }
              )}
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
                    Chef d'escouade :{" "}
                    <strong className="text-zinc-200">{activeWay.chief}</strong>
                  </p>
                </div>
              </div>

              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-black bg-white hover:bg-zinc-200 transition-all self-start md:self-center shadow-md active:scale-95"
                onClick={handleLaunchApp}
                type="button"
              >
                <span>Continuer avec cette Voie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-300">
              {activeWay.description}
            </p>

            <div className="idealy-reference-welcome__stats mt-7 grid grid-cols-2 gap-4 border-y border-white/[0.08] py-5 sm:grid-cols-4">
              {(
                [
                  ["Vitesse", activeWayProfile.stats.speed],
                  ["Créativité", activeWayProfile.stats.creativity],
                  ["Stratégie", activeWayProfile.stats.strategy],
                  ["Robustesse", activeWayProfile.stats.robustness],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[.12em] text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-100">
                    {value}
                    <span className="ml-0.5 text-xs text-zinc-500">%</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Rôles Spécialistes de la Voie */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeWay.roles.map((r) => (
                <div
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5"
                  key={r.title}
                >
                  <span className="text-xs font-bold text-white">
                    {r.title}
                  </span>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Les 3 Piliers de la Plateforme */}
        <section className="space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Bêta · accès d’évaluation
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Découvrez Idealy pendant la bêta
            </h2>
            <p className="text-sm text-zinc-400">
              Cette phase nous permet d’améliorer la qualité des missions, la
              fiabilité des résultats et l’expérience de l’espace de travail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0d14] space-y-3"
                  key={p.title}
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
          <p className="idealy-reference-welcome__beta-note mt-7 rounded-2xl border px-5 py-4 text-center text-xs leading-relaxed">
            Pendant la bêta, aucun paiement n’est demandé pour découvrir Idealy.
            Les formules affichées présentent les offres envisagées.
          </p>
        </section>

        {/* Section Tarifs Intégrée */}
        <section className="space-y-10 pt-6" id="tarifs">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              Offres & Forfaits
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Des tarifs simples et transparents
            </h2>
            <p className="text-sm text-zinc-400">
              Commencez gratuitement. Passez au niveau supérieur lorsque vous
              êtes prêt.
            </p>

            {/* Toggle Mensuel / Annuel */}
            <div className="pt-2 flex justify-center">
              <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] p-1 text-xs font-medium backdrop-blur-md">
                <button
                  className={`rounded-full px-4 py-1.5 transition-all ${
                    yearly
                      ? "text-zinc-400 hover:text-white"
                      : "bg-white text-black font-semibold shadow-sm"
                  }`}
                  onClick={() => setYearly(false)}
                  type="button"
                >
                  Mensuel
                </button>
                <button
                  className={`rounded-full px-4 py-1.5 transition-all flex items-center gap-1.5 ${
                    yearly
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  onClick={() => setYearly(true)}
                  type="button"
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
                  <span className="text-4xl font-extrabold text-white">
                    0 €
                  </span>
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
                className="mt-8 w-full py-3 rounded-xl border border-white/[0.12] bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition-all"
                onClick={handleLaunchApp}
                type="button"
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
                className="mt-8 w-full py-3 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-md active:scale-95"
                onClick={() => setActivePage("pricing")}
                type="button"
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
                className="mt-8 w-full py-3 rounded-xl border border-white/[0.12] bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08] transition-all"
                onClick={() => setActivePage("pricing")}
                type="button"
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
