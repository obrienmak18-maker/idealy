import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const personas = await readFile(
  new URL("../lib/idealy/agent-personas.ts", import.meta.url),
  "utf8"
);
const adapter = await readFile(
  new URL("../lib/idealy/backend-adapter.ts", import.meta.url),
  "utf8"
);
const orchestrator = await readFile(
  new URL("../supabase/functions/orchestrate-mission/index.ts", import.meta.url),
  "utf8"
);

for (const way of ["professional", "ninja", "hunter", "mage"]) {
  assert.match(personas, new RegExp(`${way}: \\{`), `La voie ${way} doit avoir un profil original.`);
}
assert.match(personas, /Do not imitate, quote, reference or claim affiliation with any existing fictional character or franchise/, "Les personas de production doivent interdire l’imitation de personnage.");
assert.match(adapter, /voiceProfile: persona/, "Le profil de voix doit être persisté avec la mission.");
assert.match(adapter, /missionPersonaPrompt\(way\)/, "La planification doit recevoir le profil de voix choisi.");
assert.match(orchestrator, /const missionVoice = voiceDirection\(mission\.way\)/, "L’orchestrateur doit relayer la voix persistée.");
assert.match(orchestrator, /Ne pas imiter, citer ou revendiquer l’identité/, "L’orchestrateur doit conserver l’interdiction d’imitation.");

console.log("Agent personas contract passed.");
