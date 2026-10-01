"use client";

import {
  BrainIcon,
  CodeIcon,
  DatabaseIcon,
  GitBranchIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MicIcon,
  MoonIcon,
  PenSquareIcon,
  PlugZapIcon,
  RocketIcon,
  SearchIcon,
  Settings2Icon,
  SunIcon,
  TerminalIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaletteAction {
  id: string;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  keywords?: string;
  onSelect: () => void;
}

interface PaletteGroup {
  heading: string;
  actions: PaletteAction[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  // ⌘K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Custom event to open from other components
  useEffect(() => {
    function onOpenPalette() {
      setOpen(true);
    }
    window.addEventListener("idealy:open-command-palette", onOpenPalette);
    return () =>
      window.removeEventListener("idealy:open-command-palette", onOpenPalette);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const groups: PaletteGroup[] = useMemo(
    () => [
      {
        heading: "Navigation",
        actions: [
          {
            id: "nav-new-mission",
            label: "Nouvelle mission",
            icon: <PenSquareIcon className="size-4" />,
            shortcut: "⌘N",
            keywords: "new chat créer",
            onSelect: () => {
              router.push("/");
              close();
            },
          },
          {
            id: "nav-workspaces",
            label: "Mes missions",
            icon: <LayoutDashboardIcon className="size-4" />,
            keywords: "workspaces projets dashboard missions",
            onSelect: () => {
              router.push("/library");
              close();
            },
          },
          {
            id: "nav-connectors",
            label: "Connecteurs",
            icon: <PlugZapIcon className="size-4" />,
            keywords: "plugins intégrations github api",
            onSelect: () => {
              router.push("/plugins");
              close();
            },
          },
          {
            id: "nav-settings",
            label: "Paramètres",
            icon: <Settings2Icon className="size-4" />,
            shortcut: "⌘,",
            keywords: "settings configuration compte",
            onSelect: () => {
              router.push("/settings");
              close();
            },
          },
        ],
      },
      {
        heading: "Workspace",
        actions: [
          {
            id: "ws-checkpoints",
            label: "Checkpoints & GitHub",
            icon: <HistoryIcon className="size-4" />,
            keywords: "versioning rollback git historique",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:open-checkpoint-modal")
              );
              close();
            },
          },
          {
            id: "ws-inspector",
            label: "Inspecteur visuel",
            icon: <SearchIcon className="size-4" />,
            keywords: "visual inspector debug click edit",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:toggle-visual-inspector")
              );
              close();
            },
          },
          {
            id: "ws-database",
            label: "Database Inspector",
            icon: <DatabaseIcon className="size-4" />,
            keywords: "base données tables sql schema",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:switch-workspace-view", {
                  detail: "database",
                })
              );
              close();
            },
          },
          {
            id: "ws-code",
            label: "Éditeur de code",
            icon: <CodeIcon className="size-4" />,
            keywords: "fichiers code source editor",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:switch-workspace-view", {
                  detail: "code",
                })
              );
              close();
            },
          },
          {
            id: "ws-console",
            label: "Console",
            icon: <TerminalIcon className="size-4" />,
            keywords: "logs terminal output sortie",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:switch-workspace-view", {
                  detail: "console",
                })
              );
              close();
            },
          },
        ],
      },
      {
        heading: "IA",
        actions: [
          {
            id: "ai-architect",
            label: "Invoquer l'Architecte",
            icon: <BrainIcon className="size-4" />,
            keywords: "sélène structurer planifier analyser",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:set-chat-input", {
                  detail: "/architect ",
                })
              );
              close();
            },
          },
          {
            id: "ai-deploy",
            label: "Déployer",
            icon: <RocketIcon className="size-4" />,
            keywords: "ship publier production deploy",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:set-chat-input", {
                  detail: "/deploy ",
                })
              );
              close();
            },
          },
          {
            id: "ai-voice",
            label: "Dictée vocale",
            icon: <MicIcon className="size-4" />,
            keywords: "micro parler voix speech recognition",
            onSelect: () => {
              window.dispatchEvent(
                new CustomEvent("idealy:toggle-voice")
              );
              close();
            },
          },
        ],
      },
      {
        heading: "Apparence",
        actions: [
          {
            id: "theme-toggle",
            label:
              resolvedTheme === "dark"
                ? "Mode clair"
                : "Mode sombre",
            icon:
              resolvedTheme === "dark" ? (
                <SunIcon className="size-4" />
              ) : (
                <MoonIcon className="size-4" />
              ),
            keywords: "theme dark light sombre clair",
            onSelect: () => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              close();
            },
          },
          {
            id: "git-branch",
            label: "Branche Git active",
            icon: <GitBranchIcon className="size-4" />,
            keywords: "branch version",
            onSelect: () => {
              // informational — no action needed
              close();
            },
          },
        ],
      },
    ],
    [router, close, resolvedTheme, setTheme]
  );

  return (
    <CommandDialog
      description="Tapez une commande ou cherchez une action…"
      onOpenChange={setOpen}
      open={open}
      title="Command Palette"
    >
      <Command
        className="rounded-lg"
        filter={(value, search) => {
          // cmdk expects a score number: 1 = match, 0 = no match
          const lowSearch = search.toLowerCase();
          const item = value.toLowerCase();
          if (item.includes(lowSearch)) return 1;
          // Check keywords embedded in the value (after "|")
          const parts = item.split("|");
          for (const part of parts) {
            if (part.includes(lowSearch)) return 1;
          }
          return 0;
        }}
      >
        <CommandInput placeholder="Rechercher une commande…" />
        <CommandList>
          <CommandEmpty>Aucune commande trouvée.</CommandEmpty>
          {groups.map((group, gi) => (
            <div key={group.heading}>
              {gi > 0 && <CommandSeparator />}
              <CommandGroup heading={group.heading}>
                {group.actions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={action.onSelect}
                    value={`${action.label}|${action.keywords ?? ""}`}
                  >
                    <span className="mr-2 flex size-5 shrink-0 items-center justify-center text-muted-foreground">
                      {action.icon}
                    </span>
                    <span className="flex-1">{action.label}</span>
                    {action.shortcut && (
                      <kbd className="ml-auto text-[11px] tracking-widest text-muted-foreground/50">
                        {action.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
