/**
 * LOT I — Assembleur de préprompts par Voie.
 *
 * Mécanisme inspiré du module `preprompts` de gpt-engineer (AntonOsika/gpt-engineer,
 * licence MIT) : un jeu de petits fichiers texte assemblés pour former le prompt
 * système, et la possibilité de charger un JEU DIFFÉRENT selon la configuration.
 * Réécriture TypeScript native Idealy — aucun fichier Python porté ligne à ligne,
 * aucune dépendance ajoutée.
 *
 * Règle structurelle (I.3) : AUCUNE directive de voie n'est codée en dur dans les
 * consumers. Tout vient des fichiers `prompts/voies/<voie>/<section>.md`. Les
 * constantes ci-dessous ne sont que les CHEMINS canoniques ; le contenu est lu.
 *
 * Sections obligatoires par voie : identity | philosophy | generate | improve.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const IDEALY_WAY_IDS = [
  "ninja",
  "mage",
  "hunter",
  "professional",
] as const;

export type IdealyWayId = (typeof IDEALY_WAY_IDS)[number];

export const WAY_SECTIONS = [
  "identity",
  "philosophy",
  "generate",
  "improve",
] as const;

export type WaySection = (typeof WAY_SECTIONS)[number];

export type WayPrepromptPack = Record<WaySection, string>;

const RACINE = path.join(process.cwd(), "prompts", "voies");

function cheminSection(voie: IdealyWayId, section: WaySection): string {
  return path.join(RACINE, voie, `${section}.md`);
}

/** Charge une section. Échoue bruyamment : pas de repli silencieux (règle dépôt). */
async function chargerSection(
  voie: IdealyWayId,
  section: WaySection,
): Promise<string> {
  const fichier = cheminSection(voie, section);
  if (!existsSync(fichier)) {
    throw new Error(
      `Préprompt manquant : prompts/voies/${voie}/${section}.md introuvable. ` +
        `Chaque Voie doit définir les quatre sections (identity, philosophy, generate, improve).`,
    );
  }
  const contenu = (await readFile(fichier, "utf8")).trim();
  if (contenu.length === 0) {
    throw new Error(`Préprompt vide : prompts/voies/${voie}/${section}.md`);
  }
  return contenu;
}

/**
 * I.3 — Assembleur : charge le pack complet de la Voie ACTIVE.
 * Le résultat est injectable tel quel dans un prompt système.
 */
export async function chargerPrepromptsVoie(
  voie: IdealyWayId,
): Promise<WayPrepromptPack> {
  const [identity, philosophy, generate, improve] = await Promise.all([
    chargerSection(voie, "identity"),
    chargerSection(voie, "philosophy"),
    chargerSection(voie, "generate"),
    chargerSection(voie, "improve"),
  ]);
  return { identity, philosophy, generate, improve };
}

/**
 * Assemblage final : balisage Idealy explicite pour que le modèle sache quelle
 * section gouverne quelle phase du DAG (analyze→build = generate, fix = improve).
 */
export function assemblerPrepromptsPourPromptSysteme(
  voie: IdealyWayId,
  pack: WayPrepromptPack,
): string {
  return [
    `<preprompts voie="${voie}">`,
    `<identity>\n${pack.identity}\n</identity>`,
    `<philosophie_decision>\n${pack.philosophy}\n</philosophie_decision>`,
    `<regles_generation>\n${pack.generate}\n</regles_generation>`,
    `<regles_correction>\n${pack.improve}\n</regles_correction>`,
    `</preprompts>`,
  ].join("\n\n");
}

/** Version synchrone pour environnements sans async (scripts de contrat, tests). */
export function chargerPrepromptsVoieSync(voie: IdealyWayId): WayPrepromptPack {
  const lire = (section: WaySection): string => {
    const fichier = cheminSection(voie, section);
    if (!existsSync(fichier)) {
      throw new Error(`Préprompt manquant : prompts/voies/${voie}/${section}.md`);
    }
    // eslint-disable-next-line no-sync -- lecture au démarrage uniquement, jamais dans le hot-path serveur
    const contenu = require("node:fs").readFileSync(fichier, "utf8").trim();
    if (contenu.length === 0) {
      throw new Error(`Préprompt vide : prompts/voies/${voie}/${section}.md`);
    }
    return contenu;
  };
  return {
    identity: lire("identity"),
    philosophy: lire("philosophy"),
    generate: lire("generate"),
    improve: lire("improve"),
  };
}
