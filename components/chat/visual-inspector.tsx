"use client";

import {
  Check,
  Copy,
  Crosshair,
  MessageSquarePlus,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type InspectedElement = {
  tag: string;
  selector: string;
  classes: string;
  dimensions: { width: number; height: number };
  textExcerpt: string;
};

/**
 * Script injecté dans l'iframe srcDoc pour permettre l'inspection visuelle chirurgicale.
 * Reste inerte tant que window.__idealyInspectorActive n'est pas activé.
 */
export const VISUAL_INSPECTOR_IFRAME_SCRIPT = `
<script id="idealy-visual-inspector-script">
(function() {
  let active = false;
  let highlightBox = null;

  function ensureHighlightBox() {
    if (!highlightBox) {
      highlightBox = document.createElement('div');
      highlightBox.id = '__idealy_inspect_box';
      highlightBox.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid oklch(0.7 0.2 210);background:oklch(0.7 0.2 210 / 0.12);border-radius:4px;transition:all 60ms ease-out;display:none;';
      document.body.appendChild(highlightBox);
    }
  }

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    let path = el.tagName.toLowerCase();
    if (el.id) return path + '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.trim().split(/\\s+/)[0];
      if (firstClass) path += '.' + firstClass;
    }
    return path;
  }

  window.addEventListener('message', function(ev) {
    if (ev.data && ev.data.type === 'idealy:set-inspector-mode') {
      active = Boolean(ev.data.enabled);
      ensureHighlightBox();
      if (!active && highlightBox) {
        highlightBox.style.display = 'none';
      }
    }
  });

  document.addEventListener('mouseover', function(ev) {
    if (!active) return;
    const el = ev.target;
    if (!el || el === highlightBox || el === document.body) return;
    ensureHighlightBox();
    const rect = el.getBoundingClientRect();
    highlightBox.style.display = 'block';
    highlightBox.style.top = rect.top + 'px';
    highlightBox.style.left = rect.left + 'px';
    highlightBox.style.width = rect.width + 'px';
    highlightBox.style.height = rect.height + 'px';
  }, true);

  document.addEventListener('click', function(ev) {
    if (!active) return;
    ev.preventDefault();
    ev.stopPropagation();
    const el = ev.target;
    if (!el || el === highlightBox) return;
    const rect = el.getBoundingClientRect();
    const payload = {
      type: 'idealy:element-inspected',
      tag: el.tagName.toLowerCase(),
      selector: getSelector(el),
      classes: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
      dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) },
      textExcerpt: (el.innerText || el.textContent || '').trim().slice(0, 80)
    };
    window.parent.postMessage(payload, '*');
  }, true);
})();
</script>
`;

export function VisualInspectorBar({
  isActive,
  onClose,
  inspectedElement,
}: {
  isActive: boolean;
  onClose: () => void;
  inspectedElement: InspectedElement | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!isActive) return null;

  const copySelector = () => {
    if (!inspectedElement) return;
    navigator.clipboard.writeText(inspectedElement.selector);
    setCopied(true);
    toast.success("Sélecteur copié");
    setTimeout(() => setCopied(false), 1500);
  };

  const requestEdit = () => {
    if (!inspectedElement) return;
    const prompt = `Modifie l’élément <${inspectedElement.selector}> : `;
    window.dispatchEvent(
      new CustomEvent("idealy:set-chat-input", { detail: prompt })
    );
    toast.info("Prompt renseigné dans le chat");
  };

  return (
    <div
      aria-live="polite"
      className="absolute bottom-4 inset-x-4 z-40 flex items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-sidebar/95 px-4 py-2.5 text-sidebar-foreground shadow-2xl backdrop-blur-xl"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
          <Crosshair className="size-4 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-sky-200">Inspecteur Visuel</span>
            {inspectedElement ? (
              <span className="font-mono text-[11px] font-semibold text-foreground">
                &lt;{inspectedElement.selector}&gt;
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Survolez et cliquez un élément de la preview
              </span>
            )}
          </div>
          {inspectedElement && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{inspectedElement.dimensions.width} × {inspectedElement.dimensions.height} px</span>
              {inspectedElement.textExcerpt && (
                <span className="truncate italic">"{inspectedElement.textExcerpt}"</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {inspectedElement && (
          <>
            <button
              aria-label="Copier le sélecteur"
              className="flex h-7 items-center gap-1 rounded-lg border border-sidebar-border bg-background/40 px-2.5 text-[11px] font-medium transition hover:bg-sidebar-accent"
              onClick={copySelector}
              type="button"
            >
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              <span>{copied ? "Copié" : "Copier"}</span>
            </button>
            <button
              aria-label="Demander une modification sur cet élément"
              className="flex h-7 items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-2.5 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-400/20"
              onClick={requestEdit}
              type="button"
            >
              <MessageSquarePlus className="size-3" />
              <span>Modifier</span>
            </button>
          </>
        )}
        <button
          aria-label="Fermer l'inspecteur"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
