import {
  ChevronDown,
  ChevronRight,
  Download,
  File,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Search,
  Terminal,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import type { MissionWorkspaceFile } from "../../types";

interface CodePaneProps {
  files: MissionWorkspaceFile[];
  onDownloadProject?: () => void;
  onFileSelect?: (path: string) => void;
  terminalOutput?: string;
}

/** Build a nested tree from flat file paths */
type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: MissionWorkspaceFile;
};

function buildTree(files: MissionWorkspaceFile[]): TreeNode[] {
  const root: TreeNode = { children: [], isDir: true, name: "", path: "" };
  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").replace(/^\/+/, "").split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.children.find((c) => c.name === part);
      if (existing) {
        current = existing;
      } else {
        const newNode: TreeNode = {
          children: [],
          file: isLast ? file : undefined,
          isDir: !isLast,
          name: part,
          path: parts.slice(0, i + 1).join("/"),
        };
        current.children.push(newNode);
        current = newNode;
      }
    }
  }
  // Sort: folders first, then alphabetical
  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    [...nodes]
      .sort((a, b) => {
        if (a.isDir && !b.isDir) {
          return -1;
        }
        if (!a.isDir && b.isDir) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map((n) => ({ ...n, children: sortNodes(n.children) }));
  return sortNodes(root.children);
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["tsx", "ts", "jsx", "js"].includes(ext)) {
    return <FileCode2 className="h-3.5 w-3.5 text-sky-400" />;
  }
  if (ext === "json") {
    return <FileJson className="h-3.5 w-3.5 text-yellow-400" />;
  }
  if (["md", "txt", "mdx"].includes(ext)) {
    return (
      <FileText className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
    );
  }
  if (["png", "jpg", "jpeg", "svg", "webp", "gif", "ico"].includes(ext)) {
    return <Image className="h-3.5 w-3.5 text-pink-400" />;
  }
  if (["css", "scss", "less"].includes(ext)) {
    return <FileCode2 className="h-3.5 w-3.5 text-violet-400" />;
  }
  return (
    <File className="h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
  );
}

const FileTreeItem: React.FC<{
  node: TreeNode;
  depth: number;
  selectedPath: string;
  openDirs: Set<string>;
  toggleDir: (p: string) => void;
  onSelect: (p: string) => void;
}> = ({ node, depth, selectedPath, openDirs, toggleDir, onSelect }) => {
  const isOpen = openDirs.has(node.path);
  const isSelected = selectedPath === node.path;

  if (node.isDir) {
    return (
      <>
        <button
          className="flex w-full items-center gap-1 py-1 text-left text-[11px] font-medium text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] rounded-md transition-colors"
          onClick={() => toggleDir(node.path)}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          type="button"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--idealy-teal-petrol)]" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--idealy-teal-petrol)]" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen &&
          node.children.map((child) => (
            <FileTreeItem
              depth={depth + 1}
              key={child.path}
              node={child}
              onSelect={onSelect}
              openDirs={openDirs}
              selectedPath={selectedPath}
              toggleDir={toggleDir}
            />
          ))}
      </>
    );
  }

  return (
    <button
      className={`flex w-full items-center gap-1.5 py-1 text-left text-[11px] rounded-md transition-colors ${
        isSelected
          ? "bg-[var(--idealy-teal-bg)]/30 text-[var(--dsw-alias-label-primary)] font-medium"
          : "text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)]"
      }`}
      onClick={() => onSelect(node.path)}
      style={{ paddingLeft: `${20 + depth * 12}px` }}
      type="button"
    >
      {fileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  );
};

