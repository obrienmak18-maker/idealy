import { ArrowRight } from "lucide-react";
import type React from "react";
import { useApp } from "../../context/AppContext";
import { PageFrame } from "../layout/PageFrame";

const WAYS = [
  { name: "Ninja", resource: "Chakra", rgb: "249,115,22", line: "Vitesse et itérations précises." },
  { name: "Mage", resource: "Mana", rgb: "139,92,246", line: "Créations inédites, sens du détail." },
  { name: "Hunter", resource: "Nen", rgb: "20,184,166", line: "Décisions techniques maîtrisées." },
  { name: "Pro", resource: "Énergie", rgb: "217,70,239", line: "Logiciels solides et durables." },
] as const;

const STEPS = [
  ["Décrivez", "Une phrase suffit. Idealy pose les bonnes questions si quelque chose manque."],
  ["Regardez", "Votre application se construit sous vos yeux, étape par étape, avec un aperçu en direct."],
  ["Ajustez", "Demandez un changement, une page de plus, une autre couleur. Le projet évolue avec vous."],
] as const;

export const WelcomePage: React.FC = () => {
  const { setActivePage } = useApp();
  return (
    <PageFrame label="Bienvenue">
      <div className="relative mx-auto max-w-4xl pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-[420px] w-[820px] max-w-[140%] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(40% 50% at 30% 40%, rgba(45,212,191,0.16), transparent 70%), radial-gradient(40% 50% at 72% 45%, rgba(139,92,246,0.16), transparent 70%)",
            filter: "blur(36px)",
          }}
        />

        <section className="pt-10 text-center sm:pt-20">
          <h1 className="mx-auto max-w-3xl text-balance text-[36px] font-medium leading-[1.08] tracking-[-0.03em] text-text-main sm:text-[60px]">
            Vos idées, devenues{" "}
            <span className="bg-gradient-to-r from-[var(--idealy-teal-petrol)] via-[var(--idealy-indigo)] to-[rgb(167,139,250)] bg-clip-text text-transparent">
              de vraies applications
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-relaxed text-text-muted sm:text-[18px]">
            Parlez à Idealy comme à un collègue. Il conçoit, construit et vous montre le résultat au fur et à mesure.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              className="focus-ring inline-flex h-12 items-center gap-2 rounded-full bg-text-main px-6 text-[15px] font-medium text-bg-base transition-opacity hover:opacity-90"
              onClick={() => setActivePage("chat")}
              type="button"
            >
              Commencer
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              className="focus-ring inline-flex h-12 items-center rounded-full border border-border-subtle px-6 text-[15px] text-text-main transition-colors hover:bg-bg-subtle"
              onClick={() => setActivePage("pricing")}
              type="button"
            >
              Voir les offres
            </button>
          </div>
        </section>

        <section className="mt-24 sm:mt-32">
          <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <p className="text-[13px] tabular-nums text-text-muted">0{i + 1}</p>
                <h2 className="mt-2 text-[20px] font-medium tracking-tight text-text-main">{title}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-24 sm:mt-32">
          <h2 className="text-[24px] font-medium tracking-[-0.02em] text-text-main sm:text-[30px]">Choisissez votre voie.</h2>
          <p className="mt-2 max-w-[52ch] text-[15px] text-text-muted">Chaque voie donne son nom à votre énergie de création. Vous pouvez en changer quand vous le voulez.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WAYS.map((way) => (
              <div
                className="rounded-2xl border p-5"
                key={way.name}
                style={{
                  background: `radial-gradient(110% 80% at 0% 0%, rgba(${way.rgb},0.14), transparent 65%), var(--dsw-alias-bg-layer-2)`,
                  borderColor: `rgba(${way.rgb},0.28)`,
                }}
              >
                <p className="text-[12px] uppercase tracking-wider" style={{ color: `rgb(${way.rgb})` }}>{way.resource}</p>
                <h3 className="mt-1 text-[18px] font-medium text-text-main">Voie du {way.name}</h3>
                <p className="mt-2 text-[13.5px] leading-snug text-text-muted">{way.line}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageFrame>
  );
};
