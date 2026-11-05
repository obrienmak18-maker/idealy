import {
  ArrowRight,
  Sparkles,
  Zap,
  Code,
  Check,
  Cpu,
  Workflow,
  ChevronRight,
  Flame,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

const WAYS = [
  {
    name: "Ninja",
    chief: "Minato",
    resource: "Chakra",
    rgb: "249,115,22",
    tagline: "Vitesse d'exécution maximale & itérations chirurgicales",
    line: "Conçu pour les créateurs qui veulent itérer à la vitesse de l'éclair, prototyper en quelques secondes et déployer sans friction.",
    avatar: "/images/agents/Minato.jpg",
  },
  {
    name: "Mage",
    chief: "Erza",
    resource: "Mana",
    rgb: "139,92,246",
    tagline: "Sens du détail visuel, UI soignée & créations inédites",
    line: "Idéal pour les interfaces haut de gamme, les animations ciselées et les expériences utilisateur qui marquent les esprits.",
    avatar: "/images/agents/Erza.jpg",
  },
  {
    name: "Hunter",
    chief: "Netero",
    resource: "Nen",
    rgb: "20,184,166",
    tagline: "Rigueur d'ingénierie, traque des failles & Clean Architecture",
    line: "Pensé pour la robustesse algorithmique, la couverture de tests et les architectures applicatives solides et pérennes.",
    avatar: "/images/agents/Netero.jpg",
  },
  {
    name: "Pro",
    chief: "Daniel",
    resource: "Énergie",
    rgb: "37,99,235",
    tagline: "Standards d'entreprise, sécurité & conformité de production",
    line: "Parfait pour les systèmes critiques, les intégrations d'entreprise, la scalabilité et les flux de données sensibles.",
    avatar: "/images/agents/Daniel.jpg",
  },
] as const;

const FEATURES = [
  {
    title: "Régie d'Agents Spécialisés",
    description:
      "Alvin coordonne une escouade de spécialistes (architecte, UI designer, QA, DevOps) qui collaborent en temps réel sur votre code.",
    icon: Workflow,
    badge: "Multi-Agents",
  },
  {
    title: "Génération Full-Stack Réelle",
    description:
      "Pas de simple code factice. Idealy génère des projets TypeScript, React et Tailwind prêts pour la production, sans vendor-lock.",
    icon: Code,
    badge: "TypeScript & React",
  },
  {
    title: "Aperçu & Itérations Immédiates",
    description:
      "Visualisez instantanément chaque composant dans le Sidecar. Ajustez les détails d'un simple prompt conversationnel.",
    icon: Zap,
    badge: "Temps Réel",
  },
  {
    title: "Écosystème & Connecteurs",
    description:
      "Intégrez vos dépôts GitHub, bases Supabase, déploiements Vercel ou Netlify sans quitter votre espace de travail.",
    icon: Cpu,
    badge: "Extensible",
  },
] as const;

const PLANS = [
  {
    id: "free",
    name: "Découverte",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Pour explorer le workspace et prototyper vos premières idées.",
    features: [
      "200 Power d'énergie / mois",
      "Aperçu interactif dans le Sidecar",
      "Génération React & Tailwind complète",
      "Export ZIP du projet prêt à l'emploi",
      "Modèles de démarrage SaaS & UI",
    ],
    cta: "Commencer gratuitement",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 19,
    yearlyPrice: 15.9,
    description: "Pour construire en continu avec la régie complète et des modèles avancés.",
    features: [
      "2 500 Power d'énergie / mois",
      "Régie multi-agents complète (Alvin + Spécialistes)",
      "Choix des modèles LLM de pointe",
      "Synchronisation & export direct GitHub",
      "Déploiement Vercel & Supabase en 1 clic",
      "Historique illimité et espaces de travail",
    ],
    cta: "Démarrer avec Pro",
    highlight: true,
    badge: "Le plus populaire",
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 49,
    yearlyPrice: 40.9,
    description: "Pour les startups et équipes qui construisent des produits complets.",
    features: [
      "4 000 Power d'énergie / mois",
      "Espaces partagés & collaboration en temps réel",
      "Connecteurs sur-mesure & registre MCP",
      "Priorité haute sur les temps de réponse",
      "Accès anticipé aux nouvelles Voies & fonctionnalités",
      "Support dédié par nos ingénieurs",
    ],
    cta: "Rejoindre Business",
    highlight: false,
  },
] as const;

export const WelcomePage: React.FC = () => {
  const { setActivePage } = useApp();
  const [yearly, setYearly] = useState(true);

  const scrollToPricing = () => {
    const el = document.getElementById("tarifs");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      setActivePage("pricing");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07080a] text-zinc-100 flex flex-col overflow-y-auto selection:bg-teal-500/20 antialiased font-sans">
      {/* Raycast Ambient Background Lighting */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
      >
        <div
          className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[550px]"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 30%, rgba(45, 212, 191, 0.12) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 100%)",
            filter: "blur(70px)",
          }}
        />
        <div
          className="absolute top-[800px] -left-[200px] w-[600px] h-[600px]"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute top-[1400px] -right-[200px] w-[600px] h-[600px]"
          style={{
            background: "radial-gradient(circle, rgba(45, 212, 191, 0.05) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
      </div>

      {/* Top Navbar — Raycast Minimalist Style */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-[#07080a]/80 backdrop-blur-xl px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 via-indigo-500 to-purple-600 grid place-items-center text-white font-bold text-sm shadow-[0_0_15px_rgba(45,212,191,0.35)]">
            ✦
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Idealy
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-zinc-400 border border-white/[0.08] tracking-wider uppercase">
            v2.0
          </span>
        </div>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <button
            className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            onClick={scrollToPricing}
            type="button"
          >
            Tarifs
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            onClick={() => setActivePage("login")}
            type="button"
          >
            Se connecter
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            onClick={() => setActivePage("chat")}
            type="button"
          >
            <span>Lancer l'application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24 space-y-28">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Moteur d'ingénierie logicielle autonome</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12]">
            Transformez vos idées en{" "}
            <span className="bg-gradient-to-r from-teal-300 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              vraies applications web
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto font-normal">
            Décrivez votre vision en langage naturel. Alvin et votre escouade d'agents spécialisés
            prennent en charge la conception, rédigent du code TypeScript propre et déploient vos projets sous vos yeux.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-black transition-all hover:bg-zinc-200 active:scale-[0.98] shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              onClick={() => setActivePage("chat")}
              type="button"
            >
              <span>Commencer maintenant</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              onClick={scrollToPricing}
              type="button"
            >
              <span>Découvrir les offres</span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          </div>

          {/* Raycast Interactive Command Bar Showcase */}
          <div className="pt-10">
            <div className="rounded-2xl border border-white/[0.1] bg-[#0d0e13]/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden text-left p-4 sm:p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-500">idealy-workspace — alvin-regie</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                  </span>
                  <span className="text-[11px] text-teal-400 font-medium">Prêt pour exécution</span>
                </div>
              </div>

              {/* Prompt Box Emulation */}
              <div className="bg-[#14161f] rounded-xl border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Prompt utilisateur :</span>
                </div>
                <p className="text-sm font-mono text-zinc-200">
                  "Crée un dashboard SaaS avec métriques Stripe en temps réel, authentification et export CSV."
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    TypeScript
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    Tailwind CSS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    Lucide Icons
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                    React 18
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
                    <p className="text-zinc-400 text-[11px] mt-0.5">Scaffolding architecture & schéma des routes d'API.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 grid place-items-center text-[10px] font-bold">
                    🔮
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-200">Erza (Mage)</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5">Composants UI, micro-interactions & thème sombre.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Core Features Cards — Raycast Grid */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Une chaîne de production d'exception
            </h2>
            <p className="text-sm text-zinc-400">
              Chaque détail a été pensé pour accélérer votre développement sans jamais sacrifier la propreté du code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative p-6 rounded-2xl border border-white/[0.08] bg-[#0b0c10] hover:bg-[#101217] transition-all duration-300 hover:border-white/[0.16] flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 grid place-items-center text-teal-300">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400">
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white tracking-tight pt-1">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Les 4 Voies — Chefs d'Escouade & Spécialités */}
        <section className="space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Votre signature énergétique</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Choisissez votre Voie
            </h2>
            <p className="text-sm text-zinc-400">
              Chaque voie façonne votre univers, le vocabulaire d'énergie et les spécialistes qui composent votre escouade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WAYS.map((way) => (
              <div
                key={way.name}
                className="group relative rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                style={{
                  background: `radial-gradient(110% 80% at 0% 0%, rgba(${way.rgb}, 0.12), transparent 70%), #0c0d12`,
                  borderColor: `rgba(${way.rgb}, 0.25)`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `rgba(${way.rgb}, 0.15)`,
                        color: `rgb(${way.rgb})`,
                      }}
                    >
                      {way.resource}
                    </span>

                    <div
                      className="w-10 h-10 rounded-full overflow-hidden ring-2 shrink-0 shadow-md"
                      style={{ borderColor: `rgb(${way.rgb})` }}
                      title={`Chef : ${way.chief}`}
                    >
                      <img
                        alt={way.chief}
                        className="w-full h-full object-cover"
                        src={way.avatar}
                      />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    Voie du {way.name}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Chef : {way.chief}
                  </p>

                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                    {way.line}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integrated Pricing Section — Raycast Tier Cards */}
        <section id="tarifs" className="pt-8 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Des tarifs simples et transparents
            </h2>
            <p className="text-sm text-zinc-400">
              Commencez gratuitement, passez au forfait supérieur quand votre projet prend de l'ampleur.
            </p>

            {/* Billing Toggle (Mensuel / Annuel -20%) */}
            <div className="pt-3 inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  yearly
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Annuel</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-500/20 text-teal-700 font-bold">
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                    plan.highlight
                      ? "border-2 border-teal-400/60 bg-[#0e1017] shadow-[0_0_40px_rgba(45,212,191,0.15)] ring-1 ring-teal-400/20"
                      : "border border-white/[0.08] bg-[#0a0b0e] hover:border-white/[0.14]"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-teal-400 to-indigo-500 text-black shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-white tracking-tight">
                        {price === 0 ? "0 €" : `${price.toFixed(price % 1 ? 2 : 0)} €`}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        / mois {yearly && price > 0 ? "(facturé à l'année)" : ""}
                      </span>
                    </div>

                    <div className="h-px w-full bg-white/[0.08]" />

                    <ul className="space-y-2.5 text-xs text-zinc-300">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => {
                        if (plan.id === "free") {
                          setActivePage("chat");
                        } else {
                          setActivePage("pricing");
                        }
                      }}
                      className={`w-full py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        plan.highlight
                          ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                          : "border border-white/[0.12] bg-white/[0.05] text-white hover:bg-white/[0.1] active:scale-[0.98]"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer — Minimalist Raycast Style */}
        <footer className="pt-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-400">Idealy</span>
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
              onClick={() => setActivePage("chat")}
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