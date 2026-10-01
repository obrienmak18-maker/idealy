/**
 * Idealy Product Pricing Authority (config/pricing.ts)
 * 
 * Ce fichier est l'AUTORITÉ PRODUIT UNIQUE pour la tarification et les quotas d'Idealy.
 * 
 * Architecture financière stricte :
 * - Stripe = FINANCIAL AUTHORITY (abonnements réels, webhooks, checkout sessions)
 * - config/pricing.ts = IDEALY PRODUCT AUTHORITY (plans, quotas Power, fonctionnalités)
 * - Frontend = PRESENTATION ONLY (consommation passive des données produit)
 */

import { type IdealyPlan, type IdealyWay } from "@/lib/idealy/product-contract";
import { powerActionCosts, powerPlanPolicy } from "@/lib/idealy/power-policy";

export type Currency = "EUR" | "USD";

export type PlanFeature = {
  label: string;
  included: boolean;
  hint?: string;
};

export type PricingTier = {
  id: IdealyPlan;
  name: string;
  tagline: string;
  badge?: string;
  priceMonthlyEur: number;
  priceMonthlyUsd: number;
  stripePriceIdEur?: string;
  stripePriceIdUsd?: string;
  power: {
    monthlyAllocation: number;
    walletCap: number;
    simpleMissionsIncluded: number;
    squadMissionsIncluded: number;
  };
  quotas: {
    maxProjects: number | "unlimited";
    maxActiveMissions: number;
    vfsMaxFilesPerMission: number;
    allowedWays: readonly IdealyWay[];
    connectorsAccess: "basic" | "full" | "enterprise";
    supportLevel: "community" | "standard" | "priority" | "dedicated";
  };
  features: PlanFeature[];
  popular?: boolean;
};

