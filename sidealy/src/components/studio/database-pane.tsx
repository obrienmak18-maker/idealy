import {
  Database,
  FileKey,
  Key,
  Lock,
  Server,
  Table2,
  Terminal,
  Upload,
  Users,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "../../services/i18n";

type DatabaseSubTab =
  | "tables"
  | "security"
  | "authentication"
  | "user-management"
  | "server-functions"
  | "file-storage"
  | "secrets"
  | "logs";

interface DatabasePaneProps {
  missionId?: string | null;
}

export const DatabasePane: React.FC<DatabasePaneProps> = ({ missionId }) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<DatabaseSubTab>("tables");

  const subTabs = useMemo<
    Array<{
      id: DatabaseSubTab;
      label: string;
      icon: React.ReactNode;
    }>
  >(
    () => [
      { icon: <Table2 className="h-3.5 w-3.5" />, id: "tables", label: t("database.tables") },
      { icon: <Lock className="h-3.5 w-3.5" />, id: "security", label: t("database.security") },
      {
        icon: <Key className="h-3.5 w-3.5" />,
        id: "authentication",
        label: t("database.auth"),
      },
      {
        icon: <Users className="h-3.5 w-3.5" />,
        id: "user-management",
        label: t("database.users"),
      },
      {
        icon: <Server className="h-3.5 w-3.5" />,
        id: "server-functions",
        label: t("database.functions"),
      },
      {
        icon: <Upload className="h-3.5 w-3.5" />,
        id: "file-storage",
        label: t("database.storage"),
      },
      {
        icon: <FileKey className="h-3.5 w-3.5" />,
        id: "secrets",
        label: t("database.secrets"),
      },
      { icon: <Terminal className="h-3.5 w-3.5" />, id: "logs", label: t("database.logs") },
    ],
    [t]
  );

  const renderContent = () => {
    switch (activeSubTab) {
      case "tables":
        return (
          <div className="p-5">
            <h3 className="text-sm font-semibold text-[var(--dsw-alias-label-primary)]">
              {t("database.tables")}
            </h3>
            <p className="mt-1 text-xs text-[var(--dsw-alias-label-secondary)]">
              {t("database.desc")}
            </p>
            {missionId ? (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                  {t("database.noTables")}
                </p>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)]">
                  <Database className="h-5 w-5 text-[var(--dsw-alias-label-tertiary)]" />
                </div>
                <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
                  {t("database.notProvisioned")}
                </p>
                <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] max-w-xs">
                  {t("database.askToCreate")}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--dsw-alias-bg-layer-2)] border border-[var(--dsw-alias-border-l1)]">
              {subTabs.find((tItem) => tItem.id === activeSubTab)?.icon ?? (
                <Database className="h-5 w-5 text-[var(--dsw-alias-label-tertiary)]" />
              )}
            </div>
            <p className="text-xs font-medium text-[var(--dsw-alias-label-primary)]">
              {subTabs.find((tItem) => tItem.id === activeSubTab)?.label ?? ""}
            </p>
            <p className="text-[11px] text-[var(--dsw-alias-label-secondary)] max-w-xs">
              {t("more.featureInProgress")}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Sub-tabs bar */}
      <div className="flex items-center overflow-x-auto border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)] px-2 py-1">
        {subTabs.map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              className={`mr-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-[var(--dsw-alias-interactive-bg-hover)] text-[var(--idealy-teal-petrol)]"
                  : "text-[var(--dsw-alias-label-secondary)] hover:text-[var(--dsw-alias-label-primary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
              }`}
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
};
