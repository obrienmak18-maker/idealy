"use client";

import { Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useFreeQuota } from "@/hooks/use-free-quota";

export function FreeQuotaBadge({ compact = false }: { compact?: boolean }) {
  const { used, limit, remaining, allowed, loading, message } = useFreeQuota();

  if (loading) {
    return (
      <span
        aria-label="Chargement du quota"
        className="inline-flex h-5 w-16 animate-pulse rounded-full bg-sidebar-border/40"
      />
    );
  }

  const isExhausted = !allowed || remaining <= 0;

  const handleClick = () => {
    if (isExhausted) {
      toast.info(
        message ||
          "Vous avez atteint votre limite de générations gratuites. Les offres payantes arrivent bientôt. Votre progression est sauvegardée."
      );
    }
  };

  const badgeContent = compact ? (
    <span>{`${used}/${limit}`}</span>
  ) : (
    <span>{`${used} sur ${limit} générations utilisées`}</span>
  );

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
        isExhausted
          ? "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          : "border-sidebar-border/70 bg-background/30 text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
      }`}
      onClick={handleClick}
      title={
        isExhausted
          ? "Limite de générations gratuites atteinte. Vos données sont conservées."
          : `${used} générations gratuites utilisées sur ${limit}. Il vous en reste ${remaining}.`
      }
      type="button"
    >
      {isExhausted ? (
        <AlertCircle className="size-3 text-amber-400 shrink-0" />
      ) : (
        <Sparkles className="size-3 text-sky-400 shrink-0" />
      )}
      {badgeContent}
    </button>
  );
}
