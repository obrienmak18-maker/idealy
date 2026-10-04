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
import { useTranslation } from "@/lib/i18n/provider";

type BillingStatus = {
  active: boolean;
  cancelAtPeriodEnd: boolean;
  creditsBalance: number | null;
  planId: "free" | "pro" | "business";
  status: string;
};

const layoutCopy = {
  fr: {
    backToWorkspace: "Retour au workspace",
    title: "Paramètres",
    subtitle: "Configurez votre espace Idealy, vos données et votre plan.",
    yourPlan: "Votre plan",
    planFree: "Plan Découverte",
    planPro: "Plan Pro",
    planBusiness: "Plan Business",
    creditsSync: "Synchronisation en cours…",
    creditsAvailable: "crédits disponibles",
    toSync: "À synchroniser",
    cancelNotice: "Annulation prévue à la fin de la période.",
    viewPlans: "Voir les offres",
    manageBilling: "Gérer la facturation",
    opening: "Ouverture…",
    nav: [
      { href: "/settings/appearance", icon: PaletteIcon, label: "Apparence", desc: "Thème et affichage" },
      { href: "/settings/notifications", icon: BellIcon, label: "Notifications", desc: "Alertes et récapitulatifs" },
      { href: "/settings/privacy", icon: ShieldCheckIcon, label: "Confidentialité", desc: "Sécurité et permissions" },
      { href: "/settings/data", icon: DatabaseIcon, label: "Données & mémoire", desc: "Historique et workspace" },
      { href: "/settings/shortcuts", icon: KeyboardIcon, label: "Raccourcis", desc: "Actions rapides" },
    ],
  },
  en: {
    backToWorkspace: "Back to workspace",
    title: "Settings",
    subtitle: "Configure your Idealy workspace, your data, and your plan.",
    yourPlan: "Your plan",
    planFree: "Discovery Plan",
    planPro: "Pro Plan",
    planBusiness: "Business Plan",
    creditsSync: "Syncing credits…",
    creditsAvailable: "credits available",
    toSync: "Ready to sync",
    cancelNotice: "Cancellation scheduled at period end.",
    viewPlans: "View plans",
    manageBilling: "Manage billing",
    opening: "Opening…",
    nav: [
      { href: "/settings/appearance", icon: PaletteIcon, label: "Appearance", desc: "Theme and display" },
      { href: "/settings/notifications", icon: BellIcon, label: "Notifications", desc: "Alerts and recaps" },
      { href: "/settings/privacy", icon: ShieldCheckIcon, label: "Privacy", desc: "Security and permissions" },
      { href: "/settings/data", icon: DatabaseIcon, label: "Data & memory", desc: "History and workspace" },
      { href: "/settings/shortcuts", icon: KeyboardIcon, label: "Shortcuts", desc: "Quick keyboard actions" },
    ],
  },
  es: {
    backToWorkspace: "Volver al workspace",
    title: "Configuración",
    subtitle: "Configura tu espacio Idealy, tus datos y tu plan.",
    yourPlan: "Tu plan",
    planFree: "Plan Descubrimiento",
    planPro: "Plan Pro",
    planBusiness: "Plan Business",
    creditsSync: "Sincronizando créditos…",
    creditsAvailable: "créditos disponibles",
    toSync: "Por sincronizar",
    cancelNotice: "Cancelación programada para el final del período.",
    viewPlans: "Ver planes",
    manageBilling: "Gestionar facturación",
    opening: "Abriendo…",
    nav: [
      { href: "/settings/appearance", icon: PaletteIcon, label: "Apariencia", desc: "Tema y visualización" },
      { href: "/settings/notifications", icon: BellIcon, label: "Notificaciones", desc: "Alertas y resúmenes" },
      { href: "/settings/privacy", icon: ShieldCheckIcon, label: "Privacidad", desc: "Seguridad y permisos" },
      { href: "/settings/data", icon: DatabaseIcon, label: "Datos y memoria", desc: "Historial y workspace" },
      { href: "/settings/shortcuts", icon: KeyboardIcon, label: "Atajos", desc: "Acciones rápidas" },
    ],
  },
} as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useTranslation();
  const copy = layoutCopy[language] || layoutCopy.fr;

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
      .catch(() => {
        if (active) setBillingError("Statut de facturation indisponible.");
      });
    return () => {
      active = false;
    };
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
    } finally {
      setOpeningPortal(false);
    }
  }

  const planLabel = billing?.active
    ? billing.planId === "business"
      ? copy.planBusiness
      : copy.planPro
    : copy.planFree;
  const balanceLabel =
    billing?.creditsBalance === null || billing?.creditsBalance === undefined
      ? copy.creditsSync
      : `${billing.creditsBalance} ${copy.creditsAvailable}`;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="mb-8">
          <Link
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            href="/"
          >
            <ArrowLeftIcon className="size-4" /> {copy.backToWorkspace}
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-muted-foreground">{copy.subtitle}</p>
        </div>

        {/* Carte facturation */}
        <section className="mb-8 rounded-2xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-card/40 to-orange-400/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-violet-400">
                <CreditCardIcon className="size-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">
                  {copy.yourPlan}
                </span>
              </div>
              <h2 className="text-xl font-semibold">{planLabel}</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">{balanceLabel}.</p>
            </div>
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              {billing?.active ? billing.status : copy.toSync}
            </span>
          </div>
          {billing?.cancelAtPeriodEnd ? (
            <p className="mt-4 text-sm text-amber-500">{copy.cancelNotice}</p>
          ) : null}
          {billingError ? <p className="mt-4 text-sm text-destructive">{billingError}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-85"
              href="/welcome#tarifs"
            >
              {copy.viewPlans}
            </Link>
            <button
              className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
              disabled={openingPortal}
              onClick={openBillingPortal}
              type="button"
            >
              {openingPortal ? copy.opening : copy.manageBilling}
            </button>
          </div>
        </section>

        {/* Grid : nav + contenu */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[230px_1fr]">
          <nav className="space-y-1.5">
            {copy.nav.map(({ href, icon: Icon, label, desc }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all ${
                    active
                      ? "border-primary/60 bg-primary/10 shadow-xs"
                      : "border-border/60 bg-card/40 hover:bg-card/70"
                  }`}
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
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
