/**
 * Contrat LOT G : les quatre Voies produisent des prompts de build STRUCTURELLEMENT
 * différents (directives visibles dans le prompt système généré).
 * Attribution : mécanisme inspiré bolt.new (MIT, (c) 2024 StackBlitz, Inc.), réécriture Idealy.
 */
import { buildIdealyBuildSystemPrompt } from "../lib/idealy/prompts/build-system";

const ways = ["ninja", "mage", "hunter", "professional"] as const;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

const prompts = ways.map((w) => buildIdealyBuildSystemPrompt({ way: w }));

// 1. Chaque prompt porte la directive de SA voie, et pas celle d'une autre.
ways.forEach((w, i) => {
  assert(prompts[i].includes(`<directive_voie>${w}</directive_voie>`), `voie ${w} absente de son prompt`);
  for (const other of ways.filter((x) => x !== w)) {
    assert(!prompts[i].includes(`<directive_voie>${other}</directive_voie>`), `directive ${other} fuite dans prompt ${w}`);
  }
});

// 2. Les formes structurelles diffèrent (markers propres à chaque voie).
assert(prompts[0].includes("livraisons intermédiaires"), "ninja : granularité absente");
assert(prompts[1].includes("part dominante au design"), "mage : part design absente");
assert(prompts[2].includes("alternatives"), "hunter : alternatives absentes");
assert(prompts[3].includes("zéro fioriture"), "professional : sobriété absente");

// 3. Quatre prompts distincts deux à deux.
for (let i = 0; i < 4; i++) {
  for (let j = i + 1; j < 4; j++) {
    assert(prompts[i] !== prompts[j], `prompts ${ways[i]} et ${ways[j]} identiques`);
  }
}

// 4. Aucun nom/libellé tiers dans le prompt généré (balises Idealy uniquement).
for (const p of prompts) {
  assert(p.includes("<idealyProject>") || p.includes("idealyProject"), "protocole actions absent");
  assert(!p.toLowerCase().includes("bolt"), "occurrence interdite « bolt » dans le prompt");
}

console.log("Idealy four-way structural plan contract verified (4/4). ✓");
