import {
  BarChart3,
  Globe2,
  Link2,
  Search,
  Settings,
  Shield,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "../../services/i18n";

type MoreSubTab = "analytics" | "connectors" | "security" | "seo" | "settings";

interface MorePaneProps {
  onPublish?: () => void;
}

export const MorePane: React.FC<MorePaneProps> = ({ onPublish }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<MoreSubTab>("analytics");

  const sideItems = useMemo<
    Array<{
      id: MoreSubTab;
      label: string;
      icon: React.ReactNode;
    }>
  >(
    () => [
      {
        icon: <BarChart3 className="h-4 w-4" />,
        id: "analytics",
        label: t("more.analytics"),
      },
      { icon: <Search className="h-4 w-4" />, id: "seo", label: t("more.seo") },
      {
        icon: <Link2 className="h-4 w-4" />,
        id: "connectors",
        label: t("more.connectors"),
      },
      { icon: <Shield className="h-4 w-4" />, id: "security", label: t("more.security") },
      {
        icon: <Settings className="h-4 w-4" />,
        id: "settings",
        label: t("more.settings"),
      },
    ],
    [t]
  );

  const renderContent = () => {
    switch (activeSubTab) {
      case "analytics":
        return (
          <div className="flex-1 p-5">
            <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
              {t("more.analytics")}
            </h3>

            <div className="mt-4 rounded-xl border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-1)] p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-[var(--dsw-alias-label-tertiary)]">
                    {t("more.visits")}
                  </p>
                  <p className="text-xl font-bold text-[var(--dsw-alias-label-primary)] mt-0.5">
                    0
                  </p>
                </div>
              </div>

              {/* Empty state chart placeholder */}
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)] mb-3">
                  <TrendingUp className="h-5 w-5 text-[var(--dsw-alias-label-tertiary)]" />
                </div>
                <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
                  {t("more.publishPrompt")}
                </p>
                <p className="mt-1 text-[11px] text-[var(--dsw-alias-label-secondary)] max-w-[280px]">
                  {t("more.publishDesc")}
                </p>
                <button
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[var(--idealy-teal-petrol)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 active:scale-95 transition-all"
                  onClick={onPublish}
                  type="button"
                >
                  {t("common.publish")}
                </button>
              </div>
            </div>
          </div>
        );

      case "seo":
        return (
          <div className="flex-1 p-5">
            <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
              {t("more.seo")}
            </h3>
            <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
              {t("more.seoDesc")}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)] mb-3">
                <Globe2 className="h-5 w-5 text-[var(--dsw-alias-label-tertiary)]" />
              </div>
              <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
                {t("more.soon")}
              </p>
              <p className="mt-1 text-[11px] text-[var(--dsw-alias-label-secondary)] max-w-[260px]">
                {t("more.seoDesc")}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)]">
              {sideItems.find((i) => i.id === activeSubTab)?.icon ?? (
                <Settings className="h-5 w-5 text-[var(--dsw-alias-label-tertiary)]" />
              )}
            </div>
            <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
              {sideItems.find((i) => i.id === activeSubTab)?.label}
            </p>
            <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] max-w-xs">
              {t("more.featureInProgress")}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Vertical icon rail */}
      <nav
        aria-label="More sub-menu"
        className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)] py-3"
      >
        {sideItems.map((item) => {
          const active = activeSubTab === item.id;
          return (
            <button
              aria-label={item.label}
              className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                active
                  ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--idealy-teal-petrol)]"
                  : "text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)]"
              }`}
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              title={item.label}
              type="button"
            >
              {item.icon}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
};
