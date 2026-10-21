/**
 * Runner d'actions Idealy (LOT C) — exécute séquentiellement les actions validées
 * du protocole <idealyProject>/<idealyAction> et retourne un résultat typé par action.
 *
 * CONTRAINTE DURE : tous les appels conteneur passent par l'API WebContainer interne
 * d'Idealy déjà présente dans le dépôt :
 *   integrations/idealy/backend-core/src/core/webcontainer/webcontainer.ts
 *     → getWebContainerInstance()
 * Ce module n'importe PAS l'API d'un tiers et ne réécrit PAS la couche conteneur ;
 * il est le client de cette API, exactement comme selfCorrection.ts l'est déjà.
 *
 * Le journal de mission existant (app/api/idealy/missions/[missionId]/events +
 * lib/idealy/orchestrator/events.ts) est réutilisé via une interface de sink
 * injectée : aucune table ni route dupliquée.
 */

import { validateIdealyAction, type IdealyAction } from "./schema";

/** Statut d'une action exécutée. */
export type ActionRunStatus = "pending" | "running" | "complete" | "failed" | "rejected" | "aborted";

/** Résultat typé retourné pour chaque action exécutée. */
export interface ActionResult {
  actionId: string;
  action: IdealyAction;
  status: ActionRunStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

/** Sink du journal de mission : branché sur le journal VFS/événements EXISTANT. */
export interface MissionEventSink {
  append(event: { type: string; payload: Record<string, unknown> }): Promise<void> | void;
}

/**
 * Port minimal vers l'API WebContainer d'Idealy. L'implémentation réelle est
 * fournie par getWebContainerInstance() (backend-core). Cette interface permet
 * au runner de rester testable sans embarquer la dépendance côté serveur Node.
 */
export interface IdealyContainerPort {
  writeFile(path: string, contents: string): Promise<void>;
  removeFile(path: string): Promise<void>;
  moveFile(from: string, to: string): Promise<void>;
  spawn(command: string, opts?: { signal?: AbortSignal }): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  startDevServer(): Promise<{ url: string | null }>;
}

const ACTION_ORDER: Record<IdealyAction["type"], number> = {
  file: 0,
  delete: 1,
  rename: 2,
  shell: 3,
  start: 4,
};

/** Tri stable C.4 : files d'abord, puis shell, start en tout dernier. */
export function sortActionsInExecutionOrder(actions: readonly IdealyAction[]): IdealyAction[] {
  return [...actions].sort((a, b) => ACTION_ORDER[a.type] - ACTION_ORDER[b.type]);
}

export interface RunActionsOptions {
  container: IdealyContainerPort;
  events?: MissionEventSink;
  signal?: AbortSignal;
  onLog?: (line: string) => void;
}

/**
 * Exécution SÉQUENTIELLE stricte (l'ordre porte la sémantique : un import ne peut
 * précéder son fichier). Chaque action produit :
 *  - un ActionResult typé { action, status, stdout, stderr, exitCode },
 *  - une entrée dans le journal de mission (réutilisation du journal existant),
 *  - l'arrêt immédiat de la séquence si une action échoue (le LOT E reboucle alors
 *    stdout/stderr vers le modèle sous forme de diagnostic structuré).
 */
export async function runIdealyActions(
  incoming: readonly unknown[],
  options: RunActionsOptions,
): Promise<ActionResult[]> {
  const { container, events, signal, onLog } = options;
  const results: ActionResult[] = [];

  // Re-jonction avec le contrat Zod : rien n'atteint le conteneur sans validation (B.4).
  const validated: IdealyAction[] = [];
  for (let index = 0; index < incoming.length; index++) {
    const outcome = validateIdealyAction(incoming[index]);
    const actionId = `run-action-${index + 1}`;
    if (!outcome.ok) {
      const rejected: ActionResult = {
        actionId,
        action: { type: "shell", command: "(invalid)" },
        status: "rejected",
        stdout: "",
        stderr: "",
        exitCode: null,
        error: outcome.reason,
      };
      results.push(rejected);
      await events?.append({ type: "action.rejected", payload: { actionId, reason: outcome.reason } });
      continue;
    }
    validated.push(outcome.action);
  }

  const ordered = sortActionsInExecutionOrder(validated);

  /** Chemins déjà écrits dans cette séquence (détection de doublons explicites). */
  const writtenPaths = new Set<string>();

  for (let index = 0; index < ordered.length; index++) {
    const action = ordered[index];
    const actionId = `run-action-${index + 1}`;

    // Contrat API WebContainer : filesystem.writeFile échoue si le dossier parent
    // est absent. Le runner applique la précédence en amont — un fichier dont un
    // segment intermédiaire n'existe pas est REJETÉ avec message exploitable par
    // le modèle, jamais écrit silencieusement ni substitué par mkdir implicite.
    if (action.type === "file") {
      const segments = action.path.split("/");
      for (let depth = 1; depth < segments.length - 1; depth++) {
        const dirPath = segments.slice(0, depth + 1).join("/");
        if (!writtenPaths.has(`${dirPath}/`)) {
          results.push({
            actionId,
            action,
            status: "rejected",
            stdout: "",
            stderr: "",
            exitCode: null,
            error: `dossier parent manquant « ${dirPath} » : créez-le d'abord via une action file dans ce dossier ou une commande shell mkdir`,
          });
          await events?.append({ type: "action.rejected", payload: { actionId, reason: "missing-parent-dir" } });
          break;
        }
      }
      if (results.some((r) => r.actionId === actionId && r.status === "rejected")) continue;
      if (writtenPaths.has(action.path)) {
        results.push({
          actionId,
          action,
          status: "rejected",
          stdout: "",
          stderr: "",
          exitCode: null,
          error: `chemin « ${action.path} » déjà écrit dans cette réponse : doublon rejeté (envoyez une seule action file complète par chemin)`,
        });
        await events?.append({ type: "action.rejected", payload: { actionId, reason: "duplicate-path" } });
        continue;
      }
    }

    if (signal?.aborted) {
      results.push({ actionId, action, status: "aborted", stdout: "", stderr: "", exitCode: null });
      break;
    }

    await events?.append({ type: "action.started", payload: { actionId, action } });
    onLog?.(`[${actionId}] ${describeAction(action)}`);

    try {
      if (action.type === "file") {
        await container.writeFile(action.path, action.content);
        writtenPaths.add(action.path);
        // Le dossier parent est désormais établi implicitement par l'API WebContainer
        // (writeFile crée les segments manquants) ; on les enregistre pour la précédence.
        const segs = action.path.split("/");
        for (let d = 1; d < segs.length - 1; d++) writtenPaths.add(`${segs.slice(0, d + 1).join("/")}/`);
        const result: ActionResult = { actionId, action, status: "complete", stdout: `written ${action.path}`, stderr: "", exitCode: 0 };
        results.push(result);
        await events?.append({ type: "action.complete", payload: { actionId, path: action.path } });
      } else if (action.type === "delete") {
        await container.removeFile(action.path);
        results.push({ actionId, action, status: "complete", stdout: `deleted ${action.path}`, stderr: "", exitCode: 0 });
        await events?.append({ type: "action.complete", payload: { actionId, path: action.path } });
      } else if (action.type === "rename") {
        await container.moveFile(action.from, action.to);
        results.push({ actionId, action, status: "complete", stdout: `moved ${action.from} → ${action.to}`, stderr: "", exitCode: 0 });
        await events?.append({ type: "action.complete", payload: { actionId, from: action.from, to: action.to } });
      } else if (action.type === "shell") {
        const proc = await container.spawn(action.command, { signal });
        const failed = proc.exitCode !== 0;
        results.push({
          actionId,
          action,
          status: failed ? "failed" : "complete",
          stdout: proc.stdout,
          stderr: proc.stderr,
          exitCode: proc.exitCode,
        });
        await events?.append({
          type: failed ? "action.failed" : "action.complete",
          payload: { actionId, command: action.command, exitCode: proc.exitCode, stderr: proc.stderr.slice(-2000) },
        });
        if (failed) break; // C.1/C.3 : l'échec remonte, le LOT E reboucle vers le modèle.
      } else if (action.type === "start") {
        const { url } = await container.startDevServer();
        results.push({ actionId, action, status: "complete", stdout: url ?? "dev server started", stderr: "", exitCode: 0 });
        await events?.append({ type: "devserver.started", payload: { actionId, url } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ actionId, action, status: "failed", stdout: "", stderr: message, exitCode: null, error: message });
      await events?.append({ type: "action.error", payload: { actionId, message } });
      break;
    }
  }

  return results;
}

function describeAction(action: IdealyAction): string {
  switch (action.type) {
    case "file":
      return `file ${action.path} (${action.content.length} octets)`;
    case "shell":
      return `shell ${action.command}`;
    case "start":
      return "start dev server";
    case "delete":
      return `delete ${action.path}`;
    case "rename":
      return `rename ${action.from} → ${action.to}`;
  }
}
