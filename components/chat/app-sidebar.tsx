"use client";

import {
  BookOpenIcon,
  ChevronDownIcon,
  HelpCircle,
  PanelLeftIcon,
  PenSquareIcon,
  PlugZapIcon,
  PlusIcon,
  Settings2Icon,
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
import { useGamificationStore } from "@/lib/stores/use-gamification-store";
import { useTranslation } from "@/lib/i18n/provider";
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
import { useActiveChat } from "@/hooks/use-active-chat";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { burnDownPercentage } = useGamificationStore();
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const { mutate } = useSWRConfig();
  const { resetToNewChat } = useActiveChat();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

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
                      type="button"
                      onClick={handleToggleSidebar}
                      className="group/logo relative flex size-9 items-center justify-center rounded-xl p-1 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 cursor-pointer"
                      aria-label="Ouvrir la barre latérale"
                    >
                      {/* Logo visible par défaut, disparaît au hover */}
                      <div className="flex items-center justify-center transition-all duration-200 ease-out group-hover/logo:scale-75 group-hover/logo:opacity-0">
                        <IdealyLogo
                          animated
                          compact
                          size={32}
                        />
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
                  href="/"
                  className="flex items-center gap-2 rounded-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
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
                      type="button"
                      onClick={handleToggleSidebar}
                      className="rounded-lg p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer"
                      aria-label="Fermer la barre latérale"
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
          {/* 1. Nouvelle discussion */}
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={handleNewChat}
                    tooltip="Nouvelle discussion"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">Nouvelle discussion</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 2. Outils et ressources : Plugins, Bibliothèque, Documentation */}
          <SidebarGroup className="group-data-[collapsible=icon]:hidden pt-0">
            <SidebarGroupContent>
              <div className="flex flex-col gap-1 px-2">
                <details className="group rounded-lg border border-transparent hover:border-sidebar-border/60">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <PlugZapIcon className="size-3.5" />
                    <span className="flex-1">Plugins & connecteurs</span>
                    <ChevronDownIcon className="size-3 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="flex items-center justify-between px-7 pb-2">
                    <Link
                      className="text-[11px] leading-relaxed text-sidebar-foreground/55 hover:text-sidebar-foreground"
                      href="/plugins"
                    >
                      Ouvrir l’espace des connecteurs
                    </Link>
                    <Link
                      aria-label="Ajouter un plugin"
                      className="rounded-md p-1 text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      href="/plugins"
                    >
                      <PlusIcon className="size-3.5" />
                    </Link>
                  </div>
                </details>
                <details className="group rounded-lg border border-transparent hover:border-sidebar-border/60">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <BookOpenIcon className="size-3.5" />
                    <span className="flex-1">Bibliothèque</span>
                    <ChevronDownIcon className="size-3 transition-transform group-open:rotate-180" />
                  </summary>
                  <Link
                    className="block px-7 pb-2 text-[11px] leading-relaxed text-sidebar-foreground/55 hover:text-sidebar-foreground"
                    href="/library"
                  >
                    Ouvrir la bibliothèque
                  </Link>
                </details>
                <Link
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  href="/docs"
                >
                  <HelpCircle className="size-3.5" /> {t("sidebar.help") || "Aide & Support"}
                </Link>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 3. Mission en cours / Workspace burn-down meter */}
          <SidebarGroup className="group-data-[collapsible=icon]:hidden pt-0">
            <SidebarGroupContent>
              <div className="mx-2 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-3 shadow-[var(--shadow-card)]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-orange-400/20 text-violet-400">
                      <ZapIcon className="size-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-sidebar-foreground">
                        {t("sidebar.activeMission") || "Mission en cours"}
                      </div>
                      <div className="text-[10px] text-sidebar-foreground/55">
                        {t("sidebar.powerAvailable") || "Énergie restante"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-sidebar-foreground/75">
                    {burnDownPercentage}%
                  </span>
                </div>
                {/* Burn-down bar: starts at 100% and decreases as power is consumed */}
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-400 transition-all duration-500 ease-out"
                    style={{ width: `${burnDownPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/60">
                  <span className="flex items-center gap-1">
                    <ZapIcon className="size-3 text-amber-400" /> Power
                  </span>
                  <PowerStatusBadge />
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 4. Historique des discussions */}
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          <div className="group-data-[collapsible=icon]:hidden mb-2 flex items-center justify-end px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Ouvrir les options du workspace"
                  className="rounded-lg p-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  type="button"
                >
                  <Settings2Icon className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl border border-border/60 bg-card/95 p-1.5 shadow-[var(--shadow-float)] backdrop-blur-xl"
                side="top"
              >
                <div className="mb-1 rounded-lg bg-gradient-to-br from-violet-500/10 via-card to-orange-400/10 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold">
                      Plan découverte
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      82 énergie
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
                      <span>Effacer l’historique</span>
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
            <AlertDialogTitle>Supprimer toutes les discussions ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes vos discussions enregistrées seront définitivement effacées.
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
