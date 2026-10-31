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
  const {
    theme,
    setTheme,
    setActivePage,
    conversations,
    messages,
    artifacts,
    spaces,
  } = useApp();
  const settingsSections = [
    "general",
    "account",
    "appearance",
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
    typeof window === "undefined" ? "general" : currentSection(),
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

  useEffect(() => {
    const syncSection = () => setSection(currentSection());
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  const openSection = (next: SettingsSection) => {
    setSection(next);
    const path = next === "general" ? "/settings" : `/settings/${next}`;
    if (window.location.pathname !== path)
      window.history.pushState(null, "", path);
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

        <nav
          aria-label="Sections des paramètres"
          className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface p-1"
        >
          {(
            [
              ["general", "Général"],
              ["account", "Compte"],
              ["appearance", "Apparence"],
              ["notifications", "Notifications"],
              ["privacy", "Confidentialité"],
              ["data", "Données"],
              ["shortcuts", "Raccourcis"],
            ] as const
          ).map(([id, label]) => (
            <button
              aria-current={section === id ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-ring ${section === id ? "bg-bg-subtle text-text-main" : "text-text-muted hover:text-text-main"}`}
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
        )}

        {(section === "general" || section === "account") && (
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
        )}

        {(section === "general" || section === "account") && (
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
        )}

        {section === "data" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              Vos données sur cet appareil
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Les brouillons, espaces, messages affichés et livrables conservés
              localement peuvent être exportés en JSON. Les conversations de
              compte restent également dans l’historique backend quand la
              session est active.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-text-muted sm:grid-cols-4">
              {[
                ["Discussions", conversations.length],
                ["Messages", messages.length],
                ["Espaces", spaces.length],
                ["Livrables", artifacts.length],
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
              Exporter les données locales
            </button>
          </section>
        )}
        {section === "notifications" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              Notifications
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Les notifications push et e-mail du backend ne sont pas encore
              exposées dans cette interface. Idealy n’active donc aucun
              abonnement de notification depuis ce panneau.
            </p>
            <p className="mt-4 text-xs text-text-muted">
              Les alertes de génération restent visibles directement dans la
              conversation ouverte.
            </p>
          </section>
        )}
        {section === "privacy" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              Confidentialité et accès
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Le navigateur appelle les API du même domaine. Les secrets
              fournisseurs restent côté serveur ; les contenus envoyés à un
              modèle peuvent être transmis au fournisseur configuré pour traiter
              la demande.
            </p>
            <button
              className="mt-5 h-10 rounded-xl border border-border-subtle px-4 text-sm font-medium text-text-main hover:bg-bg-subtle focus-ring"
              onClick={() => setActivePage("privacy")}
              type="button"
            >
              Lire la politique de confidentialité
            </button>
          </section>
        )}
        {section === "shortcuts" && (
          <section className="mt-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-text-main">
              Raccourcis clavier
            </h2>
            <dl className="mt-4 divide-y divide-border-subtle">
              {[
                ["Ctrl / ⌘ + K", "Ouvrir la palette de commandes"],
                ["Entrée", "Envoyer un message sur ordinateur"],
                ["Maj + Entrée", "Ajouter une nouvelle ligne"],
                ["Échap", "Fermer le menu ou la fenêtre active"],
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
            {saving ? "Enregistrement… " : ""}
            {notice}
          </p>
        )}
      </div>
    </main>
  );
};
