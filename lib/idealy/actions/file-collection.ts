/**
 * LOT J — Carte de fichiers incrémentale (mode MAINTENANCE, distinct du mode
 * GÉNÉRATION INITIALE du protocole d'actions LOT B).
 *
 * Mécanisme inspiré des modules `chat_to_files`, `file_store` et `files_dict` de
 * gpt-engineer (AntonOsika/gpt-engineer, licence MIT) : convertir la réponse du
 * modèle en une carte chemin→contenu, puis diff/fusion contre l'état courant.
 * Réécriture TypeScript native Idealy — aucun portage ligne à ligne.
 * Persistance : via le journal de mission EXISTANT (missions/[missionId]/events),
 * en entrée typée `file_map_snapshot`. Aucun nouveau stockage.
 */

import {
  IDEALY_ACTION_CONTAINER_TAG,
  IDEALY_ACTION_ITEM_TAG,
} from "@/lib/idealy/prompts/build-system";

export interface FileMapEntry {
  content: string;
  deleted: boolean;
  /** OBLIGATOIRE si deleted=true (J.4 : jamais de suppression silencieuse). */
  deleteReason?: string;
}

export type FileMap = Record<string, FileMapEntry>;

export interface FileMapDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
}

const BALISE_FICHIER = "fichier";

/**
 * J.2 — Convertisseur sortie du modèle → carte de fichiers typée.
 * Format accepté : `<fichier chemin="...">…contenu complet…</fichier>` répété.
 * Un fichier sans contenu ou manifestement tronqué est REJETÉ (règle B.4 étendue).
 */
export function versCarteFichiers(sortieModele: string): FileMap {
  const carte: FileMap = {};
  const regex = new RegExp(
    `<${BALISE_FICHIER} chemin="([^"]+)">([\\s\\S]*?)</${BALISE_FICHIER}>`,
    "g",
  );
  let m: RegExpExecArray | null = regex.exec(sortieModele);
  while (m !== null) {
    const chemin = m[1];
    const contenu = m[2].trim();
    if (chemin.startsWith("/") || chemin.includes("..")) {
      throw new Error(`Chemin interdit dans la carte de fichiers : ${chemin}`);
    }
    if (contenu.length === 0) {
      throw new Error(
        `Action fichier rejetée (${chemin}) : contenu vide. Réécris le fichier COMPLET.`,
      );
    }
    carte[chemin] = { content: contenu, deleted: false };
    m = regex.exec(sortieModele);
  }
  return carte;
}

/**
 * J.2 — Diff exact entre état courant et nouvel état.
 * Sémantique : ajout (nouveau), modification (contenu différent), suppression
 * (deleted=true AVEC raison), inchangé (non mentionné ou identique).
 * J.4 — Une entrée deleted=true sans deleteReason lève une erreur : la
 * suppression doit être explicite.
 */
export function diffFileMap(avant: FileMap, apres: FileMap): FileMapDiff {
  const diff: FileMapDiff = { added: [], modified: [], deleted: [], unchanged: [] };
  for (const [chemin, entree] of Object.entries(apres)) {
    if (entree.deleted) {
      if (!entree.deleteReason || entree.deleteReason.trim().length === 0) {
        throw new Error(
          `Suppression interdite sans raison explicite : ${chemin}. ` +
            `Renseigne deleteReason (la suppression est journalisée).`,
        );
      }
      if (avant[chemin] && !avant[chemin].deleted) diff.deleted.push(chemin);
      continue;
    }
    const existant = avant[chemin];
    if (!existant || existant.deleted) diff.added.push(chemin);
    else if (existant.content !== entree.content) diff.modified.push(chemin);
    else diff.unchanged.push(chemin);
  }
  // Les fichiers absents de la nouvelle carte ne sont JAMAIS supprimés (incrémental pur).
  for (const chemin of Object.keys(avant)) {
    if (!(chemin in apres) && !avant[chemin].deleted) {
      diff.unchanged.push(chemin);
    }
  }
  return diff;
}

/** Fusion incrémentale : seuls les chemins mentionnés par le modèle changent. */
export function fusionnerCarte(etatCourant: FileMap, partiel: FileMap): FileMap {
  return { ...etatCourant, ...partiel };
}

/** J.3 — Sérialisation pour le journal de mission (entrée `file_map_snapshot`). */
export function serialiserCarte(carte: FileMap): string {
  return JSON.stringify(carte);
}

/** Rejeu après rechargement : parse + validation de cohérence. */
export function parserCarteDepuisJournal(json: string): FileMap {
  const brut: unknown = JSON.parse(json);
  if (typeof brut !== "object" || brut === null) {
    throw new Error("Snapshot de carte de fichiers invalide dans le journal.");
  }
  const carte = brut as FileMap;
  for (const [chemin, entree] of Object.entries(carte)) {
    if (entree.deleted && !entree.deleteReason) {
      throw new Error(`Snapshot corrompu : ${chemin} supprimé sans raison journalisée.`);
    }
  }
  return carte;
}

/** Conversion carte → actions du protocole LOT B (pour exécution conteneur). */
export function carteVersActions(carte: FileMap): Array<
  | { type: "file"; path: string; content: string }
  | { type: "delete"; path: string }
> {
  const actions: Array<
    | { type: "file"; path: string; content: string }
    | { type: "delete"; path: string }
  > = [];
  for (const [path, entree] of Object.entries(carte)) {
    if (entree.deleted) actions.push({ type: "delete", path });
    else actions.push({ type: "file", path, content: entree.content });
  }
  return actions;
}

// Les balises du protocole LOT B sont réutilisées pour la prose de maintenance.
export { IDEALY_ACTION_CONTAINER_TAG, IDEALY_ACTION_ITEM_TAG };
