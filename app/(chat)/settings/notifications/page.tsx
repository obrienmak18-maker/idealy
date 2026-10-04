"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  readIdealyNotificationPreferences,
  writeIdealyNotificationPreferences,
  type IdealyNotificationPreferences,
} from "@/lib/client-notifications";

type PermissionState = NotificationPermission | "unsupported";
type LocalPreference = Exclude<keyof IdealyNotificationPreferences, "desktop">;

const copy = {
  fr: {
    title: "Notifications",
    description: "Choisissez les alertes utiles pendant vos missions Idealy.",
    inApp: "Dans Idealy",
    squad: "Résultat d’une mission",
    squadDescription: "Un message apparaît lorsque l’escouade termine ou rencontre un problème.",
    credit: "Solde Power bas",
    creditDescription: "Une alerte apparaît lorsque votre réserve passe sous 10 % de sa capacité.",
    desktop: "Notifications du navigateur",
    desktopDescription: "Recevez les alertes de mission et de Power dans les notifications de votre ordinateur.",
    enable: "Activer les notifications",
    enabled: "Notifications activées",
    denied: "Autorisez les notifications dans les paramètres de votre navigateur pour les activer.",
    unsupported: "Ce navigateur ne prend pas en charge les notifications système.",
    permissionDenied: "Le navigateur a refusé les notifications. Modifiez cette autorisation dans ses paramètres.",
    saved: "Préférence enregistrée sur cet appareil.",
    saveError: "Impossible d’enregistrer cette préférence sur cet appareil.",
  },
  en: {
    title: "Notifications",
    description: "Choose the alerts that help while you work in Idealy.",
    inApp: "In Idealy",
    squad: "Mission result",
    squadDescription: "See a message when the squad finishes or encounters a problem.",
    credit: "Low Power balance",
    creditDescription: "Get an alert when your balance drops below 10% of its capacity.",
    desktop: "Browser notifications",
    desktopDescription: "Receive mission and Power alerts in your computer’s notifications.",
    enable: "Enable notifications",
    enabled: "Notifications enabled",
    denied: "Allow notifications in your browser settings to enable them here.",
    unsupported: "This browser does not support system notifications.",
    permissionDenied: "Your browser blocked notifications. Change this permission in its settings.",
    saved: "Preference saved on this device.",
    saveError: "This preference could not be saved on this device.",
  },
  es: {
    title: "Notificaciones",
    description: "Elige las alertas útiles mientras trabajas en Idealy.",
    inApp: "En Idealy",
    squad: "Resultado de una misión",
    squadDescription: "Recibe un aviso cuando el equipo termine o encuentre un problema.",
    credit: "Saldo bajo de Power",
    creditDescription: "Recibe una alerta cuando tu saldo baje del 10 % de su capacidad.",
    desktop: "Notificaciones del navegador",
    desktopDescription: "Recibe alertas de misión y Power en las notificaciones de tu ordenador.",
    enable: "Activar notificaciones",
    enabled: "Notificaciones activadas",
    denied: "Permite las notificaciones en los ajustes del navegador para activarlas aquí.",
    unsupported: "Este navegador no admite notificaciones del sistema.",
    permissionDenied: "El navegador bloqueó las notificaciones. Cambia este permiso en sus ajustes.",
    saved: "Preferencia guardada en este dispositivo.",
    saveError: "No se pudo guardar esta preferencia en este dispositivo.",
  },
} as const;

export default function NotificationsPage() {
  const { language } = useTranslation();
  const locale = language === "en" || language === "es" ? language : "fr";
  const text = copy[locale];
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [ready, setReady] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPreferences(readIdealyNotificationPreferences());
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    setReady(true);
  }, []);

  const updatePreference = (key: LocalPreference, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      writeIdealyNotificationPreferences(next);
      toast.success(text.saved);
    } catch {
      setPreferences(preferences);
      toast.error(text.saveError);
    }
  };

  const enableDesktopNotifications = async () => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      return;
    }

    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      const next = { ...preferences, desktop: result === "granted" };
      setPreferences(next);
      writeIdealyNotificationPreferences(next);
      if (result === "granted") toast.success(text.enabled);
      else if (result === "denied") toast.error(text.permissionDenied);
    } catch {
      toast.error(text.saveError);
    } finally {
      setRequesting(false);
    }
  };

  const rows: { id: LocalPreference; title: string; description: string }[] = [
    { id: "squad", title: text.squad, description: text.squadDescription },
    { id: "credit", title: text.credit, description: text.creditDescription },
  ];

  return (
    <div aria-busy={!ready} className="space-y-7">
      <header>
        <h1 className="text-base font-semibold">{text.title}</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.description}</p>
      </header>

      <section aria-labelledby="idealy-notifications-heading" className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground" id="idealy-notifications-heading">{text.inApp}</h2>
        {rows.map(({ id, title, description }) => (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/50 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5" key={id}>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                aria-label={title}
                checked={preferences[id]}
                className="peer sr-only"
                disabled={!ready}
                onChange={(event) => updatePreference(id, event.target.checked)}
                role="switch"
                type="checkbox"
              />
              <span aria-hidden="true" className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
              <span aria-hidden="true" className="pointer-events-none absolute left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        ))}
      </section>

      <section aria-labelledby="idealy-desktop-notifications-heading" className="rounded-2xl border border-border/50 bg-card/35 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            {preferences.desktop ? <Bell aria-hidden="true" className="size-4" /> : <BellOff aria-hidden="true" className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold" id="idealy-desktop-notifications-heading">{text.desktop}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.desktopDescription}</p>
            {permission === "denied" ? <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">{text.denied}</p> : null}
            {permission === "unsupported" ? <p className="mt-2 text-xs text-muted-foreground">{text.unsupported}</p> : null}
          </div>
          {permission === "granted" && preferences.desktop ? (
            <span aria-label={text.enabled} className="mt-1 text-emerald-600 dark:text-emerald-400"><Check aria-hidden="true" className="size-4" /></span>
          ) : (
            <button
              className="min-h-10 shrink-0 rounded-full border border-border/60 px-3 text-xs font-medium transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!ready || requesting || permission === "denied" || permission === "unsupported"}
              onClick={enableDesktopNotifications}
              type="button"
            >
              {requesting ? "…" : text.enable}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
