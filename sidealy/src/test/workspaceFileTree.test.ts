import { describe, expect, it } from "vitest";
import type { MissionWorkspaceFile } from "../types";
import {
  buildWorkspaceFileTree,
  listWorkspaceFolderPaths,
} from "../services/workspaceFileTree";

const files: MissionWorkspaceFile[] = [
  { path: "src/components/Button.tsx", content: "button" },
  { path: "src/app/page.tsx", content: "page" },
  { path: "package.json", content: "{}" },
  { path: "README.md", content: "readme" },
  { path: "public/logo.svg", content: "svg" },
];

describe("workspace file tree", () => {
  it("groups nested paths into folders and keeps root files visible", () => {
    const tree = buildWorkspaceFileTree(files);
    expect(tree.map((node) => node.name)).toEqual([
      "public",
      "src",
      "package.json",
      "README.md",
    ]);
    const source = tree.find((node) => node.kind === "folder" && node.name === "src");
    expect(source?.kind).toBe("folder");
    if (source?.kind !== "folder") return;
    expect(source.children.map((node) => node.name)).toEqual(["app", "components"]);
  });

  it("returns all real folder paths for initial expansion", () => {
    expect(listWorkspaceFolderPaths(buildWorkspaceFileTree(files))).toEqual([
      "public",
      "src",
      "src/app",
      "src/components",
    ]);
  });

  it("normalizes path separators and ignores empty paths", () => {
    const tree = buildWorkspaceFileTree([
      { path: "/src\\components\\Card.tsx", content: "card" },
      { path: "///", content: "empty" },
    ]);
    expect(listWorkspaceFolderPaths(tree)).toEqual(["src", "src/components"]);
  });

  it("sorts folders before files, then sorts names naturally", () => {
    const tree = buildWorkspaceFileTree([
      { path: "zeta.ts", content: "z" },
      { path: "src/index.ts", content: "i" },
      { path: "alpha.ts", content: "a" },
    ]);
    expect(tree.map((node) => node.name)).toEqual(["src", "alpha.ts", "zeta.ts"]);
  });
});
