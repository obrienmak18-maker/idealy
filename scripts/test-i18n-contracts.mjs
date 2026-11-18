import assert from "node:assert/strict";
import fs from "node:fs";

console.log("Verifying Idealy tri-lingual dictionary symmetry (EN, FR, ES)...");

const content = fs.readFileSync("sidealy/src/services/i18n.ts", "utf8");

const enStart = content.indexOf("  en: {");
const frStart = content.indexOf("  fr: {");
const esStart = content.indexOf("  es: {");
const end = content.indexOf("\n};\n", esStart);

assert.ok(enStart !== -1 && frStart !== -1 && esStart !== -1 && end !== -1, "Dictionary markers found");

function getKeys(text) {
  const matches = [...text.matchAll(/"([^"]+)":/g)];
  return matches.map(m => m[1]).sort();
}

const enKeys = getKeys(content.slice(enStart, frStart));
const frKeys = getKeys(content.slice(frStart, esStart));
const esKeys = getKeys(content.slice(esStart, end));

assert.ok(enKeys.length >= 60, `EN dictionary must contain >= 60 keys, got ${enKeys.length}`);
assert.equal(frKeys.length, enKeys.length, `FR key count (${frKeys.length}) must match EN (${enKeys.length})`);
assert.equal(esKeys.length, enKeys.length, `ES key count (${esKeys.length}) must match EN (${enKeys.length})`);

for (let i = 0; i < enKeys.length; i++) {
  assert.equal(frKeys[i], enKeys[i], `Key mismatch at index ${i}: FR has "${frKeys[i]}" vs EN "${enKeys[i]}"`);
  assert.equal(esKeys[i], enKeys[i], `Key mismatch at index ${i}: ES has "${esKeys[i]}" vs EN "${enKeys[i]}"`);
}

console.log(`✓ All ${enKeys.length} dictionary keys are 100% symmetric across English (default), French, and Spanish.`);
