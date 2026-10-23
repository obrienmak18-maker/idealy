"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PricingExperience } from "@/components/billing/pricing-experience";
import type { IdealyWay } from "@/lib/idealy/product-contract";
import { useTranslation } from "@/lib/i18n/provider";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { language } = useTranslation();
  const { currentWay } = useGamificationStore();

  const locale = language === "en" || language === "es" ? language : "fr";
  const heading =
    locale === "en"
      ? "Idealy plans"
      : locale === "es"
        ? "Planes de Idealy"
        : "Offres Idealy";
  const description =
    locale === "en"
      ? "Compare plans and choose what fits your next project."
      : locale === "es"
        ? "Compara las opciones y elige la que mejor se adapte a tu próximo proyecto."
        : "Comparez les formules et choisissez celle qui convient à votre prochain projet.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#090a11] p-0 text-white shadow-2xl shadow-black/40 sm:w-[calc(100vw-2rem)] sm:rounded-3xl"
        data-testid="upgrade-modal"
      >
        <DialogHeader className="shrink-0 border-b border-white/10 bg-[#0b0d16] px-4 py-3 pr-12 sm:px-6 sm:py-4">
          <DialogTitle className="text-sm font-semibold tracking-tight text-white sm:text-base">
            {heading}
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-xs leading-5 text-white/55 sm:text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <PricingExperience
            way={currentWay as IdealyWay}
            locale={locale}
            presentation="dialog"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
