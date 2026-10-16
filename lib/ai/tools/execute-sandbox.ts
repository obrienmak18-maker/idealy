import { tool } from "ai";
import { z } from "zod";
import {
  isE2BConfigured,
  runCodeInSandbox,
  runBashInSandbox,
} from "@/lib/idealy/runtime/e2b";

export const executeSandbox = () =>
  tool({
    description:
      "Exécute du code (Python, JavaScript) ou une commande Bash dans une microVM Linux cloud isolée et sécurisée (E2B Sandbox). Permet de tester du code généré, vérifier des calculs, valider des imports ou exécuter des scripts de test.",
    inputSchema: z.object({
      codeOrCommand: z
        .string()
        .min(1)
        .describe("Le code source ou la commande shell à exécuter dans la sandbox"),
      type: z
        .enum(["python", "javascript", "bash"])
        .default("python")
        .describe("Le langage ou l'interpréteur à utiliser (python, javascript ou bash)"),
      purpose: z
        .string()
        .optional()
        .describe("L'objectif de cette exécution (ex: 'Valider la logique de calcul de prix', 'Tester l'expression régulière')"),
    }),
    execute: async ({ codeOrCommand, type, purpose }) => {
      if (!isE2BConfigured()) {
        return {
          status: "unconfigured",
          message:
            "L'environnement d'exécution E2B n'est pas configuré (E2B_API_KEY absente).",
          stdout: "",
          stderr: "",
          executionTimeMs: 0,
        };
      }

      if (type === "bash") {
        const result = await runBashInSandbox({ command: codeOrCommand });
        return {
          status: result.success ? "success" : "failed",
          purpose,
          type,
          stdout: result.stdout,
          stderr: result.stderr,
          error: result.error,
          executionTimeMs: result.executionTimeMs,
        };
      }

      const result = await runCodeInSandbox({
        code: codeOrCommand,
        language: type,
      });

      return {
        status: result.success ? "success" : "failed",
        purpose,
        type,
        stdout: result.stdout,
        stderr: result.stderr,
        results: result.results,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
      };
    },
  });
