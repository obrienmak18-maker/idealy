import { UserRound } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

type AccountProfile = {
  accountEmail: string | null;
  displayName: string | null;
};

type AccountResult = {
  profile: AccountProfile | null;
  requiresSignIn: boolean;
};

let accountRequest: Promise<AccountResult> | null = null;

function loadAccountProfile(): Promise<AccountResult> {
  if (!accountRequest) {
    accountRequest = fetch("/api/idealy/profile/preferences", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (response.status === 401) {
          return { profile: null, requiresSignIn: true };
        }
        if (!response.ok) {
          return { profile: null, requiresSignIn: false };
        }
        const payload = (await response.json().catch(() => null)) as
          | AccountProfile
          | null;
        return {
          profile:
            payload &&
            (typeof payload.displayName === "string" ||
              typeof payload.accountEmail === "string")
              ? payload
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
  const [result, setResult] = useState<AccountResult>({
    profile: null,
    requiresSignIn: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadAccountProfile().then((account) => {
      if (cancelled) return;
      setResult(account);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = result.profile?.displayName?.trim();
  const email = result.profile?.accountEmail?.trim();
  const label = name || email || (result.requiresSignIn ? "Se connecter" : "Profil Idealy");
  const initial = (name || email || "I").charAt(0).toLocaleUpperCase("fr-FR");
  const title = email && name ? `${name} · ${email}` : label;

  return (
    <button
      aria-label={result.requiresSignIn ? "Se connecter à Idealy" : "Ouvrir les paramètres du compte"}
      className={`group/account flex min-w-0 items-center rounded-xl text-left transition-colors duration-200 hover:bg-[var(--dsw-alias-interactive-bg-hover)] focus-ring ${collapsed ? "h-9 w-9 justify-center" : "h-10 flex-1 gap-2.5 px-1.5"}`}
      disabled={loading}
      onClick={() => {
        if (result.requiresSignIn) {
          window.location.assign("/login");
        } else {
          onOpenSettings();
        }
      }}
      title={title}
      type="button"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--idealy-teal-petrol)] to-[var(--idealy-indigo)] text-[12px] font-semibold text-white shadow-sm">
        {result.profile ? (
          initial
        ) : (
          <UserRound aria-hidden="true" className="h-4 w-4" />
        )}
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[12px] font-medium text-[var(--dsw-alias-label-primary)]">
            {label}
          </span>
          {email && name && (
            <span className="truncate text-[10px] text-[var(--dsw-alias-label-tertiary)]">
              {email}
            </span>
          )}
        </span>
      )}
    </button>
  );
};
