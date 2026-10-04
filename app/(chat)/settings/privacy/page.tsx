"use client";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

export default function PrivacyPage() {
  function clearLocalCache() {
    if (window.confirm("Effacer le brouillon de message enregistré sur cet appareil ?")) {
      localStorage.removeItem("input");
      toast.success("Brouillon local effacé. Vos réglages et connecteurs sont conservés.");
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Confidentialité &amp; Sécurité</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Contrôlez les autorisations et l&apos;isolation de vos espaces.
        </p>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Chiffrement des clés &amp; tokens</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Vos intégrations et clés de fournisseur (BYOK) sont chiffrées au repos via AES-GCM côté Supabase
            et ne transitent jamais en clair vers le navigateur.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Sessions actives</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Chaque session est liée à un jeton JWT signé par Supabase Auth. La révocation est effective immédiatement.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
          onClick={clearLocalCache}
          type="button"
        >
          <Trash2Icon className="size-3.5" />
          Effacer le brouillon local
        </button>
      </div>
    </div>
  );
}
