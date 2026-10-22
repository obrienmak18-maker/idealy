import { readFile } from "node:fs/promises";

const source = await readFile("app/(chat)/api/chat/route.ts", "utf8");
const planCard = await readFile("components/chat/mission-plan-card.tsx", "utf8");

if (!source.includes('if (intentCategory === "EXECUTION")')) {
  throw new Error("Only EXECUTION may create a project and mission workspace.");
}

if (source.includes('if (intentCategory !== "CONVERSATION")')) {
  throw new Error("IDEATION must not create a mission as a side effect.");
}

if (!source.includes("Plan enregistré pour")) {
  throw new Error("Execution must return the persisted mission plan.");
}

if (
  !source.includes("Valider et lancer") ||
  !planCard.includes("Valider et lancer") ||
  !planCard.includes("missionRunRequested: true")
) {
  throw new Error(
    "Execution must wait for the visible plan card's real user-confirmed launch action."
  );
}

console.log("Intent routing contract passed.");
