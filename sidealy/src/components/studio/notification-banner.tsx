import { Bell, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

export const NotificationBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    setIsSupported(true);

    const dismissed = localStorage.getItem(
      "idealy_notification_banner_dismissed"
    );
    if (!dismissed && Notification.permission === "default") {
      setIsVisible(true);
    }
  }, []);

  const handleRequest = async () => {
    if (!isSupported) {
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const _n = new Notification("Idealy", {
          body: "Notifications activées ! Vous serez averti à la fin de vos builds.",
          icon: "/favicon.ico",
        });
        _n.onclose = null; // satisfy lint: reference the instantiated object
      }
    } catch {
      // Permission prompt failed or was dismissed
    }
    setIsVisible(false);
    localStorage.setItem("idealy_notification_banner_dismissed", "true");
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("idealy_notification_banner_dismissed", "true");
  };

  if (!isVisible || !isSupported) {
    return null;
  }

  return (
    <section
      aria-label="Notification de statut de build"
      className="mx-auto w-full max-w-3xl px-3 sm:px-4 mb-2 animate-fade-in"
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)]/90 p-3.5 sm:p-4 shadow-sm backdrop-blur-md">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--idealy-indigo)]/10 text-[var(--idealy-indigo)]">
          <Bell aria-hidden="true" className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
            Recevoir une notification quand Idealy termine
          </h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--dsw-alias-label-secondary)]">
            Soyez prévenu dès que la construction est prête ou requiert votre
            attention. Modifiable à tout moment dans les paramètres.
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-lg bg-[var(--idealy-indigo)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95 focus-ring"
              onClick={handleRequest}
              type="button"
            >
              Activer les notifications
            </button>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] px-3 py-1.5 text-xs font-medium text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors focus-ring"
              onClick={handleDismiss}
              type="button"
            >
              Plus tard
            </button>
          </div>
        </div>

        <button
          aria-label="Fermer l'alerte de notification"
          className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-lg text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
          onClick={handleDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
};
