import { writeFileSync } from "fs";
import { join } from "path";

const base = "F:/Idealy/project/app/(chat)/settings";

// ── layout.tsx ──────────────────────────────────────────────────────────────
writeFileSync(join(base, "layout.tsx"), `"use client";

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
    : \`\${billing.creditsBalance} crédits disponibles\`;

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
                  className={\`flex items-center gap-3.5 rounded-2xl border p-3.5 transition-all \${
                    active
                      ? "border-primary/60 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-card/40 hover:bg-card/70"
                  }\`}
                >
                  <div className={\`flex size-9 shrink-0 items-center justify-center rounded-xl \${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }\`}>
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
`);

// ── page.tsx (index → redirect appearance) ───────────────────────────────────
writeFileSync(join(base, "page.tsx"), `import { redirect } from "next/navigation";
export default function SettingsIndex() {
  redirect("/settings/appearance");
}
`);

// ── appearance/page.tsx ───────────────────────────────────────────────────────
writeFileSync(join(base, "appearance/page.tsx"), `"use client";
import { MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Thème de l&apos;interface</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Personnalisez les tons et la luminosité d&apos;Idealy Studio.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: "light", label: "Clair",   Icon: SunIcon },
          { value: "dark",  label: "Sombre",  Icon: MoonIcon },
          { value: "system",label: "Système", Icon: PaletteIcon },
        ].map(({ value, label, Icon }) => (
          <button
            key={value}
            className={\`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-colors \${
              theme === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 hover:bg-muted/50"
            }\`}
            onClick={() => setTheme(value)}
            type="button"
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
`);

// ── notifications/page.tsx ────────────────────────────────────────────────────
writeFileSync(join(base, "notifications/page.tsx"), `"use client";
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
`);

// ── privacy/page.tsx ──────────────────────────────────────────────────────────
writeFileSync(join(base, "privacy/page.tsx"), `"use client";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

export default function PrivacyPage() {
  function clearLocalCache() {
    if (window.confirm("Effacer les caches et sessions locales ?")) {
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Mémoire locale nettoyée.");
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
          Effacer le cache local
        </button>
      </div>
    </div>
  );
}
`);

// ── data/page.tsx ─────────────────────────────────────────────────────────────
writeFileSync(join(base, "data/page.tsx"), `"use client";
import { DatabaseIcon } from "lucide-react";

export default function DataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Données et mémoire du workspace</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Structure et persistance des missions et artefacts.
        </p>
      </div>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <DatabaseIcon className="size-3.5" /> Système de fichiers virtuel (VFS)
          </p>
          <p className="mt-1">
            Chaque mission maintient un journal séquentiel d&apos;événements de fichiers synchronisé avec Supabase RLS.
            Les fichiers générés sont versionnés et réhydratés automatiquement à la réouverture du workspace.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Mémoire de contexte</p>
          <p className="mt-1">
            L&apos;escouade retient les décisions architecturales, les préférences de stack et les conventions
            du projet. Cette mémoire est isolée par workspace et peut être réinitialisée à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
}
`);

// ── shortcuts/page.tsx ────────────────────────────────────────────────────────
writeFileSync(join(base, "shortcuts/page.tsx"), `export default function ShortcutsPage() {
  const shortcuts = [
    { key: "Cmd/Ctrl + K",     action: "Recherche et palette de commandes" },
    { key: "Cmd/Ctrl + B",     action: "Afficher / masquer la barre latérale" },
    { key: "Cmd/Ctrl + S",     action: "Sauvegarder le code / fichier actif" },
    { key: "Cmd/Ctrl + Enter", action: "Envoyer le message en cours" },
    { key: "Shift + Escape",   action: "Nouvelle discussion" },
    { key: "Escape",           action: "Fermer les modales et tiroirs" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Raccourcis clavier</h3>
        <p className="mt-1 text-xs text-muted-foreground">Accélérez vos actions dans Idealy Studio.</p>
      </div>
      <div className="grid gap-2 text-xs">
        {shortcuts.map(({ key, action }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
          >
            <span className="text-muted-foreground">{action}</span>
            <kbd className="rounded border border-border/80 bg-background px-2 py-1 font-mono text-[11px] font-semibold text-foreground">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
`);

console.log("✅ Tous les fichiers settings créés.");
