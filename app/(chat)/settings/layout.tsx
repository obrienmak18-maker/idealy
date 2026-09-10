"use client";

import {
  ArrowLeftIcon,
  BellIcon,
  CreditCardIcon,
  DatabaseIcon,
  KeyboardIcon,
  PaletteIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type BillingStatus = {
  active: boolean;
  cancelAtPeriodEnd: boolean;
  creditsBalance: number | null;
  planId: "free" | "pro" | "business";
  status: string;
};

const NAV = [
  { href: "/settings/appearance",    icon: PaletteIcon,     label: "Apparence",          desc: "Thème et affichage" },
  { href: "/settings/notifications", icon: BellIcon,        label: "Notifications",       desc: "Alertes et récapitulatifs" },
  { href: "/settings/privacy",       icon: ShieldCheckIcon, label: "Confidentialité",     desc: "Sécurité et permissions" },
  { href: "/settings/data",          icon: DatabaseIcon,    label: "Données & mémoire",   desc: "Historique et workspace" },
  { href: "/settings/shortcuts",     icon: KeyboardIcon,    label: "Raccourcis",          desc: "Actions rapides" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/idealy/billing/status", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as BillingStatus & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Indisponible");
        if (active) setBilling(data);
      })
      .catch(() => { if (active) setBillingError("Statut de facturation indisponible."); });
    return () => { active = false; };
  }, []);

  async function openBillingPortal() {
    setOpeningPortal(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/idealy/billing/portal", { method: "POST" });
      const data = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Portail indisponible");
      window.location.assign(data.url);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Portail indisponible.");
    } finally { setOpeningPortal(false); }
  }

  const planLabel = billing?.active
    ? billing.planId === "business" ? "Plan Business" : "Plan Pro"
    : "Plan Découverte";
  const balanceLabel = billing?.creditsBalance == null
    ? "Synchronisation en cours…"
    : `${billing.creditsBalance} crédits disponibles`;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="mb-8">
          <Link
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            href="/"
          >
            <ArrowLeftIcon className="size-4" /> Retour au workspace
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Paramètres</h1>
          <p className="mt-2 text-muted-foreground">
            Configurez votre espace Idealy, vos données et votre plan.
          </p>
        </div>

        {/* Carte facturation */}
        <section className="mb-8 rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card/40 to-orange-400/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-violet-400">
                <CreditCardIcon className="size-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">Votre plan</span>
              </div>
              <h2 className="text-xl font-semibold">{planLabel}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{balanceLabel}.</p>
            </div>
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              {billing?.active ? billing.status : "À synchroniser"}
            </span>
          </div>
          {billing?.cancelAtPeriodEnd && (
            <p className="mt-4 text-sm text-amber-500">Annulation prévue à la fin de la période.</p>
          )}
          {billingError && <p className="mt-4 text-sm text-destructive">{billingError}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-85"
              href="/welcome#plans"
            >
              Voir les offres
            </Link>
            <button
              className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
              disabled={openingPortal}
              onClick={openBillingPortal}
              type="button"
            >
              {openingPortal ? "Ouverture…" : "Gérer la facturation"}
            </button>
          </div>
        </section>

        {/* Grid : nav + contenu */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
          <nav className="space-y-1.5">
            {NAV.map(({ href, icon: Icon, label, desc }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all ${
                    active
                      ? "border-primary/60 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-card/40 hover:bg-card/70"
                  }`}
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{desc}</p>
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="rounded-2xl border border-border/60 bg-card/50 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
