import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(
  new URL("../app/api/idealy/process-ai-request/route.ts", import.meta.url),
  "utf8"
);

const providers = await readFile(
  new URL("../lib/ai/providers.ts", import.meta.url),
  "utf8"
);

assert.doesNotMatch(route, /request\.headers\.get\("apikey"\)/, "Le proxy ne doit pas accepter une API key Supabase choisie par le client.");
assert.match(route, /\.\.\.\(supabaseAnonKey \? \{ apikey: supabaseAnonKey \} : \{\}\)/, "Le proxy doit utiliser uniquement la clé anonyme configurée côté serveur.");
assert.match(route, /if \(!authorization\?\.startsWith\("Bearer "\)\)/, "Le proxy doit exiger un bearer avant tout appel Edge.");

assert.ok(!providers.includes("gateway.languageModel("), "Les requêtes ne doivent jamais basculer implicitement vers Vercel AI Gateway.");
assert.ok(!providers.includes('import { customProvider, gateway } from "ai";'), "Le registre local ne doit pas dépendre de Vercel AI Gateway.");

console.log("Next AI proxy and direct-provider contract passed.");
