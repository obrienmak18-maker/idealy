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
import { useEffect, useState } from "react";

const sections = [
  {
    description: "Thème, densité et préférences d’affichage.",
    icon: PaletteIcon,
    id: "appearance",
    title: "Apparence",
  },
  {
    description: "Choisissez quand Idealy vous informe.",
    icon: BellIcon,
    id: "notifications",
    title: "Notifications",
  },
  {
    description: "Gérez vos données, sessions et permissions.",
    icon: ShieldCheckIcon,
    id: "privacy",
    title: "Confidentialité",
  },
  {
    description:
      "Contrôlez les sources, l’historique et la mémoire de vos espaces.",
    icon: DatabaseIcon,
    id: "data",
    title: "Données et mémoire",
  },
  {
    description: "Accédez rapidement aux actions importantes du workspace.",
    icon: KeyboardIcon,
    id: "shortcuts",
    title: "Raccourcis",
  },
];

type BillingStatus = {
  active: boolean;
  cancelAtPeriodEnd: boolean;
  creditsBalance: number | null;
  planId: "free" | "pro" | "business";
  status: string;
};

type PowerStatus = {
  balanceLabel?: string;
  canExecute?: boolean;
  costLabel?: string;
  plan?: "free" | "pro" | "business" | null;
  resourceLabel?: string;
  state?: "normal" | "low" | "insufficient" | "depleted" | "unknown";
  walletCapLabel?: string;
  way?: string;
};

export default function SettingsPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [power, setPower] = useState<PowerStatus | null>(null);
  const [powerError, setPowerError] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/idealy/billing/status", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as BillingStatus & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Statut indisponible");
        if (active) setBilling(payload);
      })
      .catch(() => {
        if (active) setBillingError("Impossible de synchroniser le statut pour le moment.");
      });
    fetch("/api/idealy/power?action=mission_simple", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as PowerStatus & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Power indisponible");
        if (active) setPower(payload);
      })
      .catch(() => {
        if (active) setPowerError("Impossible de synchroniser le Power pour le moment.");
      });
    return () => { active = false; };
  }, []);

  async function openBillingPortal() {
    setOpeningPortal(true);
    setBillingError(null);
    try {
      const response = await fetch("/api/idealy/billing/portal", { method: "POST" });
      const payload = await response.json() as { error?: string; url?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Portail indisponible");
      window.location.assign(payload.url);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Portail indisponible.");
    } finally {
      setOpeningPortal(false);
    }
  }

  const planLabel = billing?.active
    ? billing.planId === "business" ? "Plan Business" : "Plan Pro"
    : "Plan découverte";
  const balanceLabel = power?.balanceLabel
    ? `${power.balanceLabel} disponibles`
    : "Solde Power indisponible";
  const powerStateLabel = {
    depleted: "Épuisé",
    insufficient: "Insuffisant",
    low: "Faible",
    normal: "Disponible",
    unknown: "À synchroniser",
  }[power?.state ?? "unknown"];

  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeftIcon className="size-4" /> Retour au workspace
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
          <p className="mt-2 text-muted-foreground">
            Configurez votre espace Idealy, vos données et votre plan.
          </p>
        </div>
        <section
          className="mb-8 scroll-mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card/40 to-orange-400/10 p-6"
          id="billing"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-violet-400">
                <CreditCardIcon className="size-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">
                  Votre plan
                </span>
              </div>
              <h2 className="text-xl font-semibold">{planLabel}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {balanceLabel}. Coût mission simple : {power?.costLabel ?? "À synchroniser"}. Le plan commercial reste séparé de la ressource de Voie.
              </p>
            </div>
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              {powerStateLabel}
            </span>
          </div>
          {billing?.cancelAtPeriodEnd ? (
            <p className="mt-4 text-sm text-amber-500">L’annulation est prévue à la fin de la période en cours.</p>
          ) : null}
          {billingError ? <p className="mt-4 text-sm text-destructive">{billingError}</p> : null}
          {powerError ? <p className="mt-2 text-sm text-destructive">{powerError}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-85"
              href="/welcome#plans"
            >
              Voir les offres
            </Link>
            <button
              className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              disabled={openingPortal}
              onClick={openBillingPortal}
              type="button"
            >
              {openingPortal ? "Ouverture…" : "Gérer la facturation"}
            </button>
          </div>
        </section>
        <div className="grid gap-3">
          {sections.map(({ id, title, description, icon: Icon }) => (
            <Link
              className="flex scroll-mt-8 items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-colors hover:bg-card/70"
              href={`#${id}`}
              id={id}
              key={id}
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </div>
              <div>
                <h2 className="font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
