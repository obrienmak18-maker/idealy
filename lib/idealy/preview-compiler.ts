import type { MissionFile } from "./mission-files";

export type PreviewCompilationStatus =
  | "empty"
  | "building"
  | "ready"
  | "error";

export type PreviewCompilationResult = {
  html: string;
  status: PreviewCompilationStatus;
  errorMessage?: string;
  availableRoutes: Array<{ label: string; path: string }>;
};

/**
 * Safely extracts routes available in the generated project.
 * Analyzes App Router, Pages Router, and HTML files.
 */
function routePathFromFile(filePath: string): string | null {
  const path = filePath.replace(/^\/+/, "").replaceAll("\\", "/");

  // App Router: route groups such as (marketing) do not appear in the URL.
  const appMatch = path.match(/^(?:src\/)?app\/(?:(.+)\/)?page\.(?:tsx|jsx|js|ts)$/);
  if (appMatch) {
    const segments = (appMatch[1] ?? "")
      .split("/")
      .filter(Boolean)
      .filter((segment) =>
        !(segment.startsWith("(") && segment.endsWith(")")) &&
        !segment.startsWith("@")
      );
    return ("/" + segments.join("/")).replace(/\/+/g, "/");
  }

  // Pages Router: API handlers and framework files are not UI pages.
  const pagesMatch = path.match(/^(?:src\/)?pages\/(.+)\.(?:tsx|jsx|js|ts)$/);
  if (pagesMatch) {
    let pagePath = pagesMatch[1];
    if (
      pagePath.startsWith("api/") ||
      ["_app", "_document", "_error"].includes(pagePath) ||
      pagePath.startsWith("_middleware")
    ) {
      return null;
    }
    if (pagePath === "index") pagePath = "";
    else if (pagePath.endsWith("/index")) pagePath = pagePath.slice(0, -6);
    return ("/" + pagePath).replace(/\/+/g, "/");
  }

  // Static HTML pages, including index.html at the project root.
  const htmlMatch = path.match(/^(?:public\/)?(.+)\.html$/);
  if (htmlMatch) {
    const htmlPath = htmlMatch[1] === "index" ? "" : htmlMatch[1];
    return ("/" + htmlPath).replace(/\/+/g, "/");
  }

  return null;
}

/**
 * Safely extracts only actual UI routes from generated App Router, Pages Router,
 * and static HTML files. The same route resolver is used by the preview compiler.
 */
export function extractAvailableRoutes(
  files: MissionFile[]
): Array<{ label: string; path: string }> {
  if (!files || files.length === 0) {
    return [{ label: "Accueil", path: "/" }];
  }

  const routes = new Map<string, string>();
  for (const file of files) {
    const routePath = routePathFromFile(file.path);
    if (routePath === null || routes.has(routePath)) continue;

    const label =
      routePath === "/"
        ? "Accueil"
        : routePath
            .slice(1)
            .split("/")
            .map((segment) =>
              segment.replace(/^\[|\]$/g, "").replace(/[-_]/g, " ")
            )
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(" / ");
    routes.set(routePath, label);
  }

  return routes.size > 0
    ? Array.from(routes.entries()).map(([routePath, label]) => ({
        label,
        path: routePath,
      }))
    : [{ label: "Accueil", path: "/" }];
}

/**
 * Compiles files or single artifact code into a real, sandboxed HTML document.
 * Does NOT invent fake landings. Reports honest empty or building states.
 */
