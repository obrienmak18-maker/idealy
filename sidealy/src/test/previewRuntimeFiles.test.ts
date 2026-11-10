import { describe, expect, it } from "vitest";
import type { MissionWorkspaceFile } from "../types";
import {
  PREVIEW_BRIDGE_PATH,
  PREVIEW_BRIDGE_SOURCE,
  preparePreviewRuntimeFiles,
} from "../services/previewRuntimeFiles";

describe("preview runtime bridge", () => {
  it("injects the bridge into a Vite HTML entry without mutating the original file", () => {
    const source: MissionWorkspaceFile[] = [
      { path: "index.html", content: "<html><body><div id=\"root\"></div></body></html>" },
      { path: "src/main.tsx", content: "createRoot()" },
    ];
    const result = preparePreviewRuntimeFiles(source);
    expect(result.enabled).toBe(true);
    expect(result.framework).toBe("html");
    expect(result.files.find((file) => file.path === "index.html")?.content)
      .toContain('id="idealy-preview-bridge"');
    expect(result.files.some((file) => file.path === PREVIEW_BRIDGE_PATH)).toBe(true);
    expect(source[0].content).not.toContain("idealy-preview-bridge");
  });

  it("injects a Next Script component into the root App Router layout", () => {
    const source: MissionWorkspaceFile[] = [{
      path: "src/app/layout.tsx",
      content: 'export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }',
    }];
    const result = preparePreviewRuntimeFiles(source);
    const layout = result.files.find((file) => file.path === "src/app/layout.tsx");
    expect(result.enabled).toBe(true);
    expect(result.framework).toBe("next");
    expect(layout?.content).toContain('import Script from "next/script"');
    expect(layout?.content).toContain('id="idealy-preview-bridge"');
  });

  it("does not claim visual bridge support when no safe entry point exists", () => {
    const source: MissionWorkspaceFile[] = [
      { path: "package.json", content: "{\"scripts\":{\"dev\":\"vite\"}}" },
      { path: "src/App.tsx", content: "export default function App() { return null; }" },
    ];
    const result = preparePreviewRuntimeFiles(source);
    expect(result.enabled).toBe(false);
    expect(result.framework).toBe("unsupported");
    expect(result.files).toEqual(source);
  });

  it("preserves an existing bridge rather than injecting it twice", () => {
    const source: MissionWorkspaceFile[] = [{
      path: "index.html",
      content: '<html><body><script id="idealy-preview-bridge" src="/bridge.js"></script></body></html>',
    }];
    const result = preparePreviewRuntimeFiles(source);
    expect(result.enabled).toBe(true);
    expect(result.files.find((file) => file.path === "index.html")?.content.match(/idealy-preview-bridge/g)).toHaveLength(1);
  });

  it("chooses a collision-safe filename when the project already owns the bridge path", () => {
    const source: MissionWorkspaceFile[] = [
      { path: "index.html", content: "<html><body></body></html>" },
      { path: PREVIEW_BRIDGE_PATH, content: "user source" },
    ];
    const result = preparePreviewRuntimeFiles(source);
    expect(result.enabled).toBe(true);
    expect(result.files.find((file) => file.path === PREVIEW_BRIDGE_PATH)?.content).toBe("user source");
    expect(result.files.some((file) => file.path === "public/__idealy-preview-bridge-runtime.js")).toBe(true);
  });

  it("includes a real JavaScript bridge source", () => {
    expect(PREVIEW_BRIDGE_SOURCE).toContain("idealy:preview-element");
    expect(PREVIEW_BRIDGE_SOURCE).toContain("idealy:preview-mode");
  });
});
