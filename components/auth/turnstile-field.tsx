"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: "auto" | "light" | "dark";
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileField({
  value,
  onChange,
  action,
}: {
  value: string;
  onChange: (token: string) => void;
  action: "login" | "register";
}) {
  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const previousValueRef = useRef(value);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || !window.turnstile || !containerRef.current) {
      return;
    }

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "auto",
      callback: (token) => onChange(token),
      "expired-callback": () => onChange(""),
      "error-callback": () => onChange(""),
    });
    widgetIdRef.current = widgetId;

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onChange, scriptReady, siteKey]);

  useEffect(() => {
    if (previousValueRef.current && !value && widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current);
    }
    previousValueRef.current = value;
  }, [value]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <p className="mb-2 text-xs font-medium text-foreground">Vérification de sécurité</p>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => onChange("")}
      />
      <div aria-label="Cloudflare Turnstile" ref={containerRef} />
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Cette vérification aide à limiter les inscriptions et connexions automatisées.
      </p>
    </div>
  );
}
