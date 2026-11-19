import {
  CreditCard,
  Keyboard,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { authenticatedFetch, signOutFirebase } from "../../services/firebase";

type AccountProfile = {
  accountEmail: string | null;
  displayName: string | null;
  plan?: string | null;
};

type AccountResult = {
  profile: AccountProfile | null;
  requiresSignIn: boolean;
};

let accountRequest: Promise<AccountResult> | null = null;

export function resetAccountProfileCache(): void {
  accountRequest = null;
}

export function formatPlanName(
  plan: string | undefined | null,
  language: string
): string {
  if (!plan) {
    return language === "en"
      ? "Free Tier"
      : language === "es"
        ? "Plan Gratuito"
        : "Compte Gratuit";
  }
  const p = plan.toLowerCase();
  if (p === "pro") {
    return "Plan Pro";
  }
  if (p === "business") {
    return "Plan Business";
  }
  if (p === "enterprise") {
    return "Plan Enterprise";
  }
  return language === "en"
    ? "Free Tier"
    : language === "es"
      ? "Plan Gratuito"
      : "Compte Gratuit";
}

function loadAccountProfile(): Promise<AccountResult> {
  if (!accountRequest) {
    accountRequest = Promise.all([
      authenticatedFetch("/api/idealy/profile/preferences", {
        cache: "no-store",
        credentials: "same-origin",
      }),
      authenticatedFetch("/api/idealy/power", {
        cache: "no-store",
        credentials: "same-origin",
      }).catch(() => null),
    ])
      .then(async ([prefResponse, powerResponse]) => {
        if (prefResponse.status === 401) {
          return { profile: null, requiresSignIn: true };
        }
        if (!prefResponse.ok) {
          return { profile: null, requiresSignIn: false };
        }
        const prefPayload = (await prefResponse
          .json()
          .catch(() => null)) as AccountProfile | null;
        let plan: string | null = null;
        if (powerResponse && powerResponse.ok) {
          const powerPayload = (await powerResponse
            .json()
            .catch(() => null)) as { plan?: string } | null;
          if (typeof powerPayload?.plan === "string") {
            plan = powerPayload.plan;
          }
        }
        return {
          profile:
            prefPayload &&
            (typeof prefPayload.displayName === "string" ||
              typeof prefPayload.accountEmail === "string")
              ? { ...prefPayload, plan }
              : null,
          requiresSignIn: false,
        };
      })
      .catch(() => ({ profile: null, requiresSignIn: false }));
  }
  return accountRequest;
}

export const AccountChip: React.FC<{
  collapsed?: boolean;
  onOpenSettings: () => void;
}> = ({ collapsed = false, onOpenSettings }) => {
  const { setActivePage, theme, setTheme, setIsCommandPaletteOpen, language } =
    useApp();
  const [result, setResult] = useState<AccountResult>({
    profile: null,
    requiresSignIn: false,
  });
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAccountProfile().then((account) => {
      if (cancelled) {
        return;
      }
      setResult(account);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close outside
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const name =
    result.profile?.displayName?.trim() ||
    (language === "fr"
      ? "Compte Idealy"
      : language === "es"
        ? "Cuenta Idealy"
        : "Idealy Account");
  const email =
    result.profile?.accountEmail?.trim() ||
    (language === "fr"
      ? "Compte authentifié"
      : language === "es"
        ? "Cuenta autenticada"
        : "Authenticated account");
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label={
          language === "fr"
            ? "Menu du profil utilisateur"
            : language === "es"
              ? "Menú del perfil de usuario"
              : "User profile menu"
        }
        className={`group/account flex min-w-0 items-center rounded-xl text-left transition-colors duration-200 hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring ${
          collapsed ? "h-9 w-9 justify-center" : "h-10 flex-1 gap-2.5 px-2"
        }`}
        disabled={loading}
        onClick={() => {
          if (result.requiresSignIn) {
            window.location.assign("/login");
          } else {
            setIsMenuOpen((prev) => !prev);
          }
        }}
        ref={triggerRef}
        title={`${name} (${email})`}
        type="button"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-[11px] font-bold text-white shadow-xs">
          {initial}
        </span>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
              {name}
            </span>
            <span className="truncate text-[10px] text-[var(--dsw-alias-label-tertiary)]">
              {loading
                ? language === "en"
                  ? "Loading…"
                  : language === "es"
                    ? "Cargando…"
                    : "Chargement…"
                : formatPlanName(result.profile?.plan, language)}
            </span>
          </div>
        )}
      </button>

      {/* Popover Menu utilisateur (ChatGPT / Claude Style) */}
      {isMenuOpen && (
        <div
          className="absolute bottom-12 left-0 z-50 w-64 rounded-2xl border border-[var(--dsw-alias-border-l2)] bg-[var(--dsw-alias-bg-layer-2)] p-2 shadow-2xl animate-fade-in"
          ref={menuRef}
          role="menu"
        >
          {/* Header Popover */}
          <div className="px-3 py-2 border-b border-[var(--dsw-alias-border-l1)]">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-xs font-bold text-white">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--dsw-alias-label-primary)]">
                  {name}
                </p>
                <p className="truncate text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                  {email}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.05] text-[var(--dsw-alias-label-secondary)] border border-[var(--dsw-alias-border-l1)]">
                {formatPlanName(result.profile?.plan, language)}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1 space-y-0.5 text-xs">
            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors text-left"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenSettings();
              }}
              type="button"
            >
              <Settings className="h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
              <span>
                {language === "fr"
                  ? "Paramètres généraux"
                  : language === "es"
                    ? "Configuración general"
                    : "General Settings"}
              </span>
            </button>

            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors text-left"
              onClick={() => {
                setIsMenuOpen(false);
                setIsCommandPaletteOpen(true);
              }}
              type="button"
            >
              <Keyboard className="h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
              <span>
                {language === "fr"
                  ? "Palette de commandes"
                  : language === "es"
                    ? "Paleta de comandos"
                    : "Command Palette"}
              </span>
            </button>

            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors text-left"
              onClick={() => {
                setIsMenuOpen(false);
                setActivePage("pricing");
              }}
              type="button"
            >
              <CreditCard className="h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
              <span>
                {language === "fr"
                  ? "Offres & Forfaits"
                  : language === "es"
                    ? "Planes y Precios"
                    : "Plans & Pricing"}
              </span>
            </button>

            <button
              className="flex w-full items-center justify-between px-3 py-2 rounded-xl text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors text-left"
              onClick={() => {
                setTheme(theme === "dark" ? "light" : "dark");
              }}
              type="button"
            >
              <span className="flex items-center gap-2.5">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
                ) : (
                  <Sun className="h-4 w-4 text-[var(--dsw-alias-label-tertiary)]" />
                )}
                <span>
                  {language === "fr"
                    ? "Thème d'affichage"
                    : language === "es"
                      ? "Tema de visualización"
                      : "Theme"}
                </span>
              </span>
              <span className="text-[10.5px] font-mono text-[var(--dsw-alias-label-tertiary)] uppercase">
                {theme}
              </span>
            </button>

            <div className="my-1 border-t border-[var(--dsw-alias-border-l1)]" />

            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
              onClick={async () => {
                setIsMenuOpen(false);
                resetAccountProfileCache();
                try {
                  await signOutFirebase();
                } catch (error) {
                  console.error("[Idealy sign-out]", error);
                } finally {
                  window.location.href = "/welcome";
                }
              }}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              <span>
                {language === "fr"
                  ? "Se déconnecter"
                  : language === "es"
                    ? "Cerrar sesión"
                    : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
