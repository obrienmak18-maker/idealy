import {
  Check,
  Lock,
  X,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Monitor,
  Moon,
  Server,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "../../services/i18n";
import { authenticatedFetch, signOutFirebase } from "../../services/firebase";
import { voiesCatalog, type WayDetailed } from "../../services/voies-catalog";

type Preferences = {
  accountEmail: string | null;
  displayName: string | null;
  preferredLanguage: "fr" | "en" | "es";
  timezone: string;
  way: "mage" | "ninja" | "hunter" | "professional";
};
type ServiceState = "checking" | "ready" | "offline";

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    setActivePage,
    conversations,
    messages,
    artifacts,
    spaces,
    userWay,
    setUserWay,
    language,
    setLanguage,
    remainingWayChanges,
  } = useApp();
  const { t, ti } = useTranslation();
  const settingsSections = [
    "general",
    "account",
    "appearance",
    "billing",
    "notifications",
    "privacy",
    "data",
    "shortcuts",
  ] as const;
  type SettingsSection = (typeof settingsSections)[number];
  const currentSection = (): SettingsSection => {
    const segment = window.location.pathname.split("/").filter(Boolean).at(-1);
    return settingsSections.includes(segment as SettingsSection)
      ? (segment as SettingsSection)
      : "general";
  };
  const [section, setSection] = useState<SettingsSection>(() =>
    typeof window === "undefined" ? "general" : currentSection()
  );
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [service, setService] = useState<ServiceState>("checking");
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
  const [pendingWayChange, setPendingWayChange] = useState<WayDetailed | null>(null);

  useEffect(() => {
    const syncSection = () => setSection(currentSection());
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  useEffect(() => {
    if (section !== "billing") {
      return;
    }
    const controller = new AbortController();
    setBillingLoading(true);
    setBillingError("");
    authenticatedFetch("/api/idealy/billing/status", {
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
        if (!response.ok) {
          throw new Error(
            payload.error || "Le statut de facturation est indisponible."
          );
        }
        if (!controller.signal.aborted) {
          setBilling(payload);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setBillingError(
            cause instanceof Error
              ? cause.message
              : "Le statut de facturation est indisponible."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBillingLoading(false);
        }
      });
    return () => controller.abort();
  }, [section]);

  const openSection = (next: SettingsSection) => {
    setSection(next);
    const path = next === "general" ? "/settings" : `/settings/${next}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    setBillingError("");
    try {
      const response = await authenticatedFetch("/api/idealy/billing/portal", {
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
      ) {
        throw new Error(
          payload.error || "Le portail de facturation n’a pas pu être ouvert."
        );
      }
      window.location.assign(portalUrl.toString());
    } catch (cause) {
      setBillingError(
        cause instanceof Error
          ? cause.message
          : "Le portail de facturation n’a pas pu être ouvert."
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
          2
        ),
      ],
      { type: "application/json" }
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
      authenticatedFetch("/api/idealy/health", {
        cache: "no-store",
        credentials: "same-origin",
      }),
      authenticatedFetch("/api/idealy/profile/preferences", {
        cache: "no-store",
        credentials: "same-origin",
      }),
      authenticatedFetch("/api/idealy/quota", {
        cache: "no-store",
        credentials: "same-origin",
      }),
    ])
      .then(async ([healthResponse, preferencesResponse, quotaResponse]) => {
        const health = (await healthResponse.json().catch(() => ({}))) as {
          status?: string;
        };
        const profile = (await preferencesResponse
          .json()
          .catch(() => null)) as Preferences | null;
        const quotaPayload = (await quotaResponse.json().catch(() => null)) as {
          limit?: number;
          remaining?: number;
        } | null;
        if (cancelled) {
          return;
        }
        setService(
          healthResponse.ok && health.status !== "error" ? "ready" : "offline"
        );
        if (
          preferencesResponse.ok &&
          profile &&
          typeof profile.way === "string"
        ) {
          setPreferences(profile);
        } else if (preferencesResponse.status === 401) {
          setNotice(
            t("auth.submitLogin")
          );
        } else if (preferencesResponse.status === 409) {
          setNotice(
            t("common.continue")
          );
        }
        if (quotaResponse.ok && quotaPayload) {
          setQuota(quotaPayload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setService("offline");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePreferences = async (updates: Partial<Preferences>) => {
    setSaving(true);
    setNotice("");
    try {
      const response = await authenticatedFetch(
        "/api/idealy/profile/preferences",
        {
          body: JSON.stringify(updates),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }
      );
      const payload = (await response
        .json()
        .catch(() => ({}))) as Preferences & { error?: string };
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t("common.error"));
        }
        if (response.status === 409) {
          throw new Error(t("common.error"));
        }
        if (response.status === 503) {
          throw new Error(t("common.error"));
        }
        throw new Error(payload.error || t("common.error"));
      }

      // Backend update succeeded! Synchronize UI state
      if (updates.way && updates.way !== (preferences?.way || userWay)) {
        const wayResult = setUserWay(updates.way);
        if (!wayResult.success) {
          throw new Error(wayResult.error || t("common.error"));
        }
      }
      if (updates.preferredLanguage) {
        setLanguage(updates.preferredLanguage);
      }
      setPreferences((current) =>
        current
          ? { ...current, ...updates, ...payload }
          : ({ ...updates, ...payload } as Preferences)
      );
      setNotice(t("settings.saved"));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Enregistrement impossible."
      );
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    { icon: Monitor, id: "system" as const, label: t("settings.themeSystem") },
    { icon: Sun, id: "light" as const, label: t("settings.themeLight") },
    { icon: Moon, id: "dark" as const, label: t("settings.themeDark") },
  ];

  return (
    <main className="h-full w-full overflow-y-auto px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
      <div className="mx-auto w-full max-w-[1280px] pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          {t("settings.accountAndApp")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-main">
          {t("settings.settingsTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          {t("settings.subtitle")}
        </p>

        <nav
          aria-label={t("settings.title")}
          className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface p-1 scrollbar-none"
        >
          {(
            [
              ["general", t("settings.general")],
              ["account", t("settings.account")],
              ["appearance", t("settings.appearance")],
              ["billing", t("settings.billing")],
              ["notifications", t("settings.notifications")],
              ["privacy", t("settings.privacy")],
              ["data", t("settings.data")],
              ["shortcuts", t("settings.shortcuts")],
            ] as const
          ).map(([id, label]) => (
            <button
              aria-current={section === id ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-ring ${section === id ? "bg-bg-subtle text-text-main" : "text-text-muted hover:text-text-main"}`}
              key={id}
              onClick={() => openSection(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        {(section === "general" || section === "appearance") && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
                <Sun aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-main">
                  {t("settings.appearance")}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {t("settings.theme")}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {themes.map(({ id, label, icon: Icon }) => (
                <button
                  aria-pressed={theme === id}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm focus-ring ${theme === id ? "border-brand-primary/50 bg-brand-primary/10 text-brand-primary" : "border-border-subtle bg-bg-base text-text-muted hover:text-text-main"}`}
                  key={id}
                  onClick={() => setTheme(id)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {(section === "general" || section === "account") && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-main">
                  {t("settings.accountPreferences")}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {t("settings.subtitle")}
                </p>
              </div>
            </div>
            {loading ? (
              <p className="mt-5 text-sm text-text-muted">
                {t("common.loading")}
              </p>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="flex items-center gap-3 pb-2 border-b border-border-subtle">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-white font-semibold text-base shadow-sm">
                    {(
                      (
                        preferences?.displayName ||
                        preferences?.accountEmail ||
                        "U"
                      ).charAt(0) || "U"
                    ).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-main truncate">
                      {preferences?.displayName || t("account.unknownTier")}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {preferences?.accountEmail || t("account.activeSession")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-text-main">
                        {t("settings.way")}
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        {t("settings.subtitle")}
                      </p>
                    </div>
                    <span className="rounded-full bg-bg-base border border-border-subtle px-2.5 py-1 text-[11px] text-text-muted">
                      {t("settings.remainingChanges")}:{" "}
                      <strong className="text-text-main font-semibold">
                        {remainingWayChanges} / 2
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t("settings.way")}>
                    {Object.values(voiesCatalog).map((way) => {
                      const isActive = (preferences?.way || userWay) === way.id;
                      const isLocked = remainingWayChanges === 0 && !isActive;

                      return (
                        <button
                          key={way.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          disabled={isLocked || saving}
                          onClick={() => {
                            if (isActive) return;
                            setPendingWayChange(way);
                          }}
                          className={`relative flex flex-col justify-between text-left p-4 rounded-xl border transition-all duration-200 outline-none ${
                            isActive
                              ? "border-violet-500/60 bg-gradient-to-br from-violet-500/[0.08] to-transparent shadow-[0_0_20px_rgba(139,92,246,0.12)] ring-1 ring-violet-500/40"
                              : isLocked
                              ? "border-border-subtle/50 bg-bg-base/40 opacity-50 cursor-not-allowed"
                              : "border-border-subtle bg-bg-base hover:border-border-strong hover:bg-bg-subtle/60 active:scale-[0.99]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-text-main">
                                {way.label}
                              </span>
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                  <Check className="h-3 w-3" />
                                  {t("settings.activeStatus")}
                                </span>
                              ) : isLocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] text-zinc-400">
                                  <Lock className="h-3 w-3" />
                                  {t("settings.lockedStatus")}
                                </span>
                              ) : (
                                <span className="rounded-full bg-bg-surface border border-border-subtle px-2 py-0.5 text-[10px] text-text-muted">
                                  {way.resourceLabel}
                                </span>
                              )}
                            </div>

                            <p className="mt-1.5 text-xs text-text-muted line-clamp-2 leading-relaxed">
                              {way.tagline}
                            </p>
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-border-subtle/60 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-text-muted">{t("settings.chiefLabel")}</span>
                              <span className="text-[11px] font-medium text-text-main">{way.chiefName}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-text-muted mr-0.5">5 agents</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {way.agents.slice(0, 5).map((agent) => (
                                  <img
                                    key={agent.name}
                                    src={agent.avatarUrl}
                                    alt={agent.name}
                                    title={`${agent.name} (${agent.role})`}
                                    className="inline-block h-5 w-5 rounded-full ring-1 ring-bg-surface object-cover bg-bg-subtle"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-[10.5px] text-text-muted/80 truncate">
                            {way.agents.slice(0, 5).map((a) => a.name).join(" · ")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block text-xs font-medium text-text-muted">
                  {t("settings.language")}
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                    onChange={(event) =>
                      void savePreferences({
                        preferredLanguage: event.target
                          .value as Preferences["preferredLanguage"],
                      })
                    }
                    value={preferences?.preferredLanguage || language}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </label>

                <label className="block text-xs font-medium text-text-muted">
                  {t("settings.timezone")}
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                    defaultValue={preferences?.timezone || "UTC"}
                    maxLength={64}
                    onBlur={(event) => {
                      if (
                        event.target.value !== (preferences?.timezone || "UTC")
                      ) {
                        void savePreferences({ timezone: event.target.value });
                      }
                    }}
                  />
                </label>

                <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text-main">
                      {t("account.activeSession")}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {t("settings.logout")}
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                    onClick={async () => {
                      try {
                        await signOutFirebase();
                      } catch {}
                      try {
                        localStorage.removeItem("idealy_session");
                        localStorage.removeItem("idealy_user_profile");
                        localStorage.removeItem("idealy_profile");
                      } catch {}
                      window.location.href = "/welcome";
                    }}
                    type="button"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t("sidebar.logout")}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {(section === "general" || section === "account") && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
                <Server aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-text-main">
                  {t("settings.servicesTitle")}
                </h2>
                <p className="mt-1 text-xs text-text-muted">
                  {t("settings.servicesSubtitle")}
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 text-xs ${service === "ready" ? "text-emerald-500" : service === "offline" ? "text-amber-500" : "text-text-muted"}`}
              >
                {service === "checking" ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : service === "ready" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                {service === "checking"
                  ? t("settings.serviceChecking")
                  : service === "ready"
                    ? t("settings.serviceAvailable")
                    : t("settings.serviceUnavailable")}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
              <span className="rounded-lg bg-bg-subtle px-3 py-2">
                API Idealy :{" "}
                {service === "ready"
                  ? t("settings.apiConnected")
                  : service === "checking"
                    ? t("settings.apiChecking")
                    : t("settings.apiUnreachable")}
              </span>
              {quota && (
                <span className="rounded-lg bg-bg-subtle px-3 py-2">
                  {ti("settings.quotaRemaining", { remaining: quota.remaining ?? "—" })}
                  {quota.limit ? ti("settings.quotaOutOf", { limit: quota.limit }) : ""}
                </span>
              )}
              <button
                className="rounded-lg bg-bg-subtle px-3 py-2 hover:text-text-main focus-ring"
                onClick={() => setActivePage("connectors")}
                type="button"
              >
                {t("settings.manageConnectors")}
              </button>
            </div>
          </section>
        )}

        {section === "billing" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
                <CreditCard aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-main">
                  {t("settings.billingTitle")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  {t("settings.billingSubtitle")}
                </p>
              </div>
            </div>
            {billingLoading ? (
              <p aria-live="polite" className="mt-5 text-sm text-text-muted">
                {t("settings.billingLoading")}
              </p>
            ) : billingError ? (
              <p
                aria-live="polite"
                className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-500"
              >
                {billingError}
              </p>
            ) : billing ? (
              <>
                {(() => {
                  const activeWayKey = preferences?.way || userWay;
                  const tiers = {
                    hunter: {
                      business: "Double Star",
                      free: "Candidat",
                      max: "Triple Star",
                      pro: "Hunter Licencié",
                      resource: "Nen",
                    },
                    mage: {
                      business: "Archimage",
                      free: "Apprenti",
                      max: "Grand Primordial",
                      pro: "Mage",
                      resource: "Mana",
                    },
                    ninja: {
                      business: "Jonin",
                      free: "Genin",
                      max: "Kage / Sannin",
                      pro: "Chunin",
                      resource: "Chakra",
                    },
                    professional: {
                      business: "Team",
                      free: "Starter",
                      max: "Enterprise",
                      pro: "Pro",
                      resource: "Énergie",
                    },
                  }[activeWayKey] || {
                    business: "Jonin",
                    free: "Genin",
                    max: "Kage / Sannin",
                    pro: "Chunin",
                    resource: "Chakra",
                  };

                  return (
                    <>
                      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-bg-subtle p-3">
                          <dt className="text-xs text-text-muted">
                            {t("settings.activePlan")} ({activeWayKey.toUpperCase()})
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-text-main">
                            {billing.planId === "business"
                              ? tiers.business
                              : billing.planId === "pro"
                                ? tiers.pro
                                : tiers.free}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-bg-subtle p-3">
                          <dt className="text-xs text-text-muted">
                            {t("settings.resourceCredits")} ({tiers.resource})
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-text-main">
                            {billing.creditsBalance ??
                              t("settings.unlimitedBeta")}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 p-3 rounded-xl bg-bg-subtle/50 border border-border-subtle">
                        <p className="text-xs font-semibold text-text-main mb-2">
                          {ti("settings.availableTiers", { way: activeWayKey })}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-bg-surface border border-border-subtle">
                            <p className="font-semibold text-text-main truncate">
                              {tiers.free}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              0 € {t("settings.month")}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-bg-surface border border-border-subtle">
                            <p className="font-semibold text-text-main truncate">
                              {tiers.pro}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              19 € {t("settings.month")}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-bg-surface border border-border-subtle">
                            <p className="font-semibold text-text-main truncate">
                              {tiers.business}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              49 € {t("settings.month")}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-bg-surface border border-border-subtle">
                            <p className="font-semibold text-text-main truncate">
                              {tiers.max}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              199 € {t("settings.month")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                <p className="mt-3 text-xs leading-5 text-text-muted">
                  {billing.active
                    ? billing.cancelAtPeriodEnd
                      ? `L’abonnement se termine le ${billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd * 1000).toLocaleDateString() : "à la fin de la période"}.`
                      : `Abonnement ${billing.status === "trialing" ? "en période d’essai" : "actif"}${billing.currentPeriodEnd ? ` · renouvellement le ${new Date(billing.currentPeriodEnd * 1000).toLocaleDateString()}` : ""}.`
                    : t("settings.noActiveSubscription")}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {billing.active ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-text-main px-4 text-sm font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-60"
                      disabled={portalLoading}
                      onClick={() => void openBillingPortal()}
                      type="button"
                    >
                      {portalLoading ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      )}
                      {t("settings.manageSubscription")}
                    </button>
                  ) : (
                    <button
                      className="h-10 rounded-xl bg-text-main px-4 text-sm font-medium text-bg-base hover:opacity-90 focus-ring"
                      onClick={() => setActivePage("pricing")}
                      type="button"
                    >
                      {t("settings.viewPlans")}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-text-muted">
                {t("settings.loginToViewBilling")}
              </p>
            )}
          </section>
        )}

        {section === "data" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              {t("settings.dataTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {t("settings.dataSubtitle")}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-text-muted sm:grid-cols-4">
              {[
                ["Discussions", conversations.length],
                ["Messages", messages.length],
                ["Spaces", spaces.length],
                ["Artifacts", artifacts.length],
              ].map(([label, count]) => (
                <div
                  className="rounded-xl bg-bg-subtle p-3"
                  key={String(label)}
                >
                  <dt>{label}</dt>
                  <dd className="mt-1 text-base font-semibold text-text-main">
                    {count}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              className="mt-5 h-10 rounded-xl border border-border-subtle px-4 text-sm font-medium text-text-main hover:bg-bg-subtle focus-ring"
              onClick={exportLocalData}
              type="button"
            >
              {t("settings.exportData")}
            </button>
          </section>
        )}
        {section === "notifications" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              {t("settings.notificationsTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {t("settings.notificationsDesc")}
            </p>
          </section>
        )}
        {section === "privacy" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              {t("settings.privacyTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {t("settings.privacyDesc")}
            </p>
            <button
              className="mt-5 h-10 rounded-xl border border-border-subtle px-4 text-sm font-medium text-text-main hover:bg-bg-subtle focus-ring"
              onClick={() => setActivePage("privacy")}
              type="button"
            >
              {t("settings.readPrivacyPolicy")}
            </button>
          </section>
        )}
        {section === "shortcuts" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              {t("settings.shortcutsTitle")}
            </h2>
            <dl className="mt-4 divide-y divide-border-subtle">
              {[
                ["Ctrl / ⌘ + K", t("settings.shortcutPalette")],
                ["Enter", t("settings.shortcutSend")],
                ["Shift + Enter", t("settings.shortcutNewLine")],
                ["Esc", t("settings.shortcutEscape")],
              ].map(([key, action]) => (
                <div
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                  key={key}
                >
                  <dt className="text-text-muted">{action}</dt>
                  <dd>
                    <kbd className="rounded-md border border-border-subtle bg-bg-base px-2 py-1 text-xs text-text-main">
                      {key}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {notice && (
          <p aria-live="polite" className="mt-4 text-sm text-text-muted">
            {saving ? `${t("settings.saving")} ` : ""}
            {notice}
          </p>
        )}
        {/* Work Mode Confirmation Modal */}
        {pendingWayChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161821] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-semibold text-white">
                  {t("settings.confirmWayChange")}
                </h3>
                <button
                  type="button"
                  onClick={() => setPendingWayChange(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <p className="text-sm font-semibold text-white">
                    {pendingWayChange.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {pendingWayChange.tagline}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-400">
                    <span>{t("settings.resourceLabel")} <strong className="text-white">{pendingWayChange.resourceLabel}</strong></span>
                    <span>·</span>
                    <span>{t("settings.chiefLabel")} <strong className="text-white">{pendingWayChange.chiefName}</strong></span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs font-medium text-zinc-400 mb-2">
                      {ti("settings.agentsSquad", { count: pendingWayChange.agents.length })}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pendingWayChange.agents.slice(0, 5).map((agent) => (
                        <div key={agent.name} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5 border border-white/[0.06]">
                          <img src={agent.avatarUrl} alt={agent.name} className="h-6 w-6 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{agent.name}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{agent.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {t("settings.wayChangeDescription")}{" "}
                  <strong className="text-white">{Math.max(0, remainingWayChanges - 1)}</strong> {t("settings.wayChangeRemaining")}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPendingWayChange(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition"
                  disabled={saving}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = pendingWayChange;
                    setPendingWayChange(null);
                    await savePreferences({ way: target.id });
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("common.continue")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
