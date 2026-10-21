/**
 * Contrat LOT I : les préprompts par Voie viennent des FICHIERS (pas du code),
 * les quatre jeux diffèrent structurellement, et le prompt système final est
 * assemblé depuis `prompts/voies/<voie>/`.
 * Mécanisme inspiré gpt-engineer (AntonOsika/gpt-engineer, MIT) — réécriture TS Idealy.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildIdealyBuildSystemPrompt } from "../lib/idealy/prompts/build-system";

const voies = ["ninja", "mage", "hunter", "professional"] as const;
const sections = ["identity", "philosophy", "generate", "improve"] as const;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

// I.2 — Les 4 voies × 4 sections existent en fichiers, non vides.
for (const voie of voies) {
  for (const section of sections) {
    const f = path.join(process.cwd(), "prompts", "voies", voie, `${section}.md`);
    assert(existsSync(f), `fichier manquant : prompts/voies/${voie}/${section}.md`);
    assert(readFileSync(f, "utf8").trim().length > 50, `fichier trop court : ${voie}/${section}.md`);
  }
}

// I.3 — Le prompt système contient le balisage assembleur ET le contenu des fichiers.
const prompts = voies.map((v) => buildIdealyBuildSystemPrompt({ way: v }));
for (let i = 0; i < voies.length; i++) {
  const p = prompts[i];
  assert(p.includes(`<preprompts voie="${voies[i]}">`), `${voies[i]} : pack fichier non injecté (repli code utilisé)`);
  const gen = readFileSync(path.join(process.cwd(), "prompts", "voies", voies[i], "generate.md"), "utf8").trim();
  assert(p.includes(gen.slice(0, 60)), `${voies[i]} : contenu generate.md absent du prompt`);
}

// I.4 — Formes structurellement différentes (marqueurs propres à chaque jeu).
assert(prompts[0].includes("minimum 8 étapes"), "ninja : granularité absente");
assert(prompts[1].includes("au moins 2 consacrées exclusivement au design"), "mage : part design absente");
assert(prompts[2].includes("alternatives"), "hunter : alternatives absentes");
assert(prompts[3].includes("3 à 4 étapes maximum"), "professional : sobriété absente");
for (let i = 0; i < 4; i++)
  for (let j = i + 1; j < 4; j++)
    assert(prompts[i] !== prompts[j], `prompts ${voies[i]} et ${voies[j]} identiques`);

// I.5 — Zéro nom de personnage sous licence dans les fichiers de preprompts.
const marquesInterdites = ["naruto", "sasuke", "goku", "luffy", "zoro", "pokemon", "pikachu", "sailor moon", "kakashi", "itachi"];
for (const voie of voies) {
  for (const section of sections) {
    const contenu = readFileSync(path.join(process.cwd(), "prompts", "voies", voie, `${section}.md`), "utf8").toLowerCase();
    for (const m of marquesInterdites) assert(!contenu.includes(m), `marque sous licence « ${m} » dans ${voie}/${section}.md`);
  }
}

console.log("Idealy way-preprompts file-pack contract verified (4 voies × 4 sections). ✓");
