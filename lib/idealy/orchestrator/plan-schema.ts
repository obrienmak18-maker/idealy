import { z } from "zod";

/**
 * Strict Step Schema within an Idealy Action Plan.
 */
export const planStepSchema = z.object({
  depends_on: z.array(z.string()).default([]),
  done_criteria: z
    .array(z.string().min(1))
    .min(1, "Au moins un critère d'achèvement mesurable est requis"),
  id: z.string().min(1, "L'identifiant d'étape est requis"),
  owner: z.string().min(1, "Le responsable (owner) est requis"),
  status: z
    .enum(["pending", "in_progress", "completed", "blocked"])
    .default("pending"),
  title: z.string().min(1, "Le titre d'étape est requis"),
  why: z.string().min(1, "La justification (why) est requise"),
});

export type PlanStep = z.infer<typeof planStepSchema>;

const FORBIDDEN_VAGUE_WORDS = ["moderne", "optimisé", "réactif"];

/**
 * Checks whether done criteria use vague unmeasured words without metrics.
 */
function hasVagueCriteria(criteria: string[]): boolean {
  for (const c of criteria) {
    const lower = c.toLowerCase();
    for (const word of FORBIDDEN_VAGUE_WORDS) {
      if (lower.includes(word) && !/\d/.test(lower)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Strict Idealy Action Plan Schema.
 * Mandated structure:
 * { goal, non_goals[], assumptions[], steps[], risks[], questions_blocking[] }
 */
export const planSchema = z
  .object({
    assumptions: z
      .array(z.string())
      .min(1, "Au moins une hypothèse explicite (assumptions) est requise"),
    goal: z.string().min(3, "L'objectif (goal) doit être explicité"),
    non_goals: z.array(z.string()).default([]),
    questions_blocking: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
    steps: z
      .array(planStepSchema)
      .min(1, "Le plan doit contenir au moins une étape"),
  })
  .superRefine((data, ctx) => {
    // Check circular dependencies
    const stepIds = new Set(data.steps.map((s) => s.id));
    for (let i = 0; i < data.steps.length; i += 1) {
      const step = data.steps[i];
      for (const dep of step.depends_on) {
        if (!stepIds.has(dep)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `L'étape ${step.id} dépend d'une étape inexistante : ${dep}`,
            path: ["steps", i, "depends_on"],
          });
        }
        if (dep === step.id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `L'étape ${step.id} ne peut pas dépendre d'elle-même`,
            path: ["steps", i, "depends_on"],
          });
        }
      }

      if (hasVagueCriteria(step.done_criteria)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `L'étape ${step.id} contient des critères vagues non mesurables sans chiffre (mots interdits : ${FORBIDDEN_VAGUE_WORDS.join(", ")})`,
          path: ["steps", i, "done_criteria"],
        });
      }
    }
  });

export type Plan = z.infer<typeof planSchema>;

/**
 * Plan Critique Schema (T1.4 verification pass)
 */
export const planCritiqueSchema = z.object({
  assumptions_to_add: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  revised_plan: planSchema.optional(),
  valid: z.boolean(),
});

export type PlanCritique = z.infer<typeof planCritiqueSchema>;

/**
 * Safely parse a JSON string as a Plan, returning a structured result.
 */
export function validatePlanJSON(raw: unknown): {
  success: boolean;
  plan?: Plan;
  error?: string;
  issues?: z.ZodIssue[];
} {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      const cleaned = raw
        .trim()
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```\s*$/, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return {
        error: `JSON invalide : ${e instanceof Error ? e.message : String(e)}`,
        success: false,
      };
    }
  }

  const result = planSchema.safeParse(parsed);
  if (!result.success) {
    return {
      error: result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
      issues: result.error.issues,
      success: false,
    };
  }

  return {
    plan: result.data,
    success: true,
  };
}
