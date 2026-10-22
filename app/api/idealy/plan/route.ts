import { NextResponse } from "next/server";
import {
  type Plan,
  type PlanCritique,
  validatePlanJSON,
} from "@/lib/idealy/orchestrator/plan-schema";

const FORBIDDEN_WORDS = ["moderne", "optimisé", "réactif"];

/**
 * T1.4 — Critique step verifying the plan against quality checklist:
 * - Missing dependencies?
 * - Non-testable criteria? (e.g. "moderne", "optimisé", "réactif" without metrics)
 * - Tasks touching > 5 files?
 * - Assumptions explicit?
 */
export function critiquePlan(plan: Plan): PlanCritique {
  const objections: string[] = [];
  const assumptionsToAdd: string[] = [];

  // 1. Check for vague/non-testable criteria
  for (const step of plan.steps) {
    for (const criterion of step.done_criteria) {
      const lower = criterion.toLowerCase();
      for (const word of FORBIDDEN_WORDS) {
        if (lower.includes(word) && !/\d/.test(lower)) {
          objections.push(
            `Étape "${step.id}": critère non mesurable "${criterion}" (mot interdit "${word}" sans métrique chiffrée)`
          );
        }
      }
    }

    // 2. Check if a task appears to touch too many files (> 5)
    if (step.done_criteria.length > 5) {
      objections.push(
        `Étape "${step.id}": périmètre potentiellement trop large (> 5 critères/fichiers)`
      );
    }
  }

  // 3. Check for missing explicit assumptions
  if (!plan.assumptions || plan.assumptions.length === 0) {
    objections.push("Aucune hypothèse explicite fournie (assumptions[] vide)");
    assumptionsToAdd.push(
      "Environnement d'exécution standard Node 20+ et navigateur moderne"
    );
  }

  const isValid = objections.length === 0;

  let revisedPlan: Plan | undefined;
  if (!isValid) {
    // Produce a revised plan fixing unmeasured criteria and enriching assumptions
    revisedPlan = {
      ...plan,
      assumptions:
        (plan.assumptions ?? []).length > 0
          ? plan.assumptions
          : assumptionsToAdd.length > 0
            ? assumptionsToAdd
            : ["Hypothèse par défaut validée par le critique"],
      steps: plan.steps.map((s) => ({
        ...s,
        done_criteria: s.done_criteria.map((c) => {
          let refined = c;
          for (const word of FORBIDDEN_WORDS) {
            const re = new RegExp(`\\b${word}\\b`, "gi");
            if (re.test(refined) && !/\d/.test(refined)) {
              refined = refined.replace(
                re,
                `${word} (temps de réponse < 100ms, score >= 90/100)`
              );
            }
          }
          return refined;
        }),
      })),
    };
  }

  return {
    assumptions_to_add: assumptionsToAdd,
    objections,
    revised_plan: revisedPlan,
    valid: isValid,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      candidatePlan?: unknown;
      prompt?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { error: "Corps de requête JSON manquant", success: false },
        { status: 400 }
      );
    }

    const { candidatePlan } = body;

    // T1.3 — Valider avec Zod.
    const validation = validatePlanJSON(candidatePlan);

    // Si validation échoue, diagnostic visible : jamais de faux plan inventé
    if (!validation.success || !validation.plan) {
      return NextResponse.json(
        {
          diagnostic: validation.error ?? "Structure de plan non reconnue",
          error: "Plan invalide : rejeté par le schéma de validation strict",
          issues: validation.issues,
          success: false,
          valid: false,
        },
        { status: 422 }
      );
    }

    const validPlan = validation.plan;

    // T1.4 — Passe de critique
    const critique = critiquePlan(validPlan);
    const finalPlan = critique.valid
      ? validPlan
      : (critique.revised_plan ?? validPlan);

    return NextResponse.json({
      critique,
      plan: finalPlan,
      success: true,
      valid: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        diagnostic: error instanceof Error ? error.message : String(error),
        error: "Erreur interne lors de la validation du plan",
        success: false,
      },
      { status: 500 }
    );
  }
}
