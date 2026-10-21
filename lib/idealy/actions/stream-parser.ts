/**
 * Machine d'états de parsing en streaming des actions Idealy (LOT D).
 *
 * Mécanisme inspiré de la machine d'états de parsing incrémental du dépôt
 * open-source StackBlitz bolt.new (MIT, (c) 2024 StackBlitz, Inc.) : un parseur
 * qui consomme des chunks partiels sans jamais émettre d'action à partir d'un
 * flux incomplet. Le code source n'est PAS copié : balises, noms, structures et
 * API sont réécrits pour le protocole Idealy (lib/idealy/actions/schema.ts).
 * Voir THIRD_PARTY_NOTICES.md.
 */

import { validateIdealyAction } from "./schema";
import {
  IDEALY_ACTION_CONTAINER_TAG,
  IDEALY_ACTION_ITEM_TAG,
} from "../prompts/build-system";

const CONTAINER_OPEN = `<${IDEALY_ACTION_CONTAINER_TAG}`;
const CONTAINER_CLOSE = `</${IDEALY_ACTION_CONTAINER_TAG}>`;
const ACTION_OPEN = `<${IDEALY_ACTION_ITEM_TAG}`;
const ACTION_CLOSE = `</${IDEALY_ACTION_ITEM_TAG}>`;

export interface ParsedContainerInfo {
  id: string;
  title: string;
}

export interface EmittedAction {
  actionId: string;
  /** Contenu brut entre les balises (avant trim/validation). */
  raw: string;
  /** Résultat de la validation Zod + rejet placeholder (B.4). */
  result: ReturnType<typeof validateIdealyAction>;
}

export interface StreamParserCallbacks {
  onContainerOpen?: (info: ParsedContainerInfo) => void;
  onContainerClose?: () => void;
  onActionComplete?: (emitted: EmittedAction) => void;
  /** Trame non reconnue ou anomalie : journalisée, jamais avalée silencieusement. */
  onWarning?: (message: string) => void;
}

interface ContainerAttrs {
  id?: string;
  title?: string;
}