export const CodePane: React.FC<CodePaneProps> = ({
  files,
  onFileSelect,
  terminalOutput = "",
  onDownloadProject,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(
    files[0]?.path ?? ""
  );
  const [openDirs, setOpenDirs] = useState<Set<string>>(() => {
    const dirs = new Set<string>();
    // Open first two levels by default
    for (const f of files) {
      const parts = f.path.replace(/\\/g, "/").replace(/^\/+/, "").split("/");
      if (parts.length > 1) {
        dirs.add(parts[0]);
      }
      if (parts.length > 2) {
        dirs.add(`${parts[0]}/${parts[1]}`);
      }
    }
    return dirs;
  });
  const [sidebarTab, setSidebarTab] = useState<"files" | "search">("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"idealy" | "terminal">("idealy");
  const [openTabs, setOpenTabs] = useState<string[]>(() =>
    files[0]?.path ? [files[0].path] : []
  );

  const tree = useMemo(() => buildTree(files), [files]);

  const selectedFile = useMemo(
    () => files.find((f) => f.path === selectedPath),
    [files, selectedPath]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    const q = searchQuery.toLowerCase();
    return files
      .filter(
        (f) =>
          f.path.toLowerCase().includes(q) ||
          f.content.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [files, searchQuery]);

  const toggleDir = useCallback((p: string) => {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }, []);

  const selectFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      onFileSelect?.(path);
      setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    },
    [onFileSelect]
  );

  const closeTab = useCallback(
    (path: string) => {
      setOpenTabs((tabs) => {
        const next = tabs.filter((t) => t !== path);
        if (selectedPath === path && next.length > 0) {
          setSelectedPath(next.at(-1) ?? "");
        }
        return next;
      });
    },
    [selectedPath]
  );

  const fileName = (path: string) => path.split("/").pop() ?? path;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* File sidebar */}
        <div className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)]">
          {/* Sidebar tabs */}
          <div className="flex items-center border-b border-[var(--dsw-alias-border-l1)] px-2 py-1.5">
            <button
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sidebarTab === "files"
                  ? "text-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-interactive-bg-hover)]"
                  : "text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-secondary)]"
              }`}
              onClick={() => setSidebarTab("files")}
              type="button"
            >
              Fichiers
            </button>
            <button
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sidebarTab === "search"
                  ? "text-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-interactive-bg-hover)]"
                  : "text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-secondary)]"
              }`}
              onClick={() => setSidebarTab("search")}
              type="button"
            >
              Recherche
            </button>
            <div className="flex-1" />
            {onDownloadProject && (
              <button
                aria-label="Télécharger le projet"
                className="grid h-6 w-6 place-items-center rounded-md text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-colors"
                onClick={onDownloadProject}
                title="Télécharger le projet"
                type="button"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* File tree or search */}
          <div className="flex-1 overflow-y-auto p-1">
            {sidebarTab === "files" ? (
              tree.map((node) => (
                <FileTreeItem
                  depth={0}
                  key={node.path}
                  node={node}
                  onSelect={selectFile}
                  openDirs={openDirs}
                  selectedPath={selectedPath}
                  toggleDir={toggleDir}
                />
              ))
            ) : (
              <div className="space-y-2 p-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--dsw-alias-label-tertiary)]" />
                  <input
                    className="w-full rounded-lg border border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-layer-2)] py-1.5 pl-7 pr-2 text-[11px] text-[var(--dsw-alias-label-primary)] placeholder:text-[var(--dsw-alias-label-caption)] focus:outline-none focus:border-[var(--idealy-teal-petrol)]"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Chercher dans les fichiers…"
                    type="text"
                    value={searchQuery}
                  />
                </div>
                {searchResults.map((f) => (
                  <button
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] text-left transition-colors"
                    key={f.path}
                    onClick={() => {
                      selectFile(f.path);
                      setSidebarTab("files");
                    }}
                    type="button"
                  >
                    {fileIcon(f.path.split("/").pop() ?? "")}
                    <span className="truncate">{f.path}</span>
                  </button>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <p className="py-4 text-center text-[11px] text-[var(--dsw-alias-label-tertiary)]">
                    Aucun résultat
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Open file tabs */}
          {openTabs.length > 0 && (
            <div className="flex h-8 items-center overflow-x-auto border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)]">
              {openTabs.map((path) => {
                const active = path === selectedPath;
                return (
                  <div
                    className={`group flex h-full items-center gap-1 border-r border-[var(--dsw-alias-border-l1)] px-2.5 text-[11px] transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--dsw-alias-bg-layer-1)] text-[var(--dsw-alias-label-primary)] font-medium"
                        : "text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-secondary)] hover:bg-[var(--dsw-alias-bg-layer-2)]"
                    }`}
                    key={path}
                    onClick={() => setSelectedPath(path)}
                    onKeyDown={() => {}}
                    role="tab"
                    tabIndex={0}
                  >
                    {fileIcon(fileName(path))}
                    <span className="max-w-[100px] truncate">
                      {fileName(path)}
                    </span>
                    <button
                      aria-label={`Fermer ${fileName(path)}`}
                      className="ml-0.5 grid h-4 w-4 place-items-center rounded-sm text-[var(--dsw-alias-label-tertiary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--dsw-alias-interactive-bg-hover)] hover:text-[var(--dsw-alias-label-primary)] transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(path);
                      }}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Breadcrumb */}
          {selectedPath && (
            <div className="flex h-6 items-center gap-1 border-b border-[var(--dsw-alias-border-l1)] bg-[var(--dsw-alias-bg-base)] px-3 text-[10px] text-[var(--dsw-alias-label-tertiary)]">
              {selectedPath.split("/").map((seg, i, arr) => (
                <span className="flex items-center gap-1" key={`${seg}-${i}`}>
                  {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                  <span
                    className={
                      i === arr.length - 1
                        ? "text-[var(--dsw-alias-label-primary)] font-medium"
                        : ""
                    }
                  >
                    {seg}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Code content */}
          <div className="flex-1 overflow-auto bg-[#0d1117] p-4">
            {selectedFile ? (
              <pre className="text-[12px] leading-5 text-[#c9d1d9] font-mono whitespace-pre-wrap break-words">
                <code>
                  {selectedFile.content.split("\n").map((line, i) => (
                    <div className="flex" key={i}>
                      <span className="mr-4 w-8 shrink-0 text-right text-[#484f58] select-none">
                        {i + 1}
                      </span>
                      <span>{line || " "}</span>
                    </div>
                  ))}
                </code>
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#484f58]">
                Sélectionnez un fichier pour l'afficher
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible bottom panel */}
      <div className="shrink-0 border-t border-[var(--dsw-alias-border-l1)]">
        <div className="flex h-7 items-center gap-0.5 bg-[var(--dsw-alias-bg-base)] px-2">
          <button
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
              bottomPanelOpen && bottomTab === "idealy"
                ? "text-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-interactive-bg-hover)]"
                : "text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-secondary)]"
            }`}
            onClick={() => {
              setBottomPanelOpen((o) => !o);
              setBottomTab("idealy");
            }}
            type="button"
          >
            Idealy
          </button>
          <button
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
              bottomPanelOpen && bottomTab === "terminal"
                ? "text-[var(--dsw-alias-label-primary)] bg-[var(--dsw-alias-interactive-bg-hover)]"
                : "text-[var(--dsw-alias-label-tertiary)] hover:text-[var(--dsw-alias-label-secondary)]"
            }`}
            onClick={() => {
              setBottomPanelOpen((o) => !o);
              setBottomTab("terminal");
            }}
            type="button"
          >
            <Terminal className="h-3 w-3" />
            Terminal
          </button>
          <div className="flex-1" />
          {bottomPanelOpen && (
            <button
              className="grid h-5 w-5 place-items-center rounded-md text-[var(--dsw-alias-label-tertiary)] hover:bg-[var(--dsw-alias-interactive-bg-hover)] transition-colors"
              onClick={() => setBottomPanelOpen(false)}
              type="button"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
        {bottomPanelOpen && (
          <div className="h-36 overflow-auto bg-[#0d1117] p-3">
            <pre className="text-[11px] leading-4 text-[#8b949e] font-mono whitespace-pre-wrap">
              {bottomTab === "terminal"
                ? terminalOutput || "$ En attente de commandes…"
                : "Logs de construction Idealy…\nPrêt."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
