import {
  Check,
  LoaderCircle,
  Monitor,
  Moon,
  Server,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../common/Button";

type Preferences = {
  accountEmail: string | null;
  displayName: string | null;
  preferredLanguage: "fr" | "en" | "es";
  timezone: string;
  way: "mage" | "ninja" | "hunter" | "professional";
};
type ServiceState = "checking" | "ready" | "offline";

const wayOptions: Array<{ id: Preferences["way"]; label: string }> = [
  { id: "professional", label: "Professionnel" },
  { id: "mage", label: "Mage" },
  { id: "ninja", label: "Ninja" },
  { id: "hunter", label: "Hunter" },
];

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, setActivePage } = useApp();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [service, setService] = useState<ServiceState>("checking");
  const [quota, setQuota] = useState<{
    limit?: number;
    remaining?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

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
          healthResponse.ok && health.status !== "error" ? "ready" : "offline",
        );
        if (
          preferencesResponse.ok &&
          profile &&
          typeof profile.way === "string"
        )
          setPreferences(profile);
        else if (preferencesResponse.status === 401)
          setNotice(
            "Connectez-vous pour charger et modifier vos préférences de compte.",
          );
        else if (preferencesResponse.status === 409)
          setNotice(
            "Terminez la configuration de votre profil pour accéder aux préférences du compte.",
          );
        if (quotaResponse.ok && quotaPayload) setQuota(quotaPayload);
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
      setNotice("Préférences enregistrées.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    { id: "system" as const, label: "Système", icon: Monitor },
    { id: "light" as const, label: "Clair", icon: Sun },
    { id: "dark" as const, label: "Sombre", icon: Moon },
  ];

  return (
    <main className="h-full overflow-y-auto px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Compte et application
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-main">
          Paramètres
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Gérez l’apparence, les préférences de travail et vérifiez les services
          connectés.
        </p>

        <section className="mt-8 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
              <Sun aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text-main">
                Apparence
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Choisissez le thème de l’interface.
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

        <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text-main">
                Préférences du compte
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Ces options sont chargées et enregistrées sur votre profil
                Idealy.
              </p>
            </div>
          </div>
          {loading ? (
            <p className="mt-5 text-sm text-text-muted">
              Chargement des préférences…
            </p>
          ) : preferences ? (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-text-muted">
                {preferences.accountEmail ||
                  preferences.displayName ||
                  "Profil Idealy"}
              </p>
              <label className="block text-xs font-medium text-text-muted">
                Voie de travail
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                  onChange={(event) =>
                    void savePreferences({
                      way: event.target.value as Preferences["way"],
                    })
                  }
                  value={preferences.way}
                >
                  {wayOptions.map((way) => (
                    <option key={way.id} value={way.id}>
                      {way.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-text-muted">
                Langue
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                  onChange={(event) =>
                    void savePreferences({
                      preferredLanguage: event.target
                        .value as Preferences["preferredLanguage"],
                    })
                  }
                  value={preferences.preferredLanguage}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-text-muted">
                Fuseau horaire
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-sm text-text-main focus-ring"
                  defaultValue={preferences.timezone}
                  maxLength={64}
                  onBlur={(event) => {
                    if (event.target.value !== preferences.timezone)
                      void savePreferences({ timezone: event.target.value });
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm text-text-muted">
                Les préférences de compte ne sont pas accessibles pour cette
                session.
              </p>
              <Button
                className="mt-3"
                onClick={() =>
                  window.location.assign("/login?callbackUrl=%2Fsettings")
                }
                size="sm"
                variant="secondary"
              >
                Se connecter
              </Button>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-subtle text-text-muted">
              <Server aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-text-main">
                Services et compteurs
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                État lu depuis les API du backend Idealy.
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
                ? "Vérification"
                : service === "ready"
                  ? "Disponible"
                  : "Indisponible"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
            <span className="rounded-lg bg-bg-subtle px-3 py-2">
              API Idealy :{" "}
              {service === "ready"
                ? "connectée"
                : service === "checking"
                  ? "vérification en cours"
                  : "non joignable"}
            </span>
            {quota && (
              <span className="rounded-lg bg-bg-subtle px-3 py-2">
                Quota : {quota.remaining ?? "—"} restant
                {quota.limit ? ` sur ${quota.limit}` : ""}
              </span>
            )}
            <button
              className="rounded-lg bg-bg-subtle px-3 py-2 hover:text-text-main focus-ring"
              onClick={() => setActivePage("connectors")}
              type="button"
            >
              Gérer les connecteurs
            </button>
          </div>
        </section>
        {notice && (
          <p aria-live="polite" className="mt-4 text-sm text-text-muted">
            {saving ? "Enregistrement… " : ""}
            {notice}
          </p>
        )}
      </div>
    </main>
  );
};
