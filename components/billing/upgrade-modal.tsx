"use client";

import { useState } from "react";
import { Check, Zap, Shield, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { IdealyMark } from "@/components/branding/idealy-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/provider";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import { getPricingTier } from "@/config/pricing";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { t, language } = useTranslation();
  const { currentWay, powerBalance } = useGamificationStore();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const getTierNames = (way: string) => {
    switch (way) {
      case "ninja":
        return {
          free: "Genin",
          pro: "Chunin",
          business: "Jonin",
          enterprise: "Kage / Sannin",
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
          business: "Double Star Hunter",
          enterprise: "Triple Star Hunter",
          resource: "Nen",
        };
      default:
        return {
          free: "Starter",
          pro: "Pro",
          business: "Team",
          enterprise: "Enterprise",
          resource: "Power",
        };
    }
  };

  const wayTiers = getTierNames(currentWay);

  const isEn = language === "en";
  const isEs = language === "es";

  const handleSelectPlan = async (planKey: "pro" | "business") => {
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/idealy/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: planKey,
          billingCycle: annual ? "yearly" : "monthly",
        }),
      });

      const data = await res.json().catch(() => null);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.info(
          isEn
            ? "Redirecting to checkout..."
            : isEs
            ? "Redirigiendo a la pasarela segura..."
            : "Redirection vers la passerelle sécurisée..."
        );
        window.location.href = "/welcome#tarifs";
      }
    } catch {
      window.location.href = "/welcome#tarifs";
    } finally {
      setLoadingPlan(null);
    }
  };

  const proTier = getPricingTier("pro");
  const businessTier = getPricingTier("business");
  const proPrice = annual
    ? (proTier.annualPriceEur ?? proTier.priceMonthlyEur * 12) / 12
    : proTier.priceMonthlyEur;
  const businessPrice = annual
    ? (businessTier.annualPriceEur ?? businessTier.priceMonthlyEur * 12) / 12
    : businessTier.priceMonthlyEur;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] p-0 border-border/80 bg-background/95 backdrop-blur-2xl">
        {/* Header with glow */}
        <div className="relative bg-gradient-to-b from-violet-500/15 via-background to-background p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-400 text-white shadow-md shadow-violet-500/20">
              <IdealyMark className="size-6 text-white" size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isEn
                  ? "Scale up your AI Studio"
                  : isEs
                  ? "Pasa al siguiente nivel"
                  : "Passez à la vitesse supérieure"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEn
                  ? "Unlock full multi-agent squad power and ship your apps without limits."
                  : isEs
                  ? "Desbloquea el poder total del equipo de IA y crea tus apps sin límites."
                  : "Débloquez la puissance maximale de l'escouade multi-agents et construisez vos apps sans limite."}
              </DialogDescription>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="mt-5 flex items-center justify-center">
            <div className="inline-flex items-center rounded-full border border-border/80 bg-muted/60 p-1 text-xs">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1 font-medium transition-all ${
                  !annual
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
              >
                {isEn ? "Monthly" : isEs ? "Mensual" : "Facturation mensuelle"}
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1 font-medium transition-all ${
                  annual
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
              >
                <span>{isEn ? "Yearly" : isEs ? "Anual" : "Annuel"}</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {isEn ? "2 months free" : isEs ? "2 meses gratis" : "2 mois offerts"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-5 p-6 pt-2 sm:grid-cols-2">
          {/* Pro Plan (Highlighted) */}
          <div className="relative flex flex-col justify-between rounded-3xl border-2 border-violet-500/60 bg-gradient-to-b from-violet-500/10 via-card/90 to-card p-6 shadow-xl shadow-violet-500/10">
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-violet-600 to-sky-500 px-3.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white shadow-md">
              {isEn ? "Most Popular" : isEs ? "Más Popular" : "Le plus populaire"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                  <Zap className="size-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  {`Plan ${wayTiers.pro}`}
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEn
                  ? "Perfect for solo builders and founders building MVPs."
                  : isEs
                  ? "Ideal para creadores y fundadores que lanzan sus MVP."
                  : "Idéal pour concevoir et lancer vos SaaS & MVP en autonomie complète."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  {proPrice.toFixed(2)} €
                </span>
                <span className="text-xs text-muted-foreground">
                  {isEn ? "/ month" : isEs ? "/ mes" : "/ mois"}
                </span>
              </div>

              <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                {[
                  `${proTier.power.monthlyAllocation.toLocaleString()} ${wayTiers.resource} Points / mois`,
                  isEn
                    ? "Complete multi-agent squad (Architect, Builder, Reviewer)"
                    : isEs
                    ? "Equipo multi-agente completo (Arquitecto, Builder, Revisor)"
                    : "Escouade multi-agents complète (Architecte + Builder + Reviewer)",
                  isEn
                    ? "High performance AI models with priority speed"
                    : isEs
                    ? "Modelos de IA prioritarios y máxima velocidad"
                    : "Modèles IA haute performance & vitesse prioritaire",
                  isEn
                    ? "Direct GitHub sync & bidirectional commits"
                    : isEs
                    ? "Conexión directa con GitHub y sync bidireccional"
                    : "Intégration directe GitHub & export sans limite",
                  isEn
                    ? "Unlimited mission history and context retention"
                    : isEs
                    ? "Historial ilimitado y retención de contexto"
                    : "Historique illimité et rétention avancée",
                  isEn ? "Priority support within 24h" : isEs ? "Soporte prioritario en 24h" : "Support prioritaire sous 24h",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="mt-6 w-full gap-2 cursor-pointer font-semibold bg-gradient-to-r from-violet-600 via-purple-600 to-sky-500 text-white shadow-md shadow-violet-500/25 hover:opacity-95"
              onClick={() => handleSelectPlan("pro")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "pro" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>{isEn ? `Choose ${wayTiers.pro}` : isEs ? `Elegir ${wayTiers.pro}` : `Choisir ${wayTiers.pro}`}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {/* Business Plan */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card/60 p-6 backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-orange-400/20 text-orange-400">
                  <Shield className="size-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  {`Plan ${wayTiers.business}`}
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEn
                  ? "For teams, studios, and agencies shipping at highest frequency."
                  : isEs
                  ? "Para equipos, agencias y estudios con máxima frecuencia."
                  : "Pour les équipes, studios et agences exigeant une cadence maximale."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  {businessPrice.toFixed(2)} €
                </span>
                <span className="text-xs text-muted-foreground">
                  {isEn ? "/ month" : isEs ? "/ mes" : "/ mois"}
                </span>
              </div>

              <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                {[
                  `${businessTier.power.monthlyAllocation.toLocaleString()} ${wayTiers.resource} Points / mois`,
                  isEn
                    ? "Customizable specialized agents and roles"
                    : isEs
                    ? "Agentes especializados personalizables"
                    : "Agents spécialisés personnalisables",
                  isEn
                    ? "Multi-member collaborative shared workspaces"
                    : isEs
                    ? "Espacios de trabajo colaborativos multiusuario"
                    : "Espaces partagés et collaboration multi-utilisateurs",
                  isEn
                    ? "Enterprise connectors and private MCP fleet"
                    : isEs
                    ? "Flota de conectores MCP de empresa"
                    : "Gestion de flotte de clés API et connecteurs d'entreprise",
                  isEn
                    ? "Early access to upcoming models and engine updates"
                    : isEs
                    ? "Acceso prioritario a nuevos modelos y motores"
                    : "Accès prioritaire aux nouvelles versions & modèles",
                  isEn
                    ? "99.9% uptime SLA and 24/7 dedicated support"
                    : isEs
                    ? "SLA 99.9% y soporte dedicado 24/7"
                    : "SLA 99.9% et support dédié 24/7",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="size-4 shrink-0 text-orange-400 mt-0.5" />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              className="mt-6 w-full gap-2 cursor-pointer border-border/80 hover:bg-muted/60"
              onClick={() => handleSelectPlan("business")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "business" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {isEn ? `Choose ${wayTiers.business}` : isEs ? `Elegir ${wayTiers.business}` : `Choisir ${wayTiers.business}`}
                  </span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
