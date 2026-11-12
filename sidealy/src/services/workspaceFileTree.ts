import type { MissionWorkspaceFile } from "../types";

export type WorkspaceFileTreeNode =
  | {
      children: WorkspaceFileTreeNode[];
      kind: "folder";
      name: string;
      path: string;
    }
  | {
      file: MissionWorkspaceFile;
      kind: "file";
      name: string;
      path: string;
    };

type MutableFolder = {
  children: WorkspaceFileTreeNode[];
  folders: Map<string, MutableFolder>;
  node: Extract<WorkspaceFileTreeNode, { kind: "folder" }>;
};

function compareNames(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });
}

function sortTree(nodes: WorkspaceFileTreeNode[]) {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;
    return compareNames(left.name, right.name);
  });
  for (const node of nodes) {
    if (node.kind === "folder") sortTree(node.children);
  }
}

/** Build a deterministic, folder-first explorer tree from real mission files. */
export function buildWorkspaceFileTree(
  files: readonly MissionWorkspaceFile[],
): WorkspaceFileTreeNode[] {
  const root: MutableFolder = {
    children: [],
    folders: new Map(),
    node: { children: [], kind: "folder", name: "", path: "" },
  };

  for (const file of [...files].sort((a, b) => compareNames(a.path, b.path))) {
    const normalizedPath = file.path.replaceAll("\\", "/").replace(/^\/+/, "");
    const segments = normalizedPath.split("/").filter(Boolean);
    if (!segments.length) continue;

    let current = root;
    const directorySegments = segments.slice(0, -1);
    let folderPath = "";
    for (const segment of directorySegments) {
      folderPath = folderPath ? folderPath + "/" + segment : segment;
      let child = current.folders.get(segment);
      if (!child) {
        const node: Extract<WorkspaceFileTreeNode, { kind: "folder" }> = {
          children: [],
          kind: "folder",
          name: segment,
          path: folderPath,
        };
        child = { children: node.children, folders: new Map(), node };
        current.folders.set(segment, child);
        current.children.push(node);
      }
      current = child;
    }

    const name = segments[segments.length - 1];
    current.children.push({
      file,
      kind: "file",
      name,
      path: normalizedPath,
    });
  }

  sortTree(root.children);
  return root.children;
}

export function listWorkspaceFolderPaths(
  nodes: readonly WorkspaceFileTreeNode[],
): string[] {
  const result: string[] = [];
  const visit = (items: readonly WorkspaceFileTreeNode[]) => {
    for (const item of items) {
      if (item.kind !== "folder") continue;
      result.push(item.path);
      visit(item.children);
    }
  };
  visit(nodes);
  return result;
}
