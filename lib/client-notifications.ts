export type IdealyNotificationPreferences = {
  squad: boolean;
  credit: boolean;
  desktop: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: IdealyNotificationPreferences = {
  credit: true,
  desktop: false,
  squad: true,
};

const STORAGE_KEY = "idealy-notification-preferences";

export function readIdealyNotificationPreferences(): IdealyNotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return DEFAULT_NOTIFICATION_PREFERENCES;
    const value = saved as Record<string, unknown>;
    return {
      credit: typeof value.credit === "boolean" ? value.credit : DEFAULT_NOTIFICATION_PREFERENCES.credit,
      desktop: value.desktop === true,
      squad: typeof value.squad === "boolean" ? value.squad : DEFAULT_NOTIFICATION_PREFERENCES.squad,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function writeIdealyNotificationPreferences(
  preferences: IdealyNotificationPreferences
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function sendIdealyDesktopNotification(title: string, body: string) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !readIdealyNotificationPreferences().desktop
  ) {
    return;
  }

  try {
    new Notification(title, { body, icon: "/icon.svg", tag: "idealy-update" });
  } catch {
    // Browser notifications can be unavailable in embedded or private contexts.
  }
}
