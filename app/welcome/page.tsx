"use client";

import { ArrowRightIcon, CheckIcon, SparklesIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  wayPresentations,
  type IdealyWay,
} from "@/lib/idealy/product-contract";

const voices = [
  wayPresentations.mage,
  wayPresentations.ninja,
  wayPresentations.hunter,
  wayPresentations.professional,
] as const;

const plans = [
  {
    detail: "100 crédits de découverte pour tester des missions courtes. Le renouvellement n’est pas encore annoncé.",
    highlight: false,
    name: "Découverte",
    price: "100 crédits",
  },
  {
    detail: "Allocation, tarif et droits à publier uniquement après validation du catalogue Stripe côté serveur.",
    highlight: true,
    name: "Pro",
    price: "Bientôt configuré",
  },
  {
    detail: "Offre équipe à définir après configuration du catalogue de prix et des contrôles d’usage.",
    highlight: false,
    name: "Business",
    price: "Sur configuration",
  },
];

export default function WelcomePage() {
  const [step, setStep] = useState(0);
  const [selectedWay, setSelectedWay] = useState<IdealyWay>("mage");

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#09090f] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="welcome-orb welcome-orb-sky" />
        <div className="welcome-orb welcome-orb-sunset" />
        <div className="welcome-orb welcome-orb-gold" />
        <div className="welcome-grid" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link
          className="flex items-center gap-2 font-semibold tracking-tight"
          href="/welcome"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-violet-500 to-orange-400 shadow-lg shadow-violet-500/20">
            <SparklesIcon className="size-4" />
          </span>
          Idealy
        </Link>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            href="/login"
          >
            Se connecter
          </Link>
          <Link
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/85"
            href="/register"
          >
            Commencer
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:px-10 sm:pt-24">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
          <ZapIcon className="size-3.5 text-yellow-300" /> Votre espace pour
          transformer une idée en mission
        </div>
        <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          <span className="welcome-gradient-text">
            Construisez ce que vous imaginez.
          </span>
          <br />
          <span className="text-white/90">Une mission à la fois.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-white/60 sm:text-lg">
          Idealy vous aide à clarifier une idée, créer une application et
          avancer avec une équipe d’agents qui accompagne votre vision.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:scale-[1.02]"
            href="/register"
          >
            Lancer ma première mission{" "}
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/80 backdrop-blur transition hover:bg-white/10"
            href="#plans"
          >
            Voir les plans
          </a>
        </div>
        <div className="mt-14 grid gap-3 text-left sm:grid-cols-3">
          {[
            "Décrivez votre idée en langage naturel",
            "Observez votre projet se construire",
            "Itérez, exportez et partagez",
          ].map((item) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
              key={item}
            >
              <CheckIcon className="mb-3 size-4 text-emerald-300" />
              <p className="text-sm text-white/75">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="relative z-10 mx-auto max-w-5xl px-6 pb-20 sm:px-10"
        id="voices"
      >
        <div className="mb-7 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Votre façon de créer
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Choisissez votre Voie
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Vous pourrez la changer plus tard dans votre espace.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {voices.map((way) => {
            const selected = selectedWay === way.id;
            return (
              <button
                className={`rounded-2xl border p-4 text-left transition ${selected ? "border-white/45 bg-white/14 shadow-lg shadow-violet-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                key={way.id}
                onClick={() => setSelectedWay(way.id)}
                type="button"
              >
                <span
                  className={`mb-4 block h-1.5 w-14 rounded-full bg-gradient-to-r ${way.accentClassName}`}
                />
                <div className="flex items-center justify-between">
                  <span className="font-medium">{way.label}</span>
                  {selected ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-white text-black">
                      <CheckIcon className="size-3" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  {way.description}
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-7 flex justify-center">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/85"
            onClick={() => setStep(1)}
            type="button"
          >
            Continuer avec{" "}
            {wayPresentations[selectedWay].label} {" "}
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </section>

      <section
        className="relative z-10 mx-auto max-w-5xl px-6 pb-24 sm:px-10"
        id="plans"
      >
        <div className="mb-7 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Simple et transparent
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Commencez gratuitement
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Les offres payantes ne sont présentées comme disponibles qu’après
            vérification de leur catalogue et de leurs droits côté serveur.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              className={`rounded-2xl border p-5 ${plan.highlight ? "border-violet-400/45 bg-violet-400/10" : "border-white/10 bg-white/5"}`}
              key={plan.name}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{plan.name}</h3>
                {plan.highlight ? (
                  <span className="rounded-full bg-violet-300/15 px-2 py-1 text-[10px] text-violet-200">
                    Recommandé
                  </span>
                ) : null}
              </div>
              <p className="mt-5 text-2xl font-semibold">{plan.price}</p>
              <p className="mt-2 text-sm text-white/55">{plan.detail}</p>
              <Link
                className="mt-6 inline-flex text-sm text-white/80 underline-offset-4 hover:underline"
                href="/register"
              >
                Choisir ce plan
              </Link>
            </div>
          ))}
        </div>
      </section>

      {step > 0 ? (
        <div
          aria-label="Onboarding"
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-5 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#14131d]/95 p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs text-white/45">
                Étape {step + 1} sur 3
              </span>
              <button
                className="text-sm text-white/50 hover:text-white"
                onClick={() => setStep(0)}
                type="button"
              >
                Fermer
              </button>
            </div>
            {step === 1 ? (
              <>
                <h2 className="text-2xl font-semibold">
                  Quel est votre objectif ?
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Cela aide Idealy à proposer les bonnes missions dès votre
                  arrivée.
                </p>
                <div className="mt-5 grid gap-2">
                  {[
                    "Créer une application",
                    "Apprendre et explorer",
                    "Structurer un projet existant",
                  ].map((item) => (
                    <button
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm transition hover:bg-white/10"
                      key={item}
                      onClick={() => setStep(2)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold">
                  Votre espace est presque prêt.
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Créez votre compte pour conserver vos missions, votre Voie et
                  vos projets.
                </p>
                <div className="mt-6 grid gap-2">
                  <Link
                    className="rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-black"
                    href={`/register?way=${selectedWay}`}
                  >
                    Créer mon compte
                  </Link>
                  <Link
                    className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm text-white/80"
                    href="/login"
                  >
                    J’ai déjà un compte
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
