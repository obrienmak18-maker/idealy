import Link from "next/link";
import { memo, useCallback, useState } from "react";
import { Edit3, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";
import { useChatCustomizationStore } from "@/lib/stores/use-chat-customization-store";
import type { Chat } from "@/lib/db/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import {
  MoreHorizontalIcon,
  TrashIcon,
} from "./icons";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const { isPinned, togglePin } = useChatCustomizationStore();
  const pinned = isPinned(chat.id);

  const [currentTitle, setCurrentTitle] = useState(chat.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState(chat.title);
  const [isSaving, setIsSaving] = useState(false);

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const handleDelete = useCallback(() => {
    onDelete(chat.id);
  }, [chat.id, onDelete]);

  const handleSaveRename = async () => {
    const trimmed = renameInput.trim();
    if (!trimmed || trimmed === currentTitle) {
      setIsRenaming(false);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/chat?id=${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        setCurrentTitle(trimmed);
        toast.success(t("common.saved", "Titre mis à jour"));
        setIsRenaming(false);
      } else {
        toast.error("Impossible de renommer");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          className="h-8 rounded-none text-[13px] text-sidebar-foreground/50 transition-all duration-150 hover:bg-transparent hover:text-sidebar-foreground data-active:bg-transparent data-active:font-normal data-active:text-sidebar-foreground/50 data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium data-[active=true]:border-b data-[active=true]:border-dashed data-[active=true]:border-sidebar-foreground/50"
          isActive={isActive}
        >
          <Link href={`/chat/${chat.id}`} onClick={closeMobile}>
            {pinned && (
              <Pin className="mr-1.5 h-3 w-3 shrink-0 text-amber-500 fill-amber-500/20" />
            )}
            <span className="truncate">{currentTitle}</span>
          </Link>
        </SidebarMenuButton>

        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="mr-0.5 rounded-md text-sidebar-foreground/50 ring-0 transition-colors duration-150 focus-visible:ring-0 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">Actions</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="bottom" className="w-40">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => togglePin(chat.id)}
            >
              {pinned ? (
                <>
                  <PinOff className="h-4 w-4 text-muted-foreground" />
                  <span>{t("sidebar.unpin", "Détacher")}</span>
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 text-muted-foreground" />
                  <span>{t("sidebar.pin", "Épingler")}</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => {
                setRenameInput(currentTitle);
                setIsRenaming(true);
              }}
            >
              <Edit3 className="h-4 w-4 text-muted-foreground" />
              <span>{t("sidebar.rename", "Renommer")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onSelect={handleDelete}
            >
              <TrashIcon />
              <span>{t("sidebar.delete", "Supprimer")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("sidebar.rename", "Renommer la discussion")}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveRename();
                }
              }}
              placeholder="Nouveau titre..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRenaming(false)}
              disabled={isSaving}
            >
              {t("common.cancel", "Annuler")}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRename}
              disabled={isSaving || !renameInput.trim()}
            >
              {isSaving ? "Enregistrement..." : t("common.save", "Enregistrer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});
