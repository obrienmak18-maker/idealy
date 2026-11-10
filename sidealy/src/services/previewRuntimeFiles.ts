import type { MissionWorkspaceFile } from "../types";

export const PREVIEW_BRIDGE_PATH = "public/__idealy-preview-bridge.js";
export const PREVIEW_BRIDGE_URL = "/__idealy-preview-bridge.js";

export const PREVIEW_BRIDGE_SOURCE = "(function () {\n  let mode = \"off\";\n  let highlight = null;\n\n  function ensureHighlight() {\n    if (highlight || !document.body) return;\n    highlight = document.createElement(\"div\");\n    highlight.id = \"__idealy_preview_highlight\";\n    highlight.setAttribute(\"aria-hidden\", \"true\");\n    highlight.style.cssText = \"position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #5b7cfa;background:rgba(91,124,250,.10);border-radius:5px;display:none;transition:all 60ms ease-out\";\n    document.body.appendChild(highlight);\n  }\n\n  function selectorFor(element) {\n    if (!element || element === document.body) return \"body\";\n    if (element.id) return \"#\" + element.id;\n    const classes = typeof element.className === \"string\"\n      ? element.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2)\n      : [];\n    return element.tagName.toLowerCase() + classes.map(function (name) {\n      return \".\" + name.replace(/[^a-zA-Z0-9_-]/g, \"\");\n    }).join(\"\");\n  }\n\n  function setMode(nextMode) {\n    mode = nextMode === \"select\" || nextMode === \"comment\" ? nextMode : \"off\";\n    ensureHighlight();\n    if (highlight) highlight.style.display = \"none\";\n    if (document.documentElement) {\n      document.documentElement.style.cursor = mode === \"off\" ? \"\" : \"crosshair\";\n    }\n  }\n\n  window.addEventListener(\"message\", function (event) {\n    if (event.source !== window.parent || !event.data || event.data.type !== \"idealy:preview-mode\") return;\n    setMode(event.data.mode);\n  });\n\n  document.addEventListener(\"pointerover\", function (event) {\n    if (mode === \"off\") return;\n    const element = event.target;\n    if (!(element instanceof Element) || element === highlight) return;\n    ensureHighlight();\n    const rect = element.getBoundingClientRect();\n    highlight.style.display = \"block\";\n    highlight.style.top = rect.top + \"px\";\n    highlight.style.left = rect.left + \"px\";\n    highlight.style.width = rect.width + \"px\";\n    highlight.style.height = rect.height + \"px\";\n  }, true);\n\n  document.addEventListener(\"click\", function (event) {\n    if (mode === \"off\") return;\n    const element = event.target;\n    if (!(element instanceof Element) || element === highlight) return;\n    event.preventDefault();\n    event.stopPropagation();\n    const rect = element.getBoundingClientRect();\n    window.parent.postMessage({\n      type: \"idealy:preview-element\",\n      mode: mode,\n      tag: element.tagName.toLowerCase(),\n      selector: selectorFor(element),\n      classes: typeof element.className === \"string\" ? element.className.slice(0, 160) : \"\",\n      text: (element.textContent || \"\").trim().replace(/\\s+/g, \" \").slice(0, 140),\n      dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) }\n    }, \"*\");\n    setMode(\"off\");\n  }, true);\n})();";

export type PreviewBridgeResult = {
  enabled: boolean;
  files: MissionWorkspaceFile[];
  framework: "html" | "next" | "unsupported";
};

function insertBeforeClosingTag(content: string, tag: string, closingTag: RegExp) {
  if (content.includes('id="idealy-preview-bridge"')) return content;
  if (closingTag.test(content)) {
    closingTag.lastIndex = 0;
    return content.replace(closingTag, `${tag}\n</body>`);
  }
  return content;
}

/**
 * Injects the visual selection bridge only into the ephemeral WebContainer
 * mount tree. The user's persisted mission files and artifacts are never changed.
 */
export function preparePreviewRuntimeFiles(
  sourceFiles: readonly MissionWorkspaceFile[],
): PreviewBridgeResult {
  const files = sourceFiles.map((file) => ({ ...file }));
  const htmlIndex = files.find((file) => file.path.replaceAll("\\", "/") === "index.html");
  const nextLayout = files.find((file) =>
    /^(?:src\/)?app\/layout\.(?:tsx?|jsx?)$/i.test(file.path.replaceAll("\\", "/")),
  );

  const bridgeFilePath = files.some((file) => file.path === PREVIEW_BRIDGE_PATH)
    ? "public/__idealy-preview-bridge-runtime.js"
    : PREVIEW_BRIDGE_PATH;
  const bridgeUrl = bridgeFilePath.split("/").at(-1) === "__idealy-preview-bridge.js"
    ? PREVIEW_BRIDGE_URL
    : "/__idealy-preview-bridge-runtime.js";
  const bridgeFileExists = files.some((file) => file.path === bridgeFilePath);
  if (!bridgeFileExists) {
    files.push({
      content: PREVIEW_BRIDGE_SOURCE,
      language: "javascript",
      path: bridgeFilePath,
      status: "saved",
      version: Number.MAX_SAFE_INTEGER,
    });
  }

  if (htmlIndex) {
    const scriptTag = `<script id="idealy-preview-bridge" src="${bridgeUrl}" defer></script>`;
    const updated = insertBeforeClosingTag(htmlIndex.content, scriptTag, /<\/body>/i);
    if (updated !== htmlIndex.content || updated.includes('id="idealy-preview-bridge"')) {
      htmlIndex.content = updated;
      return { enabled: true, files, framework: "html" };
    }
    return { enabled: false, files: sourceFiles.map((file) => ({ ...file })), framework: "unsupported" };
  }

  if (nextLayout) {
    let content = nextLayout.content;
    if (content.includes('id="idealy-preview-bridge"')) {
      return { enabled: true, files, framework: "next" };
    }
    if (!/<\/body>/i.test(content)) {
      return { enabled: false, files: sourceFiles.map((file) => ({ ...file })), framework: "unsupported" };
    }

    if (!/import\s+Script\s+from\s+["']next\/script["']/.test(content)) {
      content = `import Script from "next/script";\n${content}`;
    }
    content = insertBeforeClosingTag(
      content,
      `<Script id="idealy-preview-bridge" src="${bridgeUrl}" strategy="afterInteractive" />`,
      /<\/body>/i,
    );
    nextLayout.content = content;
    return { enabled: true, files, framework: "next" };
  }

  return { enabled: false, files: sourceFiles.map((file) => ({ ...file })), framework: "unsupported" };
}