export const PRICING_TIERS: Record<IdealyPlan, PricingTier> = {
  free: {
    id: "free",
    name: "Découverte (Genin)",
    tagline: "Explorez Idealy, concevez vos premières idées et découvrez l'escouade multi-agents.",
    priceMonthlyEur: 0,
    priceMonthlyUsd: 0,
    power: {
      monthlyAllocation: powerPlanPolicy.free.monthlyAllocation, // 100 pts
      walletCap: powerPlanPolicy.free.walletCap,                 // 100 pts
      simpleMissionsIncluded: Math.floor(powerPlanPolicy.free.monthlyAllocation / powerActionCosts.mission_simple), // 10
      squadMissionsIncluded: Math.floor(powerPlanPolicy.free.monthlyAllocation / powerActionCosts.mission_squad),   // 2
    },
    quotas: {
      maxProjects: 3,
      maxActiveMissions: 1,
      vfsMaxFilesPerMission: 50,
      allowedWays: ["professional", "ninja", "hunter", "mage"],
      connectorsAccess: "basic",
      supportLevel: "community",
    },
    features: [
      { label: "Accès complet aux 4 Voies (Ninja, Mage, Hunter, Pro)", included: true },
      { label: "Orchestration multi-agents Architecte → Builder → Reviewer", included: true },
      { label: "Virtual File System (VFS) & Export PKZip immédiat", included: true },
      { label: "100 Power Points rechargeables mensuellement", included: true },
      { label: "Preview temps réel du code généré", included: true },
      { label: "Connecteurs OAuth avancés", included: false, hint: "Réservé aux plans Pro & Business" },
      { label: "Génération illimitée et modèles de raisonnement profonds", included: false },
    ],
  },
  pro: {
    id: "pro",
    name: "Professionnel (Chūnin)",
    tagline: "Pour les créateurs, freelances et développeurs bâtissant des applications réelles en production.",
    badge: "Le plus choisi",
    priceMonthlyEur: 29,
    priceMonthlyUsd: 32,
    stripePriceIdEur: process.env.STRIPE_PRO_PRICE_ID_EUR || "price_pro_monthly_eur",
    stripePriceIdUsd: process.env.STRIPE_PRO_PRICE_ID_USD || "price_pro_monthly_usd",
    popular: true,
    power: {
      monthlyAllocation: powerPlanPolicy.pro.monthlyAllocation, // 1 000 pts
      walletCap: powerPlanPolicy.pro.walletCap,                 // 1 000 pts
      simpleMissionsIncluded: Math.floor(powerPlanPolicy.pro.monthlyAllocation / powerActionCosts.mission_simple), // 100
      squadMissionsIncluded: Math.floor(powerPlanPolicy.pro.monthlyAllocation / powerActionCosts.mission_squad),   // 20
    },
    quotas: {
      maxProjects: "unlimited",
      maxActiveMissions: 5,
      vfsMaxFilesPerMission: 300,
      allowedWays: ["professional", "ninja", "hunter", "mage"],
      connectorsAccess: "full",
      supportLevel: "priority",
    },
    features: [
      { label: "Tout ce qui est inclus dans Découverte", included: true },
      { label: "1 000 Power Points par mois (cumulables jusqu'au plafond)", included: true },
      { label: "Projets et dépôts illimités", included: true },
      { label: "Intégration GitHub OAuth & Sync de branches", included: true },
      { label: "VFS étendu jusqu'à 300 fichiers par mission", included: true },
      { label: "Modèles d'IA avancés (Claude 3.7 / GPT-5 / Gemini 2.5 Flash)", included: true },
      { label: "Support prioritaire et assistance aux pannes", included: true },
    ],
  },
  business: {
    id: "business",
    name: "Business (Jōnin)",
    tagline: "Pour les startups, agences et équipes requérant une puissance de génération soutenue.",
    badge: "Haute Capacité",
    priceMonthlyEur: 79,
    priceMonthlyUsd: 89,
    stripePriceIdEur: process.env.STRIPE_BUSINESS_PRICE_ID_EUR || "price_biz_monthly_eur",
    stripePriceIdUsd: process.env.STRIPE_BUSINESS_PRICE_ID_USD || "price_biz_monthly_usd",
    power: {
      monthlyAllocation: powerPlanPolicy.business.monthlyAllocation, // 3 000 pts
      walletCap: powerPlanPolicy.business.walletCap,                 // 3 000 pts
      simpleMissionsIncluded: Math.floor(powerPlanPolicy.business.monthlyAllocation / powerActionCosts.mission_simple), // 300
      squadMissionsIncluded: Math.floor(powerPlanPolicy.business.monthlyAllocation / powerActionCosts.mission_squad),   // 60
    },
    quotas: {
      maxProjects: "unlimited",
      maxActiveMissions: 20,
      vfsMaxFilesPerMission: 1000,
      allowedWays: ["professional", "ninja", "hunter", "mage"],
      connectorsAccess: "full",
      supportLevel: "priority",
    },
    features: [
      { label: "Tout ce qui est inclus dans Professionnel", included: true },
      { label: "3 000 Power Points par mois", included: true },
      { label: "Orchestration multi-projets parallèle (20 missions actives)", included: true },
      { label: "Accès anticipé aux connecteurs MCP & intégrations cloud", included: true },
      { label: "Auto-correction Reviewer boucle fermée (3 passes)", included: true },
      { label: "SLA garanti 99.9% et support direct ingénierie", included: true },
    ],
  },
};

/**
 * Retourne le pricing tier d'un plan donné.
 */
export function getPricingTier(plan: IdealyPlan): PricingTier {
  return PRICING_TIERS[plan] ?? PRICING_TIERS.free;
}

/**
 * Calcule l'estimation Power pour un nombre donné de missions simples et en escouade.
 */
export function estimateRequiredPower(simpleMissionsCount: number, squadMissionsCount: number): number {
  const simple = Math.max(0, Math.floor(simpleMissionsCount));
  const squad = Math.max(0, Math.floor(squadMissionsCount));
  return simple * powerActionCosts.mission_simple + squad * powerActionCosts.mission_squad;
}
