import { authenticatedFetch } from "../../services/firebase";
import {
  AlertCircle,
  ChevronDown,
  LoaderCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type PluginTool = {
  id: string;
  label: string;
  requiresConfirmation: boolean;
  risk: string;
};
type MissionOption = { id: string; title: string };
type Field = {
  key: string;
  label: string;
  options?: string[];
  required?: boolean;
  type?: "text" | "textarea" | "json" | "number";
};
type Execution = {
  id?: string;
  output?: unknown;
  started_at?: string | null;
  status?: string;
  tool_id?: string;
};
type Review = {
  confirmationToken: string;
  input: Record<string, unknown>;
  missionId: string;
  operation: string;
  tool: PluginTool;
};
type Props = {
  available: boolean;
  missions: MissionOption[];
  pluginId: string;
  pluginName: string;
  tools: PluginTool[];
};

const NO_INPUT_READ_TOOLS = new Set([
  "github-list-repositories",
  "google-drive-list-drive-files",
  "vercel-list-projects",
  "canva-list-designs",
  "notion-search-pages",
  "slack-list-channels",
  "stripe-read-subscription",
  "stripe-read-invoice",
]);

const INPUTS: Record<string, Field[]> = {
  "github-read-repository": [
    { key: "owner", label: "Propriétaire ou organisation", required: true },
    { key: "repo", label: "Dépôt", required: true },
  ],
  "github-create-branch": [
    { key: "owner", label: "Propriétaire ou organisation", required: true },
    { key: "repo", label: "Dépôt", required: true },
    { key: "branch", label: "Nouvelle branche", required: true },
    { key: "fromBranch", label: "Branche source (facultatif)" },
  ],
  "github-open-pull-request": [
    { key: "owner", label: "Propriétaire ou organisation", required: true },
    { key: "repo", label: "Dépôt", required: true },
    { key: "head", label: "Branche source", required: true },
    { key: "base", label: "Branche cible (facultatif)" },
    { key: "title", label: "Titre", required: true },
    { key: "body", label: "Description", type: "textarea" },
  ],
  "google-drive-read-drive-metadata": [
    { key: "fileId", label: "Identifiant du fichier Drive", required: true },
  ],
  "vercel-get-deployment": [
    { key: "id", label: "Identifiant ou URL du déploiement", required: true },
  ],
  "canva-get-design": [
    { key: "designId", label: "Identifiant du design", required: true },
  ],
  "canva-create-design": [
    { key: "title", label: "Titre du nouveau design", required: true },
    {
      key: "designType.name",
      label: "Format",
      options: ["doc", "presentation", "whiteboard"],
    },
  ],
  "canva-export-design": [
    { key: "designId", label: "Identifiant du design", required: true },
    {
      key: "format.type",
      label: "Format d’export",
      options: ["pdf", "png", "jpg", "gif", "pptx"],
    },
  ],
  "figma-read-file": [
    { key: "fileKey", label: "Clé du fichier Figma", required: true },
  ],
  "figma-export-assets": [
    { key: "fileKey", label: "Clé du fichier Figma", required: true },
    {
      key: "ids",
      label: "Identifiants des nœuds (séparés par des virgules)",
      required: true,
    },
    { key: "format", label: "Format", options: ["png", "jpg", "svg", "pdf"] },
    { key: "scale", label: "Échelle (facultatif)", type: "number" },
  ],
  "notion-read-page": [
    { key: "pageId", label: "Identifiant de la page Notion", required: true },
  ],
  "notion-append-page": [
    { key: "pageId", label: "Identifiant de la page Notion", required: true },
    { key: "text", label: "Texte à ajouter", type: "textarea", required: true },
  ],
  "slack-send-message": [
    { key: "channel", label: "Identifiant du canal Slack", required: true },
    { key: "text", label: "Message", type: "textarea", required: true },
  ],
  "supabase-read-mission": [],
  "supabase-read-mission-files": [],
  "supabase-append-mission-event": [
    { key: "eventType", label: "Type d’événement", required: true },
    { key: "message", label: "Message", type: "textarea", required: true },
    { key: "taskKey", label: "Clé de tâche (facultatif)" },
    { key: "payload", label: "Données JSON (facultatif)", type: "json" },
  ],
};

const MISSION_INPUT_TOOLS = new Set([
  "supabase-read-mission",
  "supabase-read-mission-files",
  "supabase-append-mission-event",
]);

async function readJson<T>(
  response: Response,
): Promise<T & { error?: string }> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      payload.error || `Le backend a répondu ${response.status}.`,
    );
  return payload;
}

function createToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

async function actionDigest(
  input: Record<string, unknown>,
  missionId: string,
  pluginId: string,
  toolId: string,
) {
  const bytes = new TextEncoder().encode(
    stableJson({ input, missionId, pluginId, toolId }),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const keys = path.split(".");
  let current = target;
  for (const key of keys.slice(0, -1)) {
    const existing = current[key];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

function formatResult(value: unknown) {
  const formatted = JSON.stringify(value, null, 2) ?? "null";
  return formatted.length > 18000
    ? `${formatted.slice(0, 18000)}\n… Résultat tronqué dans l’interface.`
    : formatted;
}

export const PluginToolRunner: React.FC<Props> = ({
  available,
  missions,
  pluginId,
  pluginName,
  tools,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [missionId, setMissionId] = useState(missions[0]?.id ?? "");
  const [history, setHistory] = useState<Execution[]>([]);
  const [result, setResult] = useState<{
    output: unknown;
    toolId: string;
  } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const executableTools = tools.filter(
    (tool) =>
      NO_INPUT_READ_TOOLS.has(tool.id) || Object.hasOwn(INPUTS, tool.id),
  );
  const selectedTool = tools.find((tool) => tool.id === selectedToolId);
  const selectedFields = selectedTool ? (INPUTS[selectedTool.id] ?? []) : [];
  const selectedToolNeedsMission = selectedTool
    ? MISSION_INPUT_TOOLS.has(selectedTool.id) ||
      selectedTool.requiresConfirmation
    : false;

  useEffect(() => {
    if (missionId && missions.some((mission) => mission.id === missionId))
      return;
    setMissionId(missions[0]?.id ?? "");
  }, [missionId, missions]);

  const loadHistory = async () => {
    const response = await authenticatedFetch(
      `/api/idealy/plugins/${encodeURIComponent(pluginId)}/execute`,
      { cache: "no-store", credentials: "same-origin" },
    );
    const payload = await readJson<{ executions?: Execution[] }>(response);
    setHistory(Array.isArray(payload.executions) ? payload.executions : []);
  };

  useEffect(() => {
    if (!review) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }
    if (!previousFocusRef.current)
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    confirmButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setReview(null);
        return;
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [review, busy]);

  const openTools = async () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    setError("");
    if (!nextExpanded) return;
    try {
      await loadHistory();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "L’historique des outils est indisponible.",
      );
    }
  };

  const buildInput = () => {
    const input: Record<string, unknown> = {};
    for (const field of selectedFields) {
      const raw = values[field.key]?.trim() ?? "";
      if (!raw) continue;
      let value: unknown = raw;
      if (field.type === "number") {
        const number = Number(raw);
        if (!Number.isFinite(number))
          throw new Error(`Valeur numérique invalide : ${field.label}.`);
        value = number;
      }
      if (field.type === "json") {
        try {
          value = JSON.parse(raw) as unknown;
        } catch {
          throw new Error(
            `Le champ « ${field.label} » doit contenir du JSON valide.`,
          );
        }
      }
      setPath(input, field.key, value);
    }
    if (MISSION_INPUT_TOOLS.has(selectedToolId ?? "")) {
      if (!missionId)
        throw new Error("Choisissez une mission Idealy pour cette action.");
      input.missionId = missionId;
    }
    return input;
  };

  const prepareExecution = async () => {
    if (!selectedTool || busy) return;
    setError("");
    setBusy(true);
    try {
      const input = buildInput();
      const requiredMissing = selectedFields.find(
        (field) => field.required && !values[field.key]?.trim(),
      );
      if (requiredMissing)
        throw new Error(`Le champ « ${requiredMissing.label} » est requis.`);
      const needsMission = selectedTool.requiresConfirmation;
      if (needsMission && !missionId)
        throw new Error(
          "Choisissez une mission avant de confirmer cette action.",
        );
      if (selectedTool.requiresConfirmation) {
        const token = createToken();
        const operation = `${pluginId}:${selectedTool.id}`;
        const payloadDigest = await actionDigest(
          input,
          missionId,
          pluginId,
          selectedTool.id,
        );
        const response = await authenticatedFetch(
          "/api/idealy/missions/" +
            encodeURIComponent(missionId) +
            "/confirmation",
          {
            body: JSON.stringify({
              confirmationToken: token,
              operation,
              payloadDigest,
            }),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "POST",
          },
        );
        const payload = await readJson<{ status?: string }>(response);
        if (payload.status !== "pending")
          throw new Error("La confirmation de l’action n’a pas été préparée.");
        setReview({
          confirmationToken: token,
          input,
          missionId,
          operation,
          tool: selectedTool,
        });
      } else {
        await execute(input, selectedTool, null, null);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "L’action n’a pas pu être préparée.",
      );
    } finally {
      setBusy(false);
    }
  };

  const execute = async (
    input: Record<string, unknown>,
    tool: PluginTool,
    token: string | null,
    selectedMissionId: string | null,
  ) => {
    const response = await authenticatedFetch(
      `/api/idealy/plugins/${encodeURIComponent(pluginId)}/execute`,
      {
        body: JSON.stringify({
          confirmed: tool.requiresConfirmation,
          confirmationToken: token ?? undefined,
          idempotencyKey: crypto.randomUUID(),
          input,
          missionId: selectedMissionId ?? undefined,
          toolId: tool.id,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const payload = await readJson<{
      executionId?: string;
      ok?: boolean;
      output?: unknown;
    }>(response);
    if (payload.ok !== true)
      throw new Error(
        payload.error || "Le moteur n’a pas confirmé la réussite de l’outil.",
      );
    setResult({ output: payload.output ?? null, toolId: tool.id });
    setSelectedToolId(null);
    setValues({});
    try {
      await loadHistory();
    } catch {
      setError(
        "L’action a réussi, mais l’historique n’a pas été actualisé. Ne relancez pas une action de publication à cause de ce message.",
      );
    }
  };

  const confirmExecution = async () => {
    if (!review || busy) return;
    setBusy(true);
    setError("");
    try {
      const url = `/api/idealy/missions/${encodeURIComponent(review.missionId)}/confirmation`;
      const approvedResponse = await authenticatedFetch(url, {
        body: JSON.stringify({
          confirmationToken: review.confirmationToken,
          operation: review.operation,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const approved = await readJson<{ status?: string }>(approvedResponse);
      if (approved.status !== "approved")
        throw new Error(
          "La confirmation de l’action a expiré ou a été refusée.",
        );
      await execute(
        review.input,
        review.tool,
        review.confirmationToken,
        review.missionId,
      );
      setReview(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "L’action confirmée a échoué.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!available || executableTools.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        aria-expanded={expanded}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-subtle px-3 text-[11px] font-medium text-text-main hover:bg-bg-subtle focus-ring"
        onClick={() => void openTools()}
        type="button"
      >
        Outils
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <section
          aria-label={`Outils ${pluginName}`}
          className="mt-3 rounded-xl border border-border-subtle bg-bg-base p-3"
        >
          <p className="text-[11px] leading-5 text-text-muted">
            Les outils disponibles sont contrôlés par le backend. Les écritures
            demandent une confirmation avant exécution.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {executableTools.map((tool) => (
              <button
                aria-pressed={selectedToolId === tool.id}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium focus-ring disabled:opacity-50 ${selectedToolId === tool.id ? "bg-brand-primary text-brand-onPrimary" : "bg-bg-subtle text-text-main hover:bg-border-subtle"}`}
                disabled={busy}
                key={tool.id}
                onClick={() => {
                  setSelectedToolId(tool.id);
                  setValues({});
                  setError("");
                  if (NO_INPUT_READ_TOOLS.has(tool.id))
                    void execute({}, tool, null, null).catch((cause: unknown) =>
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "L’outil a échoué.",
                      ),
                    );
                }}
                type="button"
              >
                {NO_INPUT_READ_TOOLS.has(tool.id) ? (
                  <Play aria-hidden="true" className="h-3 w-3" />
                ) : tool.requiresConfirmation ? (
                  <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                ) : null}
                {tool.label}
              </button>
            ))}
          </div>
          {selectedTool && !NO_INPUT_READ_TOOLS.has(selectedTool.id) && (
            <div className="mt-3 space-y-3 rounded-lg border border-border-subtle bg-bg-surface p-3">
              {selectedToolNeedsMission ? (
                <div>
                  <label className="block text-[11px] font-medium text-text-muted">
                    Mission à associer
                    <select
                      className="mt-1.5 h-9 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-xs text-text-main focus-ring"
                      onChange={(event) => setMissionId(event.target.value)}
                      value={missionId}
                    >
                      <option value="">Choisir une mission</option>
                      {missions.map((mission) => (
                        <option key={mission.id} value={mission.id}>
                          {mission.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {missions.length === 0 && (
                    <p className="mt-1.5 text-[10px] leading-4 text-text-muted">
                      Créez d’abord une mission dans le chat pour associer cette
                      action à votre historique.
                    </p>
                  )}
                </div>
              ) : null}
              {selectedFields.map((field) => {
                const fieldId = `${pluginId}-${field.key}`;
                return (
                  <div
                    className="block text-[11px] font-medium text-text-muted"
                    key={field.key}
                  >
                    <label htmlFor={fieldId}>
                      {field.label}
                      {field.required ? " · requis" : ""}
                    </label>
                    {field.options ? (
                      <select
                        className="mt-1.5 h-9 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-xs text-text-main focus-ring"
                        id={fieldId}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        value={values[field.key] ?? ""}
                      >
                        <option value="">Choisir…</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" || field.type === "json" ? (
                      <textarea
                        className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-border-subtle bg-bg-base p-2.5 font-mono text-xs text-text-main focus-ring"
                        id={fieldId}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={field.type === "json" ? "{}" : ""}
                        value={values[field.key] ?? ""}
                      />
                    ) : (
                      <input
                        className="mt-1.5 h-9 w-full rounded-lg border border-border-subtle bg-bg-base px-3 text-xs text-text-main focus-ring"
                        id={fieldId}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        type={field.type ?? "text"}
                        value={values[field.key] ?? ""}
                      />
                    )}
                  </div>
                );
              })}
              <button
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-text-main px-3 text-xs font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-50"
                disabled={
                  busy ||
                  (selectedToolNeedsMission &&
                    !missions.some((mission) => mission.id === missionId))
                }
                onClick={() => void prepareExecution()}
                type="button"
              >
                {busy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                ) : null}
                {selectedTool.requiresConfirmation
                  ? "Examiner l’action"
                  : "Exécuter l’outil"}
              </button>
            </div>
          )}
          {result && (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-bg-surface p-3 font-mono text-[10px] leading-4 text-text-muted">
              {formatResult(result.output)}
            </pre>
          )}
          <div className="mt-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Exécutions récentes
            </h4>
            {history.length ? (
              <ul className="mt-2 space-y-1.5">
                {history.slice(0, 5).map((execution, index) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-muted"
                    key={execution.id ?? `${execution.tool_id}-${index}`}
                  >
                    <span className="truncate">
                      {execution.tool_id ?? "Outil"}
                      {execution.started_at
                        ? ` · ${new Date(execution.started_at).toLocaleString("fr-FR")}`
                        : ""}
                    </span>
                    <span
                      className={
                        execution.status === "succeeded" ? "text-success" : ""
                      }
                    >
                      {execution.status ?? "État inconnu"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[10px] text-text-muted">
                Aucune exécution enregistrée.
              </p>
            )}
          </div>
        </section>
      )}
      {error && (
        <p
          aria-live="polite"
          className="mt-2 flex items-start gap-2 text-[11px] text-error"
          role="alert"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          {error}
        </p>
      )}
      {review && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4">
          <section
            aria-labelledby="plugin-action-review-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-elevated"
            ref={dialogRef}
            role="alertdialog"
          >
            <h2
              className="text-sm font-semibold text-text-main"
              id="plugin-action-review-title"
            >
              Confirmer l’action · {review.tool.label}
            </h2>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              {pluginName} va exécuter cette action pour la mission
              sélectionnée. Les paramètres exacts sont liés à la confirmation et
              l’action ne sera pas rejouée automatiquement.
            </p>
            <p className="mt-2 text-[11px] font-medium text-text-main">
              Mission :{" "}
              {missions.find((mission) => mission.id === review.missionId)
                ?.title ?? review.missionId}
            </p>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border-subtle bg-bg-base p-3 font-mono text-[10px] leading-4 text-text-muted">
              {formatResult(review.input)}
            </pre>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-9 rounded-lg px-3 text-xs text-text-muted hover:bg-bg-subtle focus-ring"
                disabled={busy}
                onClick={() => setReview(null)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-text-main px-3 text-xs font-medium text-bg-base hover:opacity-90 focus-ring disabled:opacity-60"
                disabled={busy}
                onClick={() => void confirmExecution()}
                ref={confirmButtonRef}
                type="button"
              >
                {busy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                ) : null}
                Confirmer et exécuter
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