export function compileProjectPreview({
  files,
  singleCodeContent,
  activePath = "/",
  isStreaming = false,
}: {
  files: MissionFile[];
  singleCodeContent?: string;
  activePath?: string;
  isStreaming?: boolean;
}): PreviewCompilationResult {
  const availableRoutes = extractAvailableRoutes(files);

  // 1. If currently streaming and no usable content yet
  if (isStreaming && (!files || files.length === 0) && (!singleCodeContent || singleCodeContent.trim().length === 0)) {
    return {
      status: "building",
      availableRoutes,
      html: `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; background: #07090e; color: #f8fafc; font-family: Inter, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .box { max-width: 380px; padding: 32px 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: rgba(15,23,42,0.6); backdrop-filter: blur(16px); }
    .pulse { width: 44px; height: 44px; margin: 0 auto 16px; border-radius: 12px; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite ease-in-out; }
    h2 { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #fff; }
    p { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; }
    @keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1.04); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="pulse">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>
    </div>
    <h2>Génération de l'application…</h2>
    <p>L'escouade Idealy structure et compile les fichiers de votre projet.</p>
  </div>
</body>
</html>`,
    };
  }

  // 2. If completely empty (no files and no code)
  if ((!files || files.length === 0) && (!singleCodeContent || singleCodeContent.trim().length === 0)) {
    return {
      status: "empty",
      availableRoutes: [{ label: "Aperçu", path: "/" }],
      html: `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; background: #07090e; color: #f8fafc; font-family: Inter, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .box { max-width: 420px; padding: 40px 28px; border-radius: 24px; border: 1px dashed rgba(255,255,255,0.12); background: rgba(15,23,42,0.4); }
    .icon { width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 14px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: #64748b; }
    h2 { font-size: 17px; font-weight: 600; margin: 0 0 10px; color: #e2e8f0; }
    p { font-size: 13px; color: #64748b; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>
    </div>
    <h2>Aucun projet à prévisualiser</h2>
    <p>Décrivez votre application dans la discussion pour que l'escouade conçoive, crée les fichiers et affiche l'aperçu en direct.</p>
  </div>
</body>
</html>`,
    };
  }

  // 3. Select the actual file for the active route (including route groups).
  let targetFile: MissionFile | undefined;
  if (files && files.length > 0) {
    const normalizedTarget = `/${activePath.split("/").filter(Boolean).join("/")}`;
    const matchingFiles = files
      .filter((file) => routePathFromFile(file.path) === normalizedTarget)
      .sort((left, right) => (right.version ?? 0) - (left.version ?? 0));
    targetFile = matchingFiles[0];

    // If a route disappears mid-stream, prefer the real root page before a
    // generic fallback. This keeps selection deterministic while files stream.
    if (!targetFile && normalizedTarget !== "/") {
      targetFile = files
        .filter((file) => routePathFromFile(file.path) === "/")
        .sort((left, right) => (right.version ?? 0) - (left.version ?? 0))[0];
    }

    if (!targetFile) {
      targetFile = files.find(
        (file) =>
          file.path.endsWith(".html") ||
          file.path.endsWith(".tsx") ||
          file.path.endsWith(".jsx")
      );
    }
  }

  const codeSource = targetFile?.content || singleCodeContent || "";

  // 4. If codeSource is raw HTML: inject Tailwind & safe error boundary
  if (codeSource.includes("<!DOCTYPE") || codeSource.includes("<!doctype") || codeSource.includes("<html")) {
    let completeHtml = codeSource;
    // Inject Tailwind CDN if missing
    if (!completeHtml.includes("tailwindcss.com")) {
      completeHtml = completeHtml.replace(
        "<head>",
        '<head><script src="https://cdn.tailwindcss.com"></script>'
      );
    }
    // Inject Error listener
    const errorGuard = `<script>
      window.addEventListener('error', function(e) {
        window.parent.postMessage({ type: 'idealy:preview-error', message: e.message, lineno: e.lineno }, '*');
      });
    </script>`;
    if (completeHtml.includes("</head>")) {
      completeHtml = completeHtml.replace("</head>", `${errorGuard}</head>`);
    } else {
      completeHtml = `${errorGuard}${completeHtml}`;
    }

    return {
      status: "ready",
      availableRoutes,
      html: completeHtml,
    };
  }

  // 5. If codeSource is React / JSX / TSX: wrap in safe client-side React preview harness
  const cleanCode = codeSource
    .replace(/^import\s+.*?from\s+['"].*?['"];?/gm, "") // strip standard imports
    .replace(/^export\s+default\s+/gm, "window.__IDEALY_DEFAULT_COMPONENT = ");

  const reactHarness = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Idealy Live Preview</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React 18 & Babel Standalone -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Lucide Icons UMD -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #ffffff; color: #0f172a; font-family: Inter, system-ui, -apple-system, sans-serif; }
    .error-card { padding: 24px; margin: 24px auto; max-width: 600px; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3); background: #fef2f2; color: #991b1b; }
    .error-card h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
    .error-card pre { margin: 12px 0 0; padding: 12px; background: rgba(0,0,0,0.05); border-radius: 8px; font-size: 12px; overflow-x: auto; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // Error Boundary
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }
      componentDidCatch(error) {
        window.parent.postMessage({ type: 'idealy:preview-error', message: error.message }, '*');
      }
      render() {
        if (this.state.hasError) {
          return (
            <div className="error-card">
              <h3>Erreur d'exécution de l'aperçu</h3>
              <p>Le composant a généré une exception lors du rendu :</p>
              <pre>{this.state.error?.message || String(this.state.error)}</pre>
            </div>
          );
        }
        return this.props.children;
      }
    }

    try {
      ${cleanCode}

      const TargetComponent = window.__IDEALY_DEFAULT_COMPONENT || (() => (
        <div className="p-8 text-center text-slate-500">
          <p>Composant prêt sans export explicite.</p>
        </div>
      ));

      ReactDOM.createRoot(document.getElementById('root')).render(
        <ErrorBoundary>
          <TargetComponent />
        </ErrorBoundary>
      );
    } catch (err) {
      window.parent.postMessage({ type: 'idealy:preview-error', message: err.message }, '*');
      document.getElementById('root').innerHTML = '<div class="error-card"><h3>Erreur de syntaxe / compilation</h3><pre>' + (err.message || String(err)) + '</pre></div>';
    }
  </script>
</body>
</html>`;

  return {
    status: "ready",
    availableRoutes,
    html: reactHarness,
  };
}
