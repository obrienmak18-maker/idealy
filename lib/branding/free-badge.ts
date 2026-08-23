const IDEALY_BADGE_MARKUP = `
<div data-idealy-badge="true" style="position:fixed;right:18px;bottom:18px;z-index:2147483647">
  <a href="https://idealy.app" target="_blank" rel="noreferrer" aria-label="Created with Idealy" style="display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(148,163,184,.35);border-radius:999px;background:rgba(255,255,255,.9);box-shadow:0 8px 24px rgba(15,23,42,.14);color:#334155;font:600 11px/1 Inter,ui-sans-serif,system-ui,sans-serif;text-decoration:none;backdrop-filter:blur(12px)">
    <svg width="18" height="18" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs><linearGradient id="idealy-free-badge-gradient" x1="8" y1="10" x2="56" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#38BDF8"/><stop offset=".35" stop-color="#14B8A6"/><stop offset=".68" stop-color="#8B5CF6"/><stop offset="1" stop-color="#FB923C"/></linearGradient></defs>
      <ellipse cx="32" cy="32" rx="25" ry="12" transform="rotate(-28 32 32)" stroke="url(#idealy-free-badge-gradient)" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 5.5 37.3 26.7 58.5 32 37.3 37.3 32 58.5 26.7 37.3 5.5 32 26.7 26.7 32 5.5Z" fill="url(#idealy-free-badge-gradient)"/>
      <circle cx="32" cy="32" r="8.5" fill="#fff"/>
      <path d="M32 26.2v13M27.8 30.2h8.4" stroke="#0F172A" stroke-width="6" stroke-linecap="round"/>
    </svg>
    <span>Created with <strong style="color:#0F172A">Idealy</strong></span>
  </a>
</div>`;

export function injectFreeIdealyBadge(html: string, enabled = true): string {
  if (!enabled || html.includes('data-idealy-badge="true"')) {
    return html;
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${IDEALY_BADGE_MARKUP}</body>`);
  }

  return `${html}${IDEALY_BADGE_MARKUP}`;
}
