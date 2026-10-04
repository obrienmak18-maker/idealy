"use client";

import {
  PanelLeftIcon,
  PenSquareIcon,
  PlugZapIcon,
  Settings2Icon,
  SparklesIcon,
  TrashIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { IdealyLogo } from "@/components/branding/idealy-logo";
import { PowerStatusBadge } from "@/components/chat/power-status";
import { voiesCatalog } from "@/lib/idealy/voies-catalog";
import { cn } from "@/lib/utils";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useActiveChat } from "@/hooks/use-active-chat";
import { usePowerStatus } from "@/hooks/use-power-status";
import { useTranslation } from "@/lib/i18n/provider";
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

/** Capitalise first letter of plan name for display. */
function planDisplayName(plan: string | undefined): string {
  if (!plan) {
    return "—";
  }
  const names: Record<string, string> = {
    business: "Business",
    free: "Découverte",
    pro: "Pro",
  };
  return names[plan] ?? plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { burnDownPercentage, currentWay } = useGamificationStore();
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const { mutate } = useSWRConfig();
  const { resetToNewChat } = useActiveChat();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const { loading: powerLoading, status: powerStatus } = usePowerStatus();

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleNewChat = useCallback(() => {
    setOpenMobile(false);
    resetToNewChat();
  }, [resetToNewChat, setOpenMobile]);

  const handleShowDeleteAllDialog = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success("Historique des discussions supprimé");
  }, [mutate, router]);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            {state === "collapsed" ? (
              <SidebarMenuItem className="flex items-center justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Ouvrir la barre latérale"
                      className="group/logo relative flex size-9 items-center justify-center rounded-xl p-1 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 cursor-pointer"
                      onClick={handleToggleSidebar}
                      type="button"
                    >
                      {/* Logo visible par défaut, disparaît au hover */}
                      <div className="flex items-center justify-center transition-all duration-200 ease-out group-hover/logo:scale-75 group-hover/logo:opacity-0">
                        <IdealyLogo animated compact size={32} />
                      </div>
                      {/* Icône panneau latéral qui apparaît au survol */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 ease-out group-hover/logo:scale-100 group-hover/logo:opacity-100 text-sidebar-foreground">
                        <PanelLeftIcon className="size-4" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block" side="right">
                    Ouvrir la barre latérale
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem className="flex flex-row items-center justify-between w-full px-1">
                <Link
                  className="flex items-center gap-2 rounded-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  href="/"
                >
                  <IdealyLogo
                    animated
                    className="flex-none drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]"
                    compact={false}
                    size={34}
                  />
                </Link>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Fermer la barre latérale"
                      className="rounded-lg p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
                      onClick={handleToggleSidebar}
                      type="button"
                    >
                      <PanelLeftIcon className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block" side="right">
                    Fermer la barre latérale
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {/* 1. Nouvelle discussion — primary CTA */}
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={handleNewChat}
                    tooltip={t("sidebar.newChat") || "Nouvelle discussion"}
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">{t("sidebar.newChat") || "Nouvelle discussion"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 2. Navigation pillars — clean and focused */}
          <SidebarGroup className="group-data-[collapsible=icon]:hidden pt-0">
            <SidebarGroupContent>
              <nav
                aria-label="Navigation principale"
                className="flex flex-col gap-0.5 px-2"
              >
                {/* CONNECTEURS */}
                <Link
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  href="/plugins"
                >
                  <PlugZapIcon className="size-3.5 shrink-0 text-violet-400" />
                  <span>{t("sidebar.connectors") || "Connecteurs"}</span>
                </Link>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 3. Mission en cours / Way & Power burn-down (Compact & customized) */}
          <SidebarGroup className="group-data-[collapsible=icon]:hidden pt-0">
            <SidebarGroupContent>
              <div className="mx-2 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/20 p-2.5 shadow-xs">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sidebar-border/80 bg-sidebar-accent text-xs">
                      {voiesCatalog[currentWay]?.agents?.[0]?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={voiesCatalog[currentWay]?.chiefName || "Chef"}
                          className="size-full object-cover"
                          src={voiesCatalog[currentWay]?.agents?.[0]?.avatarUrl}
                        />
                      ) : (
                        <span>{voiesCatalog[currentWay]?.agents?.[0]?.emoji || "🥷"}</span>
                      )}
                    </div>
                    <div className="leading-tight">
                      <div className="text-[11px] font-semibold text-sidebar-foreground flex items-center gap-1">
                        <span>{t("sidebar.activeMission") || "Mission"}</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          • {voiesCatalog[currentWay]?.label || "Voie"}
                        </span>
                      </div>
                      <div className="text-[9.5px] text-sidebar-foreground/50">
                        {voiesCatalog[currentWay]?.resourceLabel || "Énergie"} restante
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-sidebar-foreground/80">
                    {burnDownPercentage}%
                  </span>
                </div>
                {/* Burn-down bar compact */}
                <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-sidebar-border/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r",
                      voiesCatalog[currentWay]?.accentClassName || "from-violet-500 to-orange-400"
                    )}
                    style={{ width: `${burnDownPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9.5px] text-sidebar-foreground/60">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="text-[10px]">{voiesCatalog[currentWay]?.agents?.[0]?.emoji || "⚡"}</span>
                    {voiesCatalog[currentWay]?.resourceLabel || "Power"}
                  </span>
                  <PowerStatusBadge />
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 4. Historique des discussions (Workspaces) */}
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-1.5 pb-2">
          {/* Settings button — placed at bottom where it belongs */}
          <div className="px-2 mb-1 flex items-center justify-between gap-1">
            <Link
              className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer"
              href="/settings"
            >
              <Settings2Icon className="size-4 shrink-0" />
              <span className="font-medium">{t("sidebar.settings") || "Paramètres"}</span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Options du workspace"
                  className="rounded-lg p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer"
                  type="button"
                >
                  <span className="sr-only">Options</span>
                  <div className="flex flex-col gap-0.5 items-center justify-center size-4">
                    <span className="size-0.5 rounded-full bg-current" />
                    <span className="size-0.5 rounded-full bg-current" />
                    <span className="size-0.5 rounded-full bg-current" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl border border-border/60 bg-card/95 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl"
                side="top"
              >
                {/* Dynamic plan card — reads real Power status, no hardcoded strings */}
                <div className="mb-1 rounded-lg bg-gradient-to-br from-violet-500/10 via-card to-orange-400/10 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold">
                      {powerLoading
                        ? "—"
                        : `Plan ${planDisplayName(powerStatus?.plan)}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {powerLoading
                        ? "—"
                        : powerStatus
                          ? `${powerStatus.balance} énergie`
                          : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Débloquez plus de missions, de connecteurs et de
                    générations.
                  </p>
                  <Link
                    className="mt-2 inline-flex rounded-md bg-foreground px-2.5 py-1 text-[10px] font-medium text-background hover:opacity-85"
                    href="/settings#billing"
                  >
                    Voir les offres
                  </Link>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings#appearance">Apparence</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings#notifications">Notifications</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings#privacy">Confidentialité</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings#data">Données et mémoire</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings#shortcuts">Raccourcis</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings#billing">Facturation et plan</Link>
                </DropdownMenuItem>
                {user ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                      onClick={handleShowDeleteAllDialog}
                    >
                      <TrashIcon className="mr-2 size-3.5" />
                      <span>Effacer l'historique</span>
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {user ? <SidebarUserNav user={user} /> : null}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer toutes les discussions ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes vos discussions enregistrées
              seront définitivement effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
