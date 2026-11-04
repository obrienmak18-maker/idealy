import { ArrowRight, Sparkles, Layers, Zap } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";

const WAYS = [
  {
    name: "Ninja",
    chief: "Minato",
    resource: "Chakra",
    rgb: "249,115,22",
    line: "Vitesse d'exécution maximale, fluidité absolue et itérations chirurgicales.",
    avatar: "/images/agents/Minato.jpg",
  },
  {
    name: "Mage",
    chief: "Erza",
    resource: "Mana",
    rgb: "139,92,246",
    line: "Créations inédites, sens du détail visuel et conception féerique.",
    avatar: "/images/agents/Erza.jpg",
  },
  {
    name: "Hunter",
    chief: "Netero",
    resource: "Nen",
    rgb: "20,184,166",
    line: "Décisions d'ingénierie maîtrisées, traque de failles et robustesse Clean.",
    avatar: "/images/agents/Netero.jpg",
  },
  {
    name: "Pro",
    chief: "Daniel",
    resource: "Énergie",
    rgb: "37,99,235",
    line: "Standards d'entreprise, sécurité de pointe et architectures pérennes.",
    avatar: "/images/agents/Daniel.jpg",
  },
] as const;

const STEPS = [
  {
    num: "01",
    title: "Décrivez",
    text: "Une phrase suffit. Idealy pose les bonnes questions de cadrage si une dépendance manque.",
    icon: Sparkles,
  },
  {
    num: "02",
    title: "Regardez",
    text: "Votre application se construit sous vos yeux, fichier par fichier, avec un aperçu immédiat.",
    icon: Layers,
  },
  {
    num: "03",
    title: "Ajustez",
    text: "Demandez un changement, un nouvel écran, une autre couleur. Le projet évolue avec vous.",
    icon: Zap,
  },
] as const;

export const WelcomePage: React.FC = () => {
  const { setActivePage } = useApp();

  return (
    <div className="min-h-screen w-full bg-[var(--dsw-alias-bg-base)] text-[var(--dsw-alias-label-primary)] flex flex-col overflow-y-auto selection:bg-[var(--idealy-indigo)]/20">
      {/* Top Navbar Autonome (Style ChatGPT / Linear) */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--dsw-alias-border-l3)]/80 bg-[var(--dsw-alias-bg-base)]/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] grid place-items-center text-white font-bold text-xs shadow-sm">
            ✦
          </div>
          <span className="text-base font-semibold tracking-tight text-[var(--dsw-alias-label-primary)]">
            Idealy
          </span>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            className="focus-ring px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
            onClick={() => setActivePage("pricing")}
            type="button"
          >
            Offres
          </button>
          <button
            className="focus-ring px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
            onClick={() => setActivePage("login")}
            type="button"
          >
            Se connecter
          </button>
          <button
            className="focus-ring inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs md:text-sm font-medium bg-[var(--dsw-alias-label-primary)] text-[var(--dsw-alias-bg-base)] hover:opacity-90 transition-opacity shadow-xs"
            onClick={() => setActivePage("chat")}
            type="button"
          >
            <span>Lancer l'application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </nav>
      </header>

      {/* Main Welcome Content */}
      <main className="relative flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-14 md:py-20">
        {/* Glow cosmétique en arrière-plan */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[460px] w-[860px] max-w-[140%] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(40% 50% at 30% 40%, rgba(45,212,191,0.18), transparent 70%), radial-gradient(40% 50% at 72% 45%, rgba(139,92,246,0.18), transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--idealy-teal-petrol)]/10 text-[var(--idealy-teal-petrol)] border border-[var(--idealy-teal-petrol)]/20">
            <span>✨ Nouvelle génération du moteur Idealy</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-[var(--dsw-alias-label-primary)] leading-[1.1]">
            Vos idées, devenues{" "}
            <span className="bg-gradient-to-r from-[var(--idealy-teal-petrol)] via-[var(--idealy-indigo)] to-[rgb(167,139,250)] bg-clip-text text-transparent">
              de vraies applications
            </span>
            .
          </h1>

          <p className="text-base sm:text-lg text-[var(--dsw-alias-label-secondary)] leading-relaxed max-w-xl mx-auto">
            Parlez à Idealy comme à un collègue d'ingénierie. Une scène avec régie,
            des agents spécialisés qui prennent le micro, réfléchissent à voix haute et
            produisent réellement votre code.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-full bg-[var(--dsw-alias-label-primary)] px-7 text-sm font-medium text-[var(--dsw-alias-bg-base)] transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
              onClick={() => setActivePage("chat")}
              type="button"
            >
              <span>Commencer maintenant</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              className="focus-ring inline-flex h-12 items-center rounded-full border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/60 px-6 text-sm font-medium text-[var(--dsw-alias-label-primary)] transition-colors hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
              onClick={() => setActivePage("pricing")}
              type="button"
            >
              Voir les offres
            </button>
          </div>
        </section>

        {/* 3 Étapes */}
        <section className="mt-24 sm:mt-32">
          <ol className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  className="relative p-6 rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)]/40 flex flex-col justify-between"
                  key={step.title}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono font-semibold text-[var(--dsw-alias-label-tertiary)]">
                        {step.num}
                      </span>
                      <Icon className="w-4 h-4 text-[var(--idealy-teal-petrol)]" />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--dsw-alias-label-primary)]">
                      {step.title}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--dsw-alias-label-secondary)]">
                      {step.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Les 4 Voies avec les Portraits Réels des Chefs */}
        <section className="mt-24 sm:mt-32">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--dsw-alias-label-primary)]">
              Choisissez votre voie.
            </h2>
            <p className="mt-2 text-sm text-[var(--dsw-alias-label-secondary)]">
              Chaque voie façonne votre univers, le vocabulaire d'énergie et les
              spécialistes qui composent votre escouade d'exécution.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WAYS.map((way) => (
              <div
                className="group relative rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
                key={way.name}
                style={{
                  background: `radial-gradient(110% 80% at 0% 0%, rgba(${way.rgb},0.12), transparent 65%), var(--dsw-alias-bg-layer-2)`,
                  borderColor: `rgba(${way.rgb},0.28)`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `rgba(${way.rgb},0.15)`,
                        color: `rgb(${way.rgb})`,
                      }}
                    >
                      {way.resource}
                    </span>

                    {/* Portrait réel du chef de voie */}
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden ring-2 shrink-0"
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

                  <h3 className="text-base font-semibold text-[var(--dsw-alias-label-primary)]">
                    Voie du {way.name}
                  </h3>
                  <p className="text-xs text-[var(--dsw-alias-label-tertiary)] font-medium mt-0.5">
                    Chef d'escouade : {way.chief}
                  </p>

                  <p className="mt-2.5 text-xs leading-relaxed text-[var(--dsw-alias-label-secondary)]">
                    {way.line}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-28 pt-8 border-t border-[var(--dsw-alias-border-l3)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--dsw-alias-label-tertiary)]">
          <p>© 2026 Idealy. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <button
              className="hover:text-[var(--dsw-alias-label-primary)] transition-colors"
              onClick={() => setActivePage("terms")}
              type="button"
            >
              Conditions
            </button>
            <button
              className="hover:text-[var(--dsw-alias-label-primary)] transition-colors"
              onClick={() => setActivePage("privacy")}
              type="button"
            >
              Confidentialité
            </button>
            <button
              className="hover:text-[var(--dsw-alias-label-primary)] transition-colors"
              onClick={() => setActivePage("pricing")}
              type="button"
            >
              Tarifs
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};
