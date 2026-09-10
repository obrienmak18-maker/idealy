"use client";
import { useState } from "react";
import { toast } from "sonner";

type Pref = { id: string; label: string; desc: string };
const PREFS: Pref[] = [
  { id: "squad",  label: "Fin de mission escouade",    desc: "Alertes quand Architecte, Builder et Reviewer terminent." },
  { id: "credit", label: "Alerte solde Power bas",     desc: "Notifié quand l'énergie ou Power passe sous le seuil critique." },
  { id: "email",  label: "Récapitulatif hebdomadaire", desc: "Résumé des missions et de la progression chaque lundi." },
];

export default function NotificationsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({ squad: true, credit: true, email: true });
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Préférences de notification</h3>
        <p className="mt-1 text-xs text-muted-foreground">Gérez les alertes et récapitulatifs automatiques.</p>
      </div>
      <div className="space-y-3 text-sm">
        {PREFS.map(({ id, label, desc }) => (
          <label key={id} className="flex items-center justify-between rounded-xl border border-border/60 p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <input
              checked={checked[id] ?? false}
              className="size-4 accent-primary"
              onChange={(e) => {
                setChecked((prev) => ({ ...prev, [id]: e.target.checked }));
                toast.success("Préférence enregistrée.");
              }}
              type="checkbox"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
