"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Shield, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { t } = useTranslation();
  const { currentWay, powerBalance } = useGamificationStore();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/idealy/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => null);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.info("Redirection vers la passerelle sécurisée...");
        window.location.href = "/welcome#tarifs";
      }
    } catch {
      window.location.href = "/welcome#tarifs";
    } finally {
      setLoadingPlan(null);
    }
  };

  const proPrice = annual ? "23" : "29";
  const studioPrice = annual ? "79" : "99";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:max-h-[90vh]">
        {/* Header with glow */}
        <div className="relative bg-gradient-to-b from-primary/15 via-background to-background p-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {t("pricing.upgradeTitle", "Passez à la vitesse supérieure")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t(
                  "pricing.upgradeSubtitle",
                  "Débloquez la puissance maximale de l'escouade multi-agents et construisez vos apps sans limite."
                )}
              </DialogDescription>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="mt-5 flex items-center justify-center">
            <div className="inline-flex items-center rounded-full border border-border/80 bg-muted/50 p-1 text-xs">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-3.5 py-1 font-medium transition-all ${
                  !annual
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
              >
                {t("pricing.monthly", "Mensuel")}
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 font-medium transition-all ${
                  annual
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
              >
                <span>{t("pricing.annual", "Annuel")}</span>
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 p-6 pt-2 sm:grid-cols-2">
          {/* Pro Plan (Highlighted) */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary/60 bg-gradient-to-b from-primary/5 via-card/80 to-card p-5 shadow-lg">
            <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-[10.5px] font-semibold text-primary-foreground shadow-xs">
              {t("pricing.recommended", "Recommandé")}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  {t("pricing.tierProTitle", "Fondateur Pro")}
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("pricing.tierProDesc", "Idéal pour bâtir et lancer vos SaaS & MVP en autonomie complète.")}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {proPrice}€
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("pricing.perMonth", "/mois")}
                </span>
              </div>

              <ul className="mt-5 space-y-2 text-xs text-foreground/90">
                {[
                  "1 500 Power / jour (recharge automatique)",
                  "Escouade complète : Architecte, Builder, Designer & QA",
                  "Live Canvas & prévisualisation en temps réel",
                  "Export du code complet sans restriction (Next.js / Vite)",
                  "Connexion directe GitHub & sync bidirectionnelle",
                  "Modèles de pointe (Claude 3.5 Sonnet, GPT-4o)",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              className="mt-6 w-full gap-2 cursor-pointer font-semibold"
              onClick={() => handleSelectPlan("pro")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "pro" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>{t("pricing.ctaPro", "Choisir Fondateur Pro")}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {/* Studio Plan */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/60 p-5 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-purple-500" />
                <h3 className="font-bold text-base text-foreground">
                  {t("pricing.tierStudioTitle", "Organisation & Studio")}
                </h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("pricing.tierStudioDesc", "Pour les équipes, agences et créateurs exigeant une cadence maximale.")}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">
                  {studioPrice}€
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("pricing.perMonth", "/mois")}
                </span>
              </div>

              <ul className="mt-5 space-y-2 text-xs text-foreground/90">
                {[
                  "Power illimité & prioritaire sans file d'attente",
                  "Workspaces collaboratifs multi-membres",
                  "Connecteurs personnalisés MCP illimités",
                  "Déploiement en 1-clic Cloudflare / Vercel personnalisé",
                  "Accompagnement architectural dédié 7j/7",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="size-3.5 shrink-0 text-purple-500 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              className="mt-6 w-full gap-2 cursor-pointer"
              onClick={() => handleSelectPlan("studio")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "studio" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>{t("pricing.ctaStudio", "Découvrir Studio")}</span>
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
