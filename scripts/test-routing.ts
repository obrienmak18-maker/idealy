import assert from "node:assert/strict";
import { routeIdealyRequest } from "../lib/idealy/routing";

const quick = routeIdealyRequest({ prompt: "Salut, tu connais React ?", intent: "CONVERSATION" });
assert.equal(quick.lane, "quick");
assert.equal(quick.agents.length, 0);
assert.equal(quick.powerPoints, 0);

const small = routeIdealyRequest({ prompt: "Crée une landing page pour mon café", intent: "EXECUTION" });
assert.equal(small.depth, "focused");
assert.equal(small.powerPoints, 10);

const big = routeIdealyRequest({
  prompt: "Crée un SaaS avec authentification, base de données, paiements Stripe et dashboard admin multi-pages",
  intent: "EXECUTION",
});
assert.equal(big.depth, "squad");
assert.equal(big.agents.length, 5);
assert.equal(big.powerPoints, 50);

const tweak = routeIdealyRequest({ prompt: "Ajoute un bouton de partage", intent: "EXECUTION", existingFileCount: 8 });
assert.equal(tweak.depth, "focused");
console.log("routing: ok");
