"use client";

import { useState } from "react";
import { Check, Zap, Sparkles, Shield, Building2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { IdealyMark } from "@/components/branding/idealy-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/provider";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import { getPricingTier } from "@/config/pricing";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { language } = useTranslation();
  const { currentWay } = useGamificationStore();
  const [annual, setAnnual] = useState(false);

  const getTierNames = (way: string) => {
    switch (way) {
      case "ninja":
        return {
          free: "Genin",
          pro: "Chunin",
          business: "Jonin",
          enterprise: "Kage",
          resource: "Chakra",
        };
      case "mage":
        return {
          free: "Apprenti",
          pro: "Mage",
          business: "Archimage",
          enterprise: "Grand Primordial",
          resource: "Mana",
        };
      case "hunter":
        return {
          free: "Candidat",
          pro: "Hunter Licencié",
          business: "Double Star",
          enterprise: "Triple Star",
          resource: "Nen",
        };
      default:
        return {
          free: "Découverte",
          pro: "Pro",
          business: "Business",
          enterprise: "Entreprise",
          resource: "Power",
        };
    }
  };

  const wayTiers = getTierNames(currentWay);
  const isEn = language === "en";
  const isEs = language === "es";

  const freeTier = getPricingTier("free");
  const proTier = getPricingTier("pro");
  const businessTier = getPricingTier("business");

  const proPrice = annual
    ? (proTier.annualPriceEur ?? proTier.priceMonthlyEur * 12) / 12
    : proTier.priceMonthlyEur;
  const businessPrice = annual
    ? (businessTier.annualPriceEur ?? businessTier.priceMonthlyEur * 12) / 12
    : businessTier.priceMonthlyEur;

  const handleNotifyPlan = (planName: string) => {
    toast.info(
      isEn
        ? `The ${planName} plan will be available very soon. Payments are currently paused in preview mode.`
        : isEs
        ? `El plan ${planName} estará disponible muy pronto. Los pagos están pausados durante la fase de prueba.`
        : `L'offre ${planName} sera disponible très prochainement. Les paiements réels sont désactivés pour cette phase.`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl overflow-y-auto max-h-[92vh] p-0 border-slate-800/60 bg-[#07090e]/85 text-slate-100 shadow-2xl backdrop-blur-3xl backdrop-saturate-150 rounded-3xl">
        {/* Header exact et moderne */}
        <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-cyan-950/20 via-[#0a0e1a] to-[#07090e] px-6 py-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/40 text-cyan-400 shadow-md">
                <IdealyMark className="size-6 text-cyan-400" size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {isEn ? "Idealy Plans & Pricing" : isEs ? "Tarifas y Planes Idealy" : "Tarifs & Formules Idealy"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  {isEn
                    ? "Transparent pricing tailored to every stage of your software development journey."
                    : isEs
                    ? "Precios transparentes adaptados a cada etapa del desarrollo de software."
                    : "Des offres transparentes adaptées à chaque étape de vos projets logiciels."}
                </DialogDescription>
              </div>
            </div>

            {/* Toggle Annuel / Mensuel */}
            <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/90 p-1 text-xs self-start sm:self-center">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-3.5 py-1 font-medium transition-all cursor-pointer ${
                  !annual
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                type="button"
              >
                {isEn ? "Monthly" : isEs ? "Mensual" : "Mensuel"}
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 font-medium transition-all cursor-pointer ${
                  annual
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                type="button"
              >
                <span>{isEn ? "Yearly" : isEs ? "Anual" : "Annuel"}</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-bold text-emerald-400">
                  {isEn ? "-20%" : isEs ? "-20%" : "-20%"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Grille Desktop 4 Colonnes pour tous les plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8">
          {/* 1. PLAN DÉCOUVERTE / STARTER */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0c1017] p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">
                  {wayTiers.free}
                </span>
                <span className="rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  Actuel
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {isEn
                  ? "Explore Idealy and build your first full-stack apps."
                  : isEs
                  ? "Explora Idealy y crea tus primeras aplicaciones."
                  : "Explorez Idealy et concevez vos premières applications."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">0 €</span>
                <span className="text-xs text-slate-400">/ mois</span>
              </div>

              <div className="my-4 h-px bg-slate-800/80" />

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0" />
                  <span>200 pts de {wayTiers.resource} / mois</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0" />
                  <span>3 projets & VFS 50 fichiers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Accès aux 4 Voies d'agents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Export PKZip immédiat</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed text-center"
              >
                Plan Actif
              </button>
            </div>
          </div>

          {/* 2. PLAN PRO (HIGHLIGHTED) */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-cyan-500/70 bg-gradient-to-b from-cyan-950/20 via-[#0c1017] to-[#0c1017] p-5 shadow-xl shadow-cyan-500/10">
            <div className="absolute -top-3 right-4 rounded-full bg-cyan-500 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-black shadow-md">
              Populaire
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <Zap className="size-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">
                  {wayTiers.pro}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {isEn
                  ? "For creators & developers shipping production software."
                  : isEs
                  ? "Para desarrolladores y creadores de software real."
                  : "Pour les créateurs et développeurs déployant en production."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  {proPrice.toFixed(0)} €
                </span>
                <span className="text-xs text-slate-400">/ mois</span>
              </div>

              <div className="my-4 h-px bg-slate-800/80" />

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium text-white">2 500 pts de {wayTiers.resource} / mois</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-cyan-400 shrink-0" />
                  <span>Projets illimités & VFS 300 fichiers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-cyan-400 shrink-0" />
                  <span>Sync bidirectionnelle GitHub</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-cyan-400 shrink-0" />
                  <span>Modèles IA haute performance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-cyan-400 shrink-0" />
                  <span>Support prioritaire</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleNotifyPlan(`Plan ${wayTiers.pro}`)}
                className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black py-2 text-xs font-bold transition-all cursor-pointer shadow-md shadow-cyan-500/20 text-center"
              >
                Bientôt disponible
              </button>
            </div>
          </div>

          {/* 3. PLAN BUSINESS */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0c1017] p-5">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-violet-400" />
                <span className="text-sm font-bold text-slate-200">
                  {wayTiers.business}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {isEn
                  ? "For startups & agencies requiring continuous execution."
                  : isEs
                  ? "Para startups y equipos que exigen máxima potencia."
                  : "Pour les startups & équipes exigeant une puissance continue."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  {businessPrice.toFixed(0)} €
                </span>
                <span className="text-xs text-slate-400">/ mois</span>
              </div>

              <div className="my-4 h-px bg-slate-800/80" />

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-violet-400 shrink-0" />
                  <span className="font-medium text-white">4 000 pts de {wayTiers.resource} / mois</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-violet-400 shrink-0" />
                  <span>20 missions parallèles en simultané</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-violet-400 shrink-0" />
                  <span>Connecteurs Cloud & MCP complets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-violet-400 shrink-0" />
                  <span>Auto-correction en boucle fermée</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-violet-400 shrink-0" />
                  <span>SLA 99.9% garanti</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleNotifyPlan(`Plan ${wayTiers.business}`)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white py-2 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Bientôt disponible
              </button>
            </div>
          </div>

          {/* 4. PLAN ENTERPRISE */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#0c1017] p-5">
            <div>
              <div className="flex items-center gap-1.5">
                <Building2 className="size-4 text-amber-400" />
                <span className="text-sm font-bold text-slate-200">
                  {wayTiers.enterprise}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {isEn
                  ? "Custom multi-agent fleets & bespoke cloud infrastructure."
                  : isEs
                  ? "Infraestructura dedicada y flotas de agentes a medida."
                  : "Flottes d'agents sur-mesure & infrastructure dédiée."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">Sur mesure</span>
              </div>

              <div className="my-4 h-px bg-slate-800/80" />

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-amber-400 shrink-0" />
                  <span className="font-medium text-white">Volume de {wayTiers.resource} sur mesure</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-amber-400 shrink-0" />
                  <span>Agents d'ingénierie personnalisés</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-amber-400 shrink-0" />
                  <span>Déploiement On-Premise ou Cloud privé</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-amber-400 shrink-0" />
                  <span>SLA 99.99% & Account Manager dédié</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleNotifyPlan(`Plan ${wayTiers.enterprise}`)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white py-2 text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Bientôt disponible
              </button>
            </div>
          </div>
        </div>

        {/* Note de bas de page rassurante */}
        <div className="border-t border-slate-800/80 bg-[#090c14] px-6 py-4 sm:px-8 flex items-center justify-between text-xs text-slate-500">
          <span>Idealy Studio Preview — Aucune carte bancaire requise pour les tests.</span>
          <span className="font-mono">Chiffrement AES-256</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