/** Extrait un attribut simple (`name="value"`) depuis une tête de balise. */
function readAttr(header: string, name: string): string | undefined {
  const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`).exec(header);
  return match?.[1];
}

/**
 * Parseur incrémental par machine d'états. Garanties :
 *  - aucune action n'est émise tant que sa balise fermante n'a pas été reçue ;
 *  - si un chunk se termine au milieu d'une balise ouvrante ou d'un attribut,
 *    la position est recalée sur le dernier préfixe partiel de balise pour ne
 *    perdre ni action ni fragment en limite de chunk ;
 *  - hors conteneur, le texte est traité comme prose et ignoré par le runner.
 */
export class IdealyActionStreamParser {
  private insideContainer = false;
  private insideAction = false;
  private containerAttrs: ContainerAttrs = {};
  private actionHeader = "";
  private actionContent = "";
  private actionCount = 0;
  /** Buffer des fragments de balise coupés en limite de chunk. */
  private pendingPartial = "";

  constructor(private readonly callbacks: StreamParserCallbacks = {}) {}

  reset(): void {
    this.insideContainer = false;
    this.insideAction = false;
    this.containerAttrs = {};
    this.actionHeader = "";
    this.actionContent = "";
    this.actionCount = 0;
    this.pendingPartial = "";
  }

  /** Consomme un chunk du flux. Peut être appelé des centaines de fois. */
  feed(chunk: string): void {
    let input = this.pendingPartial + chunk;
    this.pendingPartial = "";

    while (input.length > 0) {
      if (!this.insideContainer) {
        const openIdx = input.indexOf(CONTAINER_OPEN);
        if (openIdx === -1) {
          this.pendingPartial = trailingTagPrefix(input, CONTAINER_OPEN);
          return;
        }
        const headerEnd = input.indexOf(">", openIdx);
        if (headerEnd === -1) {
          // Tête de conteneur incomplète : on garde tout à partir de l'ouverture.
          this.pendingPartial = input.slice(openIdx);
          return;
        }
        const header = input.slice(openIdx, headerEnd + 1);
        if (header.endsWith("/>")) {
          this.callbacks.onWarning?.(`Conteneur ${IDEALY_ACTION_CONTAINER_TAG} auto-fermé, vide : ignoré.`);
          input = input.slice(headerEnd + 1);
          continue;
        }
        this.insideContainer = true;
        this.containerAttrs = {
          id: readAttr(header, "id"),
          title: readAttr(header, "title"),
        };
        this.callbacks.onContainerOpen?.({
          id: this.containerAttrs.id ?? "",
          title: this.containerAttrs.title ?? "",
        });
        input = input.slice(headerEnd + 1);
        continue;
      }

      if (!this.insideAction) {
        // Fermeture du conteneur ?
        const closeIdx = input.indexOf(CONTAINER_CLOSE);
        const actionIdx = input.indexOf(ACTION_OPEN);

        if (closeIdx !== -1 && (actionIdx === -1 || closeIdx < actionIdx)) {
          const stray = input.slice(0, closeIdx).trim();
          if (stray.length > 0) {
            this.callbacks.onWarning?.(`Texte déposé hors action dans le conteneur : « ${stray.slice(0, 80)}… »`);
          }
          this.insideContainer = false;
          this.callbacks.onContainerClose?.();
          input = input.slice(closeIdx + CONTAINER_CLOSE.length);
          continue;
        }
        if (actionIdx === -1) {
          this.pendingPartial = trailingTagPrefix(input, ACTION_OPEN);
          return;
        }
        const headerEnd = input.indexOf(">", actionIdx);
        if (headerEnd === -1) {
          this.pendingPartial = input.slice(actionIdx);
          return;
        }
        this.insideAction = true;
        this.actionHeader = input.slice(actionIdx, headerEnd + 1);
        this.actionContent = "";
        input = input.slice(headerEnd + 1);
        continue;
      }

      // On est à l'intérieur d'une action : on attend sa balise fermante.
      const endIdx = input.indexOf(ACTION_CLOSE);
      if (endIdx === -1) {
        // Flux incomplet : JAMAIS d'émission ici. On conserve le contenu reçu,
        // en gardant uniquement le possible suffixe partiel de balise fermante.
        this.actionContent += stripTrailingPartial(input, ACTION_CLOSE);
        this.pendingPartial = trailingTagPrefix(input, ACTION_CLOSE);
        return;
      }
      this.actionContent += input.slice(0, endIdx);
      input = input.slice(endIdx + ACTION_CLOSE.length);
      this.emitCurrentAction();
    }
  }

  /** Signale la fin définitive du flux : toute action restée ouverte est une anomalie. */
  finish(): void {
    if (this.insideAction) {
      this.callbacks.onWarning?.(
        `Flux terminé pendant l'action « ${readAttr(this.actionHeader, "type") ?? "?"} » : action abandonnée, rien n'est écrit.`,
      );
      this.insideAction = false;
      this.actionHeader = "";
      this.actionContent = "";
    }
    if (this.insideContainer) {
      this.callbacks.onWarning?.("Flux terminé avant la fermeture du conteneur d'actions.");
      this.insideContainer = false;
    }
    this.pendingPartial = "";
  }

  private emitCurrentAction(): void {
    const type = readAttr(this.actionHeader, "type");
    const path = readAttr(this.actionHeader, "path");
    const from = readAttr(this.actionHeader, "from");
    const to = readAttr(this.actionHeader, "to");
    const raw = this.actionContent;
    const trimmed = raw.trim();

    let candidate: unknown;
    switch (type) {
      case "file":
        candidate = { type: "file", path: path ?? "", content: trimmed };
        break;
      case "shell":
        candidate = { type: "shell", command: trimmed };
        break;
      case "start":
        candidate = { type: "start" };
        break;
      case "delete":
        candidate = { type: "delete", path: path ?? "" };
        break;
      case "rename":
        candidate = { type: "rename", from: from ?? "", to: to ?? "" };
        break;
      default:
        this.callbacks.onWarning?.(
          `Balise ${IDEALY_ACTION_ITEM_TAG} avec type inconnu « ${type ?? "(absent)"} » : ignorée.`,
        );
        this.insideAction = false;
        this.actionHeader = "";
        this.actionContent = "";
        return;
    }

    const result = validateIdealyAction(candidate);
    // Contrat B.4/D.3 : toute action complète est ÉMISE avec son résultat de
    // validation — y compris les rejets (contenu vide, placeholder, schéma invalide),
    // afin que le consommateur puisse les signaler au modèle. Seuls les types
    // inconnus sont ignorés (plus haut). Rien n'est jamais avalé silencieusement.
    if (!result.ok) {
      this.callbacks.onWarning?.(result.reason);
    }
    this.actionCount += 1;
    const actionId = `${this.containerAttrs.id ?? "container"}-action-${this.actionCount}`;
    this.callbacks.onActionComplete?.({ actionId, raw: trimmed, result });

    this.insideAction = false;
    this.actionHeader = "";
    this.actionContent = "";
  }
}

/**
 * Si `input` se termine par un préfixe strict de `tag` (ex. "<idealyActi"),
 * renvoie ce préfixe (à mettre en attente), sinon "".
 */
function trailingTagPrefix(input: string, tag: string): string {
  for (let len = Math.min(tag.length - 1, input.length); len > 0; len--) {
    if (input.endsWith(tag.slice(0, len))) {
      return input.slice(input.length - len);
    }
  }
  return "";
}

/** Retire d'`input` le éventuel préfixe partiel de `tag` en fin de chaîne. */
function stripTrailingPartial(input: string, tag: string): string {
  const partial = trailingTagPrefix(input, tag);
  return partial.length > 0 ? input.slice(0, input.length - partial.length) : input;
}
