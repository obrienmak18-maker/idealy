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
  projectTitle = "Application",
}: {
  files: MissionFile[];
  singleCodeContent?: string;
  activePath?: string;
  isStreaming?: boolean;
  projectTitle?: string;
}): PreviewCompilationResult {
  const availableRoutes = extractAvailableRoutes(files);

  // 1. If currently streaming: show live, high-tech animated construction view so it never flashes blank white
  if (isStreaming) {
    return {
      status: "building",
      availableRoutes,
      html: `<!doctype html>
<html lang="fr" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${projectTitle} — Construction en direct</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><rect width='24' height='24' rx='6' fill='%230f172a'/><path d='M12 4L20 20H4L12 4Z' fill='%2338bdf8'/></svg>">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #030712;
      color: #f8fafc;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      position: relative;
    }
    .mesh-glow {
      position: absolute;
      width: 480px;
      height: 480px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.06) 50%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .box {
      position: relative;
      z-index: 10;
      max-width: 440px;
      width: 90%;
      padding: 36px 28px;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(24px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      text-align: center;
    }
    .spinner-ring {
      width: 52px;
      height: 52px;
      margin: 0 auto 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .spinner-ring svg {
      animation: spin 1.5s linear infinite;
    }
    .spinner-ring .core {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #38bdf8;
      opacity: 0.3;
      animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    h2 {
      font-size: 17px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .steps {
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: left;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 14px;
      padding: 14px 16px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .step {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: #94a3b8;
    }
    .step.active {
      color: #38bdf8;
      font-weight: 500;
    }
    .step-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #475569;
    }
    .step.active .step-dot {
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
      animation: pulse 1.5s infinite;
    }
    .step.done .step-dot {
      background: #10b981;
    }
    .progress-bar-bg {
      margin-top: 18px;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      width: 65%;
      border-radius: 9999px;
      animation: progress-flow 2s infinite ease-in-out;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
    @keyframes progress-flow {
      0% { width: 30%; transform: translateX(-20%); }
      50% { width: 75%; transform: translateX(10%); }
      100% { width: 95%; transform: translateX(5%); }
    }
  </style>
</head>
<body>
  <div class="mesh-glow"></div>
  <div class="box">
    <div class="spinner-ring">
      <div class="core"></div>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
        <path d="M44 24C44 12.9543 35.0457 4 24 4" stroke="url(#spinner-gradient)" stroke-width="3" stroke-linecap="round"/>
        <defs>
          <linearGradient id="spinner-gradient" x1="24" y1="4" x2="44" y2="24" gradientUnits="userSpaceOnUse">
            <stop stop-color="#38bdf8"/>
            <stop offset="1" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h2>Votre application se fait construire…</h2>
    <p>L'escouade Idealy structure les composants et prépare l'environnement interactif.</p>
    <div class="steps">
      <div class="step done">
        <span class="step-dot"></span>
        <span>Initialisation de l'espace de travail</span>
      </div>
      <div class="step active">
        <span class="step-dot"></span>
        <span>Génération des fichiers et composants React…</span>
      </div>
      <div class="step">
        <span class="step-dot"></span>
        <span>Compilation du rendu en direct</span>
      </div>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill"></div>
    </div>
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
<html lang="fr" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${projectTitle}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><rect width='24' height='24' rx='6' fill='%230f172a'/><path d='M12 4L20 20H4L12 4Z' fill='%2338bdf8'/></svg>">
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
    body { margin: 0; background: #030712; color: #f8fafc; font-family: Inter, system-ui, -apple-system, sans-serif; }
    .error-card { padding: 24px; margin: 24px auto; max-width: 600px; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3); background: #180d0d; color: #fca5a5; }
    .error-card h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #f87171; }
    .error-card pre { margin: 12px 0 0; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; font-size: 12px; overflow-x: auto; color: #fecaca; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    // Universal Icon Proxy for Lucide icons
    function createDynamicIcon(name) {
      return function DynamicIcon(props) {
        const p = props || {};
        const size = p.size || 18;
        return React.createElement('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: p.className || '',
          style: p.style || {},
          ...p
        }, React.createElement('circle', { cx: 12, cy: 12, r: 8, opacity: 0.25 }));
      };
    }

    const commonLucideIcons = [
      'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ChevronRight', 'ChevronLeft', 'ChevronDown', 'ChevronUp',
      'Check', 'CheckCircle', 'CheckCircle2', 'X', 'XCircle', 'AlertCircle', 'AlertTriangle', 'Info',
      'Github', 'Twitter', 'Linkedin', 'Mail', 'Globe', 'ExternalLink', 'Search', 'Menu', 'Terminal',
      'Code', 'Code2', 'Folder', 'File', 'FileCode', 'FileText', 'Database', 'Server', 'Cpu', 'Layers',
      'Shield', 'ShieldCheck', 'Zap', 'Sparkles', 'Star', 'Heart', 'Eye', 'EyeOff', 'Lock', 'Unlock',
      'User', 'Users', 'Settings', 'HelpCircle', 'Bell', 'Compass', 'Play', 'Pause', 'Copy', 'Download',
      'Upload', 'RefreshCw', 'Clock', 'Calendar', 'Filter', 'Sliders', 'BarChart', 'BarChart2', 'TrendingUp',
      'Activity', 'Box', 'Package', 'Cloud', 'Sun', 'Moon', 'Monitor', 'Smartphone', 'Laptop', 'Maximize',
      'Minimize', 'Plus', 'Minus', 'Trash', 'Edit', 'Edit2', 'Save', 'Share2', 'Send', 'Link', 'Paperclip',
      'GitBranch', 'GitCommit', 'GitPullRequest', 'Workflow', 'Rocket', 'Home', 'LogOut', 'LogIn', 'Radio'
    ];
    commonLucideIcons.forEach(icon => {
      if (typeof window[icon] === 'undefined') {
        window[icon] = createDynamicIcon(icon);
      }
    });

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
