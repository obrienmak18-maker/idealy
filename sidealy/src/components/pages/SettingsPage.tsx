import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Database,
  ExternalLink,
  Info,
  Keyboard,
  LoaderCircle,
  Lock,
  Monitor,
  Moon,
  Palette,
  Server,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../common/Button";
import { PageFrame } from "../layout/PageFrame";
import { PageHeader } from "../layout/PageHeader";

type Preferences = {
  accountEmail: string | null;
  displayName: string | null;
  preferredLanguage: "fr" | "en" | "es";
  timezone: string;
  way: "mage" | "ninja" | "hunter" | "professional";
};

type ServiceState = "checking" | "ready" | "demo" | "offline";

const wayOptions: Array<{
  id: Preferences["way"];
  label: string;
  description: string;
  badge: string;
}> = [
  {
    id: "ninja",
    label: "Voie du Ninja (Vitesse & Exécution)",
    description: "Minato, Naruto, Sasuke, Shikamaru, Sakura, Kakashi, Itachi",
    badge: "Escouade Konoha",
  },
  {
    id: "mage",
    label: "Voie des Mages (Créativité & Arcanes)",
    description: "Natsu, Erza, Lucy, Gray, Wendy",
    badge: "Fairy Tail",
  },
  {
    id: "hunter",
    label: "Voie des Hunters (Stratégie & Investigation)",
    description: "Gon, Killua, Kurapika, Leorio, Netero",
    badge: "Hunter x Hunter",
  },
  {
    id: "professional",
    label: "Voie Studio Pro (Rigueur & Architecture)",
    description: "Alvin, Architecture, Sécurité & Scalabilité industrielle",
    badge: "Production Ready",
  },
];

const settingsSections = [
  "general",
  "appearance",
  "account",
  "billing",
  "data",
  "shortcuts",
  "notifications",
  "privacy",
  "resources",
  "about",
] as const;

type SettingsSection = (typeof settingsSections)[number];

const sectionMetadata: Record<
  SettingsSection,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    iconBg: string;
  }
