import { readFile } from "node:fs/promises";

const source = await readFile("app/(chat)/api/chat/route.ts", "utf8");

if (!source.includes('if (intentCategory === "EXECUTION")')) {
  throw new Error("Only EXECUTION may create a project and mission workspace.");
}

if (source.includes('if (intentCategory !== "CONVERSATION")')) {
  throw new Error("IDEATION must not create a mission as a side effect.");
}

console.log("Intent routing contract passed.");
