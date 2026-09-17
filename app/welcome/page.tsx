"use client";

import {
  ArrowRightIcon,
  Brain,
  CheckIcon,
  Code2,
  Globe,
  Layers,
  Moon,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Users,
  Zap,
  Activity,
  Gauge,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

import { IdealyLogo } from "@/components/branding/idealy-logo";
import { TypewriterHero } from "@/components/branding/typewriter-hero";
import {
  type IdealyWay,
  wayPresentations,
} from "@/lib/idealy/product-contract";
import {
  type SupportedLanguage,
  welcomeTranslations,
} from "@/lib/i18n/welcome-translations";
import { useTranslation } from "@/lib/i18n/provider";
import { alvinMessenger, voiesCatalog, type WayDetailed } from "@/lib/idealy/voies-catalog";
import { PRO_PACK_OPTIONS } from "@/lib/idealy/power-policy";

export default function WelcomePage() {
  const { language: lang, setLanguage: handleLangChange } = useTranslation();
  const [step, setStep] = useState(0);
  const [selectedWay, setSelectedWay] = useState<IdealyWay>("ninja");
  const [proTierIndex, setProTierIndex] = useState(0);
  
  // Power estimator states (intuitive dual dials)
  const [simpleCount, setSimpleCount] = useState(20);
  const [squadCount, setSquadCount] = useState(8);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = welcomeTranslations[lang] || welcomeTranslations.fr;
  const activeWayData: WayDetailed = voiesCatalog[selectedWay] || voiesCatalog.ninja;

  // Pro tier custom point options — source de vérité = power-policy.ts
  const proOptions = PRO_PACK_OPTIONS.map((o) => ({
    points: o.points,
    price: `${o.priceEur} €`,
    label: o.label,
    simples: Math.floor(o.points / 10),
    squads: Math.floor(o.points / 50),
  }));
  const selectedProOption = proOptions[proTierIndex];

  // Calculated points from estimator
  const calculatedPoints = simpleCount * 10 + squadCount * 50;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#09090f] text-white selection:bg-violet-500 selection:text-white">
      {/* High-Energy Colliding Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="welcome-orb welcome-orb-sky" />
        <div className="welcome-orb welcome-orb-sunset" />
        <div className="welcome-orb welcome-orb-gold" />
        <div className="welcome-grid" />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        <Link
          className="flex items-center gap-3 font-semibold tracking-tight transition-transform hover:scale-105"
          href="/welcome"
        >
          <IdealyLogo animated size={34} />
        </Link>

        {/* Center links */}
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-xl md:flex">
          <Link
            className="rounded-full px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            href="#product"
          >
            {t.nav.product}
          </Link>
          <Link
            className="rounded-full px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            href="#voices"
          >
            {t.nav.ways}
          </Link>
          <Link
            className="rounded-full px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            href="#squad"
          >
            {t.nav.squad}
          </Link>
          <Link
            className="rounded-full px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            href="#plans"
          >
            {t.nav.pricing}
          </Link>
          <Link
            className="rounded-full px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            href="/docs"
          >
            {t.nav.docs}
          </Link>
        </div>

        {/* Right tools (Language, Theme, Auth) */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur">
            <Globe className="ml-1.5 mr-1 size-3.5 text-white/50" />
            {(["fr", "en", "es"] as const).map((l) => (
              <button
                className={`rounded-lg px-2 py-0.5 text-xs font-medium uppercase transition ${
                  lang === l
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-white/50 hover:text-white"
                }`}
                key={l}
                onClick={() => handleLangChange(l)}
                type="button"
              >
                {l}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          {mounted ? (
            <button
              aria-label="Toggle Theme"
              className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 backdrop-blur transition hover:bg-white/15 hover:text-white"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              type="button"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4 text-amber-300" />
              ) : (
                <Moon className="size-4 text-sky-300" />
              )}
            </button>
          ) : null}

          {/* Auth Actions */}
          <Link
            className="hidden rounded-xl px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            href="/login"
          >
            {t.nav.signIn}
          </Link>
          <Link
            className="rounded-xl bg-gradient-to-r from-sky-400 via-violet-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90 active:scale-95"
            href="/register"
          >
            {t.nav.getStarted}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-12 text-center sm:px-10 sm:pt-16"
        id="product"
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-200 backdrop-blur-md"
          initial={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="size-3.5 text-sky-300 animate-pulse" />
          <span>{t.hero.badge}</span>
        </motion.div>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="welcome-gradient-text">{t.hero.title1}</span>
          <br />
          <span className="text-white/95">{t.hero.title2}</span>
        </motion.h1>

        {/* Animated Typewriter with Magic Pen Mascot */}
        <TypewriterHero lang={lang} />

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/65 sm:text-lg"
          initial={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {t.hero.subtitle}
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black shadow-xl shadow-white/10 transition hover:bg-white/90 active:scale-95"
            href="/register"
          >
            {t.hero.ctaPrimary}
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/85 backdrop-blur-md transition hover:bg-white/10"
            href="#plans"
          >
            {t.hero.ctaSecondary}
          </a>
        </motion.div>

        {/* 3 Step highlights */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-14 grid gap-4 text-left sm:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {t.hero.features.map((item, idx) => (
            <div
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.07]"
              key={item}
            >
              <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10">
                <span className="text-xs font-bold text-sky-300">0{idx + 1}</span>
              </div>
              <p className="text-sm font-medium leading-snug text-white/80">
                {item}
              </p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Voies (Ways) Section avec Avatars Réels & Stats */}
      <section
        className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:px-10"
        id="voices"
      >
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
            <Layers className="size-3.5" />
            {t.waysSection.tag}
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.waysSection.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            {t.waysSection.explanation}
          </p>
        </div>

        {/* 4 Ways Selector */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["ninja", "mage", "hunter", "professional"] as const).map(
            (wayKey) => {
              const wayItem = voiesCatalog[wayKey];
              const isSelected = selectedWay === wayKey;

              return (
                <button
                  className={`group relative flex flex-col justify-between rounded-3xl border p-5 text-left transition ${
                    isSelected
                      ? "border-white/45 bg-white/[0.12] shadow-2xl"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                  key={wayKey}
                  onClick={() => setSelectedWay(wayKey)}
                  type="button"
                >
                  <div>
                    <div
                      className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${wayItem.accentClassName} mb-3`}
                    />
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">
                        {t.waysSection.ways[wayKey]?.name || wayItem.label}
                      </h3>
                      {isSelected ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-white text-black shadow-md">
                          <CheckIcon className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-medium text-white/60">
                      {lang === "en" ? "Resource: " : lang === "es" ? "Recurso: " : "Ressource : "}
                      <span className="font-bold text-white">
                        {t.waysSection.ways[wayKey]?.resource || wayItem.resourceLabel}
                      </span>
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">
                      {t.waysSection.ways[wayKey]?.desc || wayItem.philosophy}
                    </p>
                  </div>

                  {/* Micro Avatars Row */}
                  <div className="mt-5 flex items-center -space-x-2">
                    {wayItem.agents.slice(0, 5).map((ag) => (
                      <div
                        className="relative size-8 overflow-hidden rounded-full border-2 border-[#09090f] bg-white/10"
                        key={ag.name}
                        title={`${ag.name} (${ag.role})`}
                      >
                        <img
                          alt={ag.name}
                          className="size-full object-cover"
                          src={ag.avatarUrl}
                        />
                      </div>
                    ))}
                    <span className="pl-3 text-[11px] font-mono text-white/40">
                      5 agents
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* Detailed Showcase of Selected Way */}
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key={selectedWay}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-white">
                    {t.waysSection.ways[selectedWay]?.name || activeWayData.label}
                  </h3>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                    {lang === "en" ? "Energy: " : lang === "es" ? "Energía: " : "Énergie : "}
                    {t.waysSection.ways[selectedWay]?.resource || activeWayData.resourceLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm italic text-sky-300">
                  "{t.waysSection.ways[selectedWay]?.tagline || activeWayData.tagline}"
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
                  <span className="text-[10px] text-white/50 uppercase font-mono">
                    {lang === "en" ? "Speed" : lang === "es" ? "Velocidad" : "Vitesse"}
                  </span>
                  <p className="text-base font-bold text-sky-300">{activeWayData.stats.speed}%</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
                  <span className="text-[10px] text-white/50 uppercase font-mono">
                    {lang === "en" ? "Creativity" : lang === "es" ? "Creatividad" : "Créativité"}
                  </span>
                  <p className="text-base font-bold text-amber-300">{activeWayData.stats.creativity}%</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
                  <span className="text-[10px] text-white/50 uppercase font-mono">
                    {lang === "en" ? "Strategy" : lang === "es" ? "Estrategia" : "Stratégie"}
                  </span>
                  <p className="text-base font-bold text-emerald-300">{activeWayData.stats.strategy}%</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
                  <span className="text-[10px] text-white/50 uppercase font-mono">
                    {lang === "en" ? "Robustness" : lang === "es" ? "Robustez" : "Robustesse"}
                  </span>
                  <p className="text-base font-bold text-purple-300">{activeWayData.stats.robustness}%</p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            {/* Universal Messenger Alvin Banner */}
            <div className="mt-6 mb-6 flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 backdrop-blur-md">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border-2 border-sky-400/50 shadow-lg">
                <img
                  alt={alvinMessenger.name}
                  className="size-full object-cover"
                  src={alvinMessenger.avatarUrl}
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    {lang === "en" ? "Universal Messenger" : lang === "es" ? "Mensajero Universal" : "Messager Universel"}
                  </span>
                  <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                    {lang === "en" ? "Present on all Paths" : lang === "es" ? "Presente en todos los Caminos" : "Présent sur toutes les Voies"}
                  </span>
                </div>
                <h4 className="font-bold text-base text-white mt-0.5">
                  {alvinMessenger.name} — {alvinMessenger.role}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  {lang === "en"
                    ? "Alvin coordinates your communications and ensures seamless task handoffs. Directly delivers the mission to Chief "
                    : lang === "es"
                    ? "Alvin coordina tus comunicaciones y asegura la entrega de tareas sin interrupciones. Transmite directamente la misión al Jefe "
                    : "Coordonne vos échanges et assure la liaison continue entre vous et l'escouade. Transmet directement la mission au Chef "}
                  <strong className="text-white">
                    {activeWayData.chiefName || activeWayData.agents[0].name}
                  </strong>
                  .
                </p>
              </div>
            </div>

            {/* Team Members */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  {lang === "en"
                    ? `Agent Squad of the ${t.waysSection.ways[selectedWay]?.name || activeWayData.label} (5 agents):`
                    : lang === "es"
                    ? `Escuadrón de agentes del ${t.waysSection.ways[selectedWay]?.name || activeWayData.label} (5 agentes):`
                    : `Escouade d'agents de la ${t.waysSection.ways[selectedWay]?.name || activeWayData.label} (5 agents) :`}
                </h4>
                <span className="text-[11px] text-white/40">
                  {lang === "en" ? "Squad Chief: " : lang === "es" ? "Jefe de escuadrón: " : "Chef d'escouade : "}
                  {activeWayData.chiefName || activeWayData.agents[0].name}
                </span>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
                {activeWayData.agents.map((ag) => (
                  <div
                    className={`flex flex-col justify-between rounded-2xl border p-3.5 backdrop-blur-sm transition ${
                      ag.isChief
                        ? "border-amber-400/40 bg-amber-400/10 shadow-lg shadow-amber-500/5"
                        : "border-white/10 bg-white/5"
                    }`}
                    key={ag.name}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-white/20 shadow-md">
                          <img
                            alt={ag.name}
                            className="size-full object-cover"
                            src={ag.avatarUrl}
                          />
                        </div>
                        {ag.isChief ? (
                          <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                            👑 Chef
                          </span>
                        ) : (
                          <span className="text-sm">{ag.emoji}</span>
                        )}
                      </div>
                      <h5 className="font-bold text-sm text-white">{ag.name}</h5>
                      <span className="text-[11px] font-medium text-sky-300 line-clamp-1">
                        {ag.role}
                      </span>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">
                        {ag.specialty}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Antagonists / Bugs Section (si présents pour cet univers) */}
            {activeWayData.antagonists && activeWayData.antagonists.length > 0 ? (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⚔️</span>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                    {lang === "en"
                      ? "Universe Antagonists (Bugs & Errors to neutralize):"
                      : lang === "es"
                      ? "Antagonistas del universo (Bugs y Errores a neutralizar):"
                      : "Antagonistes de l'univers (Bugs & Erreurs à neutraliser) :"}
                  </h4>
                </div>
                <p className="text-xs text-white/60 mb-4">
                  {lang === "en"
                    ? "When bugs or anomalies occur, these adversaries attack the code. Your squad mobilizes to neutralize them."
                    : lang === "es"
                    ? "Cuando ocurren errores o anomalías, estos adversarios atacan el código. Tu escuadrón se moviliza para neutralizarlos."
                    : "Lorsque des erreurs ou anomalies surviennent, ces adversaires attaquent le code. Votre escouade se mobilise pour les neutraliser."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {activeWayData.antagonists.map((ant) => (
                    <div
                      className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5"
                      key={ant.name}
                    >
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-rose-400/30">
                        <img
                          alt={ant.name}
                          className="size-full object-cover"
                          src={ant.avatarUrl}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <h6 className="font-bold text-xs text-rose-200 truncate">
                            {ant.name}
                          </h6>
                          <span className="text-[10px]">{ant.emoji}</span>
                        </div>
                        <p
                          className="text-[10px] font-medium text-rose-300/80 leading-tight mt-0.5 truncate"
                          title={ant.bugType}
                        >
                          {ant.bugType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Selection CTA */}
            <div className="mt-8 flex justify-center">
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-black shadow-lg hover:bg-white/90 active:scale-95 transition"
                onClick={() => setStep(1)}
                type="button"
              >
                {lang === "en"
                  ? `Choose the ${t.waysSection.ways[selectedWay]?.name || activeWayData.label} and start`
                  : lang === "es"
                  ? `Elegir el ${t.waysSection.ways[selectedWay]?.name || activeWayData.label} y comenzar`
                  : `Choisir la ${t.waysSection.ways[selectedWay]?.name || activeWayData.label} et commencer`}
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Estimator Section (Limpide & Intuitif) */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:px-10">
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-violet-500/10 via-white/[0.04] to-sky-500/10 p-8 backdrop-blur-2xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <Sliders className="size-3.5" />
              {t.estimator.tag}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {t.estimator.title}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
              {t.estimator.subtitle}
            </p>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              {/* Dial 1: Missions simples */}
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">{t.estimator.simpleLabel}</span>
                  <span className="font-bold text-sky-300">{simpleCount} / {t.estimator.simpleUnit} (={simpleCount * 10} pts)</span>
                </div>
                <input
                  aria-label={t.estimator.simpleLabel}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-sky-400"
                  max={100}
                  min={0}
                  onChange={(e) => setSimpleCount(Number(e.target.value))}
                  step={5}
                  type="range"
                  value={simpleCount}
                />
              </div>

              {/* Dial 2: Missions escouade */}
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/70">{t.estimator.squadLabel}</span>
                  <span className="font-bold text-violet-300">{squadCount} / {t.estimator.squadUnit} (={squadCount * 50} pts)</span>
                </div>
                <input
                  aria-label={t.estimator.squadLabel}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-violet-400"
                  max={50}
                  min={0}
                  onChange={(e) => setSquadCount(Number(e.target.value))}
                  step={1}
                  type="range"
                  value={squadCount}
                />
              </div>
            </div>

            {/* Output Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <span className="text-xs text-white/60">{t.estimator.estimatedNeed}</span>
              <p className="mt-1 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-violet-400 to-orange-400">
                {calculatedPoints.toLocaleString()} {t.estimator.perMonth}
              </p>
              <div className="mt-4 rounded-xl bg-white/10 border border-white/10 p-3 text-xs">
                <span className="text-white/60">{t.estimator.recommendedFormula}</span>
                <span className="font-bold text-white">
                  {calculatedPoints <= 100
                    ? t.estimator.freePlan
                    : calculatedPoints <= 1000
                    ? t.estimator.proStandardPlan
                    : calculatedPoints <= 2000
                    ? t.estimator.proBoostPlan
                    : t.estimator.businessPlan}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Plans Section with Custom Pro Points Selector */}
      <section
        className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:px-10"
        id="plans"
      >
        <div className="mb-14 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Zap className="size-3.5" />
            {t.pricingSection.tag}
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t.pricingSection.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            {t.pricingSection.subtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Plan Gratuit / Free */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {t.pricingSection.plans.free.name}
                </h3>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
                  {t.pricingSection.plans.free.badge}
                </span>
              </div>
              <div className="mt-5">
                <span className="text-4xl font-extrabold text-white">
                  {t.pricingSection.plans.free.price}
                </span>
                <span className="ml-2 text-xs text-white/50">
                  {t.pricingSection.plans.free.period}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                {t.pricingSection.plans.free.desc}
              </p>

              <div className="mt-6 border-t border-white/10 pt-6">
                <ul className="space-y-3 text-xs text-white/80">
                  {t.pricingSection.plans.free.features.map((feat, idx) => (
                    <li className="flex items-start gap-2.5" key={idx}>
                      <CheckIcon className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link
              className="mt-8 block w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-center text-xs font-semibold text-white transition hover:bg-white/10 active:scale-95"
              href="/register?plan=free"
            >
              {t.pricingSection.plans.free.cta}
            </Link>
          </div>

          {/* Plan Pro (Featured with Customizable Points Selector) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-violet-400/60 bg-gradient-to-b from-violet-500/15 via-white/[0.06] to-white/[0.02] p-7 shadow-2xl shadow-violet-500/20 backdrop-blur-2xl">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              {t.pricingSection.plans.pro.badge}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {t.pricingSection.plans.pro.name}
                </h3>
              </div>

              {/* Dynamic Price */}
              <div className="mt-5">
                <span className="text-4xl font-extrabold text-white">
                  {selectedProOption.price}
                </span>
                <span className="ml-2 text-xs text-white/50">
                  {t.pricingSection.plans.pro.period}
                </span>
              </div>

              {/* Custom Points Selector for Pro */}
              <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-2.5">
                <span className="text-[11px] font-semibold text-violet-200 block mb-1.5">
                  {lang === "en" ? "Choose your Power volume:" : lang === "es" ? "Elija su volumen Power:" : "Choisissez votre volume Power :"}
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {proOptions.map((opt, i) => (
                    <button
                      className={`rounded-lg py-1 text-[11px] font-bold transition ${
                        proTierIndex === i
                          ? "bg-white text-black shadow-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                      key={opt.points}
                      onClick={() => setProTierIndex(i)}
                      type="button"
                    >
                      {opt.points}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-white/60 text-center">
                  {lang === "en" ? (
                    <>That is <strong>~{selectedProOption.simples}</strong> simple missions or <strong>~{selectedProOption.squads}</strong> full squads.</>
                  ) : lang === "es" ? (
                    <>Es decir <strong>~{selectedProOption.simples}</strong> misiones simples o <strong>~{selectedProOption.squads}</strong> escuadrones completos.</>
                  ) : (
                    <>Soit <strong>~{selectedProOption.simples}</strong> missions simples ou <strong>~{selectedProOption.squads}</strong> escouades complètes.</>
                  )}
                </p>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <ul className="space-y-3 text-xs text-white/90">
                  <li className="flex items-start gap-2.5">
                    <CheckIcon className="size-4 shrink-0 text-sky-400 mt-0.5" />
                    <span>
                      <strong>{selectedProOption.points} Power Points</strong> {lang === "en" ? "/ month" : lang === "es" ? "/ mes" : "/ mois"}
                    </span>
                  </li>
                  {t.pricingSection.plans.pro.features.slice(1).map((feat, idx) => (
                    <li className="flex items-start gap-2.5" key={idx}>
                      <CheckIcon className="size-4 shrink-0 text-sky-400 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link
              className="mt-8 block w-full rounded-2xl bg-gradient-to-r from-sky-400 via-violet-500 to-orange-400 py-3 text-center text-xs font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:opacity-95 active:scale-95"
              href={`/register?plan=pro&points=${selectedProOption.points}`}
            >
              {lang === "en"
                ? `Choose Pro plan (${selectedProOption.points} pts)`
                : lang === "es"
                ? `Elegir el plan Pro (${selectedProOption.points} pts)`
                : `Choisir le plan Pro (${selectedProOption.points} pts)`}
            </Link>
          </div>

          {/* Plan Business */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {t.pricingSection.plans.business.name}
                </h3>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
                  {t.pricingSection.plans.business.badge}
                </span>
              </div>
              <div className="mt-5">
                <span className="text-4xl font-extrabold text-white">
                  {t.pricingSection.plans.business.price}
                </span>
                <span className="ml-2 text-xs text-white/50">
                  {t.pricingSection.plans.business.period}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                {t.pricingSection.plans.business.desc}
              </p>

              <div className="mt-6 border-t border-white/10 pt-6">
                <ul className="space-y-3 text-xs text-white/80">
                  {t.pricingSection.plans.business.features.map((feat, idx) => (
                    <li className="flex items-start gap-2.5" key={idx}>
                      <CheckIcon className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Link
              className="mt-8 block w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-center text-xs font-semibold text-white transition hover:bg-white/10 active:scale-95"
              href="/register?plan=business"
            >
              {t.pricingSection.plans.business.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-10 text-center text-xs text-white/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row sm:px-10">
          <div className="flex items-center gap-2">
            <IdealyLogo animated={false} compact size={22} />
            <span>{t.footer.copyright}</span>
          </div>
          <div className="flex items-center gap-6 text-white/60">
            <Link className="hover:text-white transition" href="/privacy">
              {t.footer.privacy}
            </Link>
            <Link className="hover:text-white transition" href="/terms">
              {t.footer.terms}
            </Link>
            <Link className="hover:text-white transition" href="/docs">
              {t.footer.contact}
            </Link>
          </div>
        </div>
      </footer>

      {/* Inline Interactive Onboarding Modal */}
      <AnimatePresence>
        {step > 0 ? (
          <motion.div
            animate={{ opacity: 1 }}
            aria-label="Onboarding"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-md"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          >
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-white/15 bg-[#14131d]/95 p-7 shadow-2xl"
              exit={{ scale: 0.95, opacity: 0 }}
              initial={{ scale: 0.95, opacity: 0 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs text-white/50">
                  {t.modal.stepOf.replace("{step}", String(step))}
                </span>
                <button
                  className="text-xs text-white/50 hover:text-white transition"
                  onClick={() => setStep(0)}
                  type="button"
                >
                  {t.modal.close}
                </button>
              </div>

              {step === 1 ? (
                <>
                  <h2 className="text-2xl font-bold text-white">
                    {t.modal.step1Title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    {t.modal.step1Subtitle}
                  </p>
                  <div className="mt-6 grid gap-2.5">
                    {t.modal.goals.map((item) => (
                      <button
                        className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left text-xs font-medium text-white/85 transition hover:border-white/25 hover:bg-white/10"
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
                  <h2 className="text-2xl font-bold text-white">
                    {t.modal.step2Title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/60">
                    {t.modal.step2Subtitle}
                  </p>
                  <div className="mt-6 grid gap-2.5">
                    <Link
                      className="rounded-2xl bg-gradient-to-r from-sky-400 via-violet-500 to-orange-400 px-4 py-3.5 text-center text-xs font-semibold text-white shadow-lg shadow-violet-500/20 hover:opacity-95 transition"
                      href={`/register?way=${selectedWay}`}
                    >
                      {t.modal.createAccount}
                    </Link>
                    <Link
                      className="rounded-2xl border border-white/15 px-4 py-3.5 text-center text-xs font-medium text-white/80 hover:bg-white/5 transition"
                      href="/login"
                    >
                      {t.modal.alreadyHaveAccount}
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