> = {
  general: {
    label: "Général & IA",
    description: "Moteur de génération, statut du backend et connecteurs actifs.",
    icon: Server,
    accentColor: "text-blue-500 dark:text-blue-400",
    iconBg: "bg-blue-500/10 text-blue-500",
  },
  appearance: {
    label: "Apparence",
    description: "Thème d'affichage, mode sombre et accents visuels.",
    icon: Palette,
    accentColor: "text-purple-500 dark:text-purple-400",
    iconBg: "bg-purple-500/10 text-purple-500",
  },
  account: {
    label: "Compte & Escouade",
    description: "Voie active de travail, langue, profil et fuseau horaire.",
    icon: User,
    accentColor: "text-teal-500 dark:text-teal-400",
    iconBg: "bg-teal-500/10 text-teal-500",
  },
  billing: {
    label: "Facturation & Forfait",
    description: "Crédits disponibles, formule d'abonnement et portail Stripe.",
    icon: CreditCard,
    accentColor: "text-amber-500 dark:text-amber-400",
    iconBg: "bg-amber-500/10 text-amber-500",
  },
  data: {
    label: "Données & Stockage",
    description: "Brouillons locaux, livrables enregistrés et export JSON complet.",
    icon: Database,
    accentColor: "text-emerald-500 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 text-emerald-500",
  },
  shortcuts: {
    label: "Raccourcis clavier",
    description: "Commandes rapides pour naviguer et composer sans la souris.",
    icon: Keyboard,
    accentColor: "text-indigo-500 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 text-indigo-500",
  },
  notifications: {
    label: "Notifications",
    description: "Alertes en direct et préférences d'activité.",
    icon: Bell,
    accentColor: "text-orange-500 dark:text-orange-400",
    iconBg: "bg-orange-500/10 text-orange-500",
  },
  privacy: {
    label: "Confidentialité & Clés",
    description: "Sécurité des API, politique de données et isolation de session.",
    icon: Lock,
    accentColor: "text-rose-500 dark:text-rose-400",
    iconBg: "bg-rose-500/10 text-rose-500",
  },
  resources: {
    label: "Aide & Ressources",
    description: "Guides, documentation de travail et assistance technique.",
    icon: BookOpen,
    accentColor: "text-cyan-500 dark:text-cyan-400",
    iconBg: "bg-cyan-500/10 text-cyan-500",
  },
  about: {
    label: "À propos d'Idealy",
    description: "Version, vision produit, conditions générales et mentions.",
    icon: Info,
    accentColor: "text-brand-primary",
    iconBg: "bg-brand-primary/10 text-brand-primary",
  },
};

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    setActivePage,
    conversations,
    messages,
    artifacts,
    spaces,
  } = useApp();

  const currentSection = (): SettingsSection => {
    const segment = window.location.pathname.split("/").filter(Boolean).at(-1);
    return settingsSections.includes(segment as SettingsSection)
      ? (segment as SettingsSection)
      : "general";
  };

  const [section, setSection] = useState<SettingsSection>(() =>
    typeof window === "undefined" ? "general" : currentSection(),
  );
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [service, setService] = useState<ServiceState>("checking");
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [quota, setQuota] = useState<{
    limit?: number;
    remaining?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [billing, setBilling] = useState<{
    active?: boolean;
    cancelAtPeriodEnd?: boolean;
    creditsBalance?: number | null;
    currentPeriodEnd?: number | null;
    planId?: string;
    status?: string;
  } | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const syncSection = () => setSection(currentSection());
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  useEffect(() => {
    if (section !== "billing") return;
    const controller = new AbortController();
    setBillingLoading(true);
    setBillingError("");
    fetch("/api/idealy/billing/status", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          active?: boolean;
          cancelAtPeriodEnd?: boolean;
          creditsBalance?: number | null;
          currentPeriodEnd?: number | null;
          error?: string;
          planId?: string;
          status?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.error || "Le statut de facturation est indisponible.",
          );
        if (!controller.signal.aborted) setBilling(payload);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setBillingError(
            cause instanceof Error
              ? cause.message
              : "Le statut de facturation est indisponible.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBillingLoading(false);
      });
    return () => controller.abort();
  }, [section]);

  const openSection = (next: SettingsSection) => {
    setSection(next);
    const path = next === "general" ? "/settings" : `/settings/${next}`;
    if (window.location.pathname !== path)
      window.history.pushState(null, "", path);
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    setBillingError("");
    try {
      const response = await fetch("/api/idealy/billing/portal", {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      const portalUrl = payload.url ? new URL(payload.url) : null;
      if (
        !response.ok ||
        !portalUrl ||
        portalUrl.protocol !== "https:" ||
        portalUrl.hostname !== "billing.stripe.com"
      )
        throw new Error(
          payload.error || "Le portail de facturation n’a pas pu être ouvert.",
        );
      window.location.assign(portalUrl.toString());
    } catch (cause) {
      setBillingError(
        cause instanceof Error
          ? cause.message
          : "Le portail de facturation n’a pas pu être ouvert.",
      );
    } finally {
      setPortalLoading(false);
    }
  };

  const exportLocalData = () => {
    const exportFile = new Blob(
      [
        JSON.stringify(
          {
            artifacts,
            conversations,
            exportedAt: new Date().toISOString(),
            messages,
            spaces,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(exportFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = `idealy-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/idealy/health", {
        cache: "no-store",
        credentials: "same-origin",
      }),
      fetch("/api/idealy/profile/preferences", {
        cache: "no-store",
        credentials: "same-origin",
      }),
      fetch("/api/idealy/quota", {
        cache: "no-store",
        credentials: "same-origin",
      }),
    ])
      .then(async ([healthResponse, preferencesResponse, quotaResponse]) => {
        const health = (await healthResponse.json().catch(() => ({}))) as {
          mode?: string;
          providers?: string[];
          status?: string;
        };
        const profile = (await preferencesResponse
          .json()
          .catch(() => null)) as Preferences | null;
        const quotaPayload = (await quotaResponse.json().catch(() => null)) as {
          limit?: number;
          remaining?: number;
        } | null;
        if (cancelled) return;
        setService(
          healthResponse.ok && health.mode === "demo"
            ? "demo"
            : healthResponse.ok && health.status === "configured"
              ? "ready"
              : "offline",
        );
        setConfiguredProviders(
          Array.isArray(health.providers)
            ? health.providers.filter(
                (provider): provider is string => typeof provider === "string",
              )
            : [],
        );
        setPreferences(profile);
        setQuota(quotaPayload);
      })
      .catch(() => {
        if (!cancelled) setService("offline");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreferences = async (updates: Partial<Preferences>) => {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/idealy/profile/preferences", {
        body: JSON.stringify(updates),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as Preferences & { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Enregistrement impossible.");
      setPreferences((current) =>
        current ? { ...current, ...updates, ...payload } : current,
      );
      setNotice("Préférences enregistrées avec succès.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    { id: "system" as const, label: "Système", icon: Monitor, desc: "Synchronisé avec votre OS" },
    { id: "light" as const, label: "Clair", icon: Sun, desc: "Palette lumineuse et pure" },
    { id: "dark" as const, label: "Sombre", icon: Moon, desc: "Contraste reposant pour les yeux" },
  ];

  const currentMeta = sectionMetadata[section];

  return (
    <PageFrame
      label={
        section === "about"
          ? "À propos"
          : section === "resources"
            ? "Ressources"
            : "Paramètres"
      }
    >
      <div className="mx-auto max-w-6xl pb-16 px-2 sm:px-4">
        {/* Header */}
        <PageHeader
          description="Personnalisez votre espace, votre escouade multi-agents et inspectez l'infrastructure Idealy."
          eyebrow="Système & Préférences"
          title="Paramètres"
        />

        {/* Notice Toast / Alert */}
        {notice && (
          <div
            aria-live="polite"
            className="mt-4 flex items-center justify-between rounded-xl border border-[var(--idealy-teal-border)] bg-[var(--idealy-teal-bg)] px-4 py-2.5 text-xs font-medium text-[var(--idealy-teal-petrol)] transition-all animate-fadeIn"
          >
            <span>{saving ? "Enregistrement en cours… " : notice}</span>
            <button
              className="text-xs font-semibold opacity-70 hover:opacity-100"
              onClick={() => setNotice("")}
              type="button"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Master-Detail Apple HIG Container */}
        <div className="mt-6 flex flex-col md:flex-row gap-6 items-start">
          {/* ─── 1. LEFT SIDEBAR: APPLE SYSTEM SETTINGS NAVIGATION ─── */}
          <nav
            aria-label="Navigation des paramètres"
            className="w-full md:w-64 shrink-0 rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)]/80 p-2 shadow-xs backdrop-blur-md"
          >
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-tertiary)]">
              Préférences
            </div>
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {settingsSections.map((id) => {
                const meta = sectionMetadata[id];
                const Icon = meta.icon;
                const isSelected = section === id;
                return (
                  <button
                    aria-current={isSelected ? "page" : undefined}
                    className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all focus-ring shrink-0 md:shrink md:w-full ${
                      isSelected
                        ? "bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)] border border-[var(--idealy-teal-border)] shadow-xs"
                        : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] border border-transparent"
                    }`}
                    key={id}
                    onClick={() => openSection(id)}
                    type="button"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105 ${
                        isSelected
                          ? "bg-[var(--idealy-teal-soft)]/20 text-[var(--idealy-teal-petrol)]"
                          : meta.iconBg
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate flex-1 font-medium tracking-tight">
                      {meta.label}
                    </span>
                    <ChevronRight
                      className={`hidden md:block h-3 w-3 shrink-0 transition-transform ${
                        isSelected
                          ? "text-[var(--idealy-teal-petrol)] translate-x-0.5"
                          : "text-[var(--dsw-alias-label-tertiary)] opacity-0 group-hover:opacity-100"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ─── 2. RIGHT CONTENT PANE: SPACIOUS APPLE CARDS ─── */}
          <main className="flex-1 min-w-0 w-full space-y-6">
            {/* Section Header Banner */}
            <div className="flex items-center gap-3 border-b border-[var(--dsw-alias-border-l1)] pb-4">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${currentMeta.iconBg}`}
              >
                <currentMeta.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[var(--dsw-alias-label-primary)]">
                  {currentMeta.label}
                </h2>
                <p className="text-xs text-[var(--dsw-alias-label-tertiary)] mt-0.5">
                  {currentMeta.description}
                </p>
              </div>
            </div>

            {/* ─── GENERAL / AI ENGINE ─── */}
            {section === "general" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                        <Server className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                          Génération IA & Moteur Backend
                        </h3>
                        <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                          État de synchronisation du runtime Idealy et des fournisseurs LLM.
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                        service === "ready"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : service === "demo" || service === "offline"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : "bg-[var(--dsw-alias-bg-layer-3)] text-[var(--dsw-alias-label-secondary)]"
                      }`}
                    >
                      {service === "checking" ? (
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                      ) : service === "ready" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                      {service === "checking"
                        ? "Vérification…"
                        : service === "ready"
                          ? "Opérationnel"
                          : service === "demo"
                            ? "Mode démo"
                            : "Hors ligne"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-3.5">
                      <div className="text-[11px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                        Mode d'exécution
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--dsw-alias-label-primary)] capitalize">
                        {service === "ready"
                          ? "Production Connectée"
                          : service === "demo"
                            ? "Démo Locale"
                            : "Vérification"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-3.5">
                      <div className="text-[11px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                        Modèles & Fournisseurs
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        {configuredProviders.length > 0
                          ? configuredProviders.join(", ")
                          : "Gemini / Claude / GPT"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-3.5">
                      <div className="text-[11px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                        Quota de requêtes
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        {quota?.remaining !== undefined
                          ? `${quota.remaining} / ${quota.limit ?? 100}`
                          : "Illimité (Démo)"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[var(--dsw-alias-border-l1)] pt-4">
                    <span className="text-xs text-[var(--dsw-alias-label-secondary)]">
                      Besoin d'ajouter vos clés d'API (OpenAI, Anthropic, Google) ?
                    </span>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--idealy-teal-border)] bg-[var(--idealy-teal-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--idealy-teal-petrol)] hover:bg-[var(--idealy-teal-soft)]/20 transition-all focus-ring"
                      onClick={() => setActivePage("connectors")}
                      type="button"
                    >
                      <span>Ouvrir les Connecteurs</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ─── APPEARANCE ─── */}
            {section === "appearance" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                      <Sun className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Thème d'affichage
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Basculez entre le mode sombre profond, clair, ou l'adaptation automatique au système d'exploitation.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {themes.map(({ id, label, icon: Icon, desc }) => {
                      const isActiveTheme = theme === id;
                      return (
                        <button
                          aria-pressed={isActiveTheme}
                          className={`group flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all focus-ring ${
                            isActiveTheme
                              ? "border-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)] shadow-xs"
                              : "border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] hover:border-[var(--dsw-alias-border-l2)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                          }`}
                          key={id}
                          onClick={() => setTheme(id)}
                          type="button"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span
                              className={`grid h-8 w-8 place-items-center rounded-xl ${
                                isActiveTheme
                                  ? "bg-[var(--idealy-teal-petrol)] text-white shadow-xs"
                                  : "bg-[var(--dsw-alias-bg-layer-3)] text-[var(--dsw-alias-label-secondary)] group-hover:text-[var(--dsw-alias-label-primary)]"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            {isActiveTheme && (
                              <Check className="h-4 w-4 text-[var(--idealy-teal-petrol)]" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`text-sm font-semibold ${
                                isActiveTheme
                                  ? "text-[var(--idealy-teal-petrol)]"
                                  : "text-[var(--dsw-alias-label-primary)]"
                              }`}
                            >
                              {label}
                            </div>
                            <div className="text-[11px] text-[var(--dsw-alias-label-tertiary)] mt-0.5">
                              {desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* ─── ACCOUNT & SQUAD WAY ─── */}
            {section === "account" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-500/10 text-teal-500">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Profil & Préférences d'Escouade
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Configurez votre voie de travail multi-agents et vos paramètres régionaux.
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="mt-6 flex items-center gap-2 text-xs text-[var(--dsw-alias-label-secondary)]">
                      <LoaderCircle className="h-4 w-4 animate-spin text-[var(--idealy-teal-petrol)]" />
                      <span>Chargement de votre profil…</span>
                    </div>
                  ) : preferences ? (
                    <div className="mt-6 space-y-6">
                      {/* Identity Card */}
                      <div className="flex items-center gap-3 rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-4">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--idealy-teal-bg)] border border-[var(--idealy-teal-border)] text-sm font-bold text-[var(--idealy-teal-petrol)]">
                          {(preferences.displayName || preferences.accountEmail || "I")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                            {preferences.displayName || "Utilisateur Idealy"}
                          </div>
                          <div className="text-xs text-[var(--dsw-alias-label-tertiary)]">
                            {preferences.accountEmail || "Compte local connecté"}
                          </div>
                        </div>
                      </div>

                      {/* Voie Selector with squad preview */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--dsw-alias-label-secondary)]">
                            Voie de travail active (Escouade)
                          </label>
                          <button
                            className="inline-flex items-center gap-1 text-xs text-[var(--idealy-teal-petrol)] hover:underline font-medium"
                            onClick={() => setActivePage("agents")}
                            type="button"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Voir l'Escouade complète</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {wayOptions.map((way) => {
                            const isSelected = (preferences.way || "ninja") === way.id;
                            return (
                              <button
                                aria-pressed={isSelected}
                                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all focus-ring ${
                                  isSelected
                                    ? "border-[var(--idealy-teal-petrol)] bg-[var(--idealy-teal-bg)] shadow-xs"
                                    : "border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
                                }`}
                                key={way.id}
                                onClick={() => void savePreferences({ way: way.id })}
                                type="button"
                              >
                                <div className="flex w-full items-center justify-between">
                                  <span className="text-xs font-bold text-[var(--dsw-alias-label-primary)]">
                                    {way.label}
                                  </span>
                                  <span className="rounded-md bg-[var(--dsw-alias-bg-layer-3)] px-2 py-0.5 text-[10px] font-semibold text-[var(--idealy-teal-petrol)]">
                                    {way.badge}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[var(--dsw-alias-label-secondary)] line-clamp-1">
                                  {way.description}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Language & Timezone Form */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--dsw-alias-border-l1)]">
                        <label className="block text-xs font-medium text-[var(--dsw-alias-label-secondary)]">
                          Langue de l'interface
                          <select
                            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] px-3 text-xs text-[var(--dsw-alias-label-primary)] focus-ring"
                            onChange={(event) =>
                              void savePreferences({
                                preferredLanguage: event.target
                                  .value as Preferences["preferredLanguage"],
                              })
                            }
                            value={preferences.preferredLanguage}
                          >
                            <option value="fr">Français (FR)</option>
                            <option value="en">English (US)</option>
                            <option value="es">Español (ES)</option>
                          </select>
                        </label>

                        <label className="block text-xs font-medium text-[var(--dsw-alias-label-secondary)]">
                          Fuseau horaire
                          <input
                            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] px-3 text-xs text-[var(--dsw-alias-label-primary)] focus-ring"
                            defaultValue={preferences.timezone}
                            maxLength={64}
                            onBlur={(event) => {
                              if (event.target.value !== preferences.timezone)
                                void savePreferences({ timezone: event.target.value });
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-5 text-center">
                      <p className="text-xs text-[var(--dsw-alias-label-secondary)]">
                        Connectez-vous pour synchroniser vos préférences sur le serveur Idealy.
                      </p>
                      <Button
                        className="mt-3.5 inline-flex"
                        onClick={() =>
                          window.location.assign("/login?callbackUrl=%2Fsettings")
                        }
                        size="sm"
                        variant="primary"
                      >
                        Se connecter au compte
                      </Button>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ─── BILLING & QUOTAS ─── */}
            {section === "billing" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                      <CreditCard className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Abonnement et Facturation
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Gestion de vos forfaits, jetons d'orchestration et factures Stripe sécurisées.
                      </p>
                    </div>
                  </div>

                  {billingLoading ? (
                    <div className="mt-6 flex items-center gap-2 text-xs text-[var(--dsw-alias-label-secondary)]">
                      <LoaderCircle className="h-4 w-4 animate-spin text-amber-500" />
                      <span>Consultation de vos abonnements…</span>
                    </div>
                  ) : billingError ? (
                    <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-400">
                      {billingError}
                    </div>
                  ) : billing ? (
                    <div className="mt-6 space-y-5">
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-4">
                          <dt className="text-xs font-medium text-[var(--dsw-alias-label-tertiary)]">
                            Forfait actif
                          </dt>
                          <dd className="mt-1 text-base font-bold text-[var(--dsw-alias-label-primary)]">
                            {billing.planId === "business"
                              ? "Formule Business"
                              : billing.planId === "pro"
                                ? "Formule Pro"
                                : "Découverte Gratuite"}
                          </dd>
                        </div>

                        <div className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-4">
                          <dt className="text-xs font-medium text-[var(--dsw-alias-label-tertiary)]">
                            Crédits d'exécution IA
                          </dt>
                          <dd className="mt-1 text-base font-bold text-[var(--idealy-teal-petrol)]">
                            {billing.creditsBalance ?? "Illimités (Local)"}
                          </dd>
                        </div>
                      </dl>

                      <p className="text-xs text-[var(--dsw-alias-label-secondary)] leading-relaxed">
                        {billing.active
                          ? billing.cancelAtPeriodEnd
                            ? `L’abonnement se termine le ${
                                billing.currentPeriodEnd
                                  ? new Date(billing.currentPeriodEnd * 1000).toLocaleDateString("fr-FR")
                                  : "à la fin de la période"
                              }.`
                            : `Abonnement ${billing.status === "trialing" ? "en période d’essai" : "actif"}${
                                billing.currentPeriodEnd
                                  ? ` · renouvellement le ${new Date(billing.currentPeriodEnd * 1000).toLocaleDateString("fr-FR")}`
                                  : ""
                              }.`
                          : "Aucun prélèvement actif. Vous êtes en mode libre."}
                      </p>

                      <div className="pt-3 border-t border-[var(--dsw-alias-border-l1)] flex flex-wrap gap-3">
                        {billing.active ? (
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--dsw-alias-label-primary)] px-4 text-xs font-semibold text-[var(--dsw-alias-bg-layer-1)] hover:opacity-90 focus-ring disabled:opacity-60"
                            disabled={portalLoading}
                            onClick={() => void openBillingPortal()}
                            type="button"
                          >
                            {portalLoading ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                            Ouvrir le portail Stripe
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--idealy-teal-petrol)] px-4 text-xs font-semibold text-white hover:opacity-95 focus-ring"
                            onClick={() => setActivePage("pricing")}
                            type="button"
                          >
                            <span>Découvrir les offres Pro</span>
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-5 text-center">
                      <p className="text-xs text-[var(--dsw-alias-label-secondary)]">
                        Connectez-vous pour consulter vos quotas et crédits de compte.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ─── DATA & STORAGE ─── */}
            {section === "data" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Database className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Vos données locales sur cet appareil
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Vos brouillons, espaces, livrables et historique sont sauvegardés localement et synchronisables.
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ["Discussions", conversations.length],
                      ["Messages", messages.length],
                      ["Espaces", spaces.length],
                      ["Livrables", artifacts.length],
                    ].map(([label, count]) => (
                      <div
                        className="rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-3.5 text-center"
                        key={String(label)}
                      >
                        <dt className="text-[11px] font-medium text-[var(--dsw-alias-label-tertiary)]">
                          {label}
                        </dt>
                        <dd className="mt-1 text-lg font-bold text-[var(--dsw-alias-label-primary)]">
                          {count}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 pt-4 border-t border-[var(--dsw-alias-border-l1)] flex items-center justify-between">
                    <span className="text-xs text-[var(--dsw-alias-label-secondary)]">
                      Téléchargez une copie JSON complète de vos données.
                    </span>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] px-4 py-2 text-xs font-semibold text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-all focus-ring"
                      onClick={exportLocalData}
                      type="button"
                    >
                      <Database className="h-3.5 w-3.5 text-[var(--idealy-teal-petrol)]" />
                      <span>Exporter en JSON</span>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ─── SHORTCUTS ─── */}
            {section === "shortcuts" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Keyboard className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Raccourcis clavier Mac & PC
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Accélérez votre flux de travail grâce à ces combinaisons de touches standardisées.
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 divide-y divide-[var(--dsw-alias-border-l1)] border-t border-[var(--dsw-alias-border-l1)]">
                    {[
                      ["Ctrl / ⌘ + K", "Ouvrir la palette de commandes globale"],
                      ["Entrée", "Envoyer le message ou lancer l'agent"],
                      ["Maj + Entrée", "Saut de ligne dans la zone de texte"],
                      ["Échap", "Fermer le modal, tiroir ou palette active"],
                      ["Ctrl / ⌘ + /", "Afficher l'aide des raccourcis"],
                    ].map(([key, action]) => (
                      <div
                        className="flex items-center justify-between py-3 text-xs"
                        key={key}
                      >
                        <dt className="text-[var(--dsw-alias-label-secondary)] font-medium">
                          {action}
                        </dt>
                        <dd>
                          <kbd className="rounded-lg border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] px-2.5 py-1 text-[11px] font-mono text-[var(--dsw-alias-label-primary)] shadow-xs">
                            {key}
                          </kbd>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            )}

            {/* ─── NOTIFICATIONS ─── */}
            {section === "notifications" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-500">
                      <Bell className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Centre de Notifications
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Les alertes en direct s'affichent automatiquement dans vos conversations actives.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-4 text-xs text-[var(--dsw-alias-label-secondary)]">
                    Les notifications Web Push et alertes par e-mail sont gérées de manière non intrusive.
                  </div>
                </section>
              </div>
            )}

            {/* ─── PRIVACY ─── */}
            {section === "privacy" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                      <Lock className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Confidentialité & Clés privées
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
                        Vos clés d'API restent chiffrées côté serveur ou dans votre stockage local sécurisé.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[var(--dsw-alias-border-l1)]">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] px-4 py-2 text-xs font-semibold text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring"
                      onClick={() => setActivePage("privacy")}
                      type="button"
                    >
                      <span>Consulter la politique complète de confidentialité</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* ─── RESOURCES ─── */}
            {section === "resources" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["welcome", "Bienvenue", "Découvrez l’espace de travail Idealy.", Sparkles],
                    ["docs", "Documentation", "Comprendre les outils et les étapes de travail.", BookOpen],
                    ["support", "Assistance", "Trouver de l’aide ou préparer un message au support.", CircleHelp],
                    ["pricing", "Offres & Forfaits", "Consulter les formules et les options du compte.", CreditCard],
                  ] as const).map(([page, title, description, Icon]) => (
                    <button
                      className="group flex min-h-[92px] items-center gap-3.5 rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-4 text-left transition-all hover:border-[var(--idealy-teal-border)] hover:bg-[var(--idealy-teal-bg)]/20 focus-ring"
                      key={page}
                      onClick={() => setActivePage(page as any)}
                      type="button"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)] border border-[var(--idealy-teal-border)] transition-transform group-hover:scale-105">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                          {title}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--dsw-alias-label-tertiary)]">
                          {description}
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--dsw-alias-label-tertiary)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--idealy-teal-petrol)]" />
                    </button>
                  ))}
                </section>
              </div>
            )}

            {/* ─── ABOUT ─── */}
            {section === "about" && (
              <div className="space-y-5 animate-fadeIn">
                <section className="rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--idealy-teal-bg)] text-[var(--idealy-teal-petrol)] border border-[var(--idealy-teal-border)]">
                      <Info className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
                        Idealy v1.0.0
                      </h3>
                      <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)] leading-relaxed">
                        Plateforme d'ingénierie et d'orchestration multi-agents alimentée par Alvin et les 4 Voies (Ninja, Mage, Hunter, Studio Pro).
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-[var(--dsw-alias-border-l1)]">
                    {[
                      ["privacy", "Confidentialité"],
                      ["terms", "Conditions d'utilisation"],
                      ["eula", "Licence EULA"],
                    ].map(([page, label]) => (
                      <button
                        className="rounded-full border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-1)] px-3.5 py-1.5 text-xs font-medium text-[var(--dsw-alias-label-secondary)] transition-colors hover:border-[var(--idealy-teal-petrol)] hover:text-[var(--idealy-teal-petrol)] focus-ring"
                        key={page}
                        onClick={() => setActivePage(page as any)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageFrame>
  );
};
