import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(
  new URL("../app/api/idealy/process-ai-request/route.ts", import.meta.url),
  "utf8"
);

assert.doesNotMatch(route, /request\.headers\.get\("apikey"\)/, "Le proxy ne doit pas accepter une API key Supabase choisie par le client.");
assert.match(route, /\.\.\.\(supabaseAnonKey \? \{ apikey: supabaseAnonKey \} : \{\}\)/, "Le proxy doit utiliser uniquement la clé anonyme configurée côté serveur.");
assert.match(route, /if \(!authorization\?\.startsWith\("Bearer "\)\)/, "Le proxy doit exiger un bearer avant tout appel Edge.");

console.log("Next AI proxy contract passed.");
