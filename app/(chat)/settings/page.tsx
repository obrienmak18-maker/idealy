"use client";

import { useEffect, useState } from "react";
import {
  CheckIcon,
  Clock3Icon,
  CompassIcon,
  Globe2Icon,
  LoaderCircleIcon,
  RefreshCwIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";
import type { SupportedLanguage } from "@/lib/i18n/language-store";
import {
  isIdealyWay,
  type IdealyWay,
} from "@/lib/idealy/product-contract";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";

const copy = {
  fr: {
    title: "Général",
    subtitle: "Personnalisez Idealy sans toucher à vos projets ni à votre historique.",
    profileTitle: "Profil Idealy",
    profileDescription: "Ce compte est utilisé pour synchroniser vos préférences et vos projets.",
    accountName: "Nom du compte",
    email: "Adresse e-mail",
    accountFallback: "Compte connecté",
    wayTitle: "Voie de travail par défaut",
    wayDescription: "Choisissez la méthode que l’escouade utilisera pour vos prochaines missions.",
    wayPreserve: "Modifier la voie ne modifie ni vos missions existantes, ni vos discussions, ni vos fichiers. Le choix s’applique aux nouvelles missions.",
    current: "Actuelle",
    chooseWay: "Utiliser cette voie",
    saving: "Enregistrement…",
    waySaved: "Votre voie par défaut a été mise à jour.",
    waySaveError: "Impossible d’enregistrer cette voie sur votre compte. Aucune modification n’a été appliquée.",
    languageTitle: "Langue de l’interface",
    languageDescription: "Cette langue est appliquée à l’interface et conservée pour vos prochaines visites.",
    languageSaved: "Langue enregistrée sur votre compte.",
    languageLocal: "La langue est conservée sur cet appareil, mais sa synchronisation au compte a échoué.",
    timezoneTitle: "Fuseau horaire",
    timezoneDescription: "Utilisé pour afficher et organiser les informations liées au temps.",
    timezonePlaceholder: "Ex. Africa/Lubumbashi",
    detectedTimezone: "Fuseau de cet appareil",
    saveTimezone: "Enregistrer le fuseau",
    timezoneSaved: "Fuseau horaire enregistré.",
    timezoneError: "Le fuseau horaire n’a pas pu être enregistré.",
    loadingProfile: "Chargement des préférences du compte…",
    profileUnavailable: "Les préférences du compte n’ont pas pu être chargées. Les réglages locaux restent accessibles.",
  },
  en: {
    title: "General",
    subtitle: "Personalize Idealy without changing your projects or history.",
    profileTitle: "Idealy profile",
    profileDescription: "This account is used to synchronize your preferences and projects.",
    accountName: "Account name",
    email: "Email address",
    accountFallback: "Connected account",
    wayTitle: "Default work path",
    wayDescription: "Choose the method your squad will use for future missions.",
    wayPreserve: "Changing your path does not alter existing missions, conversations, or files. It applies to new missions.",
    current: "Current",
    chooseWay: "Use this path",
    saving: "Saving…",
    waySaved: "Your default work path has been updated.",
    waySaveError: "This work path could not be saved to your account. No change was applied.",
    languageTitle: "Interface language",
    languageDescription: "The interface uses this language and keeps it for your next visits.",
    languageSaved: "Language saved to your account.",
    languageLocal: "The language is saved on this device, but account synchronization failed.",
    timezoneTitle: "Time zone",
    timezoneDescription: "Used to display and organize time-related information.",
    timezonePlaceholder: "E.g. Africa/Lubumbashi",
    detectedTimezone: "Use this device's time zone",
    saveTimezone: "Save time zone",
    timezoneSaved: "Time zone saved.",
    timezoneError: "The time zone could not be saved.",
    loadingProfile: "Loading account preferences…",
    profileUnavailable: "Account preferences could not be loaded. Local settings remain available.",
  },
  es: {
    title: "General",
    subtitle: "Personaliza Idealy sin modificar tus proyectos ni tu historial.",
    profileTitle: "Perfil de Idealy",
    profileDescription: "Esta cuenta se utiliza para sincronizar tus preferencias y proyectos.",
    accountName: "Nombre de la cuenta",
    email: "Correo electrónico",
    accountFallback: "Cuenta conectada",
    wayTitle: "Vía de trabajo predeterminada",
    wayDescription: "Elige el método que usará el equipo para tus próximas misiones.",
    wayPreserve: "Cambiar de vía no modifica tus misiones, conversaciones ni archivos existentes. Se aplica a las nuevas misiones.",
    current: "Actual",
    chooseWay: "Usar esta vía",
    saving: "Guardando…",
    waySaved: "Se actualizó tu vía de trabajo predeterminada.",
    waySaveError: "No se pudo guardar la vía en tu cuenta. No se aplicó ningún cambio.",
    languageTitle: "Idioma de la interfaz",
    languageDescription: "La interfaz utilizará este idioma y lo conservará para tus próximas visitas.",
    languageSaved: "Idioma guardado en tu cuenta.",
    languageLocal: "El idioma está guardado en este dispositivo, pero falló la sincronización con la cuenta.",
    timezoneTitle: "Zona horaria",
    timezoneDescription: "Se utiliza para mostrar y organizar la información relacionada con el tiempo.",
    timezonePlaceholder: "Ej. Africa/Lubumbashi",
    detectedTimezone: "Usar la zona horaria de este dispositivo",
    saveTimezone: "Guardar zona horaria",
    timezoneSaved: "Zona horaria guardada.",
    timezoneError: "No se pudo guardar la zona horaria.",
    loadingProfile: "Cargando las preferencias de la cuenta…",
    profileUnavailable: "No se pudieron cargar las preferencias de la cuenta. Los ajustes locales siguen disponibles.",
  },
} as const;

const wayCopy: Record<
  SupportedLanguage,
  Record<IdealyWay, { label: string; description: string; resource: string }>
> = {
  fr: {
    ninja: { label: "Voie du Ninja", description: "Avancer vite, avec précision et un minimum de friction.", resource: "Chakra" },
    mage: { label: "Voie du Mage", description: "Explorer des idées et tester des solutions originales.", resource: "Mana" },
    hunter: { label: "Voie du Hunter", description: "Comparer les options, analyser et choisir avec rigueur.", resource: "Nen" },
    professional: { label: "Voie du Pro", description: "Privilégier une architecture robuste et maintenable.", resource: "Énergie" },
  },
  en: {
    ninja: { label: "Ninja Path", description: "Move quickly, precisely, with minimal friction.", resource: "Chakra" },
    mage: { label: "Mage Path", description: "Explore ideas and test original solutions.", resource: "Mana" },
    hunter: { label: "Hunter Path", description: "Compare options, analyze, and choose rigorously.", resource: "Nen" },
    professional: { label: "Pro Path", description: "Favor robust, maintainable architecture.", resource: "Energy" },
  },
  es: {
    ninja: { label: "Vía del Ninja", description: "Avanza con rapidez y precisión, con la mínima fricción.", resource: "Chakra" },
    mage: { label: "Vía del Mago", description: "Explora ideas y prueba soluciones originales.", resource: "Maná" },
    hunter: { label: "Vía del Hunter", description: "Compara opciones, analiza y elige con rigor.", resource: "Nen" },
    professional: { label: "Vía Pro", description: "Prioriza una arquitectura sólida y fácil de mantener.", resource: "Energía" },
  },
};

const supportedLanguages: Array<{ value: SupportedLanguage; label: string; nativeName: string }> = [
  { value: "fr", label: "FR", nativeName: "Français" },
  { value: "en", label: "EN", nativeName: "English" },
  { value: "es", label: "ES", nativeName: "Español" },
];

type ProfilePreferences = {
  way?: unknown;
  preferredLanguage?: unknown;
  timezone?: unknown;
  displayName?: unknown;
  accountEmail?: unknown;
  simulated?: boolean;
};

async function updatePreferences(updates: {
  way?: IdealyWay;
  preferredLanguage?: SupportedLanguage;
  timezone?: string;
}) {
  const response = await fetch("/api/idealy/profile/preferences", {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Preferences could not be saved.");
  }
  return payload;
}

export default function SettingsIndex() {
  const { language, setLanguage } = useTranslation();
  const lang = language === "en" || language === "es" ? language : "fr";
  const text = copy[lang];
  const { currentWay, setWay } = useGamificationStore();

  const [selectedWay, setSelectedWay] = useState<IdealyWay>(currentWay);
  const [savingWay, setSavingWay] = useState<IdealyWay | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [deviceTimezone, setDeviceTimezone] = useState("UTC");
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileUnavailable, setProfileUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setDeviceTimezone(detected);
    setTimezone(detected);

    fetch("/api/idealy/profile/preferences", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | (ProfilePreferences & { error?: string })
          | null;
        if (!response.ok || !payload) {
          throw new Error(payload?.error ?? "Preferences unavailable.");
        }
        if (!active) return;
        if (isIdealyWay(payload.way)) {
          setSelectedWay(payload.way);
          setWay(payload.way);
        }
        if (typeof payload.timezone === "string" && payload.timezone.trim()) {
          setTimezone(payload.timezone);
        }
        setDisplayName(typeof payload.displayName === "string" ? payload.displayName : null);
        setAccountEmail(typeof payload.accountEmail === "string" ? payload.accountEmail : null);
      })
      .catch(() => {
        if (active) setProfileUnavailable(true);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setWay]);

  async function chooseWay(nextWay: IdealyWay) {
    if (nextWay === selectedWay || savingWay) return;
    setSavingWay(nextWay);
    try {
      await updatePreferences({ way: nextWay });
      setSelectedWay(nextWay);
      setWay(nextWay);
      toast.success(text.waySaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.waySaveError);
    } finally {
      setSavingWay(null);
    }
  }

  async function chooseLanguage(nextLanguage: SupportedLanguage) {
    if (nextLanguage === language || savingLanguage) return;
    setSavingLanguage(true);
    setLanguage(nextLanguage);
    try {
      await updatePreferences({ preferredLanguage: nextLanguage });
      toast.success(copy[nextLanguage].languageSaved);
    } catch {
      // The language store also persists NEXT_LOCALE on this device.
      toast.info(copy[nextLanguage].languageLocal);
    } finally {
      setSavingLanguage(false);
    }
  }

  async function saveTimezone(nextTimezone = timezone) {
    const normalized = nextTimezone.trim();
    if (!normalized || normalized.length > 64 || !/^[A-Za-z0-9_+./-]+$/.test(normalized)) {
      toast.error(text.timezoneError);
      return;
    }
    setSavingTimezone(true);
    try {
      await updatePreferences({ timezone: normalized });
      setTimezone(normalized);
      toast.success(text.timezoneSaved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.timezoneError);
    } finally {
      setSavingTimezone(false);
    }
  }

  const wayDetails = wayCopy[lang];

  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-base font-semibold tracking-tight">{text.title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.subtitle}</p>
      </header>

      {profileLoading ? (
        <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          {text.loadingProfile}
        </p>
      ) : null}
      {profileUnavailable ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {text.profileUnavailable}
        </p>
      ) : null}

      <section className="rounded-2xl border border-outline-variant/70 bg-card/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserRoundIcon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{text.profileTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.profileDescription}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{text.accountName}</p>
                <p className="mt-1 truncate text-sm font-medium">{displayName || text.accountFallback}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-border/60 bg-background/50 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{text.email}</p>
                <p className="mt-1 truncate text-sm font-medium">{accountEmail || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <CompassIcon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{text.wayTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.wayDescription}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(["ninja", "mage", "hunter", "professional"] as IdealyWay[]).map((way) => {
            const active = selectedWay === way;
            const details = wayDetails[way];
            return (
              <button
                key={way}
                type="button"
                aria-pressed={active}
                disabled={savingWay !== null || profileLoading}
                onClick={() => void chooseWay(way)}
                className={`group flex min-h-[106px] w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-70 ${
                  active
                    ? "border-primary/50 bg-primary/8 shadow-sm"
                    : "border-outline-variant/70 bg-surface-container-low hover:border-primary/35 hover:bg-surface-container-high"
                }`}
              >
                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-outline-variant text-transparent"
                }`}>
                  {savingWay === way ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                  ) : active ? (
                    <CheckIcon className="size-3.5" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {details.label}
                    {active ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {text.current}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{details.description}</span>
                  <span className="mt-2 inline-flex rounded-md bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {details.resource}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="rounded-xl border border-border/60 bg-background/45 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          {text.wayPreserve}
        </p>
      </section>

      <section className="border-t border-border/60 pt-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Globe2Icon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{text.languageTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.languageDescription}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={text.languageTitle}>
              {supportedLanguages.map(({ value, label, nativeName }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={language === value}
                  disabled={savingLanguage}
                  onClick={() => void chooseLanguage(value)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 ${
                    language === value
                      ? "border-primary/50 bg-primary/8 text-foreground"
                      : "border-outline-variant/70 bg-surface-container-low text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
                    <span>{nativeName}</span>
                  </span>
                  {savingLanguage && language === value ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                  ) : language === value ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 pt-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Clock3Icon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{text.timezoneTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.timezoneDescription}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                aria-label={text.timezoneTitle}
                autoComplete="off"
                value={timezone}
                maxLength={64}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder={text.timezonePlaceholder}
                className="h-10 min-w-0 flex-1 rounded-xl border border-outline-variant/70 bg-background/60 px-3 text-sm outline-none transition-colors focus:border-ring/70 focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <button
                type="button"
                onClick={() => void saveTimezone()}
                disabled={savingTimezone || profileLoading}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-container-high disabled:cursor-wait disabled:opacity-60"
              >
                {savingTimezone ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <CheckIcon className="size-3.5" />}
                {text.saveTimezone}
              </button>
            </div>
            <button
              type="button"
              disabled={savingTimezone || deviceTimezone === timezone}
              onClick={() => void saveTimezone(deviceTimezone)}
              className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-default disabled:text-muted-foreground"
            >
              <RefreshCwIcon className="size-3.5" />
              {text.detectedTimezone}: {deviceTimezone}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
